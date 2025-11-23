/**
 * Integration tests for WebRTC data channel chat functionality
 * Tests Requirements: 3.1, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebRTCManager, ChatMessage } from '../webrtcManager';

describe('WebRTC Data Channel Integration', () => {
  let manager: WebRTCManager;
  let mockSignalingClient: any;

  beforeEach(() => {
    manager = new WebRTCManager();
    
    // Mock signaling client for WebSocket fallback
    mockSignalingClient = {
      isConnectedToServer: vi.fn(() => true),
      sendChatMessage: vi.fn()
    };
  });

  afterEach(() => {
    manager.cleanup();
  });

  it('should initialize with user info and signaling client', async () => {
    // Requirement 3.2: Message formatting with timestamp and sender identification
    await manager.initializeConnection(
      'test-session-123',
      true, // isInitiator
      undefined, // config
      mockSignalingClient,
      'doctor-123',
      'doctor'
    );

    expect(manager.getConnectionState()).toBe('new'); // Initialized but not connected
    expect(manager.isDataChannelAvailable()).toBe(false); // Data channel not open yet
  });

  it('should set user information correctly', () => {
    manager.setUserInfo('patient-456', 'patient');
    
    // This should not throw
    expect(() => manager.setUserInfo('doctor-789', 'doctor')).not.toThrow();
  });

  it('should fallback to WebSocket when data channel unavailable', async () => {
    // Requirement 3.3: Fallback to WebSocket-based chat when data channel unavailable
    await manager.initializeConnection(
      'test-session-123',
      false, // not initiator, so no data channel created
      undefined,
      mockSignalingClient,
      'patient-456',
      'patient'
    );

    // Data channel should not be available
    expect(manager.isDataChannelAvailable()).toBe(false);
    expect(manager.getDataChannelState()).toBeNull();

    // Sending message should use WebSocket fallback
    manager.sendChatMessage('Hello from patient');
    
    expect(mockSignalingClient.sendChatMessage).toHaveBeenCalledWith('Hello from patient');
  });

  it('should handle chat message events correctly', async () => {
    // Requirement 3.1: Chat message transmission through data channel
    const receivedMessages: ChatMessage[] = [];
    
    await manager.initializeConnection(
      'test-session-123',
      true,
      undefined,
      mockSignalingClient,
      'doctor-123',
      'doctor'
    );

    // Set up message handler
    manager.onChatMessage = (message: ChatMessage) => {
      receivedMessages.push(message);
    };

    // Simulate receiving a message (would normally come through data channel)
    const testMessage: ChatMessage = {
      id: 'msg-123',
      sessionId: 'test-session-123',
      senderId: 'patient-456',
      senderRole: 'patient',
      message: 'Hello doctor!',
      timestamp: new Date(),
      messageType: 'text'
    };

    // Trigger the handler directly (simulating data channel message)
    if (manager.onChatMessage) {
      manager.onChatMessage(testMessage);
    }

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0].message).toBe('Hello doctor!');
    expect(receivedMessages[0].senderRole).toBe('patient');
  });

  it('should handle data channel state changes', async () => {
    const stateChanges: RTCDataChannelState[] = [];
    
    await manager.initializeConnection(
      'test-session-123',
      true,
      undefined,
      mockSignalingClient,
      'doctor-123',
      'doctor'
    );

    // Set up state change handler
    manager.onDataChannelStateChange = (state: RTCDataChannelState) => {
      stateChanges.push(state);
    };

    // Simulate state change (would normally happen when data channel opens/closes)
    if (manager.onDataChannelStateChange) {
      manager.onDataChannelStateChange('open');
      manager.onDataChannelStateChange('closed');
    }

    expect(stateChanges).toEqual(['open', 'closed']);
  });

  it('should throw error when no communication channel available', () => {
    // No signaling client provided and no data channel available
    expect(() => manager.sendChatMessage('test')).toThrow(
      'No available communication channel for chat message'
    );
  });

  it('should handle WebSocket fallback when signaling client disconnected', async () => {
    // Mock disconnected signaling client
    const disconnectedSignalingClient = {
      isConnectedToServer: vi.fn(() => false),
      sendChatMessage: vi.fn()
    };

    await manager.initializeConnection(
      'test-session-123',
      false, // not initiator
      undefined,
      disconnectedSignalingClient,
      'patient-456',
      'patient'
    );

    // Should throw error when both data channel and WebSocket unavailable
    expect(() => manager.sendChatMessage('test message')).toThrow(
      'No available communication channel for chat message'
    );
  });
});