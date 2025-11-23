// scripts/seed-doctors.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Doctor = require('../models/Doctor');

const doctors = [
  {
    email: 'dr.sharma@arogyaai.com',
    password: 'Doctor@123',
    name: 'Dr. Rajesh Sharma',
    role: 'doctor',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    specialization: 'Cardiology',
    experience: 15,
    consultationFee: 800,
    bio: 'Senior Cardiologist with 15+ years of experience in treating heart conditions. Specialized in preventive cardiology and cardiac rehabilitation.',
    qualifications: ['MBBS', 'MD (Cardiology)', 'DM (Cardiology)'],
    languages: ['English', 'Hindi', 'Punjabi'],
    availability: 'Available'
  },
  {
    email: 'dr.patel@arogyaai.com',
    password: 'Doctor@123',
    name: 'Dr. Priya Patel',
    role: 'doctor',
    firstName: 'Priya',
    lastName: 'Patel',
    specialization: 'Dermatology',
    experience: 10,
    consultationFee: 600,
    bio: 'Expert Dermatologist specializing in skin care, acne treatment, and cosmetic dermatology. Passionate about helping patients achieve healthy skin.',
    qualifications: ['MBBS', 'MD (Dermatology)', 'Fellowship in Cosmetic Dermatology'],
    languages: ['English', 'Hindi', 'Gujarati'],
    availability: 'Available'
  },
  {
    email: 'dr.kumar@arogyaai.com',
    password: 'Doctor@123',
    name: 'Dr. Naman Kumar',
    role: 'doctor',
    firstName: 'Naman',
    lastName: 'Kumar',
    specialization: 'General Medicine',
    experience: 8,
    consultationFee: 500,
    bio: 'General Physician with expertise in treating common ailments, preventive healthcare, and chronic disease management. Committed to holistic patient care.',
    qualifications: ['MBBS', 'MD (General Medicine)'],
    languages: ['English', 'Hindi', 'Bengali'],
    availability: 'Available'
  },
  {
    email: 'dr.reddy@arogyaai.com',
    password: 'Doctor@123',
    name: 'Dr. Ananya Reddy',
    role: 'doctor',
    firstName: 'Ananya',
    lastName: 'Reddy',
    specialization: 'Pediatrics',
    experience: 12,
    consultationFee: 700,
    bio: 'Experienced Pediatrician dedicated to child healthcare. Specializes in newborn care, vaccinations, and developmental pediatrics.',
    qualifications: ['MBBS', 'MD (Pediatrics)', 'Fellowship in Neonatology'],
    languages: ['English', 'Hindi', 'Telugu', 'Tamil'],
    availability: 'Available'
  },
  {
    email: 'dr.singh@arogyaai.com',
    password: 'Doctor@123',
    name: 'Dr. Vikram Singh',
    role: 'doctor',
    firstName: 'Vikram',
    lastName: 'Singh',
    specialization: 'Orthopedics',
    experience: 18,
    consultationFee: 900,
    bio: 'Senior Orthopedic Surgeon with extensive experience in joint replacement, sports injuries, and trauma care. Known for minimally invasive surgical techniques.',
    qualifications: ['MBBS', 'MS (Orthopedics)', 'Fellowship in Joint Replacement'],
    languages: ['English', 'Hindi', 'Marathi'],
    availability: 'Available'
  },
  {
    email: 'dr.menon@arogyaai.com',
    password: 'Doctor@123',
    name: 'Dr. Lakshmi Menon',
    role: 'doctor',
    firstName: 'Lakshmi',
    lastName: 'Menon',
    specialization: 'Psychiatry',
    experience: 9,
    consultationFee: 750,
    bio: 'Compassionate Psychiatrist specializing in anxiety, depression, and stress management. Believes in a holistic approach to mental health.',
    qualifications: ['MBBS', 'MD (Psychiatry)', 'Diploma in Clinical Psychology'],
    languages: ['English', 'Hindi', 'Malayalam', 'Tamil'],
    availability: 'Available'
  }
];

async function seedDoctors() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not found in environment variables');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing doctors (optional - comment out if you want to keep existing data)
    // await User.deleteMany({ role: 'doctor' });
    // await Doctor.deleteMany({});
    // console.log('🗑️  Cleared existing doctors');

    for (const doctorData of doctors) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: doctorData.email });
      if (existingUser) {
        console.log(`⚠️  User ${doctorData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(doctorData.password, 10);

      // Create User
      const user = await User.create({
        email: doctorData.email,
        password: hashedPassword,
        name: doctorData.name,
        role: doctorData.role,
        isVerified: true
      });

      console.log(`✅ Created user: ${user.email}`);

      // Create Doctor profile
      const doctor = await Doctor.create({
        userId: user._id,
        firstName: doctorData.firstName,
        lastName: doctorData.lastName,
        specialization: doctorData.specialization,
        experience: doctorData.experience,
        consultationFee: doctorData.consultationFee,
        bio: doctorData.bio,
        qualifications: doctorData.qualifications,
        languages: doctorData.languages,
        availability: doctorData.availability,
        rating: 4.5 + Math.random() * 0.5, // Random rating between 4.5 and 5.0
        isVerified: true,
        isActive: true,
        profileImage: `https://ui-avatars.com/api/?name=${doctorData.firstName}+${doctorData.lastName}&background=0E7A7A&color=fff&size=200`
      });

      console.log(`✅ Created doctor profile: Dr. ${doctor.firstName} ${doctor.lastName} (${doctor.specialization})`);
    }

    console.log('\n🎉 Successfully seeded all doctors!');
    console.log('\n📋 Login credentials for all doctors:');
    console.log('Password: Doctor@123');
    console.log('\nDoctors created:');
    doctors.forEach(doc => {
      console.log(`- ${doc.name} (${doc.specialization}) - ${doc.email}`);
    });

  } catch (error) {
    console.error('❌ Error seeding doctors:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed function
seedDoctors();
