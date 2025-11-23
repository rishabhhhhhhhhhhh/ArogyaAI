const ChatMessage = require('../models/ChatMessage');
const Session = require('../models/Session');

/**
 * Chat Message Controller
 * Handles chat message operations for WebRTC video calling sessions
 */

// Store a chat message (used by WebSocket fallback)
const storeChatMessage = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role;

    // Validate required fields
    if (!sessionId || !message) {
      return res.status(400).json({ message: 'Session ID and message are required' });
    }

    // Validate message length
    if (message.length > 1000) {
      return res.status(400).json({ message: 'Message too long (max 1000 characters)' });
    }

    // Verify session exists and user has access
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is authorized to send messages in this session
    const isAuthorized = session.doctorId.toString() === senderId || 
                        session.patientId.toString() === senderId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }

    // Create and save chat message
    const chatMessage = new ChatMessage({
      sessionId,
      senderId,
      senderRole,
      message,
      messageType: 'text'
    });

    await chatMessage.save();

    // Populate sender information for response
    await chatMessage.populate('senderId', 'email name role');

    res.status(201).json({ 
      message: 'Chat message stored successfully',
      chatMessage 
    });

  } catch (error) {
    console.error('Store chat message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat messages for a session (with pagination)
const getChatMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    const userId = req.user.id;

    // Verify session exists and user has access
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const isAuthorized = session.doctorId.toString() === userId || 
                        session.patientId.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }

    // Build query
    const query = { sessionId };
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    // Get messages with pagination
    const messages = await ChatMessage.find(query)
      .populate('senderId', 'email name role')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count for pagination
    const totalMessages = await ChatMessage.countDocuments({ sessionId });

    res.json({ 
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalMessages / parseInt(limit)),
        totalMessages,
        hasMore: totalMessages > parseInt(page) * parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a chat message (admin or sender only)
const deleteChatMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find the message
    const chatMessage = await ChatMessage.findById(messageId);
    if (!chatMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check authorization (admin or message sender)
    const isAuthorized = userRole === 'admin' || 
                        chatMessage.senderId.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized to delete this message' });
    }

    await ChatMessage.findByIdAndDelete(messageId);

    res.json({ message: 'Chat message deleted successfully' });

  } catch (error) {
    console.error('Delete chat message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat statistics for a session
const getChatStats = async (req, res) => {
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

    // Get chat statistics
    const stats = await ChatMessage.aggregate([
      { $match: { sessionId } },
      {
        $group: {
          _id: '$senderRole',
          messageCount: { $sum: 1 },
          avgMessageLength: { $avg: { $strLenCP: '$message' } }
        }
      }
    ]);

    const totalMessages = await ChatMessage.countDocuments({ sessionId });
    const firstMessage = await ChatMessage.findOne({ sessionId }).sort({ timestamp: 1 });
    const lastMessage = await ChatMessage.findOne({ sessionId }).sort({ timestamp: -1 });

    res.json({
      sessionId,
      totalMessages,
      messagesByRole: stats,
      firstMessageAt: firstMessage?.timestamp,
      lastMessageAt: lastMessage?.timestamp,
      chatDuration: firstMessage && lastMessage ? 
        Math.floor((lastMessage.timestamp - firstMessage.timestamp) / 1000) : 0
    });

  } catch (error) {
    console.error('Get chat stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  storeChatMessage,
  getChatMessages,
  deleteChatMessage,
  getChatStats
};