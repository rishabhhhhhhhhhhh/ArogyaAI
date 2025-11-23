// models/AIAssessment.js
const mongoose = require('mongoose');

const AIAssessmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  symptoms: [String],
  condition: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  confidence: { type: Number, min: 0, max: 100, required: true },
  recommendations: [String],
  followUpRequired: { type: Boolean, default: false },
  assessmentData: { type: mongoose.Schema.Types.Mixed }, // Store raw assessment data
  imageData: { type: String }, // Store base64 image data if provided
  summary: { type: String }, // AI-generated summary for doctor referral
  estimatedRecovery: { type: String }, // Estimated recovery time
}, { timestamps: true });

module.exports = mongoose.model('AIAssessment', AIAssessmentSchema);