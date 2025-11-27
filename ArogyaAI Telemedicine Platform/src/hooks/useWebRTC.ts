/**
 * React hook for WebRTC functionality integration
 * Provides state management and event handling for video calling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, WebRTCConfig } from '../services/webrtcManager';
import { SimpleWebRTCManager } from '../services/simpleWebRTCManager';
import { SignalingClient } from '../services/signalingClient';

export interface UseWebRTCOptions {
  sessionId: string;
  isInitiator: boolean;
  token: string;
  userId: string;
  userRole: 'doctor' | 'patient';
  config?: WebRTCConfig;
  enabled?: boolean; // Only initialize when enabled
}

export interface UseWebRTCReturn {
  // Connection state
  isConnected: boolean;
  connectionState: RTCPeerConnectionState | null;
  isSignalingConnected: boolean;
  isDataChannelAvailable: boolean;

  // Media streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // Media controls
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;

  // Call management
  startCall: () => Promise<void>;
  endCall: () => void;

  // Chat functionality
  sendChatMessage: (message: string) => void;
  chatMessages: ChatMessage[];

  // Error handling and monitoring
  error: string | null;
  clearError: () => void;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  networkMetrics: any;
}

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCReturn {
  const { sessionId, isInitiator, token, userId, userRole, config, enabled = true } = options;

  // Refs for managers to persist across re-renders
  const webrtcManagerRef = useRef<SimpleWebRTCManager | null>(null);
  const signalingClientRef = useRef<SignalingClient | null>(null);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null);
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [isDataChannelAvailable, setIsDataChannelAvailable] = useState(false);

  // Media streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Media controls
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Error handling
  const [error, setError] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [networkMetrics, setNetworkMetrics] = useState<any>(null);

  /**
   * Initialize WebRTC and signaling components
   */
  const initializeWebRTC = useCallback(async () => {
    try {
      setError(null);

      // Initialize Signaling Client first
      const signalingClient = new SignalingClient();
      await signalingClient.connect(sessionId, token);
      signalingClientRef.current = signalingClient;

      const backendIceServers = signalingClient.getIceServers();
      const finalConfig = {
      ...config,
      iceServers: backendIceServers.length > 0 ? backendIceServers : config?.iceServers
      };
      // Initialize Simple WebRTC Manager with signaling client and user info
      const webrtcManager = new SimpleWebRTCManager();
      await webrtcManager.initializeConnection(
        sessionId,
        isInitiator,
        finalConfig,
        signalingClient,
        userId,
        userRole
      );
      webrtcManagerRef.current = webrtcManager;

      // Set up WebRTC event handlers
      webrtcManager.onRemoteStream = (stream: MediaStream) => {
        console.log('🎥 useWebRTC: Received remote stream callback:', {
          streamId: stream.id,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
          active: stream.active,
          videoTrackDetails: stream.getVideoTracks().map(track => ({
            id: track.id,
            kind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState,
            label: track.label
          }))
        });

        // Ensure the stream is active and has tracks
        if (stream.active && (stream.getVideoTracks().length > 0 || stream.getAudioTracks().length > 0)) {
          console.log('🎥 Setting remote stream - stream is active with tracks');
          setRemoteStream(stream);
        } else {
          console.warn('🎥 Remote stream is not active or has no tracks:', {
            active: stream.active,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length
          });

          // Still set it, but log the issue
          setRemoteStream(stream);
        }
      };

      webrtcManager.onConnectionStateChange = (state: RTCPeerConnectionState) => {
        setConnectionState(state);
        setIsConnected(state === 'connected');
      };

      webrtcManager.onIceCandidate = (candidate: RTCIceCandidate) => {
        signalingClient.sendIceCandidate(candidate);
      };

      webrtcManager.onChatMessage = (message: ChatMessage) => {
        setChatMessages(prev => [...prev, message]);
      };

      webrtcManager.onDataChannelStateChange = (state: RTCDataChannelState) => {
        setIsDataChannelAvailable(state === 'open');
      };

      webrtcManager.onError = (errorMessage: string) => {
        setError(errorMessage);
      };

      // Note: SimpleWebRTCManager doesn't have onNetworkQualityChange
      // webrtcManager.onNetworkQualityChange = (quality: string, metrics: any) => {
      //   setNetworkQuality(quality as 'excellent' | 'good' | 'fair' | 'poor');
      //   setNetworkMetrics(metrics);
      // };

      // Set up signaling event handlers
      signalingClient.onOffer = async (offer: RTCSessionDescriptionInit) => {
        try {
          console.log('Received offer from remote peer, creating answer...');

          // If we're the initiator and we receive an offer, there might be a collision
          // Handle this by comparing user IDs or roles
          if (isInitiator) {
            console.log('Offer collision detected (both sides initiated), handling as non-initiator');
          }

          const answer = await webrtcManager.createAnswer(offer);
          signalingClient.sendAnswer(answer);
          console.log('Answer sent successfully');
        } catch (err) {
          console.error('Failed to handle offer:', err);
          setError(`Failed to handle offer: ${err}`);
        }
      };

      signalingClient.onAnswer = async (answer: RTCSessionDescriptionInit) => {
        try {
          console.log('Received answer, setting remote description...');
          await webrtcManager.setRemoteDescription(answer);
          console.log('Answer processed successfully');
        } catch (err) {
          console.error('Failed to handle answer:', err);
          setError(`Failed to handle answer: ${err}`);
        }
      };

      signalingClient.onIceCandidate = async (candidate: RTCIceCandidateInit) => {
        try {
          console.log('Received ICE candidate, adding...');
          await webrtcManager.addIceCandidate(candidate);
        } catch (err) {
          console.error('Failed to add ICE candidate:', err);
          // Don't set error for ICE candidate failures as they're common
        }
      };

      signalingClient.onChatMessage = (message: ChatMessage) => {
        setChatMessages(prev => [...prev, message]);
      };

      signalingClient.onConnectionStateChange = (connected: boolean) => {
        console.log('📡 Signaling connection state changed:', connected);
        setIsSignalingConnected(connected);
      };

      signalingClient.onUserJoined = (data) => {
        console.log('🚪 ========================================');
        console.log('🚪 USER JOINED EVENT RECEIVED');
        console.log('🚪 ========================================');
        console.log('🚪 Remote user data:', data);
        console.log('🚪 Current user is initiator:', isInitiator);
        console.log('🚪 Current user role:', userRole);
        
        // If we are the initiator (Doctor) and the new user is the remote peer
        if (isInitiator) {
          console.log('🚀 ✅ Initiator detected remote user joining!');
          console.log('🚀 Starting call in 2 seconds to allow remote peer to fully initialize...');
          
          // We add a delay to ensure the remote peer is fully ready to receive
          setTimeout(() => {
            console.log('🚀 ⏰ Timeout elapsed, calling startCall() now...');
            startCall().catch(err => {
              console.error('🚀 ❌ Failed to start call from onUserJoined:', err);
            });
          }, 2000);
        } else {
          console.log('⏳ Non-initiator (patient) waiting for offer from doctor...');
        }
        console.log('🚪 ========================================');
      };

      // Auto-start local media for immediate camera preview
      try {
        console.log('Requesting camera and microphone access...');
        const stream = await webrtcManager.startLocalMedia();
        setLocalStream(stream);
        setIsVideoEnabled(webrtcManager.isVideoEnabled());
        setIsAudioEnabled(webrtcManager.isAudioEnabled());
        console.log('Local media started successfully:', {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
          videoEnabled: webrtcManager.isVideoEnabled(),
          audioEnabled: webrtcManager.isAudioEnabled()
        });
      } catch (mediaError) {
        console.error('Failed to start local media:', mediaError);
        setError(`Camera/microphone access denied: ${mediaError}`);
      }

    } catch (err) {
      setError(`Failed to initialize WebRTC: ${err}`);
    }
  }, [sessionId, isInitiator, token, userId, userRole, config]);

  /**
   * Start the video call
   */
  const startCall = useCallback(async () => {
    try {
      setError(null);
      console.log('Starting video call...');

      const webrtcManager = webrtcManagerRef.current;
      const signalingClient = signalingClientRef.current;

      if (!webrtcManager || !signalingClient) {
        throw new Error('WebRTC not initialized');
      }

      // Ensure local media is started (may already be started in initialization)
      if (!localStream) {
        console.log('Starting local media for call...');
        const stream = await webrtcManager.startLocalMedia();
        setLocalStream(stream);
        setIsVideoEnabled(webrtcManager.isVideoEnabled());
        setIsAudioEnabled(webrtcManager.isAudioEnabled());
      }

      // Wait a bit for media to be fully ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create and send offer if initiator
      if (isInitiator) {
        console.log('Creating and sending offer as initiator...');
        const offer = await webrtcManager.createOffer();
        signalingClient.sendOffer(offer);
        console.log('Offer sent successfully');
      } else {
        console.log('Waiting for offer as non-initiator...');
      }

    } catch (err) {
      console.error('Failed to start call:', err);
      setError(`Failed to start call: ${err}`);
    }
  }, [isInitiator, localStream]);

  /**
   * End the video call
   */
  const endCall = useCallback(() => {
    const webrtcManager = webrtcManagerRef.current;
    const signalingClient = signalingClientRef.current;

    if (webrtcManager) {
      webrtcManager.cleanup();
    }

    if (signalingClient) {
      signalingClient.disconnect();
    }

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
    setConnectionState(null);
    setIsSignalingConnected(false);
    setIsDataChannelAvailable(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setChatMessages([]);

    // Clear refs
    webrtcManagerRef.current = null;
    signalingClientRef.current = null;
  }, []);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(() => {
    const webrtcManager = webrtcManagerRef.current;
    if (webrtcManager) {
      webrtcManager.toggleVideo();
      setIsVideoEnabled(webrtcManager.isVideoEnabled());
    }
  }, []);

  /**
   * Toggle audio on/off
   */
  const toggleAudio = useCallback(() => {
    const webrtcManager = webrtcManagerRef.current;
    if (webrtcManager) {
      webrtcManager.toggleAudio();
      setIsAudioEnabled(webrtcManager.isAudioEnabled());
    }
  }, []);

  /**
   * Send chat message through data channel with WebSocket fallback
   * Requirement 3.1, 3.2, 3.3: Chat message transmission with fallback
   */
  const sendChatMessage = useCallback((message: string) => {
    try {
      const webrtcManager = webrtcManagerRef.current;

      if (!webrtcManager) {
        throw new Error('WebRTC not initialized');
      }

      // WebRTC manager handles data channel first, then WebSocket fallback internally
      webrtcManager.sendChatMessage(message);

    } catch (err) {
      setError(`Failed to send message: ${err}`);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize WebRTC on mount (only when enabled)
  useEffect(() => {
    if (enabled) {
      initializeWebRTC();
    }

    // Cleanup on unmount or when disabled
    return () => {
      if (!enabled) {
        endCall();
      }
    };
  }, [enabled, initializeWebRTC, endCall]);

  return {
    // Connection state
    isConnected,
    connectionState,
    isSignalingConnected,
    isDataChannelAvailable,

    // Media streams
    localStream,
    remoteStream,

    // Media controls
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,

    // Call management
    startCall,
    endCall,

    // Chat functionality
    sendChatMessage,
    chatMessages,

    // Error handling and monitoring
    error,
    clearError,
    networkQuality,
    networkMetrics
  };
}