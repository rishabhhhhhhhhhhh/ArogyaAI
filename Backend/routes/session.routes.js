const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getIceServers,
  createSession,
  joinSession,
  getSession,
  endSession,
  getChatHistory,
  getSignalingHistory,
  getActiveSessions,
  cleanupInactiveSessions,
  getIceServerHealth,
  forceIceServerHealthCheck,
  forceTurnCredentialRotation,
  updateTurnConfiguration,
  getSignalingMetrics
} = require('../controllers/session.controller');

// Get ICE server configuration
router.get('/ice-servers', protect, getIceServers);

// Create a new session
router.post('/create', protect, createSession);

// Join an existing session
router.post('/:sessionId/join', protect, joinSession);

// End a session
router.post('/:sessionId/end', protect, endSession);

// Cleanup inactive sessions (admin endpoint)
router.post('/cleanup', protect, cleanupInactiveSessions);

// Get session details
router.get('/:sessionId', protect, getSession);

// Get chat history for a session
router.get('/:sessionId/chat', protect, getChatHistory);

// Get signaling history for audit purposes
router.get('/:sessionId/signaling', protect, getSignalingHistory);

// Get user's active sessions
router.get('/user/active', protect, getActiveSessions);

// ICE Server Management Endpoints (Admin only)
router.get('/ice-servers/health', protect, getIceServerHealth);
router.post('/ice-servers/health-check', protect, forceIceServerHealthCheck);
router.post('/ice-servers/rotate-credentials', protect, forceTurnCredentialRotation);
router.put('/ice-servers/turn-config', protect, updateTurnConfiguration);

// Signaling Server Monitoring Endpoints (Admin only)
router.get('/monitoring/metrics', protect, getSignalingMetrics);

module.exports = router;