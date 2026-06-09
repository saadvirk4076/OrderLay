const express = require('express');
const router = express.Router();
const { loginAdmin, getStats, createRestaurant, getRestaurants, toggleRestaurantStatus, editRestaurant, deleteRestaurant } = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/login', loginAdmin);

// Protected routes
router.route('/stats').get(protectAdmin, getStats);
router.route('/restaurants').get(protectAdmin, getRestaurants).post(protectAdmin, createRestaurant);
router.route('/restaurants/:id').put(protectAdmin, editRestaurant).delete(protectAdmin, deleteRestaurant);
router.route('/restaurants/:id/status').put(protectAdmin, toggleRestaurantStatus);

module.exports = router;
