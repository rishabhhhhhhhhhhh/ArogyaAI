// models/Doctor.js
const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  firstName: String,
  lastName: String,
  qualifications: [String],
  specialization: String,
  registrationNumber: String,
  clinic: {
    name: String, address: String, phone: String
  },
  profileImage: String,
  verified: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false }, // Alias for verified
  isActive: { type: Boolean, default: true },
  experience: { type: Number, default: 5 }, // Years of experience
  rating: { type: Number, default: 4.8, min: 0, max: 5 }, // Average rating
  consultationFee: { type: Number, default: 50 }, // Fee in USD
  availability: { type: String, default: 'Available' }, // Current availability status
  bio: { type: String, default: 'Experienced healthcare professional dedicated to providing quality care.' },
  availableSlots: [{ date: Date, slots: [String] }], // simple representation
  
  // Verification documents and information
  verificationDocuments: {
    medicalLicense: { type: String }, // URL or file path
    degreeCertificate: { type: String },
    idProof: { type: String },
    additionalCertifications: [String]
  },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'submitted', 'under_review', 'verified', 'rejected'], 
    default: 'pending' 
  },
  verificationSubmittedAt: { type: Date },
  verificationCompletedAt: { type: Date },
  rejectionReason: { type: String },
  
  // Additional professional information
  phoneNumber: { type: String },
  address: { type: String },
  languages: [String],
  education: [{ 
    degree: String, 
    institution: String, 
    year: Number 
  }],
}, { timestamps: true });

module.exports = mongoose.model('Doctor', DoctorSchema);
