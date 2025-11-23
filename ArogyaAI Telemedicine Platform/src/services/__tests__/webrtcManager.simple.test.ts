/**
 * Simple unit tests for WebRTCManager
 * Tests basic functionality and API structure
 */

import { describe, it, expect, vi } from 'vitest';
import { WebRTCManager } from '../webrtcManager';

describe('WebRTCManager - Basic Tests', () => {
  it('should create WebRTCManager instance', () => {
    const manager = new WebRTCManager();
    expect(manager).toBeDefined();
    expect(manager).toBeInstanceOf(WebRTCManager);
  });

  it('should have required methods', () => {
    const manager = new WebRTCManager();
    
    // Connection management methods
    expect(typeof manager.initializeConnection).toBe('function');
    expect(typeof manager.createOffer).toBe('function');
    expect(typeof manager.createAnswer).toBe('function');
    expect(typeof manager.setRemoteDescription).toBe('function');
    expect(typeof manager.addIceCandidate).toBe('function');
    
    // Media management methods
    expect(typeof manager.startLocalMedia).toBe('function');
    expect(typeof manager.stopLocalMedia).toBe('function');
    expect(typeof manager.toggleVideo).toBe('function');
    expect(typeof manager.toggleAudio).toBe('function');
    
    // Chat methods
    expect(typeof manager.sendChatMessage).toBe('function');
    expect(typeof manager.isDataChannelAvailable).toBe('function');
    expect(typeof manager.getDataChannelState).toBe('function');
    expect(typeof manager.setUserInfo).toBe('function');
    
    // State methods
    expect(typeof manager.getConnectionState).toBe('function');
    expect(typeof manager.getIceConnectionState).toBe('function');
    expect(typeof manager.getLocalStream).toBe('function');
    expect(typeof manager.isVideoEnabled).toBe('function');
    expect(typeof manager.isAudioEnabled).toBe('function');
    
    // Cleanup
    expect(typeof manager.cleanup).toBe('function');
  });

  it('should have event handler properties', () => {
    const manager = new WebRTCManager();
    
    expect(manager.onRemoteStream).toBeNull();
    expect(manager.onChatMessage).toBeNull();
    expect(manager.onConnectionStateChange).toBeNull();
    expect(manager.onIceCandidate).toBeNull();
    expect(manager.onDataChannelStateChange).toBeNull();
  });

  it('should return null for connection state when not initialized', () => {
    const manager = new WebRTCManager();
    
    expect(manager.getConnectionState()).toBeNull();
    expect(manager.getIceConnectionState()).toBeNull();
    expect(manager.getLocalStream()).toBeNull();
  });

  it('should return false for media enabled states when no stream', () => {
    const manager = new WebRTCManager();
    
    expect(manager.isVideoEnabled()).toBe(false);
    expect(manager.isAudioEnabled()).toBe(false);
  });

  it('should throw error when creating offer without initialization', async () => {
    const manager = new WebRTCManager();
    
    await expect(manager.createOffer()).rejects.toThrow('Peer connection not initialized');
  });

  it('should throw error when creating answer without initialization', async () => {
    const manager = new WebRTCManager();
    
    const mockOffer = { type: 'offer' as const, sdp: 'test-sdp' };
    await expect(manager.createAnswer(mockOffer)).rejects.toThrow('Peer connection not initialized');
  });

  it('should throw error when setting remote description without initialization', async () => {
    const manager = new WebRTCManager();
    
    const mockDescription = { type: 'offer' as const, sdp: 'test-sdp' };
    await expect(manager.setRemoteDescription(mockDescription)).rejects.toThrow('Peer connection not initialized');
  });

  it('should throw error when adding ICE candidate without initialization', async () => {
    const manager = new WebRTCManager();
    
    const mockCandidate = { candidate: 'test-candidate', sdpMid: 'test', sdpMLineIndex: 0 };
    await expect(manager.addIceCandidate(mockCandidate)).rejects.toThrow('Peer connection not initialized');
  });

  it('should handle cleanup gracefully when not initialized', () => {
    const manager = new WebRTCManager();
    
    // Should not throw
    expect(() => manager.cleanup()).not.toThrow();
    expect(() => manager.stopLocalMedia()).not.toThrow();
    expect(() => manager.toggleVideo()).not.toThrow();
    expect(() => manager.toggleAudio()).not.toThrow();
  });

  it('should return false for data channel availability when not initialized', () => {
    const manager = new WebRTCManager();
    
    expect(manager.isDataChannelAvailable()).toBe(false);
    expect(manager.getDataChannelState()).toBeNull();
  });

  it('should throw error when sending chat message without available channel', () => {
    const manager = new WebRTCManager();
    
    expect(() => manager.sendChatMessage('test message')).toThrow('No available communication channel for chat message');
  });

  it('should set user info correctly', () => {
    const manager = new WebRTCManager();
    
    // Should not throw
    expect(() => manager.setUserInfo('user123', 'doctor')).not.toThrow();
    expect(() => manager.setUserInfo('patient456', 'patient')).not.toThrow();
  });

  it('should handle sendChatMessage with mock signaling client fallback', () => {
    const manager = new WebRTCManager();
    
    // Mock signaling client
    const mockSignalingClient = {
      isConnectedToServer: () => true,
      sendChatMessage: vi.fn()
    };
    
    // Initialize with mock signaling client
    manager.initializeConnection('session123', false, undefined, mockSignalingClient, 'user123', 'doctor');
    
    // Should use WebSocket fallback
    expect(() => manager.sendChatMessage('test message')).not.toThrow();
    expect(mockSignalingClient.sendChatMessage).toHaveBeenCalledWith('test message');
  });
});