// routes/admin.js
import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import ensureAdmin from '../middleware/ensureAdmin.js';
import { protect } from '../middleware/authMiddleware.js'; // adapt path/name if needed

const router = express.Router();

/**
 * GET /api/admin/users
 * List all users (paginated optional)
 * Query: ?page=1&limit=50&role=Farmer|Buyer|Admin
 */
router.get('/users', protect, ensureAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const role = req.query.role; // optional filter
    const query = {};
    if (role) {
      // you may use userType or role
      query.userType = role;
    }
    const skip = (page - 1) * limit;
    const users = await User.find(query).select('-password').skip(skip).limit(limit).lean();
    const total = await User.countDocuments(query);
    res.json({ users, meta: { page, limit, total } });
  } catch (err) {
    console.error('GET /api/admin/users error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/admin/users/:id/block
 * Block a user (set blocked flag). We'll use `isBlocked` field on user model.
 */
router.put('/users/:id/block', protect, ensureAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isBlocked = true;
    await user.save();
    res.json({ message: 'User blocked', user: { _id: user._id, email: user.email, isBlocked: user.isBlocked } });
  } catch (err) {
    console.error('Block user error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/admin/users/:id/unblock
 */
router.put('/users/:id/unblock', protect, ensureAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isBlocked = false;
    await user.save();
    res.json({ message: 'User unblocked', user: { _id: user._id, email: user.email, isBlocked: user.isBlocked } });
  } catch (err) {
    console.error('Unblock user error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/admin/users/:id/promote
 * Promote user to admin
 * Body: { makeAdmin: true/false }
 */
router.put('/users/:id/promote', protect, ensureAdmin, async (req, res) => {
  try {
    const makeAdmin = req.body.makeAdmin === true || req.body.makeAdmin === 'true';
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isAdmin = !!makeAdmin;
    // optionally set role/userType
    if (makeAdmin) user.userType = 'Admin';
    await user.save();
    res.json({ message: `User ${makeAdmin ? 'promoted to admin' : 'demoted'}`, user: { _id: user._id, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) {
    console.error('Promote user error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/farmers
 * List only farmers
 */
router.get('/farmers', protect, ensureAdmin, async (req, res) => {
  try {
    const farmers = await User.find({ userType: 'Farmer' }).select('-password').lean();
    res.json(farmers);
  } catch (err) {
    console.error('GET /api/admin/farmers error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/orders
 * List orders with optional filters: ?status=Shipped&page=1&limit=50
 */
router.get('/orders', protect, ensureAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 1000);
    const status = req.query.status;
    const query = {};
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const orders = await Order.find(query).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await Order.countDocuments(query);
    res.json({ orders, meta: { page, limit, total } });
  } catch (err) {
    console.error('GET /api/admin/orders error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/orders/:id
 * View single order
 */
router.get('/orders/:id', protect, ensureAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email').lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('GET /api/admin/orders/:id error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/admin/orders/:id/status
 * Admin updates order status + optional trackingNumber/note/location/eta
 * body: { status, trackingNumber, note, location, estimatedDelivery }
 */
router.put('/orders/:id/status', protect, ensureAdmin, async (req, res) => {
  try {
    const { status, trackingNumber, note, location, estimatedDelivery } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (status) order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);

    // push history entry
    order.history.push({
      status: status || order.status,
      note: note || '',
      location: location || '',
      updatedBy: req.user._id
    });

    if (status === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    } else {
      order.isDelivered = false;
    }

    await order.save();
    res.json({ message: 'Order status updated', order });
  } catch (err) {
    console.error('PUT /api/admin/orders/:id/status error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Permanently remove a user (use with caution)
 */
router.delete('/users/:id', protect, ensureAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.remove();
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/users/:id error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
