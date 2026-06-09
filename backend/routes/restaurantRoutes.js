const express = require('express');
const router = express.Router();
const { 
  loginRestaurant, changePassword, getProfile, updateProfile,
  getCategories, createCategory, deleteCategory,
  getMenu, createMenuItem, updateMenuItem, deleteMenuItem,
  getOrders, updateOrderStatus, getCustomers
} = require('../controllers/restaurantController');
const { protectRestaurant } = require('../middleware/authMiddleware');

router.post('/login', loginRestaurant);

router.put('/change-password', protectRestaurant, changePassword);

router.route('/profile')
  .get(protectRestaurant, getProfile)
  .put(protectRestaurant, updateProfile);

router.route('/categories')
  .get(protectRestaurant, getCategories)
  .post(protectRestaurant, createCategory);
router.delete('/categories/:id', protectRestaurant, deleteCategory);

router.route('/menu')
  .get(protectRestaurant, getMenu)
  .post(protectRestaurant, createMenuItem);
router.route('/menu/:id')
  .put(protectRestaurant, updateMenuItem)
  .delete(protectRestaurant, deleteMenuItem);

router.route('/orders')
  .get(protectRestaurant, getOrders);
router.put('/orders/:id/status', protectRestaurant, updateOrderStatus);

router.get('/customers', protectRestaurant, getCustomers);

module.exports = router;
