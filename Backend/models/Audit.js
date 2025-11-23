// models/Audit.js
const mongoose = require('mongoose');

const AuditSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who performed the action
  actorEmail: { type: String }, // denormalized for faster queries
  action: { type: String, required: true }, // e.g., 'PROMOTE_USER', 'VERIFY_DOCTOR'
  targetType: { type: String }, // e.g., 'User', 'Doctor'
  targetId: { type: mongoose.Schema.Types.ObjectId }, // id of the target doc
  details: { type: mongoose.Schema.Types.Mixed }, // extra contextual data
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('Audit', AuditSchema);
