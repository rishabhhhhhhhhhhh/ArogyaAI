// scripts/seedSampleData.js
require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const AIAssessment = require('../models/AIAssessment');
const HealthMetric = require('../models/HealthMetric');

async function seed() {
  await connectDB();

  try {
    console.log('🌱 Seeding sample data...');

    // --- ADMIN ---
    const adminEmail = 'admin@arogya.local';
    const adminPassword = 'Admin@123';
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        email: adminEmail,
        password: adminPassword,
        name: 'Arogya Admin',
        role: 'admin',
        isVerified: true,
      });
      console.log(`✅ Admin created: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log('ℹ️  Admin already exists.');
    }

    // --- DOCTORS ---
    const doctorsData = [
      {
        email: 'dr.sharma@arogya.local',
        password: 'Doctor@123',
        name: 'Dr. Anil Sharma',
        role: 'doctor',
      },
      {
        email: 'dr.rao@arogya.local',
        password: 'Doctor@123',
        name: 'Dr. Meera Rao',
        role: 'doctor',
      },
    ];

    for (const doc of doctorsData) {
      let user = await User.findOne({ email: doc.email });
      if (!user) {
        user = await User.create({
          email: doc.email,
          password: doc.password,
          name: doc.name,
          role: 'doctor',
          isVerified: true,
        });
        await Doctor.create({
          userId: user._id,
          firstName: doc.name.split(' ')[1] || doc.name,
          lastName: doc.name.split(' ')[2] || '',
          specialization: doc.email.includes('sharma') ? 'Dermatology' : 'Cardiology',
          registrationNumber: `REG-${Math.floor(Math.random() * 9000 + 1000)}`,
          verified: true,
        });
        console.log(`✅ Doctor created: ${doc.email} / ${doc.password}`);
      } else {
        console.log(`ℹ️  Doctor already exists: ${doc.email}`);
      }
    }

    // --- PATIENTS ---
    const patientsData = [
      {
        email: 'ravi.patel@arogya.local',
        password: 'Patient@123',
        name: 'Ravi Patel',
        role: 'patient',
        firstName: 'Ravi',
        lastName: 'Patel',
      },
      {
        email: 'neha.verma@arogya.local',
        password: 'Patient@123',
        name: 'Neha Verma',
        role: 'patient',
        firstName: 'Neha',
        lastName: 'Verma',
      },
    ];

    for (const p of patientsData) {
      let user = await User.findOne({ email: p.email });
      if (!user) {
        user = await User.create({
          email: p.email,
          password: p.password,
          name: p.name,
          role: 'patient',
          isVerified: true,
        });
        await Patient.create({
          userId: user._id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          gender: 'other',
          isProfileComplete: true,
        });
        console.log(`✅ Patient created: ${p.email} / ${p.password}`);
      } else {
        console.log(`ℹ️  Patient already exists: ${p.email}`);
      }
    }

    // --- SAMPLE DATA FOR PATIENTS ---
    const patients = await Patient.find();
    const doctors = await Doctor.find();

    if (patients.length > 0 && doctors.length > 0) {
      const samplePatient = patients[0];
      const sampleDoctor = doctors[0];

      // Create sample appointments
      const appointmentExists = await Appointment.findOne({ patient: samplePatient._id });
      if (!appointmentExists) {
        const today = new Date();
        const futureDate1 = new Date();
        futureDate1.setDate(futureDate1.getDate() + 3);
        const futureDate2 = new Date();
        futureDate2.setDate(futureDate2.getDate() + 7);

        // Create today's appointments for better demo
        const todayAppointments = [];
        for (let i = 0; i < 3; i++) {
          const appointmentTime = new Date();
          appointmentTime.setHours(9 + i * 2, 0, 0, 0); // 9 AM, 11 AM, 1 PM
          
          todayAppointments.push({
            patient: patients[i % patients.length]._id,
            doctor: sampleDoctor._id,
            scheduledAt: appointmentTime,
            status: 'scheduled',
            mode: 'video',
            reason: ['Regular checkup', 'Follow-up consultation', 'Symptom evaluation'][i]
          });
        }

        const appointments = await Appointment.create([
          ...todayAppointments,
          {
            patient: samplePatient._id,
            doctor: sampleDoctor._id,
            scheduledAt: futureDate1,
            status: 'scheduled',
            mode: 'video',
            reason: 'Regular checkup'
          },
          {
            patient: samplePatient._id,
            doctor: doctors[1] ? doctors[1]._id : sampleDoctor._id,
            scheduledAt: futureDate2,
            status: 'scheduled',
            mode: 'video',
            reason: 'Follow-up consultation'
          }
        ]);

        // Update patient with appointments
        await Patient.findByIdAndUpdate(samplePatient._id, {
          $push: { appointments: { $each: appointments.map(a => a._id) } }
        });

        console.log('✅ Sample appointments created');
      }

      // Create sample prescriptions
      const prescriptionExists = await Prescription.findOne({ patient: samplePatient._id });
      if (!prescriptionExists) {
        const prescriptions = await Prescription.create([
          {
            patient: samplePatient._id,
            doctor: sampleDoctor._id,
            medications: [
              {
                name: 'Amoxicillin 500mg',
                dosage: '500mg',
                frequency: 'Twice daily',
                duration: '7 days',
                notes: 'Take with food'
              }
            ],
            notes: 'Complete the full course'
          },
          {
            patient: samplePatient._id,
            doctor: doctors[1] ? doctors[1]._id : sampleDoctor._id,
            medications: [
              {
                name: 'Vitamin D3 1000 IU',
                dosage: '1000 IU',
                frequency: 'Once daily',
                duration: '30 days',
                notes: 'Take with breakfast'
              }
            ]
          }
        ]);

        // Update patient with prescriptions
        await Patient.findByIdAndUpdate(samplePatient._id, {
          $push: { prescriptions: { $each: prescriptions.map(p => p._id) } }
        });

        console.log('✅ Sample prescriptions created');
      }

      // Create sample AI assessments
      const aiAssessmentExists = await AIAssessment.findOne({ patient: samplePatient._id });
      if (!aiAssessmentExists) {
        const assessments = await AIAssessment.create([
          {
            patient: samplePatient._id,
            symptoms: ['cough', 'runny nose', 'mild fever'],
            condition: 'Common Cold',
            severity: 'Low',
            confidence: 87,
            recommendations: ['Rest', 'Stay hydrated', 'Monitor symptoms'],
            followUpRequired: false
          },
          {
            patient: samplePatient._id,
            symptoms: ['sneezing', 'watery eyes', 'nasal congestion'],
            condition: 'Seasonal Allergies',
            severity: 'Low',
            confidence: 92,
            recommendations: ['Avoid allergens', 'Consider antihistamines', 'Monitor pollen count'],
            followUpRequired: false
          }
        ]);

        // Update patient with AI assessments
        await Patient.findByIdAndUpdate(samplePatient._id, {
          $push: { aiAssessments: { $each: assessments.map(a => a._id) } }
        });

        console.log('✅ Sample AI assessments created');
      }

      // Create sample health metrics
      const healthMetricExists = await HealthMetric.findOne({ patient: samplePatient._id });
      if (!healthMetricExists) {
        const healthMetrics = [];
        
        // Create 6 months of health data
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          
          const baseScore = 85;
          const variation = Math.floor(Math.random() * 10) - 5;
          const healthScore = Math.max(70, Math.min(100, baseScore + variation));
          
          healthMetrics.push({
            patient: samplePatient._id,
            healthScore,
            metrics: {
              bloodPressure: { systolic: 120 + Math.floor(Math.random() * 20), diastolic: 80 + Math.floor(Math.random() * 10) },
              heartRate: 70 + Math.floor(Math.random() * 20),
              weight: 70 + Math.floor(Math.random() * 10),
              height: 170,
              bmi: 24.2,
              temperature: 98.6,
              oxygenSaturation: 98 + Math.floor(Math.random() * 2)
            },
            recordedBy: 'system',
            createdAt: date
          });
        }

        const createdMetrics = await HealthMetric.create(healthMetrics);

        // Update patient with health metrics and current health score
        await Patient.findByIdAndUpdate(samplePatient._id, {
          $push: { healthMetrics: { $each: createdMetrics.map(m => m._id) } },
          currentHealthScore: healthMetrics[healthMetrics.length - 1].healthScore
        });

        console.log('✅ Sample health metrics created');
      }
    }

    console.log('🌱 Seeding complete.');
  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
