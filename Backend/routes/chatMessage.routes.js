const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  storeChatMessage,
  getChatMessages,
  deleteChatMessage,
  getChatStats
} = require('../controllers/chatMessage.controller');

// Store a chat message (WebSocket fallback)
router.post('/store', protect, storeChatMessage);

// Get chat messages for a session with pagination
router.get('/session/:sessionId', protect, getChatMessages);

// Get chat statistics for a session
router.get('/session/:sessionId/stats', protect, getChatStats);

// Delete a chat message (admin or sender only)
router.delete('/:messageId', protect, deleteChatMessage);

module.exports = router;