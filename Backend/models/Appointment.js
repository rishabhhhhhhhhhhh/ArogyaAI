// models/Appointment.js
const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['scheduled','in_progress','completed','cancelled','no_show'], default: 'scheduled' },
  mode: { type: String, enum: ['video','audio','in_person'], default: 'in_person' },
  reason: String,
  notes: String,
  aiAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAssessment' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
