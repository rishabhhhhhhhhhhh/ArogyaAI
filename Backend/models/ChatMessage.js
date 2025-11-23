const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
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
  senderRole: {
    type: String,
    enum: ['doctor', 'patient'],
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  messageType: {
    type: String,
    enum: ['text', 'system'],
    default: 'text'
  }
});

// Index for efficient message retrieval
ChatMessageSchema.index({ sessionId: 1, timestamp: 1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);