const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

// @desc    Get restaurant data by slug
// @route   GET /api/public/restaurant/:slug
const getRestaurantData = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, status: 'active' }).select('-password -isFirstLogin');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found or is currently suspended' });
    }

    const categories = await Category.find({ restaurant: restaurant._id });
    const menuItems = await MenuItem.find({ restaurant: restaurant._id, isOutOfStock: false });

    res.json({
      restaurant,
      categories,
      menuItems
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new order (with mock OTP verification logic built-in to the frontend request)
// @route   POST /api/public/order
const createOrder = async (req, res) => {
  const { restaurantId, customerPhone, customerName, customerAddress, deliveryLocation, items, totalAmount, otp } = req.body;


  try {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.operatingHours.isOpen) {
      return res.status(400).json({ message: 'Restaurant is currently not accepting orders' });
    }

    const order = await Order.create({
      restaurant: restaurantId,
      customerPhone,
      customerName,
      customerAddress,
      deliveryLocation,
      items,
      totalAmount,
      status: 'New',
      paymentMethod: 'Cash on Delivery'
    });

    // Update or create Customer CRM record
    await Customer.findOneAndUpdate(
      { phone: customerPhone },
      { name: customerName, address: customerAddress },
      { upsert: true, new: true }
    );

    // Notify the restaurant via Socket.io
    req.app.get('io').to(restaurantId).emit('newOrder', order);

    // Send Web Push to Restaurant Dashboard
    const webpush = require('web-push');
    if (restaurant.pushSubscriptions && restaurant.pushSubscriptions.length > 0) {
      const payload = JSON.stringify({
        title: 'New Order Received!',
        body: `Order for Rs. ${totalAmount} from ${customerName}`,
        url: '/restaurant/dashboard'
      });
      restaurant.pushSubscriptions.forEach(sub => {
        webpush.sendNotification(sub, payload).catch(err => console.error('Push error', err));
      });
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order status
// @route   GET /api/public/order/:id
const getOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all active restaurants for the homepage
// @route   GET /api/public/restaurants
const getAllActiveRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ status: 'active' }).select('name slug profilePicture bannerImage phone');
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRestaurantData, createOrder, getOrderStatus, getAllActiveRestaurants };
