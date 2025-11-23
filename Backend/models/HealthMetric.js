// models/HealthMetric.js
const mongoose = require('mongoose');

const HealthMetricSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  healthScore: { type: Number, min: 0, max: 100, required: true },
  metrics: {
    bloodPressure: { systolic: Number, diastolic: Number },
    heartRate: Number,
    weight: Number,
    height: Number,
    bmi: Number,
    temperature: Number,
    oxygenSaturation: Number,
  },
  notes: String,
  recordedBy: { type: String, enum: ['patient', 'doctor', 'system'], default: 'patient' },
}, { timestamps: true });

// Index for efficient querying by patient and date
HealthMetricSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('HealthMetric', HealthMetricSchema);