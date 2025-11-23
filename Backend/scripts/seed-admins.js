// scripts/seed-admins.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const admins = [
  {
    email: 'rishabh@gmail.com',
    password: '123456',
    name: 'Rishabh',
    role: 'admin'
  },
  {
    email: 'karan@gmail.com',
    password: '123456',
    name: 'Karan',
    role: 'admin'
  }
];

async function seedAdmins() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not found in environment variables');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const adminData of admins) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: adminData.email });
      if (existingUser) {
        console.log(`⚠️  User ${adminData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // Create Admin User
      const user = await User.create({
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        role: adminData.role,
        isVerified: true
      });

      console.log(`✅ Created admin user: ${user.name} (${user.email})`);
    }

    console.log('\n🎉 Successfully seeded all admin users!');
    console.log('\n📋 Login credentials:');
    console.log('Password: 123456');
    console.log('\nAdmins created:');
    admins.forEach(admin => {
      console.log(`- ${admin.name} - ${admin.email}`);
    });

  } catch (error) {
    console.error('❌ Error seeding admins:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed function
seedAdmins();
