const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// Subscribe a restaurant dashboard to notifications
router.post('/subscribe-restaurant', async (req, res) => {
  try {
    const { restaurantId, subscription } = req.body;
    if (!restaurantId || !subscription) return res.status(400).json({ message: 'Missing fields' });

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    // Ensure we don't store exact duplicates
    const isDuplicate = restaurant.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!isDuplicate) {
      restaurant.pushSubscriptions.push(subscription);
      await restaurant.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Subscribe a customer to an order's updates
router.post('/subscribe-order/:orderId', async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ message: 'Missing subscription' });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.pushSubscription = subscription;
    await order.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
