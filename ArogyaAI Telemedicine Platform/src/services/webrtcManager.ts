/**
 * WebRTC Manager for handling peer-to-peer video calling functionality
 * Implements Requirements: 2.2, 2.3, 2.4, 5.1, 5.5 (Error Handling)
 */

import { WebRTCErrorHandler, ErrorType, ErrorSeverity } from './errorHandler';
import { NetworkQualityMonitor, QualityLevel, NetworkQualityMetrics } from './networkQualityMonitor';
import { NotificationSystem, NotificationType, NotificationCategory } from './notificationSystem';
import { iceServerService } from './iceServerService';

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderRole: 'doctor' | 'patient';
  message: string;
  timestamp: Date;
  messageType: 'text' | 'system';
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private sessionId: string = '';
  private isInitiator: boolean = false;
  private signalingClient: any = null; // Will be injected for WebSocket fallback
  private currentUserId: string = '';
  private currentUserRole: 'doctor' | 'patient' = 'doctor';

  // Error handling and monitoring
  private errorHandler: WebRTCErrorHandler;
  private networkMonitor: NetworkQualityMonitor;
  private notificationSystem: NotificationSystem;
  private connectionRetryCount: number = 0;
  private maxConnectionRetries: number = 3;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private mediaConstraints: MediaStreamConstraints | null = null;

  // Event handlers
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onChatMessage: ((message: ChatMessage) => void) | null = null;
  public onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;
  public onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
  public onDataChannelStateChange: ((state: RTCDataChannelState) => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onNetworkQualityChange: ((quality: string, metrics: NetworkQualityMetrics) => void) | null = null;

  constructor() {
    // Initialize error handling and monitoring systems with fallbacks
    try {
      this.errorHandler = new WebRTCErrorHandler({
        maxRetryAttempts: 3,
        retryDelay: 1000,
        enableLogging: true,
        onError: (error) => {
          if (this.onError) {
            this.onError(error.message);
          }
        },
        onRecovery: (error) => {
          console.log('Connection recovered from:', error.type);
        }
      });
    } catch (error) {
      console.warn('WebRTCErrorHandler not available, using fallback');
      this.errorHandler = {
        handleError: (type: any, message: string, error: Error) => {
          console.error(`WebRTC Error [${type}]:`, message, error);
          return Promise.resolve();
        },
        isSystemHealthy: () => true,
        getErrorStatistics: () => ({}),
        clearErrorHistory: () => {}
      } as any;
    }

    try {
      this.networkMonitor = new NetworkQualityMonitor({
        enableAutomaticAdaptation: true,
        adaptationThreshold: {
          bandwidthDecrease: 20,
          bandwidthIncrease: 50,
          packetLossThreshold: 5,
          latencyThreshold: 300
        }
      });

      // Setup network quality monitoring callbacks
      this.networkMonitor.onQualityChange = (level: QualityLevel, reason: string) => {
        this.handleQualityChange(level, reason);
      };

      this.networkMonitor.onNetworkIssue = (issue: string, severity: 'low' | 'medium' | 'high') => {
        this.handleNetworkIssue(issue, severity);
      };

      this.networkMonitor.onMetricsUpdate = (metrics: NetworkQualityMetrics) => {
        if (this.onNetworkQualityChange) {
          const quality = this.networkMonitor.getNetworkQualityAssessment();
          this.onNetworkQualityChange(quality, metrics);
        }
      };
    } catch (error) {
      console.warn('NetworkQualityMonitor not available, using fallback');
      this.networkMonitor = {
        initialize: () => {},
        stopMonitoring: () => {},
        cleanup: () => {},
        getAverageMetrics: () => null,
        getNetworkQualityAssessment: () => 'good'
      } as any;
    }

    try {
      this.notificationSystem = new NotificationSystem({
        enableToasts: true,
        enableBrowserNotifications: false,
        enableSounds: false,
        maxNotifications: 10,
        defaultDuration: 5000
      });
    } catch (error) {
      console.warn('NotificationSystem not available, using fallback');
      this.notificationSystem = {
        notifyConnectionStatus: (status: string, message: string) => {
          console.log(`Connection Status [${status}]:`, message);
        },
        notifyMediaStatus: (device: string, status: string, message: string) => {
          console.log(`Media Status [${device}] [${status}]:`, message);
        },
        notifyNetworkQuality: (quality: string, message: string) => {
          console.log(`Network Quality [${quality}]:`, message);
        },
        notifySystem: (type: string, title: string, message: string) => {
          console.log(`System [${type}] ${title}:`, message);
        }
      } as any;
    }
  }

  /**
   * Initialize WebRTC connection with session configuration
   * Requirement 2.2: Establish RTCPeerConnection with ICE server configuration
   * Requirement 5.5: Comprehensive error handling and recovery
   */
  async initializeConnection(
    sessionId: string, 
    isInitiator: boolean, 
    config?: WebRTCConfig,
    signalingClient?: any,
    userId?: string,
    userRole?: 'doctor' | 'patient'
  ): Promise<void> {
    try {
      this.sessionId = sessionId;
      this.isInitiator = isInitiator;
      this.signalingClient = signalingClient;
      this.currentUserId = userId || 'unknown-user';
      this.currentUserRole = userRole || 'doctor';

      // Notify connection attempt
      this.notificationSystem.notifyConnectionStatus('connecting', 'Initializing WebRTC connection...');

      // Get production-ready WebRTC configuration with ICE servers
      let rtcConfig: RTCConfiguration;
      
      if (config && config.iceServers) {
        // Use provided configuration
        rtcConfig = {
          iceServers: config.iceServers,
          iceTransportPolicy: config.iceTransportPolicy || 'all',
          bundlePolicy: config.bundlePolicy || 'balanced',
          rtcpMuxPolicy: config.rtcpMuxPolicy || 'require',
          iceCandidatePoolSize: 10 // Increase candidate pool for better connectivity
        };
      } else {
        // Get fresh ICE servers from the service
        rtcConfig = await iceServerService.getWebRTCConfiguration();
        rtcConfig.iceCandidatePoolSize = 10; // Increase candidate pool
      }
      
      console.log('WebRTC configuration:', {
        iceServersCount: rtcConfig.iceServers?.length || 0,
        iceTransportPolicy: rtcConfig.iceTransportPolicy,
        iceCandidatePoolSize: rtcConfig.iceCandidatePoolSize
      });

      this.peerConnection = new RTCPeerConnection(rtcConfig);

      // Set up event handlers
      this.setupPeerConnectionHandlers();

      // Initialize network monitoring
      this.networkMonitor.initialize(this.peerConnection);

      // Create data channel for chat if initiator
      if (this.isInitiator) {
        this.createDataChannel();
      }

      // Set connection timeout
      this.setConnectionTimeout();

    } catch (error) {
      await this.errorHandler.handleError(
        ErrorType.CONNECTION_FAILED,
        'Failed to initialize WebRTC connection',
        error as Error,
        { sessionId, isInitiator, userId, userRole }
      );
      throw error;
    }
  }

  /**
   * Set up RTCPeerConnection event handlers
   * Requirement 5.1: Connection state monitoring and error handling
   * Requirement 5.5: Enhanced error handling and recovery
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;

    // Handle ICE candidates with filtering and optimization
    this.peerConnection.onicecandidate = (event) => {
      try {
        if (event.candidate && this.onIceCandidate) {
          console.log('Sending ICE candidate:', event.candidate.candidate);
          // Filter and optimize ICE candidates
          const filteredCandidate = this.filterIceCandidate(event.candidate);
          if (filteredCandidate) {
            this.onIceCandidate(filteredCandidate);
          }
        } else if (!event.candidate) {
          console.log('ICE gathering completed');
        }
      } catch (error) {
        this.errorHandler.handleError(
          ErrorType.ICE_CONNECTION_FAILED,
          'Failed to handle ICE candidate',
          error as Error
        );
      }
    };

    // Handle remote stream - Enhanced with better logging and error handling
    this.peerConnection.ontrack = (event) => {
      try {
        console.log('Received remote track:', {
          kind: event.track.kind,
          id: event.track.id,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          streamsCount: event.streams.length
        });

        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          console.log('Remote stream details:', {
            id: remoteStream.id,
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length,
            active: remoteStream.active
          });

          if (this.onRemoteStream) {
            this.onRemoteStream(remoteStream);
            this.notificationSystem.notifyConnectionStatus('connected', 'Remote video stream received');
          }
        } else {
          console.warn('No streams in track event');
        }
      } catch (error) {
        console.error('Error handling remote track:', error);
        this.errorHandler.handleError(
          ErrorType.MEDIA_DEVICE_ERROR,
          'Failed to handle remote stream',
          error as Error
        );
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;

      const state = this.peerConnection.connectionState;
      console.log('Connection state changed:', state);

      try {
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(state);
        }

        switch (state) {
          case 'connecting':
            this.notificationSystem.notifyConnectionStatus('connecting', 'Establishing peer connection...');
            break;
          case 'connected':
            this.connectionRetryCount = 0;
            this.clearConnectionTimeout();
            this.notificationSystem.notifyConnectionStatus('connected', 'Peer connection established');
            break;
          case 'disconnected':
            this.notificationSystem.notifyConnectionStatus('disconnected', 'Peer connection lost');
            this.handleConnectionFailure();
            break;
          case 'failed':
            this.notificationSystem.notifyConnectionStatus('failed', 'Peer connection failed');
            this.handleConnectionFailure();
            break;
          case 'closed':
            this.cleanup();
            break;
        }
      } catch (error) {
        this.errorHandler.handleError(
          ErrorType.CONNECTION_FAILED,
          'Error handling connection state change',
          error as Error,
          { state }
        );
      }
    };

    // Handle data channel from remote peer
    this.peerConnection.ondatachannel = (event) => {
      try {
        const channel = event.channel;
        this.setupDataChannelHandlers(channel);
      } catch (error) {
        this.errorHandler.handleError(
          ErrorType.DATA_CHANNEL_ERROR,
          'Failed to handle incoming data channel',
          error as Error
        );
      }
    };

    // Handle ICE connection state changes for detailed error handling
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;

      const iceState = this.peerConnection.iceConnectionState;
      console.log('ICE connection state:', iceState);

      try {
        switch (iceState) {
          case 'checking':
            this.notificationSystem.notifyConnectionStatus('connecting', 'Checking network connectivity...');
            break;
          case 'connected':
          case 'completed':
            this.connectionRetryCount = 0;
            this.clearConnectionTimeout();
            break;
          case 'disconnected':
            this.handleIceDisconnection();
            break;
          case 'failed':
            this.handleIceConnectionFailure();
            break;
          case 'closed':
            this.cleanup();
            break;
        }
      } catch (error) {
        this.errorHandler.handleError(
          ErrorType.ICE_CONNECTION_FAILED,
          'Error handling ICE connection state change',
          error as Error,
          { iceState }
        );
      }
    };

    // Handle ICE gathering state changes
    this.peerConnection.onicegatheringstatechange = () => {
      if (!this.peerConnection) return;

      const gatheringState = this.peerConnection.iceGatheringState;
      console.log('ICE gathering state:', gatheringState);

      if (gatheringState === 'complete') {
        this.clearConnectionTimeout();
      }
    };
  }

  /**
   * Create data channel for chat messaging
   * Requirement 3.1: RTCDataChannel creation for real-time text messaging
   */
  private createDataChannel(): void {
    if (!this.peerConnection) return;

    this.dataChannel = this.peerConnection.createDataChannel('chat', {
      ordered: true,
      maxRetransmits: 3
    });

    this.setupDataChannelHandlers(this.dataChannel);
  }

  /**
   * Set up data channel event handlers
   * Requirement 3.2: Chat message transmission through data channel
   */
  private setupDataChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('Data channel opened for chat');
      if (this.onDataChannelStateChange) {
        this.onDataChannelStateChange(channel.readyState);
      }
    };

    channel.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        // Validate message format
        if (this.isValidChatMessage(message)) {
          if (this.onChatMessage) {
            this.onChatMessage(message);
          }
        } else {
          console.warn('Received invalid chat message format:', event.data);
        }
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      if (this.onDataChannelStateChange) {
        this.onDataChannelStateChange(channel.readyState);
      }
    };

    // Store reference to the data channel
    if (!this.dataChannel) {
      this.dataChannel = channel;
    }
  }

  /**
   * Start local media stream (camera/microphone access)
   * Requirement 2.2: Local media stream handling
   * Requirement 5.5: Media device error handling with graceful degradation
   */
  async startLocalMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    try {
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 }, // Lower frame rate for better bandwidth
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1 // Mono audio for better bandwidth
        }
      };

      let mediaConstraints = constraints || defaultConstraints;
      this.mediaConstraints = mediaConstraints;

      try {
        // First attempt with full constraints
        console.log('Requesting media with constraints:', mediaConstraints);
        this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        console.log('Local media stream obtained:', {
          id: this.localStream.id,
          videoTracks: this.localStream.getVideoTracks().length,
          audioTracks: this.localStream.getAudioTracks().length,
          active: this.localStream.active
        });
        
        // Notify successful media access
        if (mediaConstraints.video) {
          this.notificationSystem.notifyMediaStatus('camera', 'enabled', 'Camera access granted');
        }
        if (mediaConstraints.audio) {
          this.notificationSystem.notifyMediaStatus('microphone', 'enabled', 'Microphone access granted');
        }

      } catch (error) {
        // Handle media access errors with graceful degradation
        await this.handleMediaAccessError(error as Error, mediaConstraints);
      }

      // Add tracks to peer connection with enhanced logging
      if (this.peerConnection && this.localStream) {
        console.log('Adding local tracks to peer connection...');
        this.localStream.getTracks().forEach((track, index) => {
          if (this.peerConnection && this.localStream) {
            console.log(`Adding track ${index + 1}:`, {
              kind: track.kind,
              id: track.id,
              enabled: track.enabled,
              readyState: track.readyState
            });
            
            const sender = this.peerConnection.addTrack(track, this.localStream);
            console.log('Track added, sender:', sender);
          }
        });

        // Setup track event handlers for error monitoring
        this.setupMediaTrackHandlers();
      }

      return this.localStream!;
    } catch (error) {
      await this.errorHandler.handleError(
        ErrorType.MEDIA_ACCESS_DENIED,
        'Failed to access media devices',
        error as Error,
        { constraints }
      );
      throw error;
    }
  }

  /**
   * Stop local media stream
   */
  stopLocalMedia(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  /**
   * Toggle video track enabled/disabled
   */
  toggleVideo(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }

  /**
   * Toggle audio track enabled/disabled
   */
  toggleAudio(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }

  /**
   * Check if video is currently enabled
   */
  isVideoEnabled(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      return videoTrack ? videoTrack.enabled : false;
    }
    return false;
  }

  /**
   * Check if audio is currently enabled
   */
  isAudioEnabled(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      return audioTrack ? audioTrack.enabled : false;
    }
    return false;
  }

  /**
   * Create SDP offer for call initiation
   * Requirement 2.3: Offer/answer creation and handling
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('Creating WebRTC offer...');
      
      // Ensure we have local media before creating offer
      if (!this.localStream) {
        console.log('No local stream, starting media first...');
        await this.startLocalMedia();
      }

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: false
      });

      console.log('Offer created:', {
        type: offer.type,
        sdpLength: offer.sdp?.length || 0
      });

      await this.peerConnection.setLocalDescription(offer);
      console.log('Local description set for offer');
      
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw new Error(`Failed to create offer: ${error}`);
    }
  }

  /**
   * Create SDP answer in response to an offer
   * Requirement 2.3: Offer/answer creation and handling
   */
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('Received offer, creating answer...', {
        type: offer.type,
        sdpLength: offer.sdp?.length || 0
      });

      // Ensure we have local media before creating answer
      if (!this.localStream) {
        console.log('No local stream, starting media first...');
        await this.startLocalMedia();
      }

      await this.peerConnection.setRemoteDescription(offer);
      console.log('Remote description set from offer');
      
      const answer = await this.peerConnection.createAnswer();
      console.log('Answer created:', {
        type: answer.type,
        sdpLength: answer.sdp?.length || 0
      });
      
      await this.peerConnection.setLocalDescription(answer);
      console.log('Local description set for answer');
      
      return answer;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw new Error(`Failed to create answer: ${error}`);
    }
  }

  /**
   * Set remote description (offer or answer)
   * Requirement 2.3: Remote description handling
   */
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('Setting remote description:', {
        type: description.type,
        sdpLength: description.sdp?.length || 0
      });
      
      await this.peerConnection.setRemoteDescription(description);
      console.log('Remote description set successfully');
    } catch (error) {
      console.error('Error setting remote description:', error);
      throw new Error(`Failed to set remote description: ${error}`);
    }
  }

  /**
   * Add ICE candidate for connection establishment
   * Requirement 2.4: ICE candidate gathering and exchange
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('Adding ICE candidate:', {
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid
      });
      
      await this.peerConnection.addIceCandidate(candidate);
      console.log('ICE candidate added successfully');
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
      // Don't throw error for ICE candidate failures as they're common
      console.warn('ICE candidate failed, but continuing...');
    }
  }

  /**
   * Send chat message through data channel with WebSocket fallback
   * Requirement 3.1: Chat message transmission through data channel
   * Requirement 3.3: Fallback to WebSocket-based chat when data channel unavailable
   */
  sendChatMessage(message: string): void {
    const chatMessage: ChatMessage = this.createChatMessage(message);

    // Try data channel first
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(chatMessage));
        console.log('Chat message sent via data channel');
        return;
      } catch (error) {
        console.warn('Failed to send via data channel, falling back to WebSocket:', error);
      }
    }

    // Fallback to WebSocket signaling
    if (this.signalingClient && this.signalingClient.isConnectedToServer()) {
      try {
        this.signalingClient.sendChatMessage(message);
        console.log('Chat message sent via WebSocket fallback');
      } catch (error) {
        console.error('Failed to send chat message via WebSocket fallback:', error);
        throw new Error(`Failed to send chat message: ${error}`);
      }
    } else {
      throw new Error('No available communication channel for chat message');
    }
  }

  /**
   * Create formatted chat message with timestamp and sender identification
   * Requirement 3.2: Message formatting with timestamp and sender identification
   */
  private createChatMessage(message: string): ChatMessage {
    return {
      id: crypto.randomUUID(),
      sessionId: this.sessionId,
      senderId: this.currentUserId,
      senderRole: this.currentUserRole,
      message: message.trim(),
      timestamp: new Date(),
      messageType: 'text'
    };
  }

  /**
   * Validate chat message format
   */
  private isValidChatMessage(message: any): message is ChatMessage {
    return (
      typeof message === 'object' &&
      typeof message.id === 'string' &&
      typeof message.sessionId === 'string' &&
      typeof message.senderId === 'string' &&
      (message.senderRole === 'doctor' || message.senderRole === 'patient') &&
      typeof message.message === 'string' &&
      message.timestamp instanceof Date || typeof message.timestamp === 'string' &&
      typeof message.messageType === 'string'
    );
  }

  /**
   * Handle connection failures with retry logic
   * Requirement 5.1: Error handling and recovery
   */
  private async handleConnectionFailure(): Promise<void> {
    console.log('Handling connection failure, attempting ICE restart...');
    
    if (this.peerConnection) {
      try {
        // Attempt ICE restart
        const offer = await this.peerConnection.createOffer({ iceRestart: true });
        await this.peerConnection.setLocalDescription(offer);
        
        // Notify about the restart attempt through ICE candidate handler
        if (this.onIceCandidate) {
          // The actual restart will be handled by the signaling layer
          console.log('ICE restart initiated');
        }
      } catch (error) {
        console.error('ICE restart failed:', error);
      }
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection ? this.peerConnection.connectionState : null;
  }

  /**
   * Get current ICE connection state
   */
  getIceConnectionState(): RTCIceConnectionState | null {
    return this.peerConnection ? this.peerConnection.iceConnectionState : null;
  }

  /**
   * Get local media stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Check if video is enabled
   */
  isVideoEnabled(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      return videoTrack ? videoTrack.enabled : false;
    }
    return false;
  }

  /**
   * Check if audio is enabled
   */
  isAudioEnabled(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      return audioTrack ? audioTrack.enabled : false;
    }
    return false;
  }

  /**
   * Check if data channel is available for chat
   */
  isDataChannelAvailable(): boolean {
    return this.dataChannel !== null && this.dataChannel.readyState === 'open';
  }

  /**
   * Get data channel state
   */
  getDataChannelState(): RTCDataChannelState | null {
    return this.dataChannel ? this.dataChannel.readyState : null;
  }

  /**
   * Set user information for chat messages
   */
  setUserInfo(userId: string, userRole: 'doctor' | 'patient'): void {
    this.currentUserId = userId;
    this.currentUserRole = userRole;
  }

  /**
   * Handle media access errors with graceful degradation
   * Requirement 5.5: Media device error handling with graceful degradation
   */
  private async handleMediaAccessError(error: Error, originalConstraints: MediaStreamConstraints): Promise<void> {
    console.warn('Media access error, attempting graceful degradation:', error);

    // Check if it's a permission denied error
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      if (originalConstraints.video) {
        this.notificationSystem.notifyMediaStatus('camera', 'permission_denied', 
          'Camera access denied. Please allow camera access and refresh the page.');
      }
      if (originalConstraints.audio) {
        this.notificationSystem.notifyMediaStatus('microphone', 'permission_denied', 
          'Microphone access denied. Please allow microphone access and refresh the page.');
      }
      
      await this.errorHandler.handleError(
        ErrorType.MEDIA_ACCESS_DENIED,
        'Media access permission denied',
        error,
        { originalConstraints }
      );
      return;
    }

    // Try fallback strategies
    const fallbackStrategies = [
      // Try audio-only if video fails
      () => originalConstraints.video ? { audio: originalConstraints.audio } : null,
      // Try lower quality video
      () => originalConstraints.video ? {
        video: { width: 640, height: 480, frameRate: 15 },
        audio: originalConstraints.audio
      } : null,
      // Try audio-only with basic settings
      () => ({ audio: true })
    ];

    for (const strategy of fallbackStrategies) {
      const fallbackConstraints = strategy();
      if (!fallbackConstraints) continue;

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        
        // Notify about fallback
        if (!fallbackConstraints.video && originalConstraints.video) {
          this.notificationSystem.notifyMediaStatus('camera', 'error', 
            'Camera unavailable, continuing with audio only');
        }
        
        console.log('Successfully fell back to constraints:', fallbackConstraints);
        return;
      } catch (fallbackError) {
        console.warn('Fallback strategy failed:', fallbackError);
      }
    }

    // If all fallbacks fail, throw the original error
    throw error;
  }

  /**
   * Setup media track event handlers for error monitoring
   */
  private setupMediaTrackHandlers(): void {
    if (!this.localStream) return;

    this.localStream.getTracks().forEach(track => {
      track.addEventListener('ended', () => {
        const trackKind = track.kind as 'video' | 'audio';
        const deviceType = trackKind === 'video' ? 'camera' : 'microphone';
        
        this.notificationSystem.notifyMediaStatus(deviceType, 'error', 
          `${trackKind} track ended unexpectedly`);
        
        this.errorHandler.handleError(
          ErrorType.MEDIA_DEVICE_ERROR,
          `${trackKind} track ended`,
          new Error(`${trackKind} track ended unexpectedly`),
          { trackKind, trackId: track.id }
        );
      });

      track.addEventListener('mute', () => {
        const trackKind = track.kind as 'video' | 'audio';
        const deviceType = trackKind === 'video' ? 'camera' : 'microphone';
        
        this.notificationSystem.notifyMediaStatus(deviceType, 'disabled', 
          `${trackKind} muted`);
      });

      track.addEventListener('unmute', () => {
        const trackKind = track.kind as 'video' | 'audio';
        const deviceType = trackKind === 'video' ? 'camera' : 'microphone';
        
        this.notificationSystem.notifyMediaStatus(deviceType, 'enabled', 
          `${trackKind} unmuted`);
      });
    });
  }

  /**
   * Handle ICE disconnection with retry logic
   */
  private async handleIceDisconnection(): Promise<void> {
    console.log('ICE connection disconnected, attempting recovery...');
    
    // Wait a bit for potential reconnection
    setTimeout(async () => {
      if (this.peerConnection?.iceConnectionState === 'disconnected') {
        await this.handleConnectionFailure();
      }
    }, 3000);
  }

  /**
   * Handle ICE connection failure
   */
  private async handleIceConnectionFailure(): Promise<void> {
    await this.errorHandler.handleError(
      ErrorType.ICE_CONNECTION_FAILED,
      'ICE connection failed',
      new Error('ICE connection failed'),
      {
        webrtcManager: this,
        signalingClient: this.signalingClient,
        sessionId: this.sessionId,
        retryCount: this.connectionRetryCount
      }
    );
  }

  /**
   * Handle quality change from network monitor
   */
  private async handleQualityChange(level: any, reason: string): Promise<void> {
    console.log(`Quality changed: ${reason}`);
    
    try {
      // Basic quality adaptation - reduce video quality if needed
      if (this.localStream && this.peerConnection && level?.video) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          // Apply basic constraints to video track
          await videoTrack.applyConstraints({
            width: { max: level.video.width || 640 },
            height: { max: level.video.height || 480 },
            frameRate: { max: level.video.frameRate || 15 }
          });
        }
      }

      console.log('Video quality adapted for network conditions');

    } catch (error) {
      console.error('Failed to apply quality changes:', error);
    }
  }

  /**
   * Handle network issues
   */
  private handleNetworkIssue(issue: string, severity: 'low' | 'medium' | 'high'): void {
    console.warn(`Network issue (${severity}): ${issue}`);
    
    // Simple notification without complex mapping
    if (severity === 'high') {
      console.error('High severity network issue detected:', issue);
    }
  }

  /**
   * Set connection timeout
   */
  private setConnectionTimeout(): void {
    this.clearConnectionTimeout();
    
    this.connectionTimeout = setTimeout(() => {
      if (this.peerConnection?.connectionState !== 'connected') {
        console.warn('WebRTC connection timeout reached, attempting recovery...');
        this.handleConnectionTimeout();
      }
    }, 45000); // Increased to 45 second timeout for better reliability
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
   * Handle connection timeout
   */
  private async handleConnectionTimeout(): Promise<void> {
    console.error('Connection timeout reached');
    
    await this.errorHandler.handleError(
      ErrorType.CONNECTION_FAILED,
      'Connection timeout',
      new Error('Connection establishment timed out'),
      {
        webrtcManager: this,
        signalingClient: this.signalingClient,
        sessionId: this.sessionId,
        timeout: 30000
      }
    );
  }

  /**
   * Get error statistics for debugging
   */
  getErrorStatistics(): Record<string, number> {
    return this.errorHandler.getErrorStatistics();
  }

  /**
   * Get network quality metrics
   */
  getNetworkMetrics(): NetworkQualityMetrics | null {
    return this.networkMonitor.getAverageMetrics();
  }

  /**
   * Get current network quality assessment
   */
  getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    return this.networkMonitor.getNetworkQualityAssessment();
  }

  /**
   * Check if system is healthy
   */
  isSystemHealthy(): boolean {
    return this.errorHandler.isSystemHealthy();
  }

  /**
   * Filter and optimize ICE candidates for better performance
   * Requirement: Optimize ICE candidate gathering and filtering
   */
  private filterIceCandidate(candidate: RTCIceCandidate): RTCIceCandidate | null {
    try {
      // Skip candidates that are not useful for optimization
      if (!candidate.candidate || candidate.candidate.trim() === '') {
        return null;
      }

      const candidateString = candidate.candidate.toLowerCase();

      // Filter out IPv6 candidates if IPv4 is preferred (configurable)
      const preferIPv4 = true; // Could be made configurable
      if (preferIPv4 && candidateString.includes('::')) {
        console.log('Filtering out IPv6 candidate for optimization');
        return null;
      }

      // Filter out TCP candidates in favor of UDP for better performance
      if (candidateString.includes('tcp')) {
        console.log('Filtering out TCP candidate, preferring UDP');
        return null;
      }

      // Prioritize host candidates over reflexive candidates for local networks
      const isHostCandidate = candidateString.includes('typ host');
      const isReflexiveCandidate = candidateString.includes('typ srflx');
      const isRelayCandidate = candidateString.includes('typ relay');

      // Log candidate type for monitoring
      if (isHostCandidate) {
        console.log('Processing host candidate (highest priority)');
      } else if (isReflexiveCandidate) {
        console.log('Processing reflexive candidate (medium priority)');
      } else if (isRelayCandidate) {
        console.log('Processing relay candidate (lowest priority)');
      }

      // Filter out candidates with very high port numbers (likely to be blocked)
      const portMatch = candidateString.match(/(\d+)\s+typ/);
      if (portMatch) {
        const port = parseInt(portMatch[1]);
        if (port > 65000) {
          console.log(`Filtering out candidate with high port number: ${port}`);
          return null;
        }
      }

      // Filter out private IP addresses if we're in a production environment
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction && isHostCandidate) {
        const privateIPRegex = /(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.)/;
        if (privateIPRegex.test(candidateString)) {
          console.log('Filtering out private IP candidate in production');
          return null;
        }
      }

      return candidate;
    } catch (error) {
      console.warn('Error filtering ICE candidate:', error);
      // Return the original candidate if filtering fails
      return candidate;
    }
  }

  /**
   * Enhanced cleanup with comprehensive memory management and resource cleanup
   */
  cleanup(): void {
    console.log('Starting WebRTC cleanup...');

    // Clear all timeouts and intervals
    this.clearConnectionTimeout();

    // Stop monitoring systems first
    try {
      this.networkMonitor.stopMonitoring();
      this.networkMonitor.cleanup();
    } catch (error) {
      console.warn('Error cleaning up network monitor:', error);
    }

    // Close data channel with proper error handling
    if (this.dataChannel) {
      try {
        // Remove event listeners to prevent memory leaks
        this.dataChannel.onopen = null;
        this.dataChannel.onclose = null;
        this.dataChannel.onerror = null;
        this.dataChannel.onmessage = null;
        
        if (this.dataChannel.readyState !== 'closed') {
          this.dataChannel.close();
        }
      } catch (error) {
        console.warn('Error closing data channel:', error);
      } finally {
        this.dataChannel = null;
      }
    }

    // Stop local media streams with proper cleanup
    this.stopLocalMedia();

    // Close peer connection with comprehensive cleanup
    if (this.peerConnection) {
      try {
        // Remove all event listeners to prevent memory leaks
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.ondatachannel = null;
        this.peerConnection.onnegotiationneeded = null;
        this.peerConnection.onsignalingstatechange = null;
        this.peerConnection.onicegatheringstatechange = null;

        // Get all transceivers and stop them (if supported)
        try {
          if (typeof this.peerConnection.getTransceivers === 'function') {
            const transceivers = this.peerConnection.getTransceivers();
            transceivers.forEach(transceiver => {
              try {
                if (transceiver.sender && transceiver.sender.track) {
                  transceiver.sender.track.stop();
                }
                if (transceiver.receiver && transceiver.receiver.track) {
                  transceiver.receiver.track.stop();
                }
                if (typeof transceiver.stop === 'function') {
                  transceiver.stop();
                }
              } catch (error) {
                console.warn('Error stopping transceiver:', error);
              }
            });
          }
        } catch (error) {
          console.warn('Error accessing transceivers:', error);
        }

        // Close the peer connection
        if (this.peerConnection.connectionState !== 'closed') {
          this.peerConnection.close();
        }
      } catch (error) {
        console.warn('Error closing peer connection:', error);
      } finally {
        this.peerConnection = null;
      }
    }

    // Cleanup error handler
    try {
      this.errorHandler.clearErrorHistory();
    } catch (error) {
      console.warn('Error cleaning up error handler:', error);
    }

    // Clear all event handlers to prevent memory leaks
    this.onRemoteStream = null;
    this.onChatMessage = null;
    this.onConnectionStateChange = null;
    this.onIceCandidate = null;
    this.onDataChannelStateChange = null;
    this.onError = null;
    this.onNetworkQualityChange = null;

    // Reset all state variables
    this.sessionId = '';
    this.isInitiator = false;
    this.connectionRetryCount = 0;
    this.currentUserId = '';
    this.currentUserRole = 'doctor';
    this.signalingClient = null;
    this.mediaConstraints = null;

    // Force garbage collection hint (if available)
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
      } catch (error) {
        // Ignore if gc is not available
      }
    }

    console.log('WebRTC cleanup completed');
  }

  /**
   * Enhanced stopLocalMedia with better resource cleanup
   */
  stopLocalMedia(): void {
    if (this.localStream) {
      try {
        // Stop all tracks individually
        this.localStream.getTracks().forEach(track => {
          try {
            track.stop();
            // Remove track from stream
            this.localStream?.removeTrack(track);
          } catch (error) {
            console.warn('Error stopping media track:', error);
          }
        });

        // Clear the stream reference
        this.localStream = null;
        
        console.log('Local media streams stopped and cleaned up');
      } catch (error) {
        console.error('Error stopping local media:', error);
        // Force clear the reference even if cleanup failed
        this.localStream = null;
      }
    }
  }
}