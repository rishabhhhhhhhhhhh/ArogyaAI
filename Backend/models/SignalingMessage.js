const mongoose = require('mongoose');

const SignalingMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageType: {
    type: String,
    enum: ['offer', 'answer', 'ice-candidate', 'join', 'leave'],
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    connectionId: String
  }
});

// Index for efficient audit queries
SignalingMessageSchema.index({ sessionId: 1, timestamp: 1 });
SignalingMessageSchema.index({ senderId: 1, timestamp: 1 });

// TTL index to automatically delete old signaling messages after 30 days
SignalingMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('SignalingMessage', SignalingMessageSchema);