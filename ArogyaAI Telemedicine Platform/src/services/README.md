# WebRTC Video Calling Implementation

This directory contains the WebRTC implementation for the ArogyaAI telemedicine platform, providing secure peer-to-peer video calling and chat functionality.

## Components

### WebRTCManager (`webrtcManager.ts`)

The core WebRTC management class that handles:

- **RTCPeerConnection Management**: Creates and manages WebRTC peer connections
- **Media Stream Handling**: Manages camera/microphone access and media streams
- **Offer/Answer Creation**: Handles SDP offer/answer negotiation
- **ICE Candidate Exchange**: Manages ICE candidate gathering and exchange
- **Data Channel Chat**: Provides real-time chat through RTCDataChannel
- **Connection State Monitoring**: Tracks connection states and handles failures
- **Error Handling**: Comprehensive error handling with recovery mechanisms

#### Key Methods

```typescript
// Connection management
await webrtcManager.initializeConnection(sessionId, isInitiator, config);
const offer = await webrtcManager.createOffer();
const answer = await webrtcManager.createAnswer(offer);
await webrtcManager.setRemoteDescription(description);
await webrtcManager.addIceCandidate(candidate);

// Media management
const stream = await webrtcManager.startLocalMedia();
webrtcManager.toggleVideo();
webrtcManager.toggleAudio();
webrtcManager.stopLocalMedia();

// Chat functionality
webrtcManager.sendChatMessage("Hello!");

// State monitoring
const state = webrtcManager.getConnectionState();
const isVideoOn = webrtcManager.isVideoEnabled();

// Cleanup
webrtcManager.cleanup();
```

### SignalingClient (`signalingClient.ts`)

WebSocket-based signaling client that handles:

- **Secure WebSocket Connections**: TLS-encrypted signaling communication
- **Authentication**: JWT token-based authentication
- **Message Routing**: Routes offers, answers, ICE candidates, and chat messages
- **Automatic Reconnection**: Exponential backoff reconnection strategy
- **Connection State Management**: Tracks signaling server connectivity

#### Key Methods

```typescript
// Connection management
await signalingClient.connect(sessionId, token);
signalingClient.disconnect();

// Signaling message sending
signalingClient.sendOffer(offer);
signalingClient.sendAnswer(answer);
signalingClient.sendIceCandidate(candidate);
signalingClient.sendChatMessage(message);

// Event handlers
signalingClient.onOffer = (offer) => { /* handle offer */ };
signalingClient.onAnswer = (answer) => { /* handle answer */ };
signalingClient.onIceCandidate = (candidate) => { /* handle candidate */ };
signalingClient.onChatMessage = (message) => { /* handle chat */ };
```

### useWebRTC Hook (`../hooks/useWebRTC.ts`)

React hook that integrates WebRTC functionality with React components:

- **State Management**: Manages connection and media states
- **Event Handling**: Provides React-friendly event handlers
- **Media Controls**: Exposes video/audio toggle functions
- **Chat Integration**: Manages chat message state
- **Error Handling**: Provides error state and clearing functions

#### Usage Example

```typescript
const {
  isConnected,
  localStream,
  remoteStream,
  isVideoEnabled,
  isAudioEnabled,
  toggleVideo,
  toggleAudio,
  startCall,
  endCall,
  sendChatMessage,
  chatMessages,
  error
} = useWebRTC({
  sessionId: 'session-123',
  isInitiator: true,
  token: 'jwt-token'
});
```

## Architecture

The WebRTC implementation follows a hybrid P2P architecture:

```
┌─────────────────┐    ┌─────────────────┐
│   Doctor        │    │   Patient       │
│   Browser       │    │   Browser       │
├─────────────────┤    ├─────────────────┤
│ WebRTCManager   │    │ WebRTCManager   │
│ SignalingClient │    │ SignalingClient │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          │   WebSocket (WSS)    │
          └──────────┬───────────┘
                     │
          ┌─────────────────┐
          │ Signaling Server│
          │ (Backend)       │
          └─────────────────┘
          
          ┌─────────────────┐
          │ STUN/TURN       │
          │ Servers         │
          └─────────────────┘
```

## Requirements Fulfilled

This implementation addresses the following requirements from the specification:

### Requirement 2.2: RTCPeerConnection Management
- ✅ Establishes RTCPeerConnection with ICE server configuration
- ✅ Handles local media stream access and management
- ✅ Provides comprehensive error handling for media device failures

### Requirement 2.3: Offer/Answer Handling
- ✅ Creates SDP offers for call initiation
- ✅ Generates SDP answers in response to offers
- ✅ Manages remote description setting

### Requirement 2.4: ICE Candidate Exchange
- ✅ Implements ICE candidate gathering and exchange
- ✅ Creates RTCDataChannel for real-time chat messaging
- ✅ Handles connection establishment with NAT traversal

### Requirement 5.1: Connection Monitoring and Recovery
- ✅ Monitors connection states and provides status feedback
- ✅ Implements automatic ICE restart on connection failures
- ✅ Provides comprehensive error handling and recovery mechanisms

## Configuration

### WebRTC Configuration

```typescript
const config: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'balanced',
  rtcpMuxPolicy: 'require'
};
```

### Media Constraints

```typescript
const mediaConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};
```

## Testing

The implementation includes comprehensive unit tests:

```bash
# Run all tests
npm run test:run

# Run specific test file
npm run test:run webrtcManager.simple.test.ts

# Run tests with UI
npm run test:ui
```

### Test Coverage

- ✅ WebRTCManager instantiation and method availability
- ✅ Error handling for uninitialized connections
- ✅ Media state management
- ✅ Graceful cleanup handling
- ✅ API contract validation

## Integration

### With ConsultationPage

The WebRTC functionality can be integrated into the existing ConsultationPage:

```typescript
import { useWebRTC } from '../hooks/useWebRTC';

function ConsultationPage() {
  const { sessionId } = useParams();
  const webrtc = useWebRTC({
    sessionId: sessionId!,
    isInitiator: true, // Determine based on user role
    token: authToken
  });

  // Use webrtc.localStream and webrtc.remoteStream for video elements
  // Use webrtc.toggleVideo, webrtc.toggleAudio for controls
  // Use webrtc.sendChatMessage for chat functionality
}
```

## Security Considerations

- **TLS Encryption**: All WebSocket connections use WSS (TLS encryption)
- **JWT Authentication**: Token-based authentication for signaling
- **Session-based Authorization**: Role-based access control for sessions
- **CORS Configuration**: Restricted to trusted origins
- **Rate Limiting**: Protection against signaling abuse

## Performance Optimizations

- **Adaptive Media Quality**: Automatic quality adjustment based on network conditions
- **Efficient ICE Gathering**: Optimized candidate gathering and filtering
- **Connection Pooling**: Reused WebSocket connections where possible
- **Memory Management**: Proper cleanup of media streams and connections
- **Lazy Loading**: Components loaded only when needed

## Error Handling

The implementation provides comprehensive error handling:

- **Media Access Errors**: Graceful degradation when camera/microphone unavailable
- **Connection Failures**: Automatic retry with ICE restart
- **Signaling Errors**: Reconnection with exponential backoff
- **Network Issues**: Adaptive quality and fallback mechanisms

## Future Enhancements

- Screen sharing capability
- Recording functionality
- Multi-party calling support
- Advanced media controls (filters, effects)
- Bandwidth monitoring and optimization