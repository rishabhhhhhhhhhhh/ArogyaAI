/**
 * ICE Server Service Tests
 * Tests for production-ready STUN/TURN server configuration management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { iceServerService } from '../iceServerService';

// Mock the api service
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

describe('ICEServerService', () => {
  beforeEach(() => {
    // Clear cache before each test
    iceServerService.clearCache();
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return fallback servers when API is not available', async () => {
      const iceServers = await iceServerService.getIceServers();
      
      expect(iceServers).toBeDefined();
      expect(Array.isArray(iceServers)).toBe(true);
      expect(iceServers.length).toBeGreaterThan(0);
      
      // Should contain at least Google STUN servers
      const hasGoogleStun = iceServers.some(server => 
        server.urls.includes('stun.l.google.com')
      );
      expect(hasGoogleStun).toBe(true);
    });

    it('should validate ICE server configuration', () => {
      const validServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }
      ];
      
      const invalidServers = [
        { urls: 'invalid:server' },
        { urls: '' },
        {}
      ];
      
      expect(iceServerService.validateIceServers(validServers)).toBe(true);
      expect(iceServerService.validateIceServers(invalidServers as any)).toBe(false);
      expect(iceServerService.validateIceServers([])).toBe(false);
    });

    it('should get WebRTC configuration with ICE servers', async () => {
      const config = await iceServerService.getWebRTCConfiguration();
      
      expect(config).toBeDefined();
      expect(config.iceServers).toBeDefined();
      expect(Array.isArray(config.iceServers)).toBe(true);
      expect(config.iceTransportPolicy).toBe('all');
      expect(config.bundlePolicy).toBe('balanced');
      expect(config.rtcpMuxPolicy).toBe('require');
    });
  });

  describe('Caching', () => {
    it('should cache ICE servers', async () => {
      // First call
      const servers1 = await iceServerService.getIceServers();
      
      // Second call should use cache
      const servers2 = await iceServerService.getIceServers();
      
      expect(servers1).toEqual(servers2);
    });

    it('should provide cache statistics', async () => {
      await iceServerService.getIceServers();
      
      const stats = iceServerService.getServerStatistics();
      
      expect(stats.cachedServers).toBeGreaterThan(0);
      expect(stats.lastFetch).toBeDefined();
      expect(stats.cacheValid).toBe(true);
    });

    it('should clear cache when requested', async () => {
      await iceServerService.getIceServers();
      
      let stats = iceServerService.getServerStatistics();
      expect(stats.cachedServers).toBeGreaterThan(0);
      
      iceServerService.clearCache();
      
      stats = iceServerService.getServerStatistics();
      expect(stats.cachedServers).toBe(0);
      expect(stats.lastFetch).toBeNull();
    });
  });

  describe('Fallback Servers', () => {
    it('should manage fallback servers', () => {
      const initialFallbacks = iceServerService.getFallbackServers();
      expect(initialFallbacks.length).toBeGreaterThan(0);
      
      const newFallbacks = [
        { urls: 'stun:custom.stun.server:3478' }
      ];
      
      iceServerService.addFallbackServers(newFallbacks);
      
      const updatedFallbacks = iceServerService.getFallbackServers();
      expect(updatedFallbacks.length).toBe(initialFallbacks.length + 1);
    });

    it('should not add invalid fallback servers', () => {
      const initialCount = iceServerService.getFallbackServers().length;
      
      const invalidServers = [
        { urls: 'invalid:server' }
      ];
      
      iceServerService.addFallbackServers(invalidServers as any);
      
      const finalCount = iceServerService.getFallbackServers().length;
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Configuration Management', () => {
    it('should allow cache timeout configuration', () => {
      const newTimeout = 10000; // 10 seconds
      iceServerService.setCacheTimeout(newTimeout);
      
      // This is a configuration test, we can't easily test the actual timeout
      // but we can verify the method doesn't throw
      expect(() => iceServerService.setCacheTimeout(newTimeout)).not.toThrow();
    });
  });

  describe('ICE Server Connectivity Testing', () => {
    it('should test ICE server connectivity', async () => {
      const testServers = [
        { urls: 'stun:stun.l.google.com:19302' }
      ];
      
      // Mock RTCPeerConnection for testing
      const mockPeerConnection = {
        createDataChannel: vi.fn(),
        createOffer: vi.fn().mockResolvedValue({}),
        setLocalDescription: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
        onicecandidate: null
      };
      
      // Mock the global RTCPeerConnection
      global.RTCPeerConnection = vi.fn().mockImplementation(() => mockPeerConnection);
      
      const results = await iceServerService.testIceServerConnectivity(testServers);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(testServers.length);
      
      results.forEach(result => {
        expect(result).toHaveProperty('server');
        expect(result).toHaveProperty('reachable');
        expect(typeof result.reachable).toBe('boolean');
      });
    });
  });
});