// models/Patient.js
const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  line1: String, line2: String, city: String, state: String, country: String, postalCode: String
}, { _id: false });

const EmergencyContactSchema = new mongoose.Schema({
  name: String, relation: String, phone: String
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  type: String,
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const ImageSchema = new mongoose.Schema({
  label: String,
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const PatientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  firstName: { type: String, required: true },
  lastName: String,
  dob: Date,
  gender: { type: String, enum: ['male','female','other','prefer_not_say'] },
  phone: String,
  email: String,
  address: AddressSchema,
  emergencyContact: EmergencyContactSchema,
  medicalHistory: {
    conditions: { type: [String], default: [] },
    surgeries: { type: [String], default: [] },
    familyHistory: { type: [String], default: [] },
    smokingStatus: String,
    alcoholUse: String
  },
  allergies: { type: [{ name: String, reaction: String }], default: [] },
  medications: { type: [{ name: String, dosage: String, frequency: String }], default: [] },
  vitals: {
    heightCm: Number, weightKg: Number, bp: String, pulse: Number, temperatureC: Number, lastUpdated: Date
  },
  documents: { type: [DocumentSchema], default: [] },
  images: { type: [ImageSchema], default: [] },
  appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
  prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }],
  aiAssessments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AIAssessment' }],
  healthMetrics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HealthMetric' }],
  currentHealthScore: { type: Number, min: 0, max: 100, default: 85 },
  preferredLanguage: String,
  timezone: String,
  isProfileComplete: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);
