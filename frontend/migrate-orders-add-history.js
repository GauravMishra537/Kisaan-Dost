// scripts/migrate-orders-add-history.js
import dotenv from 'dotenv';
import connectDB from '../config/db.js'; // adapt if your connect function is in a different file
import Order from '../models/Order.js';

dotenv.config();

async function migrate() {
  await connectDB();
  console.log('Connected to DB');

  const orders = await Order.find({});
  console.log(`Found ${orders.length} orders`);

  for (const o of orders) {
    let changed = false;

    // If status isn't set, set to Pending
    if (!o.status) {
      o.status = 'Pending';
      changed = true;
    }

    // If history is missing or empty, add an initial entry
    if (!o.history || o.history.length === 0) {
      o.history = [{
        status: o.status || 'Pending',
        note: 'Initial status set by migration',
        timestamp: new Date(),
        updatedBy: null
      }];
      changed = true;
    }

    // If estimatedDelivery is null but deliveredAt exists, set it to deliveredAt as a hint
    if (!o.estimatedDelivery && o.deliveredAt) {
      o.estimatedDelivery = o.deliveredAt;
      changed = true;
    }

    if (changed) {
      await o.save();
      console.log(`Updated order ${o._id}`);
    }
  }

  console.log('Migration finished');
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
