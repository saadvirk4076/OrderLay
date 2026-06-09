const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// @desc    Restaurant login
// @route   POST /api/restaurant/login
const loginRestaurant = async (req, res) => {
  const { email, password } = req.body;
  try {
    const restaurant = await Restaurant.findOne({ email });
    if (restaurant && (await bcrypt.compare(password, restaurant.password))) {
      if (restaurant.status !== 'active') {
        return res.status(403).json({ message: 'Account is suspended. Please contact admin.' });
      }
      res.json({
        _id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        token: generateToken(restaurant._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password (first login)
// @route   PUT /api/restaurant/change-password
const changePassword = async (req, res) => {
  const { newPassword } = req.body;
  try {
    const restaurant = await Restaurant.findById(req.restaurant._id);
    if (restaurant) {
      const salt = await bcrypt.genSalt(10);
      restaurant.password = await bcrypt.hash(newPassword, salt);
      restaurant.plainPassword = newPassword; // Save for superadmin
      restaurant.isFirstLogin = false;
      await restaurant.save();
      res.json({ message: 'Password updated successfully', isFirstLogin: false });
    } else {
      res.status(404).json({ message: 'Restaurant not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get profile
// @route   GET /api/restaurant/profile
const getProfile = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurant._id).select('-password');
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update profile
// @route   PUT /api/restaurant/profile
const updateProfile = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurant._id);
    if (restaurant) {
      restaurant.name = req.body.name || restaurant.name;
      restaurant.phone = req.body.phone || restaurant.phone;
      restaurant.address = req.body.address || restaurant.address;
      restaurant.profilePicture = req.body.profilePicture || restaurant.profilePicture;
      restaurant.bannerImage = req.body.bannerImage || restaurant.bannerImage;
      
      if (req.body.operatingHours) {
        restaurant.operatingHours = req.body.operatingHours;
      }

      const updatedRestaurant = await restaurant.save();
      res.json(updatedRestaurant);
    } else {
      res.status(404).json({ message: 'Restaurant not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Categories
// @route   GET /api/restaurant/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ restaurant: req.restaurant._id });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Category
// @route   POST /api/restaurant/categories
const createCategory = async (req, res) => {
  try {
    const category = await Category.create({
      name: req.body.name,
      restaurant: req.restaurant._id
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Category
// @route   DELETE /api/restaurant/categories/:id
const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    await MenuItem.deleteMany({ category: req.params.id });
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Menu Items
// @route   GET /api/restaurant/menu
const getMenu = async (req, res) => {
  try {
    const menu = await MenuItem.find({ restaurant: req.restaurant._id }).populate('category', 'name');
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Menu Item
// @route   POST /api/restaurant/menu
const createMenuItem = async (req, res) => {
  const { name, description, price, photos, category, isOutOfStock, discount } = req.body;
  try {
    const item = await MenuItem.create({
      name, description, price, photos, category,
      restaurant: req.restaurant._id,
      isOutOfStock, discount
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Menu Item
// @route   PUT /api/restaurant/menu/:id
const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Menu Item
// @route   DELETE /api/restaurant/menu/:id
const deleteMenuItem = async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Live Orders
// @route   GET /api/restaurant/orders
const getOrders = async (req, res) => {
  try {
    // Only fetch active orders for the live queue
    const orders = await Order.find({ 
      restaurant: req.restaurant._id,
      status: { $in: ['New', 'Processing', 'Out for Delivery'] }
    }).sort({ createdAt: 1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Order Status
// @route   PUT /api/restaurant/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    order.status = status;
    await order.save();
    
    // Emit socket event for customer to track
    req.app.get('io').to(order._id.toString()).emit('orderStatusUpdated', order);

    // Send Web Push to Customer
    const webpush = require('web-push');
    if (order.pushSubscription) {
      const payload = JSON.stringify({
        title: 'Order Status Update',
        body: `Your order is now: ${status}`,
        url: req.restaurant ? `/r/${req.restaurant.slug}` : '/'
      });
      webpush.sendNotification(order.pushSubscription, payload).catch(err => console.error('Push error', err));
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Customers (CRM)
// @route   GET /api/restaurant/customers
const getCustomers = async (req, res) => {
  try {
    // Advanced CRM logic would be here, but for MVP we fetch all customers who ordered from this restaurant.
    // Instead of complex aggregation, let's just find unique customers from completed orders.
    const completedOrders = await Order.find({ restaurant: req.restaurant._id, status: 'Completed' });
    
    // Aggregate by phone
    const customersMap = {};
    completedOrders.forEach(order => {
      if(!customersMap[order.customerPhone]) {
        customersMap[order.customerPhone] = {
          phone: order.customerPhone,
          name: order.customerName,
          totalSpend: 0,
          orderCount: 0
        };
      }
      customersMap[order.customerPhone].totalSpend += order.totalAmount;
      customersMap[order.customerPhone].orderCount += 1;
    });

    res.json(Object.values(customersMap));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  loginRestaurant, changePassword, getProfile, updateProfile,
  getCategories, createCategory, deleteCategory,
  getMenu, createMenuItem, updateMenuItem, deleteMenuItem,
  getOrders, updateOrderStatus, getCustomers
};
