/**
 * WebRTC Video Call Component
 * Example component demonstrating WebRTC integration
 */

import { useRef, useEffect } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff, Phone } from 'lucide-react';

interface WebRTCVideoCallProps {
  sessionId: string;
  isInitiator: boolean;
  token: string;
  onCallEnd?: () => void;
}

export function WebRTCVideoCall({ 
  sessionId, 
  isInitiator, 
  token, 
  onCallEnd 
}: WebRTCVideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    isConnected,
    connectionState,
    isSignalingConnected,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    startCall,
    endCall,
    // sendChatMessage, // Available for future use
    chatMessages,
    error,
    clearError
  } = useWebRTC({
    sessionId,
    isInitiator,
    token
  });

  // Set up video elements when streams are available
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    endCall();
    onCallEnd?.();
  };

  const handleStartCall = async () => {
    try {
      await startCall();
    } catch (err) {
      console.error('Failed to start call:', err);
    }
  };

  return (
    <div className="webrtc-video-call">
      {/* Connection Status */}
      <div className="mb-4 p-2 bg-gray-100 rounded">
        <p>Signaling: {isSignalingConnected ? '✅ Connected' : '❌ Disconnected'}</p>
        <p>WebRTC: {connectionState || 'Not connected'}</p>
        {error && (
          <div className="text-red-600">
            Error: {error}
            <Button onClick={clearError} size="sm" className="ml-2">
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Video Elements */}
      <div className="video-container mb-4">
        {/* Remote Video (Main) */}
        <div className="remote-video mb-2">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-64 bg-gray-200 rounded"
            style={{ transform: 'scaleX(-1)' }} // Mirror effect
          />
          <p className="text-sm text-gray-600">Remote Video</p>
        </div>

        {/* Local Video (Preview) */}
        <div className="local-video">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // Always mute local video to prevent feedback
            className="w-32 h-24 bg-gray-200 rounded"
            style={{ transform: 'scaleX(-1)' }} // Mirror effect
          />
          <p className="text-xs text-gray-600">Local Video</p>
        </div>
      </div>

      {/* Call Controls */}
      <div className="call-controls flex gap-2 justify-center mb-4">
        {!isConnected && (
          <Button onClick={handleStartCall} className="bg-green-600 hover:bg-green-700">
            Start Call
          </Button>
        )}
        
        {isConnected && (
          <>
            <Button
              onClick={toggleVideo}
              variant={isVideoEnabled ? "outline" : "destructive"}
              size="lg"
              className="rounded-full"
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={toggleAudio}
              variant={isAudioEnabled ? "outline" : "destructive"}
              size="lg"
              className="rounded-full"
            >
              {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={handleEndCall}
              size="lg"
              className="rounded-full bg-red-600 hover:bg-red-700"
            >
              <Phone className="w-5 h-5 rotate-[135deg]" />
            </Button>
          </>
        )}
      </div>

      {/* Chat Messages (Simple display) */}
      {chatMessages.length > 0 && (
        <div className="chat-messages">
          <h4 className="font-semibold mb-2">Chat Messages:</h4>
          <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm mb-1">
                <strong>{msg.senderRole}:</strong> {msg.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}