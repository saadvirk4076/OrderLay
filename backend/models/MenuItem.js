const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  photos: [{ type: String }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  isOutOfStock: { type: Boolean, default: false },
  discount: {
    type: { type: String, enum: ['percentage', 'flat', 'none'], default: 'none' },
    value: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
