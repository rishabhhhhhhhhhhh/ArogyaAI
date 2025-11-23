// models/Prescription.js
const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  medications: [{ name: String, dosage: String, frequency: String, duration: String, notes: String }],
  notes: String,
  issuedAt: { type: Date, default: Date.now },
  files: [{ url: String, type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Prescription', PrescriptionSchema);
