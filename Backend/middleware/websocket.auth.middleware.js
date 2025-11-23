const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * WebSocket authentication middleware
 * Validates JWT token from query parameters or handshake auth
 */
const authenticateWebSocket = async (socket, next) => {
  try {
    // Extract token from query parameters or handshake auth
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();
    socket.userRole = user.role;
    
    next();
  } catch (error) {
    console.error('WebSocket authentication error:', error.message);
    next(new Error('Invalid authentication token'));
  }
};

/**
 * Validate session access for WebSocket operations
 */
const validateSessionAccess = async (socket, sessionId, Session) => {
  try {
    console.log(`Validating session access for user ${socket.user.email} (${socket.userId}) to session ${sessionId}`);
    
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      console.log(`Session not found: ${sessionId}`);
      throw new Error('Session not found');
    }

    console.log(`Found session: ${session._id}, doctorId: ${session.doctorId}, patientId: ${session.patientId}`);

    const userId = socket.userId;
    const isAuthorized = session.doctorId.toString() === userId || 
                        session.patientId.toString() === userId;
    
    console.log(`Authorization check: userId=${userId}, doctorId=${session.doctorId}, patientId=${session.patientId}, authorized=${isAuthorized}`);
    
    if (!isAuthorized) {
      throw new Error('Unauthorized access to session');
    }

    console.log(`Session access validated successfully for user ${socket.user.email}`);
    return session;
  } catch (error) {
    console.error(`Session validation error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  authenticateWebSocket,
  validateSessionAccess
};