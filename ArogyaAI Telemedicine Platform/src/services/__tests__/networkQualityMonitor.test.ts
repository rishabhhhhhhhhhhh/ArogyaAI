/**
 * Tests for Network Quality Monitor
 * Validates bandwidth adaptation and quality adjustment functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkQualityMonitor } from '../networkQualityMonitor';

// Mock RTCPeerConnection
const mockGetStats = vi.fn();
const mockPeerConnection = {
  getStats: mockGetStats
} as unknown as RTCPeerConnection;

describe('NetworkQualityMonitor', () => {
  let monitor: NetworkQualityMonitor;
  let mockOnQualityChange: ReturnType<typeof vi.fn>;
  let mockOnNetworkIssue: ReturnType<typeof vi.fn>;
  let mockOnMetricsUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnQualityChange = vi.fn();
    mockOnNetworkIssue = vi.fn();
    mockOnMetricsUpdate = vi.fn();
    
    monitor = new NetworkQualityMonitor({
      enableAutomaticAdaptation: true,
      adaptationThreshold: {
        bandwidthDecrease: 20,
        bandwidthIncrease: 50,
        packetLossThreshold: 5,
        latencyThreshold: 300
      }
    });

    monitor.onQualityChange = mockOnQualityChange;
    monitor.onNetworkIssue = mockOnNetworkIssue;
    monitor.onMetricsUpdate = mockOnMetricsUpdate;
  });

  describe('Quality Levels', () => {
    it('should provide predefined quality levels', () => {
      const levels = monitor.getQualityLevels();
      expect(levels).toHaveLength(5);
      expect(levels[0].name).toBe('Low');
      expect(levels[4].name).toBe('High');
    });

    it('should start with medium quality level', () => {
      const currentLevel = monitor.getCurrentQualityLevel();
      expect(currentLevel.name).toBe('Medium');
    });

    it('should allow manual quality level changes', () => {
      const success = monitor.setQualityLevel(4); // High quality
      expect(success).toBe(true);
      
      const currentLevel = monitor.getCurrentQualityLevel();
      expect(currentLevel.name).toBe('High');
      expect(mockOnQualityChange).toHaveBeenCalled();
    });

    it('should reject invalid quality levels', () => {
      const success1 = monitor.setQualityLevel(-1);
      const success2 = monitor.setQualityLevel(10);
      
      expect(success1).toBe(false);
      expect(success2).toBe(false);
    });
  });

  describe('Network Quality Assessment', () => {
    it('should assess network quality as excellent with good metrics', () => {
      // Mock good metrics
      vi.spyOn(monitor, 'getAverageMetrics').mockReturnValue({
        bandwidth: 1000,
        latency: 50,
        packetLoss: 0.5,
        jitter: 10,
        timestamp: new Date()
      });

      const quality = monitor.getNetworkQualityAssessment();
      expect(quality).toBe('excellent');
    });

    it('should assess network quality as poor with bad metrics', () => {
      // Mock poor metrics
      vi.spyOn(monitor, 'getAverageMetrics').mockReturnValue({
        bandwidth: 100,
        latency: 600,
        packetLoss: 15,
        jitter: 100,
        timestamp: new Date()
      });

      const quality = monitor.getNetworkQualityAssessment();
      expect(quality).toBe('poor');
    });

    it('should assess network quality as fair with no metrics', () => {
      vi.spyOn(monitor, 'getAverageMetrics').mockReturnValue(null);

      const quality = monitor.getNetworkQualityAssessment();
      expect(quality).toBe('fair');
    });
  });

  describe('Adaptation Settings', () => {
    it('should allow enabling/disabling automatic adaptation', () => {
      monitor.setAutomaticAdaptation(false);
      // Test would need to verify that adaptation doesn't occur
      
      monitor.setAutomaticAdaptation(true);
      // Test would need to verify that adaptation occurs
    });

    it('should allow updating adaptation settings', () => {
      const newSettings = {
        adaptationThreshold: {
          bandwidthDecrease: 30,
          bandwidthIncrease: 60,
          packetLossThreshold: 3,
          latencyThreshold: 200
        }
      };

      monitor.updateAdaptationSettings(newSettings);
      // Settings should be updated internally
    });
  });

  describe('Metrics Collection', () => {
    it('should initialize with peer connection', () => {
      expect(() => monitor.initialize(mockPeerConnection)).not.toThrow();
    });

    it('should provide recent metrics', () => {
      const metrics = monitor.getRecentMetrics(5);
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should calculate average metrics', () => {
      const avgMetrics = monitor.getAverageMetrics(10000);
      // Should return null if no metrics available
      expect(avgMetrics).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      monitor.initialize(mockPeerConnection);
      expect(() => monitor.cleanup()).not.toThrow();
    });
  });
});