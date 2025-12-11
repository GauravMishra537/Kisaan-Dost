// routes/order.js
import express from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';
import ensureAdmin from '../middleware/ensureAdmin.js'; // optional reuse if you need strict admin-only routes

const router = express.Router();

/**
 * POST /api/orders
 * Create a new order (non-transactional for single-node MongoDB)
 * - removes missing products from cart automatically
 * - validates stock
 * - creates Order
 * - decrements product stock sequentially (best-effort)
 * - clears user's cart
 * - adds initial history entry (backwards-compatible)
 */
router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    // Reload user and try to populate cart.product
    let user = await User.findById(userId).populate('cart.product').exec();
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Shipping address: prefer request body, otherwise user's saved address
    const shippingAddress = req.body.shippingAddress || (user.address ? { address: user.address } : null);
    if (!shippingAddress || !shippingAddress.address) {
      return res.status(400).json({ message: 'Shipping address required' });
    }

    // Build list of valid items and collect removed items (product missing)
    const removedItems = [];
    const validItems = [];

    for (const ci of user.cart) {
      const prodRef = ci.product;

      if (!prodRef) {
        // product deleted or null
        removedItems.push({ id: null, qty: ci.qty });
        continue;
      }

      if (typeof prodRef === 'object' && prodRef._id) {
        validItems.push({ productDoc: prodRef, qty: ci.qty });
      } else {
        // attempt to fetch by id
        const p = await Product.findById(prodRef);
        if (!p) {
          removedItems.push({ id: prodRef, qty: ci.qty });
        } else {
          validItems.push({ productDoc: p, qty: ci.qty });
        }
      }
    }

    // If any removed items, update user.cart to remove them and persist
    if (removedItems.length > 0) {
      const validIds = new Set(validItems.map(v => v.productDoc._id.toString()));
      user.cart = user.cart.filter(ci => {
        if (!ci.product) return false;
        const pid = (typeof ci.product === 'object' && ci.product._id) ? ci.product._id.toString() : ci.product.toString();
        return validIds.has(pid);
      });
      await user.save();
      // reload user.cart to be safe
      user = await User.findById(userId).populate('cart.product').exec();
    }

    // If nothing remains after cleanup
    if (validItems.length === 0) {
      return res.status(400).json({
        message: 'Some items in your cart were removed because they are no longer available. Your cart has been updated. Please review and try again.',
        removedItems,
      });
    }

    // Check stock availability for each valid item
    for (const it of validItems) {
      const productDoc = await Product.findById(it.productDoc._id);
      if (!productDoc) {
        return res.status(400).json({ message: `Product ${it.productDoc.name || it.productDoc._id} not available` });
      }
      if (productDoc.countInStock < it.qty) {
        return res.status(400).json({ message: `Not enough stock for ${productDoc.name}. Available: ${productDoc.countInStock}` });
      }
    }

    // Build orderItems and totals
    const orderItems = validItems.map(v => ({
      name: v.productDoc.name,
      qty: v.qty,
      image: v.productDoc.image,
      price: v.productDoc.price,
      product: v.productDoc._id,
      // seller: v.productDoc.seller || null  // optional: include if your Product model has seller field
    }));

    const itemsPrice = orderItems.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 0), 0);
    const shippingPrice = req.body.shippingPrice != null ? Number(req.body.shippingPrice) : 0;
    const taxPrice = req.body.taxPrice != null ? Number(req.body.taxPrice) : 0;
    const totalPrice = typeof req.body.totalPrice === 'number' ? req.body.totalPrice : itemsPrice + shippingPrice + taxPrice;

    // Create order doc (backwards-compatible shapes retained)
    const order = new Order({
      user: user._id,
      orderItems,
      shippingAddress,
      paymentMethod: req.body.paymentMethod || 'Cash on Delivery',
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      isPaid: false,
      status: 'Pending', // initial status
    });

    // Add initial history entry (useful for UI)
    order.history.push({
      status: order.status,
      note: 'Order created',
      location: (shippingAddress.city || shippingAddress.address) || '',
      updatedBy: user._id
    });

    // Save order (non-transactional)
    const createdOrder = await order.save();

    // Decrement stock sequentially (best-effort)
    for (const it of orderItems) {
      try {
        const prod = await Product.findById(it.product);
        if (!prod) {
          console.error(`Product ${it.product} not found when decrementing stock`);
          continue;
        }
        if (prod.countInStock < it.qty) {
          // race condition case — log and continue
          console.error(`Race condition: insufficient stock for ${prod.name} while finalizing order ${createdOrder._id}`);
          continue;
        }
        prod.countInStock = prod.countInStock - it.qty;
        await prod.save();
      } catch (err) {
        console.error('Failed to decrement stock for product', it.product, err);
        // continue with next product
      }
    }

    // Clear user's cart
    user.cart = [];
    await user.save();

    // Return created order; include removedItems if any
    const response = { order: createdOrder };
    if (removedItems.length > 0) response.removedItems = removedItems;

    return res.status(201).json(response);
  } catch (err) {
    console.error('Order creation error (non-transactional):', err);
    return res.status(500).json({ message: err.message || 'Server error creating order' });
  }
});

/**
 * GET /api/orders/myorders
 * Return orders for the logged-in user (for transaction history)
 */
router.get('/myorders', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).lean().exec();
    return res.json(orders);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    return res.status(500).json({ message: 'Failed to load orders' });
  }
});

/**
 * GET /api/orders/:id
 * Return a single order detail (only if it belongs to the logged-in user)
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const order = await Order.findById(req.params.id).lean().exec();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== userId.toString() && !(req.user.isAdmin || req.user.userType === 'Admin')) {
      // allow owner or admin to view single order
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json(order);
  } catch (err) {
    console.error('Error fetching order by id:', err);
    return res.status(500).json({ message: 'Failed to load order' });
  }
});

/**
 * GET /api/orders/:id/status
 * Owner or admin can view the status/tracking/history summary
 */
router.get('/:id/status', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email').exec();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // allow owner or admin
    const isOwner = req.user._id.toString() === order.user._id.toString();
    const isAdmin = !!req.user.isAdmin || req.user.userType === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    return res.json({
      status: order.status,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      history: order.history
    });
  } catch (err) {
    console.error('GET /api/orders/:id/status error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/orders/:id/status
 * Update order status/tracking. Allowed: admins and (optionally) farmers.
 * Body: { status, trackingNumber, note, location, estimatedDelivery }
 *
 * NOTE: If you want farmers to update only orders that include their products,
 * include seller references in orderItems (seller field) and uncomment the seller ownership checks below.
 */
router.put('/:id/status', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isAdmin = !!req.user.isAdmin || req.user.userType === 'Admin';
    const isFarmer = req.user.userType === 'Farmer';

    // If you want only admins to update, uncomment this block:
    // if (!isAdmin) return res.status(403).json({ message: 'Not authorized to update order status' });

    // If you want to allow farmers to update only their own items, you must have seller in orderItems.
    // Example check (uncomment and adapt if you have seller on each orderItem):
    // if (!isAdmin && isFarmer) {
    //   const owns = order.orderItems.some(it => it.seller && it.seller.toString() === req.user._id.toString());
    //   if (!owns) return res.status(403).json({ message: 'Farmer not authorized for this order' });
    // }

    // If neither admin nor farmer -> forbid
    if (!isAdmin && !isFarmer) {
      return res.status(403).json({ message: 'Not authorized to update order status' });
    }

    const { status, trackingNumber, note, location, estimatedDelivery } = req.body;

    if (status) order.status = status;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);

    // push history entry
    order.history.push({
      status: status || order.status,
      note: note || '',
      location: location || '',
      updatedBy: req.user._id
    });

    // convenience boolean
    if (status === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    } else if (status === 'Cancelled' || status === 'Returned') {
      // you might want to handle stock rollback here (optional)
      order.isDelivered = false;
    } else {
      order.isDelivered = false;
    }

    await order.save();

    res.json({
      message: 'Order status updated',
      status: order.status,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      history: order.history
    });
  } catch (err) {
    console.error('PUT /api/orders/:id/status error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
