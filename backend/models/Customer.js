const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String }, // latest known name
  address: { type: String }, // latest known address
  totalSpend: { type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
  // Could track favorite items or favorite restaurants later
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
