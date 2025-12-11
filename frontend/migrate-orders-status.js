// scripts/migrate-orders-status.js
import dotenv from 'dotenv';
import connectDB from '../config/db.js'; // adapt path
import Order from '../models/Order.js';

dotenv.config();
await connectDB();

async function migrate() {
  const orders = await Order.find({});
  console.log('Found', orders.length, 'orders');
  for (const o of orders) {
    let changed = false;
    if (!o.status) {
      o.status = 'Pending';
      changed = true;
    }
    if (!o.history || o.history.length === 0) {
      o.history = [{ status: o.status, note: 'Migration: initial status set', timestamp: new Date() }];
      changed = true;
    }
    if (changed) {
      await o.save();
      console.log('Updated order', o._id.toString());
    }
  }
  console.log('Migration complete');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
