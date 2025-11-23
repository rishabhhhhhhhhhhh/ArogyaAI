/**
 * Network Quality Monitor for WebRTC Video Calling System
 * Implements bandwidth adaptation and quality adjustment
 * Requirements: 5.5, Bandwidth adaptation and quality adjustment
 */

export interface NetworkQualityMetrics {
  bandwidth: number; // kbps
  latency: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
  timestamp: Date;
}

export interface QualityLevel {
  name: string;
  video: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number; // kbps
  };
  audio: {
    bitrate: number; // kbps
    sampleRate: number;
  };
}

export interface AdaptationSettings {
  enableAutomaticAdaptation: boolean;
  minQualityLevel: number;
  maxQualityLevel: number;
  adaptationThreshold: {
    bandwidthDecrease: number; // percentage
    bandwidthIncrease: number; // percentage
    packetLossThreshold: number; // percentage
    latencyThreshold: number; // ms
  };
}

export class NetworkQualityMonitor {
  private peerConnection: RTCPeerConnection | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private qualityLevels: QualityLevel[] = [];
  private currentQualityLevel: number = 2; // Start with medium quality
  private metrics: NetworkQualityMetrics[] = [];
  private adaptationSettings: AdaptationSettings;
  private lastAdaptationTime: number = 0;
  private adaptationCooldown: number = 5000; // 5 seconds

  // Event handlers
  public onQualityChange: ((level: QualityLevel, reason: string) => void) | null = null;
  public onNetworkIssue: ((issue: string, severity: 'low' | 'medium' | 'high') => void) | null = null;
  public onMetricsUpdate: ((metrics: NetworkQualityMetrics) => void) | null = null;

  constructor(adaptationSettings?: Partial<AdaptationSettings>) {
    this.adaptationSettings = {
      enableAutomaticAdaptation: true,
      minQualityLevel: 0,
      maxQualityLevel: 4,
      adaptationThreshold: {
        bandwidthDecrease: 20, // Decrease quality if bandwidth drops by 20%
        bandwidthIncrease: 50, // Increase quality if bandwidth increases by 50%
        packetLossThreshold: 5, // Decrease quality if packet loss > 5%
        latencyThreshold: 300 // Decrease quality if latency > 300ms
      },
      ...adaptationSettings
    };

    this.setupQualityLevels();
  }

  /**
   * Initialize monitoring with RTCPeerConnection
   */
  initialize(peerConnection: RTCPeerConnection): void {
    this.peerConnection = peerConnection;
    this.startMonitoring();
  }

  /**
   * Setup predefined quality levels
   */
  private setupQualityLevels(): void {
    this.qualityLevels = [
      {
        name: 'Low',
        video: { width: 320, height: 240, frameRate: 15, bitrate: 150 },
        audio: { bitrate: 32, sampleRate: 16000 }
      },
      {
        name: 'Medium-Low',
        video: { width: 480, height: 360, frameRate: 20, bitrate: 300 },
        audio: { bitrate: 48, sampleRate: 22050 }
      },
      {
        name: 'Medium',
        video: { width: 640, height: 480, frameRate: 25, bitrate: 500 },
        audio: { bitrate: 64, sampleRate: 44100 }
      },
      {
        name: 'Medium-High',
        video: { width: 960, height: 720, frameRate: 30, bitrate: 1000 },
        audio: { bitrate: 96, sampleRate: 44100 }
      },
      {
        name: 'High',
        video: { width: 1280, height: 720, frameRate: 30, bitrate: 1500 },
        audio: { bitrate: 128, sampleRate: 48000 }
      }
    ];
  }

  /**
   * Start network quality monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 2000); // Collect metrics every 2 seconds
  }

  /**
   * Stop network quality monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect network quality metrics from RTCPeerConnection
   */
  private async collectMetrics(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();
      const metrics = this.parseStats(stats);
      
      if (metrics) {
        this.metrics.push(metrics);
        
        // Keep only last 30 measurements (1 minute of data)
        if (this.metrics.length > 30) {
          this.metrics = this.metrics.slice(-30);
        }

        // Notify metrics update
        if (this.onMetricsUpdate) {
          this.onMetricsUpdate(metrics);
        }

        // Check if adaptation is needed
        if (this.adaptationSettings.enableAutomaticAdaptation) {
          this.checkAdaptationNeeded(metrics);
        }
      }
    } catch (error) {
      console.error('Failed to collect network metrics:', error);
    }
  }

  /**
   * Parse RTCStats to extract network quality metrics
   */
  private parseStats(stats: RTCStatsReport): NetworkQualityMetrics | null {
    let bandwidth = 0;
    let latency = 0;
    let packetLoss = 0;
    let jitter = 0;

    for (const [, stat] of stats) {
      // Inbound RTP stats for receiving
      if (stat.type === 'inbound-rtp' && stat.mediaType === 'video') {
        if (stat.bytesReceived && stat.timestamp) {
          // Calculate bandwidth from bytes received
          const previousStat = this.findPreviousStat(stat.ssrc, 'inbound-rtp');
          if (previousStat) {
            const timeDiff = (stat.timestamp - previousStat.timestamp) / 1000; // seconds
            const bytesDiff = stat.bytesReceived - previousStat.bytesReceived;
            bandwidth = (bytesDiff * 8) / (timeDiff * 1000); // kbps
          }
        }

        // Packet loss calculation
        if (stat.packetsReceived && stat.packetsLost) {
          const totalPackets = stat.packetsReceived + stat.packetsLost;
          packetLoss = totalPackets > 0 ? (stat.packetsLost / totalPackets) * 100 : 0;
        }

        // Jitter
        if (stat.jitter) {
          jitter = stat.jitter * 1000; // Convert to ms
        }
      }

      // Remote inbound RTP stats for RTT (latency)
      if (stat.type === 'remote-inbound-rtp' && stat.roundTripTime) {
        latency = stat.roundTripTime * 1000; // Convert to ms
      }

      // Candidate pair stats for RTT
      if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.currentRoundTripTime) {
        latency = stat.currentRoundTripTime * 1000; // Convert to ms
      }
    }

    return {
      bandwidth,
      latency,
      packetLoss,
      jitter,
      timestamp: new Date()
    };
  }

  /**
   * Find previous stat for comparison
   */
  private findPreviousStat(ssrc: number, type: string): any {
    // This would need to be implemented with stat caching
    // For now, return null to avoid errors
    return null;
  }

  /**
   * Check if quality adaptation is needed based on current metrics
   */
  private checkAdaptationNeeded(currentMetrics: NetworkQualityMetrics): void {
    const now = Date.now();
    
    // Respect cooldown period
    if (now - this.lastAdaptationTime < this.adaptationCooldown) {
      return;
    }

    const shouldDecrease = this.shouldDecreaseQuality(currentMetrics);
    const shouldIncrease = this.shouldIncreaseQuality(currentMetrics);

    if (shouldDecrease && this.currentQualityLevel > this.adaptationSettings.minQualityLevel) {
      this.adaptQuality(this.currentQualityLevel - 1, 'Network conditions degraded');
    } else if (shouldIncrease && this.currentQualityLevel < this.adaptationSettings.maxQualityLevel) {
      this.adaptQuality(this.currentQualityLevel + 1, 'Network conditions improved');
    }
  }

  /**
   * Check if quality should be decreased
   */
  private shouldDecreaseQuality(metrics: NetworkQualityMetrics): boolean {
    const { adaptationThreshold } = this.adaptationSettings;
    
    // Check packet loss
    if (metrics.packetLoss > adaptationThreshold.packetLossThreshold) {
      if (this.onNetworkIssue) {
        this.onNetworkIssue(`High packet loss: ${metrics.packetLoss.toFixed(1)}%`, 'high');
      }
      return true;
    }

    // Check latency
    if (metrics.latency > adaptationThreshold.latencyThreshold) {
      if (this.onNetworkIssue) {
        this.onNetworkIssue(`High latency: ${metrics.latency.toFixed(0)}ms`, 'medium');
      }
      return true;
    }

    // Check bandwidth decrease trend
    if (this.metrics.length >= 3) {
      const recentMetrics = this.metrics.slice(-3);
      const avgBandwidth = recentMetrics.reduce((sum, m) => sum + m.bandwidth, 0) / recentMetrics.length;
      const currentQuality = this.qualityLevels[this.currentQualityLevel];
      
      if (avgBandwidth < currentQuality.video.bitrate * 0.8) { // 80% of required bitrate
        if (this.onNetworkIssue) {
          this.onNetworkIssue(`Insufficient bandwidth: ${avgBandwidth.toFixed(0)} kbps`, 'medium');
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Check if quality should be increased
   */
  private shouldIncreaseQuality(metrics: NetworkQualityMetrics): boolean {
    const { adaptationThreshold } = this.adaptationSettings;
    
    // Only increase if conditions are stable and good
    if (this.metrics.length >= 5) {
      const recentMetrics = this.metrics.slice(-5);
      
      // Check if all recent metrics are good
      const allGoodMetrics = recentMetrics.every(m => 
        m.packetLoss < adaptationThreshold.packetLossThreshold / 2 &&
        m.latency < adaptationThreshold.latencyThreshold / 2
      );

      if (allGoodMetrics) {
        const avgBandwidth = recentMetrics.reduce((sum, m) => sum + m.bandwidth, 0) / recentMetrics.length;
        const nextQuality = this.qualityLevels[this.currentQualityLevel + 1];
        
        if (nextQuality && avgBandwidth > nextQuality.video.bitrate * 1.5) { // 150% of required bitrate
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Adapt to a new quality level
   */
  private adaptQuality(newLevel: number, reason: string): void {
    if (newLevel < 0 || newLevel >= this.qualityLevels.length) {
      return;
    }

    const oldLevel = this.currentQualityLevel;
    this.currentQualityLevel = newLevel;
    this.lastAdaptationTime = Date.now();

    const qualityLevel = this.qualityLevels[newLevel];
    
    console.log(`Quality adapted from ${this.qualityLevels[oldLevel].name} to ${qualityLevel.name}: ${reason}`);

    if (this.onQualityChange) {
      this.onQualityChange(qualityLevel, reason);
    }
  }

  /**
   * Manually set quality level
   */
  setQualityLevel(level: number): boolean {
    if (level < 0 || level >= this.qualityLevels.length) {
      return false;
    }

    this.adaptQuality(level, 'Manual adjustment');
    return true;
  }

  /**
   * Get current quality level
   */
  getCurrentQualityLevel(): QualityLevel {
    return this.qualityLevels[this.currentQualityLevel];
  }

  /**
   * Get all available quality levels
   */
  getQualityLevels(): QualityLevel[] {
    return [...this.qualityLevels];
  }

  /**
   * Get recent network metrics
   */
  getRecentMetrics(count: number = 10): NetworkQualityMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get average metrics over a time period
   */
  getAverageMetrics(periodMs: number = 30000): NetworkQualityMetrics | null {
    const cutoffTime = Date.now() - periodMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);
    
    if (recentMetrics.length === 0) {
      return null;
    }

    const sum = recentMetrics.reduce((acc, m) => ({
      bandwidth: acc.bandwidth + m.bandwidth,
      latency: acc.latency + m.latency,
      packetLoss: acc.packetLoss + m.packetLoss,
      jitter: acc.jitter + m.jitter
    }), { bandwidth: 0, latency: 0, packetLoss: 0, jitter: 0 });

    const count = recentMetrics.length;
    
    return {
      bandwidth: sum.bandwidth / count,
      latency: sum.latency / count,
      packetLoss: sum.packetLoss / count,
      jitter: sum.jitter / count,
      timestamp: new Date()
    };
  }

  /**
   * Enable or disable automatic adaptation
   */
  setAutomaticAdaptation(enabled: boolean): void {
    this.adaptationSettings.enableAutomaticAdaptation = enabled;
  }

  /**
   * Update adaptation settings
   */
  updateAdaptationSettings(settings: Partial<AdaptationSettings>): void {
    this.adaptationSettings = { ...this.adaptationSettings, ...settings };
  }

  /**
   * Get network quality assessment
   */
  getNetworkQualityAssessment(): 'excellent' | 'good' | 'fair' | 'poor' {
    const recent = this.getAverageMetrics(10000); // Last 10 seconds
    
    if (!recent) {
      return 'fair';
    }

    if (recent.packetLoss > 10 || recent.latency > 500) {
      return 'poor';
    } else if (recent.packetLoss > 5 || recent.latency > 300) {
      return 'fair';
    } else if (recent.packetLoss > 2 || recent.latency > 150) {
      return 'good';
    } else {
      return 'excellent';
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.peerConnection = null;
    this.metrics = [];
  }
}