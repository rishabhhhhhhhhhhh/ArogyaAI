/**
 * Simplified WebRTC Manager for debugging video stream issues
 * Removes complex dependencies and focuses on core functionality
 */

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderRole: 'doctor' | 'patient';
  message: string;
  timestamp: Date;
  messageType: 'text' | 'system';
}

export class SimpleWebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private sessionId: string = '';
  private isInitiator: boolean = false;
  private signalingClient: any = null;
  private currentUserId: string = '';
  private currentUserRole: 'doctor' | 'patient' = 'doctor';
  private iceCandidateQueue: RTCIceCandidateInit[] = [];

  // Event handlers
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onChatMessage: ((message: ChatMessage) => void) | null = null;
  public onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;
  public onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
  public onDataChannelStateChange: ((state: RTCDataChannelState) => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  constructor() {
    console.log('SimpleWebRTCManager initialized');
  }

  /**
   * Initialize WebRTC connection with session configuration
   */
  async initializeConnection(
    sessionId: string, 
    isInitiator: boolean, 
    config?: any,
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

      console.log('Initializing WebRTC connection:', {
        sessionId,
        isInitiator,
        userId,
        userRole
      });

      // Simple WebRTC configuration
      const rtcConfig: RTCConfiguration = {
        iceServers: config?.iceServers || [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all',
        bundlePolicy: 'balanced',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 10
      };

      console.log('Creating RTCPeerConnection with config:', rtcConfig);
      this.peerConnection = new RTCPeerConnection(rtcConfig);

      // Set up event handlers
      this.setupPeerConnectionHandlers();

      // Create data channel for chat if initiator
      if (this.isInitiator) {
        this.createDataChannel();
      }

      console.log('WebRTC connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebRTC connection:', error);
      if (this.onError) {
        this.onError(`Failed to initialize WebRTC: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Set up RTCPeerConnection event handlers
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;

    console.log('Setting up peer connection handlers');

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        console.log('Sending ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');
        this.onIceCandidate(event.candidate);
      } else if (!event.candidate) {
        console.log('ICE gathering completed');
      }
    };

    // Handle remote stream - This is critical for video display
    this.peerConnection.ontrack = (event) => {
      console.log('🎥 ========================================');
      console.log('🎥 RECEIVED REMOTE TRACK EVENT');
      console.log('🎥 ========================================');
      console.log('🎥 Track Details:', {
        kind: event.track.kind,
        id: event.track.id,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        muted: event.track.muted,
        label: event.track.label
      });
      console.log('🎥 Streams Count:', event.streams.length);

      // Handle the track immediately
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log('🎥 Using existing stream from event');
        console.log('🎥 Remote Stream Details:', {
          id: remoteStream.id,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
          active: remoteStream.active,
          videoTrackDetails: remoteStream.getVideoTracks().map(t => ({
            id: t.id,
            enabled: t.enabled,
            readyState: t.readyState,
            muted: t.muted
          })),
          audioTrackDetails: remoteStream.getAudioTracks().map(t => ({
            id: t.id,
            enabled: t.enabled,
            readyState: t.readyState,
            muted: t.muted
          }))
        });

        if (this.onRemoteStream) {
          console.log('🎥 ✅ Calling onRemoteStream callback');
          this.onRemoteStream(remoteStream);
          console.log('🎥 ✅ onRemoteStream callback completed');
        } else {
          console.error('🎥 ❌ NO onRemoteStream callback set!');
        }
      } else {
        console.warn('🎥 ⚠️ No streams in track event, creating new stream');
        
        // If no stream is provided, create one and add the track
        const remoteStream = new MediaStream();
        remoteStream.addTrack(event.track);
        
        console.log('🎥 Created new remote stream:', {
          id: remoteStream.id,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
          active: remoteStream.active
        });

        if (this.onRemoteStream) {
          console.log('🎥 ✅ Calling onRemoteStream callback with new stream');
          this.onRemoteStream(remoteStream);
          console.log('🎥 ✅ onRemoteStream callback completed');
        } else {
          console.error('🎥 ❌ NO onRemoteStream callback set!');
        }
      }
      
      console.log('🎥 ========================================');
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;

      const state = this.peerConnection.connectionState;
      console.log('🔗 Connection state changed:', state);

      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    // Handle data channel from remote peer
    this.peerConnection.ondatachannel = (event) => {
      console.log('📡 Received data channel from remote peer');
      const channel = event.channel;
      this.setupDataChannelHandlers(channel);
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const iceState = this.peerConnection.iceConnectionState;
      console.log('🧊 ICE connection state:', iceState);
    };

    console.log('Peer connection handlers set up successfully');
  }

  /**
   * Create data channel for chat messaging
   */
  private createDataChannel(): void {
    if (!this.peerConnection) return;

    console.log('Creating data channel for chat');
    this.dataChannel = this.peerConnection.createDataChannel('chat', {
      ordered: true,
      maxRetransmits: 3
    });

    this.setupDataChannelHandlers(this.dataChannel);
  }

  /**
   * Set up data channel event handlers
   */
  private setupDataChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('📡 Data channel opened');
      if (this.onDataChannelStateChange) {
        this.onDataChannelStateChange(channel.readyState);
      }
    };

    channel.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        if (this.onChatMessage) {
          this.onChatMessage(message);
        }
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error('📡 Data channel error:', error);
    };

    channel.onclose = () => {
      console.log('📡 Data channel closed');
      if (this.onDataChannelStateChange) {
        this.onDataChannelStateChange(channel.readyState);
      }
    };

    if (!this.dataChannel) {
      this.dataChannel = channel;
    }
  }

  /**
   * Start local media stream
   */
  async startLocalMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    try {
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const mediaConstraints = constraints || defaultConstraints;
      console.log('🎥 Requesting local media with constraints:', mediaConstraints);

      this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      
      console.log('🎥 Local media stream obtained:', {
        id: this.localStream.id,
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length,
        active: this.localStream.active
      });

      // Add tracks to peer connection
      if (this.peerConnection && this.localStream) {
        console.log('🎥 Adding local tracks to peer connection...');
        this.localStream.getTracks().forEach((track, index) => {
          if (this.peerConnection && this.localStream) {
            console.log(`🎥 Adding track ${index + 1}:`, {
              kind: track.kind,
              id: track.id,
              enabled: track.enabled,
              readyState: track.readyState
            });
            
            const sender = this.peerConnection.addTrack(track, this.localStream);
            console.log('🎥 Track added, sender:', !!sender);
          }
        });
      }

      return this.localStream;
    } catch (error) {
      console.error('🎥 Failed to access media devices:', error);
      if (this.onError) {
        this.onError(`Failed to access media devices: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Create SDP offer for call initiation
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('📤 Creating WebRTC offer...');
      
      // Ensure we have local media before creating offer
      if (!this.localStream) {
        console.log('📤 No local stream, starting media first...');
        await this.startLocalMedia();
      }

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      console.log('📤 Offer created:', {
        type: offer.type,
        sdpLength: offer.sdp?.length || 0
      });

      await this.peerConnection.setLocalDescription(offer);
      console.log('📤 Local description set for offer');
      
      return offer;
    } catch (error) {
      console.error('📤 Error creating offer:', error);
      throw new Error(`Failed to create offer: ${error}`);
    }
  }

  /**
   * Create SDP answer in response to an offer
   */
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('📥 Received offer, creating answer...', {
        type: offer.type,
        sdpLength: offer.sdp?.length || 0
      });

      // Ensure we have local media before creating answer
      if (!this.localStream) {
        console.log('📥 No local stream, starting media first...');
        await this.startLocalMedia();
      }

      await this.peerConnection.setRemoteDescription(offer);
      console.log('📥 Remote description set from offer');
      
      const answer = await this.peerConnection.createAnswer();
      console.log('📥 Answer created:', {
        type: answer.type,
        sdpLength: answer.sdp?.length || 0
      });
      
      await this.peerConnection.setLocalDescription(answer);
      console.log('📥 Local description set for answer');
      
      return answer;
    } catch (error) {
      console.error('📥 Error creating answer:', error);
      throw new Error(`Failed to create answer: ${error}`);
    }
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('📥 Setting remote description:', {
        type: description.type,
        sdpLength: description.sdp?.length || 0
      });
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
      
      console.log('📥 ✅ Remote description set successfully');
      
      // Process queued ICE candidates
      if (this.iceCandidateQueue.length > 0) {
        console.log(`📥 Processing ${this.iceCandidateQueue.length} queued ICE candidates...`);
        
        while (this.iceCandidateQueue.length > 0) {
          const candidate = this.iceCandidateQueue.shift();
          if (candidate) {
            try {
              console.log('📥 Adding queued ICE candidate');
              const iceCandidate = new RTCIceCandidate(candidate);
              await this.peerConnection.addIceCandidate(iceCandidate);
              console.log('📥 ✅ Queued ICE candidate added');
            } catch (error) {
              console.warn('📥 ⚠️ Failed to add queued ICE candidate:', error);
              // Continue with other candidates
            }
          }
        }
        
        console.log('📥 ✅ All queued ICE candidates processed');
      }
    } catch (error) {
      console.error('📥 ❌ Error setting remote description:', error);
      throw new Error(`Failed to set remote description: ${error}`);
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      // Check if remote description is set
      if (!this.peerConnection.remoteDescription) {
        console.log('🧊 Queueing ICE candidate (remote description not set yet)');
        this.iceCandidateQueue.push(candidate);
        return;
      }

      console.log('🧊 Adding ICE candidate:', {
        candidate: candidate.candidate?.substring(0, 50) + '...',
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid
      });
      
      // Create RTCIceCandidate object and add it
      const iceCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(iceCandidate);
      console.log('🧊 ✅ ICE candidate added successfully');
    } catch (error) {
      console.error('🧊 ❌ Error adding ICE candidate:', error);
      // Don't throw error for ICE candidate failures as they're common
      console.warn('🧊 ICE candidate failed, but continuing...');
    }
  }

  /**
   * Send chat message through data channel
   */
  sendChatMessage(message: string): void {
    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: this.sessionId,
      senderId: this.currentUserId,
      senderRole: this.currentUserRole,
      message: message.trim(),
      timestamp: new Date(),
      messageType: 'text'
    };

    // Try data channel first
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(chatMessage));
        console.log('📡 Chat message sent via data channel');
        return;
      } catch (error) {
        console.warn('📡 Failed to send via data channel, falling back to WebSocket:', error);
      }
    }

    // Fallback to WebSocket signaling
    if (this.signalingClient && this.signalingClient.isConnectedToServer()) {
      try {
        this.signalingClient.sendChatMessage(message);
        console.log('📡 Chat message sent via WebSocket fallback');
      } catch (error) {
        console.error('📡 Failed to send chat message via WebSocket fallback:', error);
        throw new Error(`Failed to send chat message: ${error}`);
      }
    } else {
      throw new Error('No available communication channel for chat message');
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
        console.log('🎥 Video toggled:', videoTrack.enabled);
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
        console.log('🎤 Audio toggled:', audioTrack.enabled);
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
   * Get connection state
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection ? this.peerConnection.connectionState : null;
  }

  /**
   * Get local media stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Check if data channel is available
   */
  isDataChannelAvailable(): boolean {
    return this.dataChannel !== null && this.dataChannel.readyState === 'open';
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log('🧹 Starting WebRTC cleanup...');

    // Close data channel
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (error) {
        console.warn('Error closing data channel:', error);
      }
      this.dataChannel = null;
    }

    // Stop local media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Error stopping media track:', error);
        }
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (error) {
        console.warn('Error closing peer connection:', error);
      }
      this.peerConnection = null;
    }

    // Clear event handlers
    this.onRemoteStream = null;
    this.onChatMessage = null;
    this.onConnectionStateChange = null;
    this.onIceCandidate = null;
    this.onDataChannelStateChange = null;
    this.onError = null;

    console.log('🧹 WebRTC cleanup completed');
  }
}