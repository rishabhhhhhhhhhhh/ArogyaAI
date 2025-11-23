const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['created', 'active', 'ended'],
    default: 'created'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  metadata: {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    duration: {
      type: Number, // seconds
      default: 0
    },
    participantCount: {
      type: Number,
      default: 0
    }
  }
});

// Index for efficient cleanup queries
SessionSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Session', SessionSchema);