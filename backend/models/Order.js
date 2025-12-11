// models/Order.js
import mongoose from 'mongoose';

/**
 * Order model - backwards compatible:
 * - Keeps existing fields used by the app (user, orderItems, shippingAddress, payment fields, isPaid, isDelivered, totals)
 * - Adds new fields (status, trackingNumber, estimatedDelivery, history) with defaults so older documents are still valid
 *
 * Notes:
 * - orderItems may include optional seller field to enable farmer-scoped updates later.
 * - history is an array of small entries for audit / tracking UI.
 */

const orderItemSchema = new mongoose.Schema({
  name: { type: String },
  qty: { type: Number, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  // optional: record the seller/farmer for future farm-scoped updates (nullable)
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: false });

const historyEntrySchema = new mongoose.Schema({
  status: { type: String, required: true }, // e.g. Pending, Packed, Shipped, Out for Delivery, Delivered, Cancelled, Returned
  note: { type: String, default: '' },
  location: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  orderItems: { type: [orderItemSchema], required: true },

  shippingAddress: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    pincode: { type: String, default: '' },
    phone: { type: String, default: '' },
  },

  paymentMethod: { type: String, default: '' },
  paymentResult: { type: Object, default: {} },

  // common totals
  itemsPrice: { type: Number, default: 0 },
  shippingPrice: { type: Number, default: 0 },
  taxPrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },

  // payment/delivery flags
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },

  isDelivered: { type: Boolean, default: false },
  deliveredAt: { type: Date },

  // ---- New tracking fields (safe defaults) ----
  status: { type: String, default: 'Pending' }, // Pending | Packed | Shipped | Out for Delivery | Delivered | Cancelled | Returned
  trackingNumber: { type: String, default: '' },
  estimatedDelivery: { type: Date, default: null },
  history: { type: [historyEntrySchema], default: [] },

}, { timestamps: true });

// Export model
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
