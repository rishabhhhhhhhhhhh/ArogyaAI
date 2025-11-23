const { Server } = require('socket.io');
const { authenticateWebSocket, validateSessionAccess } = require('../middleware/websocket.auth.middleware');
const Session = require('../models/Session');
const ChatMessage = require('../models/ChatMessage');
const SignalingMessage = require('../models/SignalingMessage');
const ICEServerManager = require('./iceServerManager');
const { v4: uuidv4 } = require('uuid');

// Signaling message types for validation
const SIGNALING_MESSAGE_TYPES = {
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
  CHAT: 'chat',
  JOIN: 'join',
  LEAVE: 'leave'
};

// Message validation schemas
const MESSAGE_SCHEMAS = {
  [SIGNALING_MESSAGE_TYPES.OFFER]: {
    required: ['type', 'sdp'],
    validate: (payload) => payload.type === 'offer' && typeof payload.sdp === 'string'
  },
  [SIGNALING_MESSAGE_TYPES.ANSWER]: {
    required: ['type', 'sdp'],
    validate: (payload) => payload.type === 'answer' && typeof payload.sdp === 'string'
  },
  [SIGNALING_MESSAGE_TYPES.ICE_CANDIDATE]: {
    required: ['candidate', 'sdpMLineIndex', 'sdpMid'],
    validate: (payload) => typeof payload.candidate === 'string' && 
                          typeof payload.sdpMLineIndex === 'number'
  }
};

class SignalingServer {
  constructor(httpServer) {
    // Enhanced CORS configuration for trusted origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3000", // Development fallback
      "https://localhost:5173", // HTTPS development
    ];

    // Add production origins from environment
    if (process.env.PRODUCTION_ORIGINS) {
      allowedOrigins.push(...process.env.PRODUCTION_ORIGINS.split(','));
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      // Connection limits and optimization
      maxHttpBufferSize: 1e6, // 1MB max message size
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
      upgradeTimeout: 10000, // 10 seconds
      allowEIO3: false // Disable legacy Engine.IO v3 support
    });

    this.sessions = new Map(); // In-memory session tracking
    this.rateLimiter = new Map(); // Rate limiting for signaling messages
    this.connectionLimiter = new Map(); // Connection limits per user/IP
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      peakConnections: 0,
      connectionsPerMinute: 0,
      lastMinuteConnections: [],
      rejectedConnections: 0,
      rateLimitedRequests: 0
    };
    this.iceServerManager = new ICEServerManager(); // Production-ready ICE server management
    
    // Connection limits configuration (more permissive for development)
    this.maxConnectionsPerUser = parseInt(process.env.MAX_CONNECTIONS_PER_USER) || 10;
    this.maxConnectionsPerIP = parseInt(process.env.MAX_CONNECTIONS_PER_IP) || 50;
    this.maxTotalConnections = parseInt(process.env.MAX_TOTAL_CONNECTIONS) || 1000;
    
    this.setupMiddleware();
    this.setupEventHandlers();
    this.startCleanupTimer();
    this.startMetricsCollection();
  }

  setupMiddleware() {
    // Connection limiting middleware
    this.io.use((socket, next) => {
      try {
        // Check total connection limit
        if (this.connectionMetrics.activeConnections >= this.maxTotalConnections) {
          this.connectionMetrics.rejectedConnections++;
          console.warn(`Connection rejected: Total connection limit reached (${this.maxTotalConnections})`);
          return next(new Error('Server at capacity, please try again later'));
        }

        // Check IP-based connection limit
        const clientIP = socket.handshake.address;
        const ipConnections = Array.from(this.io.sockets.sockets.values())
          .filter(s => s.handshake.address === clientIP).length;
        
        if (ipConnections >= this.maxConnectionsPerIP) {
          this.connectionMetrics.rejectedConnections++;
          console.warn(`Connection rejected: IP connection limit reached for ${clientIP}`);
          return next(new Error('Too many connections from this IP address'));
        }

        next();
      } catch (error) {
        console.error('Connection limiting middleware error:', error);
        next(new Error('Connection validation failed'));
      }
    });

    // Authentication middleware
    this.io.use(authenticateWebSocket);

    // User-based connection limiting (after authentication)
    this.io.use((socket, next) => {
      try {
        const userId = socket.userId;
        
        // Clean up any disconnected sockets for this user first
        const userSockets = Array.from(this.io.sockets.sockets.values())
          .filter(s => s.userId === userId);
        
        // Count only connected sockets
        const activeUserConnections = userSockets.filter(s => s.connected).length;
        
        console.log(`User ${socket.user.email} connection check: ${activeUserConnections}/${this.maxConnectionsPerUser} active connections`);
        
        if (activeUserConnections >= this.maxConnectionsPerUser) {
          this.connectionMetrics.rejectedConnections++;
          console.warn(`Connection rejected: User connection limit reached for user ${userId} (${activeUserConnections}/${this.maxConnectionsPerUser})`);
          
          // Try to clean up old connections
          userSockets.forEach(oldSocket => {
            if (!oldSocket.connected) {
              console.log(`Cleaning up disconnected socket for user ${userId}`);
              oldSocket.disconnect(true);
            }
          });
          
          return next(new Error('Too many connections for this user'));
        }

        next();
      } catch (error) {
        console.error('User connection limiting middleware error:', error);
        next(new Error('User validation failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      // Update connection metrics
      this.connectionMetrics.totalConnections++;
      this.connectionMetrics.activeConnections++;
      this.connectionMetrics.peakConnections = Math.max(
        this.connectionMetrics.peakConnections, 
        this.connectionMetrics.activeConnections
      );
      
      // Track connections per minute
      const now = Date.now();
      this.connectionMetrics.lastMinuteConnections.push(now);
      this.connectionMetrics.lastMinuteConnections = this.connectionMetrics.lastMinuteConnections
        .filter(timestamp => now - timestamp < 60000); // Keep only last minute
      this.connectionMetrics.connectionsPerMinute = this.connectionMetrics.lastMinuteConnections.length;

      console.log(`User ${socket.user.email} connected to signaling server (Active: ${this.connectionMetrics.activeConnections})`);

      // Join user to their personal room
      socket.join(`user:${socket.userId}`);

      // Handle session creation
      socket.on('create-session', async (data, callback) => {
        try {
          const { patientId, appointmentId } = data;
          const session = await this.createSession(socket.userId, patientId, appointmentId);
          
          callback({ success: true, session });
        } catch (error) {
          console.error('Create session error:', error.message);
          callback({ success: false, error: error.message });
        }
      });

      // Handle joining a session
      socket.on('join-session', async (data, callback) => {
        try {
          const { sessionId } = data;
          console.log(`User ${socket.user.email} (${socket.userId}) attempting to join session: ${sessionId}`);
          
          // Add detailed session lookup logging
          const sessionLookup = await Session.findOne({ sessionId });
          if (!sessionLookup) {
            console.error(`Session not found in database: ${sessionId}`);
            console.log('Available sessions:');
            const allSessions = await Session.find({}).limit(5);
            allSessions.forEach(s => {
              console.log(`  - ${s.sessionId} (${s.status})`);
            });
            throw new Error('Session not found');
          }
          
          console.log(`Found session ${sessionId}: doctorId=${sessionLookup.doctorId}, patientId=${sessionLookup.patientId}, status=${sessionLookup.status}`);
          
          const session = await validateSessionAccess(socket, sessionId, Session);
          console.log(`Session validation successful for ${socket.user.email}`);
          
          // Join session room
          socket.join(`session:${sessionId}`);
          socket.currentSessionId = sessionId;
          
          // Update session participant count
          await this.updateSessionParticipants(sessionId, 1);
          
          // Get ICE server configuration
          const iceServers = this.getIceServers();
          
          console.log(`User ${socket.user.email} successfully joined session ${sessionId}`);
          callback({ success: true, session, iceServers });
          
          // Notify other participants
          socket.to(`session:${sessionId}`).emit('user-joined', {
            userId: socket.userId,
            userRole: socket.userRole,
            userEmail: socket.user.email
          });
          
        } catch (error) {
          console.error(`Join session error for ${socket.user.email}:`, error.message);
          console.error('Error stack:', error.stack);
          callback({ success: false, error: error.message });
        }
      });

      // Handle WebRTC offer messages
      socket.on('webrtc-offer', async (data) => {
        try {
          const { sessionId, offer } = data;
          
          // Check rate limit
          if (!this.checkRateLimit(socket.userId, 'offer')) {
            throw new Error('Rate limit exceeded for offer messages');
          }
          
          // Validate session access
          await validateSessionAccess(socket, sessionId, Session);
          
          // Validate offer message
          if (!this.validateSignalingMessage(SIGNALING_MESSAGE_TYPES.OFFER, offer)) {
            throw new Error('Invalid offer message format');
          }
          
          // Persist signaling message for audit
          await this.persistSignalingMessage(sessionId, socket.userId, 'offer', offer, socket);
          
          // Relay offer to other participants
          socket.to(`session:${sessionId}`).emit('webrtc-offer', {
            offer,
            senderId: socket.userId,
            senderRole: socket.userRole,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('WebRTC offer error:', error.message);
          socket.emit('error', { message: error.message, type: 'webrtc-offer' });
        }
      });

      // Handle WebRTC answer messages
      socket.on('webrtc-answer', async (data) => {
        try {
          const { sessionId, answer } = data;
          
          // Check rate limit
          if (!this.checkRateLimit(socket.userId, 'answer')) {
            throw new Error('Rate limit exceeded for answer messages');
          }
          
          // Validate session access
          await validateSessionAccess(socket, sessionId, Session);
          
          // Validate answer message
          if (!this.validateSignalingMessage(SIGNALING_MESSAGE_TYPES.ANSWER, answer)) {
            throw new Error('Invalid answer message format');
          }
          
          // Persist signaling message for audit
          await this.persistSignalingMessage(sessionId, socket.userId, 'answer', answer, socket);
          
          // Relay answer to other participants
          socket.to(`session:${sessionId}`).emit('webrtc-answer', {
            answer,
            senderId: socket.userId,
            senderRole: socket.userRole,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('WebRTC answer error:', error.message);
          socket.emit('error', { message: error.message, type: 'webrtc-answer' });
        }
      });

      // Handle ICE candidate messages
      socket.on('ice-candidate', async (data) => {
        try {
          const { sessionId, candidate } = data;
          
          // Check rate limit
          if (!this.checkRateLimit(socket.userId, 'ice-candidate')) {
            throw new Error('Rate limit exceeded for ICE candidate messages');
          }
          
          // Validate session access
          await validateSessionAccess(socket, sessionId, Session);
          
          // Validate ICE candidate message
          if (!this.validateSignalingMessage(SIGNALING_MESSAGE_TYPES.ICE_CANDIDATE, candidate)) {
            throw new Error('Invalid ICE candidate message format');
          }
          
          // Persist signaling message for audit
          await this.persistSignalingMessage(sessionId, socket.userId, 'ice-candidate', candidate, socket);
          
          // Relay ICE candidate to other participants
          socket.to(`session:${sessionId}`).emit('ice-candidate', {
            candidate,
            senderId: socket.userId,
            senderRole: socket.userRole,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('ICE candidate error:', error.message);
          socket.emit('error', { message: error.message, type: 'ice-candidate' });
        }
      });

      // Handle generic signaling messages (for backward compatibility)
      socket.on('signaling-message', async (data) => {
        try {
          const { sessionId, type, payload } = data;
          
          // Validate session access
          await validateSessionAccess(socket, sessionId, Session);
          
          // Validate message type
          if (!Object.values(SIGNALING_MESSAGE_TYPES).includes(type)) {
            throw new Error(`Invalid signaling message type: ${type}`);
          }
          
          // Validate payload based on type
          if (MESSAGE_SCHEMAS[type] && !this.validateSignalingMessage(type, payload)) {
            throw new Error(`Invalid ${type} message format`);
          }
          
          // Persist signaling message for audit
          await this.persistSignalingMessage(sessionId, socket.userId, type, payload, socket);
          
          // Relay signaling message to other participants
          socket.to(`session:${sessionId}`).emit('signaling-message', {
            type,
            payload,
            senderId: socket.userId,
            senderRole: socket.userRole,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('Signaling message error:', error.message);
          socket.emit('error', { message: error.message, type: 'signaling-message' });
        }
      });

      // Handle chat messages
      socket.on('chat-message', async (data) => {
        try {
          const { sessionId, message } = data;
          
          // Validate session access
          await validateSessionAccess(socket, sessionId, Session);
          
          // Persist chat message
          const chatMessage = await this.persistChatMessage(
            sessionId,
            socket.userId,
            socket.userRole,
            message
          );
          
          // Relay chat message to all participants
          this.io.to(`session:${sessionId}`).emit('chat-message', {
            id: chatMessage._id,
            sessionId,
            senderId: socket.userId,
            senderRole: socket.userRole,
            message,
            timestamp: chatMessage.timestamp,
            messageType: 'text'
          });
          
        } catch (error) {
          console.error('Chat message error:', error.message);
          socket.emit('error', { message: error.message });
        }
      });

      // Handle session end
      socket.on('end-session', async (data) => {
        try {
          const { sessionId } = data;
          
          // Validate session access
          await validateSessionAccess(socket, sessionId, Session);
          
          // End session
          await this.endSession(sessionId);
          
          // Notify all participants
          this.io.to(`session:${sessionId}`).emit('session-ended', {
            sessionId,
            endedBy: socket.userId
          });
          
        } catch (error) {
          console.error('End session error:', error.message);
          socket.emit('error', { message: error.message });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async (reason) => {
        // Update connection metrics
        this.connectionMetrics.activeConnections = Math.max(0, this.connectionMetrics.activeConnections - 1);
        
        console.log(`User ${socket.user.email} disconnected from signaling server (Reason: ${reason}, Active: ${this.connectionMetrics.activeConnections})`);
        
        if (socket.currentSessionId) {
          // Update participant count
          await this.updateSessionParticipants(socket.currentSessionId, -1);
          
          // Notify other participants
          socket.to(`session:${socket.currentSessionId}`).emit('user-left', {
            userId: socket.userId,
            userRole: socket.userRole,
            reason: reason
          });
        }

        // Clean up user-specific rate limiting data
        this.cleanupUserRateLimitData(socket.userId);
        
        // Force cleanup of this socket
        socket.removeAllListeners();
      });
    });
  }

  async createSession(doctorId, patientId, appointmentId = null) {
    const sessionId = uuidv4();
    
    const session = new Session({
      sessionId,
      doctorId,
      patientId,
      status: 'created',
      metadata: {
        appointmentId,
        participantCount: 0
      }
    });

    await session.save();
    return session;
  }

  async updateSessionParticipants(sessionId, delta) {
    await Session.findOneAndUpdate(
      { sessionId },
      { 
        $inc: { 'metadata.participantCount': delta },
        $set: { 
          status: 'active',
          startedAt: new Date()
        }
      }
    );
  }

  async endSession(sessionId) {
    const endTime = new Date();
    const session = await Session.findOneAndUpdate(
      { sessionId },
      { 
        status: 'ended',
        endedAt: endTime,
        $set: {
          'metadata.duration': function() {
            return this.startedAt ? Math.floor((endTime - this.startedAt) / 1000) : 0;
          }
        }
      },
      { new: true }
    );

    return session;
  }

  async persistChatMessage(sessionId, senderId, senderRole, message) {
    const chatMessage = new ChatMessage({
      sessionId,
      senderId,
      senderRole,
      message,
      messageType: 'text'
    });

    await chatMessage.save();
    return chatMessage;
  }

  getIceServers() {
    // Use the production-ready ICE server manager
    return this.iceServerManager.getHealthyIceServers();
  }

  /**
   * Get ICE server health status for monitoring
   */
  getIceServerHealth() {
    return this.iceServerManager.getHealthStatus();
  }

  /**
   * Force ICE server health check
   */
  async forceIceServerHealthCheck() {
    return await this.iceServerManager.forceHealthCheck();
  }

  /**
   * Force TURN credential rotation
   */
  forceTurnCredentialRotation() {
    this.iceServerManager.forceCredentialRotation();
  }

  /**
   * Enhanced rate limiting for signaling messages with adaptive limits
   */
  checkRateLimit(userId, messageType) {
    const key = `${userId}:${messageType}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    
    // Adaptive rate limits based on message type and server load
    const baseMaxRequests = {
      'ice-candidate': 100,
      'offer': 10,
      'answer': 10,
      'chat': 30,
      'join': 5,
      'leave': 5
    };
    
    // Reduce limits if server is under high load
    const loadFactor = this.connectionMetrics.activeConnections > (this.maxTotalConnections * 0.8) ? 0.5 : 1.0;
    const maxRequests = Math.floor((baseMaxRequests[messageType] || 20) * loadFactor);
    
    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, { 
        count: 1, 
        resetTime: now + windowMs,
        violations: 0,
        lastViolation: null
      });
      return true;
    }
    
    const limit = this.rateLimiter.get(key);
    
    if (now > limit.resetTime) {
      // Reset the window but keep violation history
      this.rateLimiter.set(key, { 
        count: 1, 
        resetTime: now + windowMs,
        violations: limit.violations,
        lastViolation: limit.lastViolation
      });
      return true;
    }
    
    if (limit.count >= maxRequests) {
      // Track rate limit violations
      limit.violations++;
      limit.lastViolation = now;
      this.connectionMetrics.rateLimitedRequests++;
      
      // Implement progressive penalties for repeat violators
      if (limit.violations > 5) {
        console.warn(`User ${userId} has ${limit.violations} rate limit violations for ${messageType}`);
      }
      
      return false;
    }
    
    limit.count++;
    return true;
  }

  /**
   * Validate signaling message format
   */
  validateSignalingMessage(type, payload) {
    try {
      if (!payload || typeof payload !== 'object') {
        return false;
      }

      const schema = MESSAGE_SCHEMAS[type];
      if (!schema) {
        return true; // No specific validation for this type
      }

      // Check required fields
      for (const field of schema.required) {
        if (!(field in payload)) {
          console.error(`Missing required field: ${field}`);
          return false;
        }
      }

      // Run custom validation if provided
      if (schema.validate && !schema.validate(payload)) {
        console.error(`Custom validation failed for type: ${type}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Message validation error:', error.message);
      return false;
    }
  }

  /**
   * Persist signaling message for audit purposes
   */
  async persistSignalingMessage(sessionId, senderId, messageType, payload, socket = null) {
    try {
      const signalingMessage = new SignalingMessage({
        sessionId,
        senderId,
        messageType,
        payload,
        metadata: {
          userAgent: socket?.handshake?.headers?.['user-agent'],
          ipAddress: socket?.handshake?.address,
          connectionId: socket?.id
        }
      });

      await signalingMessage.save();
      return signalingMessage;
    } catch (error) {
      console.error('Failed to persist signaling message:', error.message);
      // Don't throw error to avoid breaking signaling flow
    }
  }

  /**
   * Start automatic cleanup timer for inactive sessions
   */
  startCleanupTimer() {
    // Run cleanup every 30 minutes
    const cleanupInterval = 30 * 60 * 1000; // 30 minutes
    
    setInterval(async () => {
      try {
        await this.cleanupInactiveSessions();
        console.log('Completed automatic session cleanup');
      } catch (error) {
        console.error('Session cleanup error:', error.message);
      }
    }, cleanupInterval);

    console.log('Started automatic session cleanup timer');
  }

  /**
   * Cleanup inactive sessions (enhanced version)
   */
  async cleanupInactiveSessions() {
    try {
      const now = new Date();
      
      // Different timeouts for different session states
      const createdTimeout = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours for created sessions
      const activeTimeout = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours for active sessions
      
      // Cleanup created sessions that were never activated
      const createdResult = await Session.updateMany(
        { 
          status: 'created',
          createdAt: { $lt: createdTimeout }
        },
        { 
          status: 'ended',
          endedAt: now,
          'metadata.duration': 0
        }
      );

      // Cleanup active sessions that have been running too long
      const activeResult = await Session.updateMany(
        { 
          status: 'active',
          $or: [
            { startedAt: { $lt: activeTimeout } },
            { createdAt: { $lt: activeTimeout } }
          ]
        },
        { 
          status: 'ended',
          endedAt: now,
          $set: {
            'metadata.duration': function() {
              const startTime = this.startedAt || this.createdAt;
              return Math.floor((now - startTime) / 1000);
            }
          }
        }
      );

      console.log(`Cleaned up ${createdResult.modifiedCount} created sessions and ${activeResult.modifiedCount} active sessions`);
      
      return {
        createdSessionsCleaned: createdResult.modifiedCount,
        activeSessionsCleaned: activeResult.modifiedCount
      };
    } catch (error) {
      console.error('Session cleanup error:', error.message);
      throw error;
    }
  }

  /**
   * Get signaling message history for audit purposes
   */
  async getSignalingHistory(sessionId, limit = 100) {
    try {
      const messages = await SignalingMessage.find({ sessionId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('senderId', 'email role')
        .lean();

      return messages;
    } catch (error) {
      console.error('Failed to get signaling history:', error.message);
      return [];
    }
  }

  /**
   * Get session statistics for monitoring
   */
  async getSessionStats() {
    try {
      const stats = await Session.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        created: 0,
        active: 0,
        ended: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
      });

      return result;
    } catch (error) {
      console.error('Failed to get session stats:', error.message);
      return { created: 0, active: 0, ended: 0 };
    }
  }

  /**
   * Start metrics collection for monitoring
   */
  startMetricsCollection() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30 * 1000);

    // Log metrics summary every 5 minutes
    setInterval(() => {
      this.logMetricsSummary();
    }, 5 * 60 * 1000);

    console.log('Started signaling server metrics collection');
  }

  /**
   * Collect current metrics
   */
  collectMetrics() {
    // Update connections per minute
    const now = Date.now();
    this.connectionMetrics.lastMinuteConnections = this.connectionMetrics.lastMinuteConnections
      .filter(timestamp => now - timestamp < 60000);
    this.connectionMetrics.connectionsPerMinute = this.connectionMetrics.lastMinuteConnections.length;

    // Clean up old rate limit data
    this.cleanupRateLimitData();
  }

  /**
   * Log metrics summary for monitoring
   */
  logMetricsSummary() {
    const metrics = {
      activeConnections: this.connectionMetrics.activeConnections,
      peakConnections: this.connectionMetrics.peakConnections,
      totalConnections: this.connectionMetrics.totalConnections,
      connectionsPerMinute: this.connectionMetrics.connectionsPerMinute,
      rejectedConnections: this.connectionMetrics.rejectedConnections,
      rateLimitedRequests: this.connectionMetrics.rateLimitedRequests,
      activeSessions: this.sessions.size,
      rateLimiterEntries: this.rateLimiter.size,
      memoryUsage: process.memoryUsage()
    };

    console.log('Signaling Server Metrics:', JSON.stringify(metrics, null, 2));

    // Reset some counters for next period
    this.connectionMetrics.rateLimitedRequests = 0;
  }

  /**
   * Clean up old rate limit data to prevent memory leaks
   */
  cleanupRateLimitData() {
    const now = Date.now();
    const cleanupThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [key, data] of this.rateLimiter.entries()) {
      if (now - data.resetTime > cleanupThreshold) {
        this.rateLimiter.delete(key);
      }
    }
  }

  /**
   * Clean up rate limit data for a specific user
   */
  cleanupUserRateLimitData(userId) {
    for (const [key] of this.rateLimiter.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.rateLimiter.delete(key);
      }
    }
  }

  /**
   * Get current server metrics for monitoring endpoints
   */
  getServerMetrics() {
    return {
      ...this.connectionMetrics,
      activeSessions: this.sessions.size,
      rateLimiterEntries: this.rateLimiter.size,
      connectionLimits: {
        maxConnectionsPerUser: this.maxConnectionsPerUser,
        maxConnectionsPerIP: this.maxConnectionsPerIP,
        maxTotalConnections: this.maxTotalConnections
      },
      iceServerHealth: this.iceServerManager.getHealthStatus(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Cleanup resources and shutdown the signaling server
   */
  cleanup() {
    console.log('Shutting down signaling server...');
    
    // Cleanup ICE server manager
    if (this.iceServerManager) {
      this.iceServerManager.cleanup();
    }
    
    // Close all socket connections
    if (this.io) {
      this.io.close();
    }
    
    // Clear in-memory data
    this.sessions.clear();
    this.rateLimiter.clear();
    this.connectionLimiter.clear();
    
    console.log('Signaling server shutdown complete');
  }
}

module.exports = SignalingServer;