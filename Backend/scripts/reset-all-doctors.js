// scripts/reset-all-doctors.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const doctorEmails = [
  'dr.sharma@arogyaai.com',
  'dr.patel@arogyaai.com',
  'dr.kumar@arogyaai.com',
  'dr.reddy@arogyaai.com',
  'dr.singh@arogyaai.com',
  'dr.menon@arogyaai.com'
];

async function resetAllDoctorPasswords() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not found in environment variables');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const newPassword = 'Doctor@123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log('🔐 Resetting passwords for all doctors...\n');

    for (const email of doctorEmails) {
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log(`⚠️  User not found: ${email}`);
        continue;
      }

      // Update password directly
      await User.updateOne(
        { email },
        { $set: { password: hashedPassword } }
      );

      console.log(`✅ Password reset for: ${email}`);
    }

    console.log('\n🎉 All doctor passwords have been reset!');
    console.log('\n📋 Login credentials for all doctors:');
    console.log('- Password: Doctor@123');
    console.log('\nDoctor emails:');
    doctorEmails.forEach(email => console.log(`- ${email}`));

    // Verify one password
    console.log('\n🔐 Verifying password for dr.kumar@arogyaai.com...');
    const testUser = await User.findOne({ email: 'dr.kumar@arogyaai.com' });
    if (testUser) {
      const isMatch = await bcrypt.compare(newPassword, testUser.password);
      console.log('- Password verification:', isMatch ? '✅ SUCCESS' : '❌ FAILED');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

resetAllDoctorPasswords();
