const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Restaurant = require('../models/Restaurant');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/foodflow')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

const fixPasswords = async () => {
  try {
    const restaurants = await Restaurant.find({ plainPassword: { $exists: false } });
    console.log(`Found ${restaurants.length} restaurants missing plainPassword`);

    for (let r of restaurants) {
      // Just set it to an arbitrary indicator or reset it entirely.
      // Since we don't know the hash, we can't reverse it. 
      // We will generate a new random password and hash it.
      const newPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      r.password = await bcrypt.hash(newPassword, salt);
      r.plainPassword = newPassword;
      r.isFirstLogin = true; // Force them to change it again since we reset it
      await r.save();
      console.log(`Reset password for ${r.name} to ${newPassword}`);
    }

    console.log('Done fixing passwords');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

fixPasswords();
