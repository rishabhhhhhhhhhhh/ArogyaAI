/**
 * Signaling Client for WebSocket communication with the signaling server
 * Handles authentication, message routing, and connection management
 * Requirements: 4.1, 4.3, 5.4, 5.5 (Enhanced Error Handling)
 */

import { io, Socket } from 'socket.io-client';
import { ChatMessage } from './webrtcManager';
import { WebRTCErrorHandler, ErrorType } from './errorHandler';
import { NotificationSystem } from './notificationSystem';
import { iceServerService } from './iceServerService';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'join' | 'leave';
  sessionId: string;
  senderId: string;
  data: any;
  timestamp: number;
}

export class SignalingClient {
  private socket: Socket | null = null;
  private sessionId: string = '';
  private token: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private isConnected: boolean = false;
  private iceServers: RTCIceServer[] = [];
  private connectionTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;

  // Error handling and notifications
  private errorHandler: WebRTCErrorHandler;
  private notificationSystem: NotificationSystem;

  // Event handlers
  public onOffer: ((offer: RTCSessionDescriptionInit) => void) | null = null;
  public onAnswer: ((answer: RTCSessionDescriptionInit) => void) | null = null;
  public onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null;
  public onChatMessage: ((message: ChatMessage) => void) | null = null;
  public onConnectionStateChange: ((connected: boolean) => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onUserJoined: ((data: any) => void) | null = null;

  constructor() {
    this.errorHandler = new WebRTCErrorHandler({
      maxRetryAttempts: 5,
      retryDelay: 1000,
      enableLogging: true,
      onError: (error) => {
        if (this.onError) {
          this.onError(error.message);
        }
      }
    });

    this.notificationSystem = new NotificationSystem({
      enableToasts: true,
      enableBrowserNotifications: false,
      enableSounds: false
    });
  }

  /**
   * Connect to the signaling server with authentication
   * Requirement 4.1: JWT authentication for WebSocket connections
   * Requirement 4.3: TLS-encrypted WebSocket connections (wss://)
   * Requirement 5.5: Enhanced error handling and recovery
   */
  async connect(sessionId: string, token: string): Promise<void> {
    this.sessionId = sessionId;
    this.token = token;

    return new Promise((resolve, reject) => {
      try {
        // Notify connection attempt
        this.notificationSystem.notifyConnectionStatus('connecting', 'Connecting to signaling server...');

        // Use the backend server URL for WebSocket connection
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const baseUrl = apiUrl.replace('/api', ''); // Remove /api suffix
        const serverUrl = baseUrl; // Keep HTTP protocol for Socket.IO

        console.log('📡 Connecting to signaling server:', serverUrl);
        console.log('📡 Token length:', this.token.length);
        console.log('📡 Token preview:', this.token.substring(0, 50) + '...');
        console.log('📡 Session ID:', sessionId);
        console.log('📡 Environment API URL:', import.meta.env.VITE_API_URL);

        // Set connection timeout
        this.setConnectionTimeout(15000, () => {
          reject(new Error('Signaling server connection timeout'));
        });

        // Initialize Socket.IO connection with authentication
        this.socket = io(serverUrl, {
          auth: {
            token: this.token
          },
          transports: ['websocket', 'polling'],
          forceNew: true,
          reconnection: false, // We'll handle reconnection manually
          timeout: 10000
        });

        this.setupSocketEventHandlers();

        this.socket.on('connect', () => {
          console.log('📡 ✅ Signaling Socket.IO connected successfully!');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.clearConnectionTimeout();
          this.startHeartbeat();

          this.notificationSystem.notifyConnectionStatus('connected', 'Connected to signaling server');

          if (this.onConnectionStateChange) {
            console.log('📡 ✅ Calling onConnectionStateChange(true)');
            this.onConnectionStateChange(true);
          }

          // Join the session
          console.log('📡 🚪 Attempting to join session:', sessionId);
          this.joinSession(sessionId).then(() => {
            console.log('📡 ✅ Successfully joined session');
            resolve();
          }).catch((error) => {
            console.error('📡 ❌ Failed to join session:', error);
            this.handleSignalingError('Failed to join session', error);
            reject(error);
          });
        });

        this.socket.on('connect_error', (error) => {
          console.error('📡 ❌ Signaling Socket.IO connection error:', error);
          console.error('📡 ❌ Server URL:', serverUrl);
          console.error('📡 ❌ Token length:', this.token.length);
          console.error('📡 ❌ Session ID:', sessionId);
          console.error('📡 ❌ Error details:', error.message, error.description, error.context);
          this.clearConnectionTimeout();

          this.errorHandler.handleError(
            ErrorType.SIGNALING_ERROR,
            'Failed to connect to signaling server',
            error,
            { sessionId, serverUrl }
          );

          this.notificationSystem.notifyConnectionStatus('failed',
            `Connection failed: ${error.message}`);

          reject(new Error(`Failed to connect to signaling server: ${error.message}`));
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Signaling Socket.IO disconnected:', reason);
          this.isConnected = false;
          this.stopHeartbeat();

          this.notificationSystem.notifyConnectionStatus('disconnected',
            `Disconnected: ${reason}`);

          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(false);
          }

          // Handle different disconnect reasons
          this.handleDisconnection(reason);
        });

      } catch (error) {
        this.clearConnectionTimeout();
        this.handleSignalingError('Connection initialization failed', error as Error);
        reject(error);
      }
    });
  }

  /**
   * Join a session after connection is established
   */
  private async joinSession(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('join-session', { sessionId }, (response: any) => {
        if (response.success) {
          console.log('Successfully joined session:', sessionId);
          // Store ICE servers configuration from response
          if (response.iceServers) {
            this.iceServers = response.iceServers;
          } else {
            // Fallback to ICE server service if not provided in response
            iceServerService.getIceServers().then(servers => {
              this.iceServers = servers;
            }).catch(error => {
              console.warn('Failed to get fallback ICE servers:', error);
            });
          }
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to join session'));
        }
      });
    });
  }

  /**
   * Disconnect from the signaling server
   */
  disconnect(): void {
    if (this.socket) {
      // End session before disconnecting
      if (this.sessionId) {
        this.socket.emit('end-session', { sessionId: this.sessionId });
      }

      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  /**
   * Send SDP offer through signaling server
   */
  sendOffer(offer: RTCSessionDescriptionInit): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot send offer: Socket not connected');
      return;
    }

    this.socket.emit('webrtc-offer', {
      sessionId: this.sessionId,
      offer: offer
    });
  }

  /**
   * Send SDP answer through signaling server
   */
  sendAnswer(answer: RTCSessionDescriptionInit): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot send answer: Socket not connected');
      return;
    }

    this.socket.emit('webrtc-answer', {
      sessionId: this.sessionId,
      answer: answer
    });
  }

  /**
   * Send ICE candidate through signaling server
   */
  sendIceCandidate(candidate: RTCIceCandidateInit): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot send ICE candidate: Socket not connected');
      return;
    }

    this.socket.emit('ice-candidate', {
      sessionId: this.sessionId,
      candidate: candidate
    });
  }

  /**
   * Send chat message through signaling server (fallback when data channel unavailable)
   */
  sendChatMessage(message: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot send chat message: Socket not connected');
      return;
    }

    this.socket.emit('chat-message', {
      sessionId: this.sessionId,
      message: message
    });
  }

  /**
   * Set up Socket.IO event handlers for signaling messages
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Handle WebRTC offer messages
    this.socket.on('webrtc-offer', (data: any) => {
      if (this.onOffer && data.offer) {
        this.onOffer(data.offer as RTCSessionDescriptionInit);
      }
    });

    // Handle WebRTC answer messages
    this.socket.on('webrtc-answer', (data: any) => {
      if (this.onAnswer && data.answer) {
        this.onAnswer(data.answer as RTCSessionDescriptionInit);
      }
    });

    // Handle ICE candidate messages
    this.socket.on('ice-candidate', (data: any) => {
      if (this.onIceCandidate && data.candidate) {
        this.onIceCandidate(data.candidate as RTCIceCandidateInit);
      }
    });

    // Handle chat messages
    this.socket.on('chat-message', (data: any) => {
      if (this.onChatMessage) {
        const chatMessage: ChatMessage = {
          id: data.id || crypto.randomUUID(),
          sessionId: data.sessionId,
          senderId: data.senderId,
          senderRole: data.senderRole,
          message: data.message,
          timestamp: new Date(data.timestamp),
          messageType: data.messageType || 'text'
        };
        this.onChatMessage(chatMessage);
      }
    });

    // Handle session events
    this.socket.on('user-joined', (data: any) => {
      console.log('User joined session:', data);
      if (this.onUserJoined) {
        this.onUserJoined(data);
      }
    });

    this.socket.on('user-left', (data: any) => {
      console.log('User left session:', data);
    });

    this.socket.on('session-ended', (data: any) => {
      console.log('Session ended:', data);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(false);
      }
    });

    // Handle errors
    this.socket.on('error', (error: any) => {
      console.error('Signaling server error:', error);
      if (this.onError) {
        this.onError(error.message || 'Unknown signaling error');
      }
    });
  }

  /**
   * Attempt reconnection with exponential backoff
   * Requirement 5.4: Automatic reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      if (this.onError) {
        this.onError('Maximum reconnection attempts exceeded');
      }
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

    setTimeout(() => {
      this.connect(this.sessionId, this.token).catch((error) => {
        console.error('Reconnection failed:', error);

        // Exponential backoff with jitter (max 30 seconds)
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2 + Math.random() * 1000,
          30000
        );

        // Try again if we haven't exceeded max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnection();
        } else {
          if (this.onError) {
            this.onError('Failed to reconnect after maximum attempts');
          }
        }
      });
    }, this.reconnectDelay);
  }

  /**
   * Check if connected to signaling server
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get current socket connection state
   */
  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }

  /**
   * Get ICE servers configuration received from server
   */
  getIceServers(): RTCIceServer[] {
    return this.iceServers;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set maximum reconnection attempts
   */
  setMaxReconnectAttempts(maxAttempts: number): void {
    this.maxReconnectAttempts = maxAttempts;
  }

  /**
   * Handle disconnection with appropriate recovery strategy
   */
  private handleDisconnection(reason: string): void {
    // Determine if reconnection should be attempted
    const shouldReconnect = reason !== 'io client disconnect' &&
      reason !== 'transport close' &&
      this.reconnectAttempts < this.maxReconnectAttempts;

    if (shouldReconnect) {
      this.attemptReconnection();
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.errorHandler.handleError(
        ErrorType.SIGNALING_ERROR,
        'Maximum reconnection attempts exceeded',
        new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`),
        { reason, attempts: this.reconnectAttempts }
      );
    }
  }

  /**
   * Handle signaling errors
   */
  private handleSignalingError(message: string, error: Error): void {
    this.errorHandler.handleError(
      ErrorType.SIGNALING_ERROR,
      message,
      error,
      {
        sessionId: this.sessionId,
        isConnected: this.isConnected,
        reconnectAttempts: this.reconnectAttempts
      }
    );
  }

  /**
   * Set connection timeout
   */
  private setConnectionTimeout(timeout: number, callback: () => void): void {
    this.clearConnectionTimeout();
    this.connectionTimeout = setTimeout(callback, timeout);
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Start heartbeat to monitor connection health
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.lastHeartbeat = Date.now();
        this.socket.emit('ping', { timestamp: this.lastHeartbeat });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check connection health
   */
  isConnectionHealthy(): boolean {
    if (!this.isConnected || !this.socket) {
      return false;
    }

    // Check if heartbeat is recent (within last 60 seconds)
    const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
    return timeSinceHeartbeat < 60000;
  }

  /**
   * Get connection statistics for debugging
   */
  getConnectionStats(): {
    isConnected: boolean;
    reconnectAttempts: number;
    lastHeartbeat: number;
    timeSinceHeartbeat: number;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      timeSinceHeartbeat: Date.now() - this.lastHeartbeat
    };
  }

  /**
   * Reset reconnection state (useful for manual reconnection)
   */
  resetReconnectionState(): void {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }

  /**
   * Create a new session (for doctors initiating calls)
   */
  async createSession(patientId: string, appointmentId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        const error = new Error('Socket not connected');
        this.handleSignalingError('Cannot create session - not connected', error);
        reject(error);
        return;
      }

      this.socket.emit('create-session', {
        patientId,
        appointmentId
      }, (response: any) => {
        if (response.success) {
          resolve(response.session);
        } else {
          const error = new Error(response.error || 'Failed to create session');
          this.handleSignalingError('Session creation failed', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopHeartbeat();
    this.clearConnectionTimeout();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }
}