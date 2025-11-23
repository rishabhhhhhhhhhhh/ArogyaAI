import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { GlassCard } from '../components/GlassCard';

export function SimpleWebRTCTest() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [logs, setLogs] = useState<string[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(`WebRTC Test: ${message}`);
  };

  const startLocalMedia = async () => {
    try {
      addLog('Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      addLog(`Local media started: ${stream.getVideoTracks().length} video, ${stream.getAudioTracks().length} audio tracks`);
    } catch (error) {
      addLog(`Failed to get local media: ${error}`);
    }
  };

  const createPeerConnection = () => {
    try {
      addLog('Creating peer connection...');
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        setConnectionState(state);
        setIsConnected(state === 'connected');
        addLog(`Connection state: ${state}`);
      };

      pc.ontrack = (event) => {
        addLog(`Received remote track: ${event.track.kind}`);
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          addLog(`Remote stream set: ${stream.getVideoTracks().length} video, ${stream.getAudioTracks().length} audio tracks`);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addLog(`ICE candidate: ${event.candidate.candidate.substring(0, 50)}...`);
        } else {
          addLog('ICE gathering complete');
        }
      };

      peerConnectionRef.current = pc;
      addLog('Peer connection created successfully');
    } catch (error) {
      addLog(`Failed to create peer connection: ${error}`);
    }
  };

  const addLocalStreamToPeerConnection = () => {
    if (localStream && peerConnectionRef.current) {
      addLog('Adding local stream to peer connection...');
      localStream.getTracks().forEach(track => {
        if (peerConnectionRef.current && localStream) {
          peerConnectionRef.current.addTrack(track, localStream);
          addLog(`Added ${track.kind} track`);
        }
      });
    }
  };

  const createOffer = async () => {
    if (!peerConnectionRef.current) {
      addLog('No peer connection available');
      return;
    }

    try {
      addLog('Creating offer...');
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      addLog('Offer created and set as local description');
      addLog(`Offer SDP length: ${offer.sdp?.length || 0} characters`);
    } catch (error) {
      addLog(`Failed to create offer: ${error}`);
    }
  };

  const simulateRemoteAnswer = async () => {
    if (!peerConnectionRef.current) {
      addLog('No peer connection available');
      return;
    }

    try {
      addLog('Simulating remote answer...');
      // Create a simple answer SDP (this is just for testing)
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setRemoteDescription(answer);
      addLog('Remote answer set');
    } catch (error) {
      addLog(`Failed to set remote answer: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    setIsConnected(false);
    setConnectionState('new');
    addLog('Cleanup completed');
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Simple WebRTC Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Section */}
          <div className="space-y-4">
            <GlassCard className="p-4">
              <h2 className="text-xl font-semibold mb-4">Local Video</h2>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 bg-black rounded-lg"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="mt-2 text-sm text-muted-foreground">
                Status: {localStream ? 'Active' : 'Inactive'}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <h2 className="text-xl font-semibold mb-4">Remote Video</h2>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-black rounded-lg"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="mt-2 text-sm text-muted-foreground">
                Status: {remoteStream ? 'Active' : 'Inactive'}
              </div>
            </GlassCard>
          </div>

          {/* Controls Section */}
          <div className="space-y-4">
            <GlassCard className="p-4">
              <h2 className="text-xl font-semibold mb-4">Controls</h2>
              <div className="space-y-2">
                <Button onClick={startLocalMedia} className="w-full">
                  Start Local Media
                </Button>
                <Button onClick={createPeerConnection} className="w-full">
                  Create Peer Connection
                </Button>
                <Button onClick={addLocalStreamToPeerConnection} className="w-full">
                  Add Stream to PC
                </Button>
                <Button onClick={createOffer} className="w-full">
                  Create Offer
                </Button>
                <Button onClick={simulateRemoteAnswer} className="w-full">
                  Simulate Answer
                </Button>
                <Button onClick={cleanup} variant="destructive" className="w-full">
                  Cleanup
                </Button>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <h2 className="text-xl font-semibold mb-4">Status</h2>
              <div className="space-y-2 text-sm">
                <div>Connection State: <span className="font-mono">{connectionState}</span></div>
                <div>Connected: <span className="font-mono">{isConnected ? 'Yes' : 'No'}</span></div>
                <div>Local Stream: <span className="font-mono">{localStream ? 'Yes' : 'No'}</span></div>
                <div>Remote Stream: <span className="font-mono">{remoteStream ? 'Yes' : 'No'}</span></div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Logs</h2>
                <Button onClick={clearLogs} variant="outline" size="sm">
                  Clear
                </Button>
              </div>
              <div className="bg-black/20 rounded-lg p-3 h-64 overflow-y-auto">
                <div className="space-y-1 text-xs font-mono">
                  {logs.map((log, index) => (
                    <div key={index} className="text-green-400">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}