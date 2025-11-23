/**
 * Tests for SignalingClient
 * Validates Requirements: 4.1, 4.3, 5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignalingClient } from '../signalingClient';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

describe('SignalingClient', () => {
  let signalingClient: SignalingClient;

  beforeEach(() => {
    signalingClient = new SignalingClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    signalingClient.disconnect();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      expect(signalingClient.isConnectedToServer()).toBe(false);
      expect(signalingClient.getConnectionState()).toBe('disconnected');
    });

    it('should handle connection with authentication token', async () => {
      const sessionId = 'test-session-123';
      const token = 'test-jwt-token';

      // Mock successful connection
      mockSocket.connected = true;
      
      // Simulate connection event
      setTimeout(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        if (connectHandler) {
          connectHandler();
        }
      }, 0);

      // Mock successful session join
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'join-session' && callback) {
          callback({ 
            success: true, 
            session: { sessionId },
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
        }
      });

      await signalingClient.connect(sessionId, token);

      expect(signalingClient.getSessionId()).toBe(sessionId);
      expect(signalingClient.getIceServers()).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
    });

    it('should handle connection errors', async () => {
      const sessionId = 'test-session-123';
      const token = 'invalid-token';

      // Simulate connection error
      setTimeout(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
        if (errorHandler) {
          errorHandler(new Error('Authentication failed'));
        }
      }, 0);

      await expect(signalingClient.connect(sessionId, token)).rejects.toThrow('Failed to connect to signaling server');
    });
  });

  describe('Signaling Message Handling', () => {
    beforeEach(async () => {
      // Setup connected state
      mockSocket.connected = true;
      
      setTimeout(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        if (connectHandler) {
          connectHandler();
        }
      }, 0);

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'join-session' && callback) {
          callback({ success: true, session: { sessionId: 'test-session' } });
        }
      });

      await signalingClient.connect('test-session', 'test-token');
    });

    it('should send WebRTC offer messages', () => {
      const offer: RTCSessionDescriptionInit = {
        type: 'offer',
        sdp: 'test-sdp-offer'
      };

      signalingClient.sendOffer(offer);

      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc-offer', {
        sessionId: 'test-session',
        offer: offer
      });
    });

    it('should send WebRTC answer messages', () => {
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: 'test-sdp-answer'
      };

      signalingClient.sendAnswer(answer);

      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc-answer', {
        sessionId: 'test-session',
        answer: answer
      });
    });

    it('should send ICE candidate messages', () => {
      const candidate: RTCIceCandidateInit = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0'
      };

      signalingClient.sendIceCandidate(candidate);

      expect(mockSocket.emit).toHaveBeenCalledWith('ice-candidate', {
        sessionId: 'test-session',
        candidate: candidate
      });
    });

    it('should send chat messages', () => {
      const message = 'Hello, this is a test message';

      signalingClient.sendChatMessage(message);

      expect(mockSocket.emit).toHaveBeenCalledWith('chat-message', {
        sessionId: 'test-session',
        message: message
      });
    });

    it('should handle incoming offer messages', () => {
      const mockOnOffer = vi.fn();
      signalingClient.onOffer = mockOnOffer;

      const offer: RTCSessionDescriptionInit = {
        type: 'offer',
        sdp: 'incoming-offer-sdp'
      };

      // Simulate incoming offer
      const offerHandler = mockSocket.on.mock.calls.find(call => call[0] === 'webrtc-offer')?.[1];
      if (offerHandler) {
        offerHandler({ offer });
      }

      expect(mockOnOffer).toHaveBeenCalledWith(offer);
    });

    it('should handle incoming answer messages', () => {
      const mockOnAnswer = vi.fn();
      signalingClient.onAnswer = mockOnAnswer;

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: 'incoming-answer-sdp'
      };

      // Simulate incoming answer
      const answerHandler = mockSocket.on.mock.calls.find(call => call[0] === 'webrtc-answer')?.[1];
      if (answerHandler) {
        answerHandler({ answer });
      }

      expect(mockOnAnswer).toHaveBeenCalledWith(answer);
    });

    it('should handle incoming ICE candidate messages', () => {
      const mockOnIceCandidate = vi.fn();
      signalingClient.onIceCandidate = mockOnIceCandidate;

      const candidate: RTCIceCandidateInit = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0'
      };

      // Simulate incoming ICE candidate
      const candidateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'ice-candidate')?.[1];
      if (candidateHandler) {
        candidateHandler({ candidate });
      }

      expect(mockOnIceCandidate).toHaveBeenCalledWith(candidate);
    });

    it('should handle incoming chat messages', () => {
      const mockOnChatMessage = vi.fn();
      signalingClient.onChatMessage = mockOnChatMessage;

      const chatData = {
        id: 'msg-123',
        sessionId: 'test-session',
        senderId: 'user-456',
        senderRole: 'doctor',
        message: 'Hello from doctor',
        timestamp: new Date().toISOString(),
        messageType: 'text'
      };

      // Simulate incoming chat message
      const chatHandler = mockSocket.on.mock.calls.find(call => call[0] === 'chat-message')?.[1];
      if (chatHandler) {
        chatHandler(chatData);
      }

      expect(mockOnChatMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: chatData.id,
        sessionId: chatData.sessionId,
        senderId: chatData.senderId,
        senderRole: chatData.senderRole,
        message: chatData.message,
        messageType: chatData.messageType
      }));
    });
  });

  describe('Error Handling and Reconnection', () => {
    beforeEach(async () => {
      // Setup connected state first
      mockSocket.connected = true;
      
      setTimeout(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        if (connectHandler) {
          connectHandler();
        }
      }, 0);

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'join-session' && callback) {
          callback({ success: true, session: { sessionId: 'test-session' } });
        }
      });

      await signalingClient.connect('test-session', 'test-token');
      vi.clearAllMocks(); // Clear previous calls
    });

    it('should set error handler correctly', () => {
      const mockOnError = vi.fn();
      signalingClient.onError = mockOnError;

      expect(signalingClient.onError).toBe(mockOnError);
    });

    it('should set connection state change handler correctly', () => {
      const mockOnConnectionStateChange = vi.fn();
      signalingClient.onConnectionStateChange = mockOnConnectionStateChange;

      expect(signalingClient.onConnectionStateChange).toBe(mockOnConnectionStateChange);
    });

    it('should allow configuration of reconnection parameters', () => {
      signalingClient.setMaxReconnectAttempts(10);
      signalingClient.resetReconnectionState();

      // These methods should not throw errors
      expect(() => {
        signalingClient.setMaxReconnectAttempts(5);
        signalingClient.resetReconnectionState();
      }).not.toThrow();
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      // Setup connected state
      mockSocket.connected = true;
      
      setTimeout(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        if (connectHandler) {
          connectHandler();
        }
      }, 0);

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'join-session' && callback) {
          callback({ success: true, session: { sessionId: 'test-session' } });
        }
      });

      await signalingClient.connect('test-session', 'test-token');
    });

    it('should create new sessions', async () => {
      const patientId = 'patient-123';
      const appointmentId = 'appointment-456';

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'create-session' && callback) {
          callback({ 
            success: true, 
            session: { 
              sessionId: 'new-session-789',
              doctorId: 'doctor-123',
              patientId: patientId,
              appointmentId: appointmentId
            }
          });
        }
      });

      const session = await signalingClient.createSession(patientId, appointmentId);

      expect(mockSocket.emit).toHaveBeenCalledWith('create-session', {
        patientId,
        appointmentId
      }, expect.any(Function));

      expect(session).toEqual(expect.objectContaining({
        sessionId: 'new-session-789',
        patientId: patientId,
        appointmentId: appointmentId
      }));
    });

    it('should handle session creation errors', async () => {
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'create-session' && callback) {
          callback({ 
            success: false, 
            error: 'Patient not found'
          });
        }
      });

      await expect(signalingClient.createSession('invalid-patient')).rejects.toThrow('Patient not found');
    });
  });

  describe('Connection State Management', () => {
    it('should prevent sending messages when disconnected', () => {
      // Ensure client is disconnected
      mockSocket.connected = false;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      signalingClient.sendOffer({ type: 'offer', sdp: 'test' });
      signalingClient.sendAnswer({ type: 'answer', sdp: 'test' });
      signalingClient.sendIceCandidate({ candidate: 'test', sdpMLineIndex: 0, sdpMid: '0' });
      signalingClient.sendChatMessage('test message');

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(mockSocket.emit).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});