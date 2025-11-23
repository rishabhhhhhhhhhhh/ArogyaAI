const Session = require('../models/Session');
const ChatMessage = require('../models/ChatMessage');
const SignalingMessage = require('../models/SignalingMessage');
const User = require('../models/User');
const ICEServerManager = require('../services/iceServerManager');
const { v4: uuidv4 } = require('uuid');

// Initialize ICE server manager
const iceServerManager = new ICEServerManager();

/**
 * Session Controller
 * Handles session management operations for WebRTC video calling
 */

// Get ICE server configuration
const getIceServers = (req, res) => {
  try {
    const iceServers = iceServerManager.getHealthyIceServers();
    
    res.json({ 
      iceServers,
      serverCount: iceServers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get ICE servers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new session
const createSession = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.body;
    const doctorId = req.user.id;

    // Validate that the requesting user is a doctor
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can create sessions' });
    }

    // Validate required fields
    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required' });
    }

    // Validate that the patient exists and is a patient
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({ message: 'Invalid patient ID' });
    }

    // Check if there's already an active session between these users
    const existingSession = await Session.findOne({
      doctorId,
      patientId,
      status: { $in: ['created', 'active'] }
    });

    if (existingSession) {
      return res.status(409).json({ 
        message: 'Active session already exists',
        sessionId: existingSession.sessionId
      });
    }

    // Create new session
    const sessionId = uuidv4();
    const session = new Session({
      sessionId,
      doctorId,
      patientId,
      status: 'created',
      metadata: {
        appointmentId: appointmentId || null,
        participantCount: 0
      }
    });

    await session.save();

    // Populate user details for response
    await session.populate([
      { path: 'doctorId', select: 'email name role' },
      { path: 'patientId', select: 'email name role' }
    ]);

    res.status(201).json({ 
      message: 'Session created successfully',
      session 
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Join an existing session
const joinSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await Session.findOne({ sessionId })
      .populate('doctorId', 'email name role')
      .populate('patientId', 'email name role');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is authorized to join this session
    const isAuthorized = session.doctorId._id.toString() === userId || 
                        session.patientId._id.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }

    // Check if session is in a joinable state
    if (session.status === 'ended') {
      return res.status(400).json({ message: 'Session has already ended' });
    }

    // Update session status to active if it was just created
    if (session.status === 'created') {
      session.status = 'active';
      session.startedAt = new Date();
      await session.save();
    }

    // Get ICE server configuration with fresh credentials
    const iceServers = iceServerManager.getHealthyIceServers();

    res.json({ 
      message: 'Successfully joined session',
      session,
      iceServers,
      userRole: req.user.role
    });

  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get session details
const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await Session.findOne({ sessionId })
      .populate('doctorId', 'email name role')
      .populate('patientId', 'email name role');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is authorized to access this session
    const isAuthorized = session.doctorId._id.toString() === userId || 
                        session.patientId._id.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// End a session
const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is authorized to end this session
    const isAuthorized = session.doctorId.toString() === userId || 
                        session.patientId.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }

    // Check if session is already ended
    if (session.status === 'ended') {
      return res.status(400).json({ message: 'Session is already ended' });
    }

    // Calculate duration if session was active
    const endTime = new Date();
    let duration = 0;
    if (session.startedAt) {
      duration = Math.floor((endTime - session.startedAt) / 1000);
    }

    // Update session
    session.status = 'ended';
    session.endedAt = endTime;
    session.metadata.duration = duration;
    await session.save();

    res.json({ 
      message: 'Session ended successfully',
      session: {
        sessionId: session.sessionId,
        status: session.status,
        endedAt: session.endedAt,
        duration: duration
      }
    });

  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat history for a session
const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify session access
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const isAuthorized = session.doctorId.toString() === userId || 
                        session.patientId.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }

    // Get chat messages
    const messages = await ChatMessage.find({ sessionId })
      .populate('senderId', 'email name role')
      .sort({ timestamp: 1 })
      .limit(100); // Limit to last 100 messages

    res.json({ messages });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's active sessions
const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await Session.find({
      $or: [
        { doctorId: userId },
        { patientId: userId }
      ],
      status: { $in: ['created', 'active'] }
    })
    .populate('doctorId', 'email name role')
    .populate('patientId', 'email name role')
    .sort({ createdAt: -1 });

    res.json({ sessions });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cleanup inactive sessions (admin endpoint)
const cleanupInactiveSessions = async (req, res) => {
  try {
    // Only allow admins to trigger cleanup
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { hoursOld = 24 } = req.body;
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    
    const result = await Session.updateMany(
      { 
        status: { $in: ['created', 'active'] },
        createdAt: { $lt: cutoffTime }
      },
      { 
        status: 'ended',
        endedAt: new Date()
      }
    );

    res.json({ 
      message: 'Cleanup completed',
      sessionsUpdated: result.modifiedCount
    });

  } catch (error) {
    console.error('Cleanup sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get signaling history for audit purposes
const getSignalingHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { limit = 100 } = req.query;

    // Verify session access
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const isAuthorized = session.doctorId.toString() === userId || 
                        session.patientId.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }

    // Get signaling messages
    const messages = await SignalingMessage.find({ sessionId })
      .populate('senderId', 'email name role')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({ 
      sessionId,
      signalingMessages: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Get signaling history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validate session access (utility function)
const validateSessionAccess = async (sessionId, userId) => {
  const session = await Session.findOne({ sessionId });
  
  if (!session) {
    throw new Error('Session not found');
  }

  const isAuthorized = session.doctorId.toString() === userId || 
                      session.patientId.toString() === userId;
  
  if (!isAuthorized) {
    throw new Error('Unauthorized access to session');
  }

  return session;
};

// Get ICE server health status (admin endpoint)
const getIceServerHealth = async (req, res) => {
  try {
    // Only allow admins to access health status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const healthStatus = iceServerManager.getHealthStatus();
    res.json(healthStatus);
  } catch (error) {
    console.error('Get ICE server health error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Force ICE server health check (admin endpoint)
const forceIceServerHealthCheck = async (req, res) => {
  try {
    // Only allow admins to force health checks
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const healthStatus = await iceServerManager.forceHealthCheck();
    res.json({
      message: 'Health check completed',
      ...healthStatus
    });
  } catch (error) {
    console.error('Force ICE server health check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Force TURN credential rotation (admin endpoint)
const forceTurnCredentialRotation = (req, res) => {
  try {
    // Only allow admins to force credential rotation
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    iceServerManager.forceCredentialRotation();
    res.json({
      message: 'TURN credential rotation initiated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Force TURN credential rotation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update TURN server configuration (admin endpoint)
const updateTurnConfiguration = (req, res) => {
  try {
    // Only allow admins to update configuration
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { servers, username, secret } = req.body;
    
    if (!servers && !username && !secret) {
      return res.status(400).json({ 
        message: 'At least one configuration parameter is required' 
      });
    }

    iceServerManager.updateTURNConfiguration({
      servers,
      username,
      secret
    });

    res.json({
      message: 'TURN configuration updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update TURN configuration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get signaling server metrics (admin endpoint)
const getSignalingMetrics = (req, res) => {
  try {
    // Only allow admins to access metrics
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Access the signaling server instance from the global app context
    // This would need to be injected or accessed through a service registry
    const signalingServer = req.app.get('signalingServer');
    
    if (!signalingServer) {
      return res.status(503).json({ message: 'Signaling server not available' });
    }

    const metrics = signalingServer.getServerMetrics();
    res.json({
      timestamp: new Date().toISOString(),
      ...metrics
    });
  } catch (error) {
    console.error('Get signaling metrics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getIceServers,
  createSession,
  joinSession,
  getSession,
  endSession,
  getChatHistory,
  getSignalingHistory,
  getActiveSessions,
  cleanupInactiveSessions,
  validateSessionAccess,
  getIceServerHealth,
  forceIceServerHealthCheck,
  forceTurnCredentialRotation,
  updateTurnConfiguration,
  getSignalingMetrics
};