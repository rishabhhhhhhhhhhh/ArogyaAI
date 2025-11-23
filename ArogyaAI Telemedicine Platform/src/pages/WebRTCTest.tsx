import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/button';

export function WebRTCTest() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [isInitiator, setIsInitiator] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const initializePeerConnection = () => {
    addLog('Initializing peer connection...');
    
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };
    
    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;
    
    pc.onconnectionstatechange = () => {
      addLog(`Connection state: ${pc.connectionState}`);
      setConnectionState(pc.connectionState);
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addLog(`ICE candidate: ${event.candidate.candidate.substring(0, 50)}...`);
        // In real app, send this to remote peer via signaling
      } else {
        addLog('ICE gathering completed');
      }
    };
    
    pc.ontrack = (event) => {
      addLog(`Received remote track: ${event.track.kind}`);
      if (event.streams && event.streams[0]) {
        addLog(`Remote stream received with ${event.streams[0].getTracks().length} tracks`);
        setRemoteStream(event.streams[0]);
      }
    };
    
    addLog('Peer connection initialized');
  };
  
  const startLocalMedia = async () => {
    try {
      addLog('Requesting local media...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      setLocalStream(stream);
      addLog(`Local media obtained: ${stream.getVideoTracks().length} video, ${stream.getAudioTracks().length} audio tracks`);
      
      // Add tracks to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => {
          addLog(`Adding ${track.kind} track to peer connection`);
          peerConnectionRef.current!.addTrack(track, stream);
        });
      }
      
    } catch (error) {
      addLog(`Failed to get local media: ${error}`);
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
      addLog(`Offer created: ${offer.sdp?.substring(0, 100)}...`);
      
      // In real app, send offer to remote peer via signaling
      // For this test, we'll simulate receiving it back as an answer
      setTimeout(() => {
        simulateRemoteAnswer(offer);
      }, 1000);
      
    } catch (error) {
      addLog(`Failed to create offer: ${error}`);
    }
  };
  
  const simulateRemoteAnswer = async (offer: RTCSessionDescriptionInit) => {
    // Create a second peer connection to simulate remote peer
    addLog('Simulating remote peer...');
    
    const remotePc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    // Add remote media
    try {
      const remoteStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      remoteStream.getTracks().forEach(track => {
        remotePc.addTrack(track, remoteStream);
      });
      
      addLog('Remote peer media added');
    } catch (error) {
      addLog(`Failed to get remote media: ${error}`);
    }
    
    // Set remote description and create answer
    await remotePc.setRemoteDescription(offer);
    const answer = await remotePc.createAnswer();
    await remotePc.setLocalDescription(answer);
    
    addLog(`Remote answer created: ${answer.sdp?.substring(0, 100)}...`);
    
    // Set answer on original peer connection
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(answer);
      addLog('Answer set on local peer connection');
    }
  };
  
  // Set up video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      addLog('Local video element set up');
    }
  }, [localStream]);
  
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      addLog('Remote video element set up');
    }
  }, [remoteStream]);
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">WebRTC Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Area */}
          <div className="space-y-4">
            <div className="bg-card p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Local Video</h2>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 bg-black rounded"
              />
            </div>
            
            <div className="bg-card p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Remote Video</h2>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-black rounded"
              />
            </div>
          </div>
          
          {/* Controls and Logs */}
          <div className="space-y-4">
            <div className="bg-card p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Controls</h2>
              <div className="space-y-2">
                <Button onClick={initializePeerConnection} className="w-full">
                  Initialize Peer Connection
                </Button>
                <Button onClick={startLocalMedia} className="w-full">
                  Start Local Media
                </Button>
                <Button onClick={createOffer} className="w-full">
                  Create Offer (Test)
                </Button>
              </div>
              
              <div className="mt-4">
                <p><strong>Connection State:</strong> {connectionState}</p>
                <p><strong>Local Stream:</strong> {localStream ? 'Active' : 'None'}</p>
                <p><strong>Remote Stream:</strong> {remoteStream ? 'Active' : 'None'}</p>
              </div>
            </div>
            
            <div className="bg-card p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Logs</h2>
              <div className="h-96 overflow-y-auto bg-muted p-2 rounded text-sm font-mono">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}