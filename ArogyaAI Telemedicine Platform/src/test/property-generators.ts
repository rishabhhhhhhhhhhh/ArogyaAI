import * as fc from 'fast-check';

/**
 * Property-based test generators for WebRTC Video Calling System
 * These generators create realistic test data for property-based testing
 */

// Basic data generators
export const sessionIdGenerator = () => fc.uuid();
export const userIdGenerator = () => fc.uuid();
export const timestampGenerator = () => fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') });

// User role generator
export const userRoleGenerator = () => fc.constantFrom('doctor', 'patient');

// Session status generator
export const sessionStatusGenerator = () => fc.constantFrom('created', 'active', 'ended');

// JWT token generator (simplified for testing)
export const jwtTokenGenerator = () => fc.string({ minLength: 20, maxLength: 200 });

// WebRTC connection state generator
export const connectionStateGenerator = () => fc.constantFrom(
  'new', 'connecting', 'connected', 'disconnected', 'failed', 'closed'
);

// ICE connection state generator
export const iceConnectionStateGenerator = () => fc.constantFrom(
  'new', 'checking', 'connected', 'completed', 'failed', 'disconnected', 'closed'
);

// Session data generator
export const sessionDataGenerator = () => fc.record({
  sessionId: sessionIdGenerator(),
  doctorId: userIdGenerator(),
  patientId: userIdGenerator(),
  status: sessionStatusGenerator(),
  createdAt: timestampGenerator(),
  startedAt: fc.option(timestampGenerator()),
  endedAt: fc.option(timestampGenerator())
});

// Chat message generator
export const chatMessageGenerator = () => fc.record({
  id: fc.uuid(),
  sessionId: sessionIdGenerator(),
  senderId: userIdGenerator(),
  senderRole: userRoleGenerator(),
  message: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: timestampGenerator(),
  messageType: fc.constantFrom('text', 'system')
});

// SDP offer/answer generator (simplified)
export const sdpGenerator = () => fc.record({
  type: fc.constantFrom('offer', 'answer'),
  sdp: fc.string({ minLength: 100, maxLength: 2000 })
});

// ICE candidate generator
export const iceCandidateGenerator = () => fc.record({
  candidate: fc.string({ minLength: 50, maxLength: 200 }),
  sdpMLineIndex: fc.integer({ min: 0, max: 10 }),
  sdpMid: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
});

// ICE server configuration generator
export const iceServerGenerator = () => fc.record({
  urls: fc.oneof(
    fc.constant('stun:stun.l.google.com:19302'),
    fc.string().map(s => `turn:${s}.example.com:3478`)
  ),
  username: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
  credential: fc.option(fc.string({ minLength: 8, maxLength: 50 }))
});

// WebRTC configuration generator
export const webrtcConfigGenerator = () => fc.record({
  iceServers: fc.array(iceServerGenerator(), { minLength: 1, maxLength: 5 }),
  iceTransportPolicy: fc.constantFrom('all', 'relay'),
  bundlePolicy: fc.constantFrom('balanced', 'max-compat', 'max-bundle'),
  rtcpMuxPolicy: fc.constantFrom('negotiate', 'require')
});

// Signaling message generator
export const signalingMessageGenerator = () => fc.record({
  type: fc.constantFrom('offer', 'answer', 'ice-candidate', 'chat', 'join', 'leave'),
  sessionId: sessionIdGenerator(),
  senderId: userIdGenerator(),
  data: fc.anything(),
  timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() + 86400000 })
});

// User authentication data generator
export const authDataGenerator = () => fc.record({
  userId: userIdGenerator(),
  role: userRoleGenerator(),
  token: jwtTokenGenerator(),
  sessionId: fc.option(sessionIdGenerator())
});

// Network quality metrics generator
export const networkQualityGenerator = () => fc.record({
  bandwidth: fc.integer({ min: 100, max: 10000 }), // kbps
  latency: fc.integer({ min: 10, max: 1000 }), // ms
  packetLoss: fc.float({ min: 0, max: 0.1 }), // percentage
  jitter: fc.integer({ min: 1, max: 100 }) // ms
});

// Media stream constraints generator
export const mediaConstraintsGenerator = () => fc.record({
  video: fc.boolean(),
  audio: fc.boolean()
});

// Error condition generator
export const errorConditionGenerator = () => fc.record({
  code: fc.integer({ min: 1000, max: 9999 }),
  message: fc.string({ minLength: 10, maxLength: 100 }),
  type: fc.constantFrom('connection', 'authentication', 'media', 'network', 'signaling')
});

// Session participant generator
export const sessionParticipantGenerator = () => fc.record({
  userId: userIdGenerator(),
  role: userRoleGenerator(),
  joinedAt: timestampGenerator(),
  connectionState: connectionStateGenerator(),
  mediaEnabled: fc.record({
    video: fc.boolean(),
    audio: fc.boolean()
  })
});

// Complete session with participants generator
export const completeSessionGenerator = () => fc.record({
  session: sessionDataGenerator(),
  participants: fc.array(sessionParticipantGenerator(), { minLength: 1, maxLength: 2 }),
  chatMessages: fc.array(chatMessageGenerator(), { minLength: 0, maxLength: 50 }),
  iceServers: fc.array(iceServerGenerator(), { minLength: 1, max: 5 })
});