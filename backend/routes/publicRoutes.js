const express = require('express');
const router = express.Router();
const { getRestaurantData, createOrder, getOrderStatus, getAllActiveRestaurants } = require('../controllers/publicController');

router.get('/restaurants', getAllActiveRestaurants);
router.get('/restaurant/:slug', getRestaurantData);
router.post('/order', createOrder);
router.get('/order/:id', getOrderStatus);

module.exports = router;
