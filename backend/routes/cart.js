// backend/routes/cart.js
import express from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/cart - get current user's cart (populated)
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.product').exec();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.cart || []);
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ message: 'Failed to load cart' });
  }
});

// POST /api/cart - add/update (increment) a product in cart
// Body: { productId, qty }  -> qty defaults to 1; when item exists, qty is incremented
router.post('/', protect, async (req, res) => {
  try {
    const { productId } = req.body;
    let qty = Number(req.body.qty);
    if (!productId) return res.status(400).json({ message: 'productId is required' });
    if (!qty || isNaN(qty)) qty = 1;
    if (qty <= 0) return res.status(400).json({ message: 'Quantity must be at least 1' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // find existing cart item
    const existingIndex = user.cart.findIndex(ci => ci.product.toString() === productId.toString());

    if (existingIndex >= 0) {
      const currentQty = Number(user.cart[existingIndex].qty || 0);
      const newQty = currentQty + qty;

      if (product.countInStock < newQty) {
        return res.status(400).json({ message: `Only ${product.countInStock}kg available for ${product.name}` });
      }

      user.cart[existingIndex].qty = newQty;
    } else {
      // adding new item: ensure stock sufficient
      if (product.countInStock < qty) {
        return res.status(400).json({ message: `Only ${product.countInStock}kg available for ${product.name}` });
      }
      user.cart.push({ product: product._id, qty });
    }

    await user.save();

    // return updated cart (populated) for client convenience
    const updated = await User.findById(user._id).populate('cart.product').exec();
    res.status(200).json(updated.cart || []);
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ message: 'Failed to update cart' });
  }
});

// DELETE /api/cart/:id - remove product from cart
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.cart = user.cart.filter(ci => ci.product.toString() !== req.params.id);
    await user.save();

    const updated = await User.findById(user._id).populate('cart.product').exec();
    res.json({ message: 'Item removed', cart: updated.cart || [] });
  } catch (err) {
    console.error('Remove from cart error:', err);
    res.status(500).json({ message: 'Failed to remove item' });
  }
});

export default router;
