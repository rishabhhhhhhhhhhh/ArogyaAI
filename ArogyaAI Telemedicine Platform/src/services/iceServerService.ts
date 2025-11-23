/**
 * ICE Server Service for frontend ICE server configuration management
 * Handles fetching, caching, and monitoring of ICE server configuration
 * Requirements: 5.1, 5.2, 5.3
 */

import api from './api';

export interface ICEServerResponse {
  iceServers: RTCIceServer[];
  serverCount: number;
  timestamp: string;
}

export interface ICEServerHealthStatus {
  summary: {
    totalServers: number;
    healthyServers: number;
    lastCheck: string;
    credentialRotation: {
      lastRotation: string;
      nextRotation: string;
    };
  };
  servers: Record<string, {
    type: 'STUN' | 'TURN';
    healthy: boolean;
    lastCheck: string;
    responseTime: number | null;
    error: string | null;
    credentialsValid?: boolean;
    lastCredentialRotation?: string;
  }>;
}

class ICEServerService {
  private cachedIceServers: RTCIceServer[] = [];
  private lastFetch: number = 0;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private fallbackServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ];

  /**
   * Get ICE servers with caching and fallback
   * Requirement 5.1: ICE candidate gathering using STUN servers
   * Requirement 5.2: TURN server relay when direct P2P connection fails
   */
  async getIceServers(): Promise<RTCIceServer[]> {
    try {
      // Check if cached servers are still valid
      const now = Date.now();
      if (this.cachedIceServers.length > 0 && (now - this.lastFetch) < this.cacheTimeout) {
        console.log('Using cached ICE servers');
        return this.cachedIceServers;
      }

      // Fetch fresh ICE servers from backend
      console.log('Fetching fresh ICE servers from backend...');
      
      // Check if api is available (for testing environments)
      if (!api || typeof api.get !== 'function') {
        console.warn('API service not available, using fallback servers');
        return this.fallbackServers;
      }
      
      const response = await api.get<ICEServerResponse>('/sessions/ice-servers');
      
      if (response.data.iceServers && response.data.iceServers.length > 0) {
        this.cachedIceServers = response.data.iceServers;
        this.lastFetch = now;
        
        console.log(`Received ${response.data.serverCount} ICE servers from backend`);
        return this.cachedIceServers;
      } else {
        console.warn('Backend returned empty ICE servers, using fallback');
        // Cache fallback servers to maintain consistency
        this.cachedIceServers = this.fallbackServers;
        this.lastFetch = Date.now();
        return this.fallbackServers;
      }
    } catch (error) {
      console.error('Failed to fetch ICE servers from backend:', error);
      
      // Use cached servers if available, otherwise fallback
      if (this.cachedIceServers.length > 0) {
        console.log('Using cached ICE servers due to fetch error');
        return this.cachedIceServers;
      } else {
        console.log('Using fallback ICE servers due to fetch error');
        // Cache fallback servers to maintain consistency
        this.cachedIceServers = this.fallbackServers;
        this.lastFetch = Date.now();
        return this.fallbackServers;
      }
    }
  }

  /**
   * Get ICE server health status (admin only)
   */
  async getIceServerHealth(): Promise<ICEServerHealthStatus> {
    try {
      const response = await api.get<ICEServerHealthStatus>('/sessions/ice-servers/health');
      return response.data;
    } catch (error) {
      console.error('Failed to get ICE server health status:', error);
      throw error;
    }
  }

  /**
   * Force ICE server health check (admin only)
   */
  async forceHealthCheck(): Promise<ICEServerHealthStatus> {
    try {
      const response = await api.post<ICEServerHealthStatus>('/sessions/ice-servers/health-check');
      return response.data;
    } catch (error) {
      console.error('Failed to force ICE server health check:', error);
      throw error;
    }
  }

  /**
   * Force TURN credential rotation (admin only)
   */
  async forceTurnCredentialRotation(): Promise<{ message: string; timestamp: string }> {
    try {
      const response = await api.post<{ message: string; timestamp: string }>('/sessions/ice-servers/rotate-credentials');
      
      // Clear cache to force fresh fetch
      this.clearCache();
      
      return response.data;
    } catch (error) {
      console.error('Failed to force TURN credential rotation:', error);
      throw error;
    }
  }

  /**
   * Update TURN server configuration (admin only)
   */
  async updateTurnConfiguration(config: {
    servers?: string[];
    username?: string;
    secret?: string;
  }): Promise<{ message: string; timestamp: string }> {
    try {
      const response = await api.put<{ message: string; timestamp: string }>('/sessions/ice-servers/turn-config', config);
      
      // Clear cache to force fresh fetch
      this.clearCache();
      
      return response.data;
    } catch (error) {
      console.error('Failed to update TURN configuration:', error);
      throw error;
    }
  }

  /**
   * Get WebRTC configuration with ICE servers
   * Requirement 5.3: Automatic fallback to TURN server
   */
  async getWebRTCConfiguration(): Promise<RTCConfiguration> {
    const iceServers = await this.getIceServers();
    
    return {
      iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require'
    };
  }

  /**
   * Validate ICE server configuration
   */
  validateIceServers(iceServers: RTCIceServer[]): boolean {
    if (!Array.isArray(iceServers) || iceServers.length === 0) {
      return false;
    }

    return iceServers.every(server => {
      // Check if server has valid URLs
      if (!server.urls) {
        return false;
      }

      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      
      // Validate URL format
      return urls.every(url => {
        return typeof url === 'string' && 
               (url.startsWith('stun:') || url.startsWith('turn:') || url.startsWith('turns:'));
      });
    });
  }

  /**
   * Get server statistics for monitoring
   */
  getServerStatistics(): {
    cachedServers: number;
    lastFetch: string | null;
    cacheAge: number;
    cacheValid: boolean;
  } {
    const now = Date.now();
    const cacheAge = this.lastFetch > 0 ? now - this.lastFetch : 0;
    const cacheValid = cacheAge < this.cacheTimeout;

    return {
      cachedServers: this.cachedIceServers.length,
      lastFetch: this.lastFetch > 0 ? new Date(this.lastFetch).toISOString() : null,
      cacheAge,
      cacheValid
    };
  }

  /**
   * Clear cached ICE servers
   */
  clearCache(): void {
    this.cachedIceServers = [];
    this.lastFetch = 0;
    console.log('ICE server cache cleared');
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(timeoutMs: number): void {
    this.cacheTimeout = timeoutMs;
  }

  /**
   * Add fallback servers
   */
  addFallbackServers(servers: RTCIceServer[]): void {
    if (this.validateIceServers(servers)) {
      this.fallbackServers.push(...servers);
    }
  }

  /**
   * Get fallback servers
   */
  getFallbackServers(): RTCIceServer[] {
    return [...this.fallbackServers];
  }

  /**
   * Test ICE server connectivity (basic validation)
   */
  async testIceServerConnectivity(iceServers: RTCIceServer[]): Promise<{
    server: RTCIceServer;
    reachable: boolean;
    error?: string;
  }[]> {
    const results: {
      server: RTCIceServer;
      reachable: boolean;
      error?: string;
    }[] = [];

    for (const server of iceServers) {
      try {
        // Create a temporary peer connection to test ICE server
        const pc = new RTCPeerConnection({ iceServers: [server] });
        
        // Set a timeout for the test
        const testPromise = new Promise<boolean>((resolve) => {
          let resolved = false;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(false);
            }
          }, 5000); // 5 second timeout
          
          pc.onicecandidate = (event) => {
            if (!resolved && event.candidate) {
              resolved = true;
              clearTimeout(timeout);
              resolve(true);
            }
          };
          
          // Create a data channel to trigger ICE gathering
          pc.createDataChannel('test');
          pc.createOffer().then(offer => pc.setLocalDescription(offer));
        });

        const reachable = await testPromise;
        pc.close();
        
        results.push({
          server,
          reachable
        });
      } catch (error) {
        results.push({
          server,
          reachable: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Monitor ICE server health periodically
   */
  startHealthMonitoring(intervalMs: number = 10 * 60 * 1000): void {
    setInterval(async () => {
      try {
        const iceServers = await this.getIceServers();
        const testResults = await this.testIceServerConnectivity(iceServers);
        
        const healthyServers = testResults.filter(r => r.reachable).length;
        const totalServers = testResults.length;
        
        console.log(`ICE Server Health: ${healthyServers}/${totalServers} servers reachable`);
        
        // Log unhealthy servers
        testResults.filter(r => !r.reachable).forEach(result => {
          console.warn('Unreachable ICE server:', result.server.urls, result.error);
        });
        
      } catch (error) {
        console.error('ICE server health monitoring error:', error);
      }
    }, intervalMs);
  }
}

// Export singleton instance
export const iceServerService = new ICEServerService();
export default iceServerService;