const Admin = require('../models/Admin');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (admin && (await bcrypt.compare(password, admin.password))) {
      res.json({
        _id: admin._id,
        username: admin.username,
        token: generateToken(admin._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    const totalRestaurants = await Restaurant.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ status: 'active' });
    const totalOrders = await Order.countDocuments();
    
    const orders = await Order.find({ status: 'Completed' });
    const overallRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);

    res.json({
      totalRestaurants,
      activeRestaurants,
      totalOrders,
      overallRevenue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new restaurant
// @route   POST /api/admin/restaurants
// @access  Private/Admin
const createRestaurant = async (req, res) => {
  const { name, email, phone, address } = req.body;

  try {
    const restaurantExists = await Restaurant.findOne({ email });
    if (restaurantExists) {
      return res.status(400).json({ message: 'Restaurant already exists with this email' });
    }

    // Generate slug from name
    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let count = 1;
    while (await Restaurant.findOne({ slug })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    // Generate default password
    const defaultPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    const restaurant = await Restaurant.create({
      name,
      slug,
      email,
      password: hashedPassword,
      plainPassword: defaultPassword,
      phone,
      address,
      isFirstLogin: true,
      status: 'active'
    });

    if (restaurant) {
      res.status(201).json({
        _id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        email: restaurant.email,
        defaultPassword: defaultPassword, // Send it back once so admin can give to restaurant
        message: 'Restaurant created successfully. Please save the default password.'
      });
    } else {
      res.status(400).json({ message: 'Invalid restaurant data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Edit restaurant details
// @route   PUT /api/admin/restaurants/:id
// @access  Private/Admin
const editRestaurant = async (req, res) => {
  const { name, email, phone, address, newPassword } = req.body;
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    if (email && email !== restaurant.email) {
      const emailExists = await Restaurant.findOne({ email });
      if (emailExists) return res.status(400).json({ message: 'Email already in use' });
    }

    restaurant.name = name || restaurant.name;
    restaurant.email = email || restaurant.email;
    restaurant.phone = phone || restaurant.phone;
    restaurant.address = address || restaurant.address;

    if (newPassword) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      restaurant.password = await bcrypt.hash(newPassword, salt);
      restaurant.plainPassword = newPassword;
    }

    await restaurant.save();

    res.json({ message: 'Restaurant updated successfully', restaurant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all restaurants
// @route   GET /api/admin/restaurants
// @access  Private/Admin
const getRestaurants = async (req, res) => {
  try {
    // Send back plainPassword as well since superadmin needs to see it
    const restaurants = await Restaurant.find().select('-password');
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle restaurant status
// @route   PUT /api/admin/restaurants/:id/status
// @access  Private/Admin
const toggleRestaurantStatus = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    restaurant.status = restaurant.status === 'active' ? 'suspended' : 'active';
    await restaurant.save();

    res.json({ message: `Restaurant status updated to ${restaurant.status}`, restaurant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete restaurant completely
// @route   DELETE /api/admin/restaurants/:id
// @access  Private/Admin
const deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Must delete related records to prevent orphans
    const Category = require('../models/Category');
    const MenuItem = require('../models/MenuItem');
    const Order = require('../models/Order');

    await Category.deleteMany({ restaurant: req.params.id });
    await MenuItem.deleteMany({ restaurant: req.params.id });
    await Order.deleteMany({ restaurant: req.params.id });
    await Restaurant.findByIdAndDelete(req.params.id);

    res.json({ message: 'Restaurant and all related data removed completely' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  loginAdmin,
  getStats,
  createRestaurant,
  editRestaurant,
  getRestaurants,
  toggleRestaurantStatus,
  deleteRestaurant
};
