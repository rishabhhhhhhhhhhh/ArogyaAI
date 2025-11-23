/**
 * Comprehensive integration tests for WebRTC Video Calling System
 * Tests complete doctor-patient video call workflow, chat functionality,
 * authentication, authorization, and network conditions
 * 
 * Task 14: Final integration and end-to-end testing
 * Requirements: All Requirements Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebRTCManager } from '../../services/webrtcManager';
import { SignalingClient } from '../../services/signalingClient';

// Mock WebRTC APIs
class MockRTCPeerConnection {
  connectionState = 'new';
  iceConnectionState = 'new';
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' });
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
  addTrack = vi.fn();
  close = vi.fn();
  getSenders = vi.fn().mockReturnValue([]);
  getTransceivers = vi.fn().mockReturnValue([]);
  createDataChannel = vi.fn(() => ({
    readyState: 'open',
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null
  }));
  onicecandidate = null;
  ontrack = null;
  onconnectionstatechange = null;
  oniceconnectionstatechange = null;
  ondatachannel = null;
  onicegatheringstatechange = null;
}

class MockMediaStream {
  getTracks = vi.fn().mockReturnValue([
    { kind: 'video', enabled: true, stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() },
    { kind: 'audio', enabled: true, stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }
  ]);
  getVideoTracks = vi.fn().mockReturnValue([{ enabled: true, stop: vi.fn() }]);
  getAudioTracks = vi.fn().mockReturnValue([{ enabled: true, stop: vi.fn() }]);
  removeTrack = vi.fn();
}

// Mock Socket.IO
const mockSocket = {
  connected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

// Mock getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream())
  },
  writable: true
});

// Mock RTCPeerConnection
Object.defineProperty(global, 'RTCPeerConnection', {
  value: MockRTCPeerConnection,
  writable: true
});

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
  writable: true
});

// Mock Socket.IO client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

describe('WebRTC Integration Tests - Task 14', () => {
  let webrtcManager: WebRTCManager;
  let signalingClient: SignalingClient;
  
  beforeEach(() => {
    vi.clearAllMocks();
    webrtcManager = new WebRTCManager();
    signalingClient = new SignalingClient();
  });

  afterEach(() => {
    webrtcManager?.cleanup();
    signalingClient?.cleanup();
  });

  describe('Complete Doctor-Patient Video Call Workflow', () => {
    it('should complete full call establishment workflow', async () => {
      // Test Requirements: 1.1, 1.2, 2.2, 2.3, 2.4, 2.5
      const sessionId = 'test-session-123';
      const doctorId = 'doctor-456';
      
      // Initialize WebRTC connection as doctor (initiator)
      await webrtcManager.initializeConnection(
        sessionId, 
        true, // isInitiator
        undefined, // config
        signalingClient,
        doctorId,
        'doctor'
      );

      // Start local media
      const localStream = await webrtcManager.startLocalMedia();
      expect(localStream).toBeDefined();
      expect(webrtcManager.getLocalStream()).toBe(localStream);

      // Create offer
      const offer = await webrtcManager.createOffer();
      expect(offer).toEqual({
        type: 'offer',
        sdp: 'mock-sdp'
      });

      // Simulate remote answer
      const answer = { type: 'answer' as RTCSdpType, sdp: 'mock-answer-sdp' };
      await webrtcManager.setRemoteDescription(answer);

      // Simulate ICE candidate exchange
      const iceCandidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0'
      };
      await webrtcManager.addIceCandidate(iceCandidate);

      expect(webrtcManager.getConnectionState()).toBe('new');
    });

    it('should handle patient joining workflow', async () => {
      // Test Requirements: 2.1, 4.1, 4.2
      const sessionId = 'test-session-123';
      const patientId = 'patient-789';
      
      // Initialize as patient (non-initiator)
      await webrtcManager.initializeConnection(
        sessionId,
        false, // isInitiator
        undefined,
        signalingClient,
        patientId,
        'patient'
      );

      // Start local media
      const localStream = await webrtcManager.startLocalMedia();
      expect(localStream).toBeDefined();

      // Simulate receiving offer
      const offer = { type: 'offer' as RTCSdpType, sdp: 'mock-offer-sdp' };
      const answer = await webrtcManager.createAnswer(offer);
      
      expect(answer).toEqual({
        type: 'answer',
        sdp: 'mock-sdp'
      });
    });
  });

  describe('Chat Functionality Across Network Conditions', () => {
    it('should send chat messages via data channel when available', async () => {
      // Test Requirements: 3.1, 3.2
      const sessionId = 'test-session-chat';
      
      await webrtcManager.initializeConnection(
        sessionId,
        true,
        undefined,
        signalingClient,
        'doctor-123',
        'doctor'
      );

      // Mock data channel as open
      const mockDataChannel = {
        readyState: 'open',
        send: vi.fn(),
        close: vi.fn(),
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null
      } as any;

      webrtcManager['dataChannel'] = mockDataChannel;

      const testMessage = 'Hello, how are you feeling?';
      webrtcManager.sendChatMessage(testMessage);

      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringContaining(testMessage)
      );
    });

    it('should fallback to WebSocket when data channel unavailable', async () => {
      // Test Requirements: 3.3
      const sessionId = 'test-session-fallback';
      
      // Mock signaling client with WebSocket fallback
      const mockSignalingClient = {
        isConnectedToServer: vi.fn().mockReturnValue(true),
        sendChatMessage: vi.fn()
      };

      await webrtcManager.initializeConnection(
        sessionId,
        true,
        undefined,
        mockSignalingClient as any,
        'doctor-123',
        'doctor'
      );

      // Ensure no data channel or closed data channel
      webrtcManager['dataChannel'] = null;

      const testMessage = 'Fallback message test';
      webrtcManager.sendChatMessage(testMessage);

      expect(mockSignalingClient.sendChatMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should format chat messages with proper metadata', async () => {
      // Test Requirements: 3.2, 3.4
      const sessionId = 'test-session-format';
      const userId = 'doctor-456';
      
      await webrtcManager.initializeConnection(
        sessionId,
        true,
        undefined,
        signalingClient,
        userId,
        'doctor'
      );

      // Mock data channel
      const mockDataChannel = {
        readyState: 'open',
        send: vi.fn(),
        close: vi.fn(),
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null
      } as any;
      
      webrtcManager['dataChannel'] = mockDataChannel;

      const testMessage = 'Test message with metadata';
      webrtcManager.sendChatMessage(testMessage);

      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringMatching(/"sessionId":"test-session-format"/)
      );
      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringMatching(/"senderId":"doctor-456"/)
      );
      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringMatching(/"senderRole":"doctor"/)
      );
      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringMatching(/"message":"Test message with metadata"/)
      );
    });
  });

  describe('Authentication and Authorization Edge Cases', () => {
    it('should handle invalid JWT tokens', async () => {
      // Test Requirements: 4.1, 4.2
      const invalidToken = 'invalid.jwt.token';
      
      await expect(
        signalingClient.connect('test-session', invalidToken)
      ).rejects.toThrow();
    });

    it('should validate session access permissions', async () => {
      // Test Requirements: 2.1, 4.2
      const sessionId = 'restricted-session';
      
      // This should be handled by the signaling server
      // We test that the client properly sends authentication data
      const connectPromise = signalingClient.connect(sessionId, 'valid-token');
      
      // Mock connection error for unauthorized access
      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'join-session' && callback) {
          callback({ success: false, error: 'Unauthorized access' });
        }
      });

      await expect(connectPromise).rejects.toThrow('Unauthorized access');
    });

    it('should handle token expiration gracefully', async () => {
      // Test Requirements: 4.1
      const expiredToken = 'expired.jwt.token';
      
      // Mock token expiration scenario
      mockSocket.connected = false;
      
      await expect(
        signalingClient.connect('test-session', expiredToken)
      ).rejects.toThrow();
    });
  });

  describe('Media Stream Management', () => {
    it('should handle media stream display correctly', async () => {
      // Test Requirements: 2.5, 7.1, 7.2
      const sessionId = 'ui-test-session';
      
      await webrtcManager.initializeConnection(
        sessionId,
        true,
        undefined,
        signalingClient,
        'doctor-123',
        'doctor'
      );

      const localStream = await webrtcManager.startLocalMedia();
      expect(webrtcManager.isVideoEnabled()).toBe(true);
      expect(webrtcManager.isAudioEnabled()).toBe(true);

      // Test video toggle
      webrtcManager.toggleVideo();
      expect(webrtcManager.isVideoEnabled()).toBe(false);

      // Test audio toggle
      webrtcManager.toggleAudio();
      expect(webrtcManager.isAudioEnabled()).toBe(false);
    });

    it('should validate WebRTC manager state management', async () => {
      // Test Requirements: 7.3, 7.4, 7.5
      const sessionId = 'state-test-session';
      
      await webrtcManager.initializeConnection(
        sessionId,
        true,
        undefined,
        signalingClient,
        'doctor-123',
        'doctor'
      );

      // Check initial state
      expect(webrtcManager.getConnectionState()).toBe('new');
      expect(webrtcManager.isDataChannelAvailable()).toBe(false);
      
      // Check user info setting
      webrtcManager.setUserInfo('test-user', 'doctor');
      expect(webrtcManager['currentUserId']).toBe('test-user');
      expect(webrtcManager['currentUserRole']).toBe('doctor');
    });
  });

  describe('Network Conditions and Error Handling', () => {
    it('should handle connection failures with retry logic', async () => {
      // Test Requirements: 5.1, 5.4, 5.5
      const sessionId = 'retry-test-session';
      
      // Mock connection failure
      mockRTCPeerConnection.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      await expect(
        webrtcManager.initializeConnection(sessionId, true)
      ).rejects.toThrow('Connection failed');
    });

    it('should adapt to network quality changes', async () => {
      // Test Requirements: 5.4, 5.5
      const sessionId = 'quality-test-session';
      
      await webrtcManager.initializeConnection(
        sessionId,
        true,
        undefined,
        signalingClient,
        'doctor-123',
        'doctor'
      );

      // Test network quality monitoring
      const networkQuality = webrtcManager.getNetworkQuality();
      
      // These should be available after initialization
      expect(typeof networkQuality).toBe('string');
    });

    it('should handle media device errors gracefully', async () => {
      // Test Requirements: 5.5
      const sessionId = 'media-error-session';
      
      // Mock media access denial
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied'))
        },
        writable: true
      });

      await webrtcManager.initializeConnection(
        sessionId,
        true,
        undefined,
        signalingClient,
        'doctor-123',
        'doctor'
      );

      await expect(
        webrtcManager.startLocalMedia()
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('Load Testing Simulation', () => {
    it('should handle multiple concurrent sessions', async () => {
      // Test Requirements: 6.1, 6.2 (Minimal server logic)
      const sessions = [];
      const sessionCount = 5;

      for (let i = 0; i < sessionCount; i++) {
        const manager = new WebRTCManager();
        const client = new SignalingClient();
        
        sessions.push({
          manager,
          client,
          sessionId: `load-test-session-${i}`
        });
      }

      // Initialize all sessions
      const initPromises = sessions.map(({ manager, client, sessionId }, index) =>
        manager.initializeConnection(
          sessionId,
          index % 2 === 0, // Alternate between initiator and non-initiator
          undefined,
          client,
          `user-${index}`,
          index % 2 === 0 ? 'doctor' : 'patient'
        )
      );

      // All sessions should initialize successfully
      await Promise.all(initPromises);

      // Cleanup all sessions
      sessions.forEach(({ manager, client }) => {
        manager.cleanup();
        client.cleanup();
      });

      expect(sessions).toHaveLength(sessionCount);
    });

    it('should maintain performance under load', async () => {
      // Test Requirements: Performance and scalability
      const startTime = Date.now();
      const operations = [];

      // Simulate multiple operations
      for (let i = 0; i < 10; i++) {
        const manager = new WebRTCManager();
        operations.push(
          manager.initializeConnection(
            `perf-test-${i}`,
            true,
            undefined,
            signalingClient,
            `user-${i}`,
            'doctor'
          ).then(() => manager.cleanup())
        );
      }

      await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should provide system health status', async () => {
      // Test system monitoring capabilities
      const sessionId = 'health-test-session';
      
      await webrtcManager.initializeConnection(
        sessionId,
        true,
        undefined,
        signalingClient,
        'doctor-123',
        'doctor'
      );

      expect(webrtcManager.isSystemHealthy()).toBe(true);
      
      const errorStats = webrtcManager.getErrorStatistics();
      expect(typeof errorStats).toBe('object');
    });

    it('should track connection statistics', async () => {
      // Test connection monitoring
      const sessionId = 'stats-test-session';
      
      await signalingClient.connect(sessionId, 'test-token');
      
      const stats = signalingClient.getConnectionStats();
      expect(stats).toHaveProperty('isConnected');
      expect(stats).toHaveProperty('reconnectAttempts');
      expect(stats).toHaveProperty('lastHeartbeat');
    });

    it('should cleanup resources properly', async () => {
      // Test resource cleanup
      const sessionId = 'cleanup-test-session';
      
      await webrtcManager.initializeConnection(
        sessionId,
        true,
        undefined,
        signalingClient,
        'doctor-123',
        'doctor'
      );

      await webrtcManager.startLocalMedia();
      
      // Cleanup should not throw errors
      expect(() => webrtcManager.cleanup()).not.toThrow();
      expect(() => signalingClient.cleanup()).not.toThrow();
    });
  });
});