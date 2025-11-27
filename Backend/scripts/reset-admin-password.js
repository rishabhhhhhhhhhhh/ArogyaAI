// Script to reset admin password
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'rishabh@gmail.com';
    const newPassword = '123456';

    // Find the admin user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User ${email} not found`);
      process.exit(1);
    }

    // Set the password (it will be auto-hashed by the pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password reset successfully for ${email}`);
    console.log(`New password: ${newPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}

resetAdminPassword();
