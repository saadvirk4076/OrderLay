const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // For the permanent URL
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String }, // For superadmin visibility as requested
  isFirstLogin: { type: Boolean, default: true },
  
  // Profile
  phone: { type: String },
  address: { type: String },
  profilePicture: { type: String }, // URL or path
  bannerImage: { type: String }, // URL or path
  
  // Status
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  
  // Operating Hours
  operatingHours: {
    openTime: { type: String, default: '09:00' }, // HH:mm format
    closeTime: { type: String, default: '22:00' }, // HH:mm format
    isOpen: { type: Boolean, default: true }, // Manual override
  },
  
  // Web Push Subscriptions for Dashboard
  pushSubscriptions: [{ type: Object }]
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
