import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as fc from 'fast-check';

// Mock RTCDataChannel
global.RTCDataChannel = class MockRTCDataChannel {
  constructor() {}
  send = vi.fn();
  close = vi.fn();
  readyState = 'connecting' as RTCDataChannelState;
  onopen = null;
  onmessage = null;
  onerror = null;
  onclose = null;
} as any;

// Mock WebRTC APIs that are not available in jsdom
global.RTCPeerConnection = class MockRTCPeerConnection {
  constructor() {}
  createOffer = vi.fn();
  createAnswer = vi.fn();
  setLocalDescription = vi.fn();
  setRemoteDescription = vi.fn();
  addIceCandidate = vi.fn();
  addTrack = vi.fn();
  createDataChannel = vi.fn(() => new global.RTCDataChannel());
  close = vi.fn();
  connectionState = 'new' as RTCPeerConnectionState;
  iceConnectionState = 'new' as RTCIceConnectionState;
  onicecandidate = null;
  ontrack = null;
  onconnectionstatechange = null;
  ondatachannel = null;
  oniceconnectionstatechange = null;
} as any;

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(),
  },
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid'),
  },
});

// Configure fast-check for property-based testing
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations as specified in design document
  timeout: 10000, // 10 second timeout
  verbose: false,
  seed: 42 // Fixed seed for reproducible tests in CI
});