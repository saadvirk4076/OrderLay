const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true }, // Snapshots in case menu changes
  price: { type: Number, required: true }, // Snapshots
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  
  // Customer Info
  customerPhone: { type: String, required: true },
  customerName: { type: String, required: true },
  customerAddress: { type: String, required: true },
  deliveryLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  items: [orderItemSchema],
  
  status: { 
    type: String, 
    enum: ['New', 'Processing', 'Out for Delivery', 'Completed', 'Canceled'],
    default: 'New'
  },
  
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash on Delivery'], default: 'Cash on Delivery' },
  pushSubscription: { type: Object },
  
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
