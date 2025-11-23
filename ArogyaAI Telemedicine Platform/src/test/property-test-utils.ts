import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';

/**
 * Utility functions for property-based testing in the WebRTC Video Calling System
 */

/**
 * Configuration for property-based tests
 */
export const PBT_CONFIG = {
  numRuns: 100, // Minimum 100 iterations as specified in design document
  timeout: 10000, // 10 second timeout for property tests
  verbose: false
};

/**
 * Helper function to create property-based tests with consistent configuration
 * @param name Test name
 * @param property The property to test
 * @param options Optional configuration overrides
 */
export function createPropertyTest<T>(
  name: string,
  property: fc.Property<T>,
  options: Partial<typeof PBT_CONFIG> = {}
) {
  const config = { ...PBT_CONFIG, ...options };
  
  it(name, async () => {
    await fc.assert(property, {
      numRuns: config.numRuns,
      timeout: config.timeout,
      verbose: config.verbose
    });
  }, config.timeout + 1000); // Add buffer to vitest timeout
}

/**
 * Helper function to create property-based test suites
 * @param suiteName Name of the test suite
 * @param tests Array of test definitions
 */
export function createPropertyTestSuite(
  suiteName: string,
  tests: Array<{
    name: string;
    property: fc.Property<any>;
    options?: Partial<typeof PBT_CONFIG>;
  }>
) {
  describe(suiteName, () => {
    tests.forEach(({ name, property, options }) => {
      createPropertyTest(name, property, options);
    });
  });
}

/**
 * Assertion helpers for common WebRTC property patterns
 */
export const PropertyAssertions = {
  /**
   * Assert that a session has required properties
   */
  validSession: (session: any) => {
    expect(session).toBeDefined();
    expect(session.sessionId).toBeDefined();
    expect(typeof session.sessionId).toBe('string');
    expect(session.doctorId).toBeDefined();
    expect(session.patientId).toBeDefined();
    expect(['created', 'active', 'ended']).toContain(session.status);
  },

  /**
   * Assert that a chat message has required properties
   */
  validChatMessage: (message: any) => {
    expect(message).toBeDefined();
    expect(message.id).toBeDefined();
    expect(message.sessionId).toBeDefined();
    expect(message.senderId).toBeDefined();
    expect(['doctor', 'patient']).toContain(message.senderRole);
    expect(typeof message.message).toBe('string');
    expect(message.message.length).toBeGreaterThan(0);
    expect(message.timestamp).toBeInstanceOf(Date);
  },

  /**
   * Assert that ICE server configuration is valid
   */
  validIceServerConfig: (config: any) => {
    expect(config).toBeDefined();
    expect(Array.isArray(config.iceServers)).toBe(true);
    expect(config.iceServers.length).toBeGreaterThan(0);
    
    config.iceServers.forEach((server: any) => {
      expect(server.urls).toBeDefined();
      expect(typeof server.urls).toBe('string');
    });
  },

  /**
   * Assert that signaling message has proper format
   */
  validSignalingMessage: (message: any) => {
    expect(message).toBeDefined();
    expect(['offer', 'answer', 'ice-candidate', 'chat', 'join', 'leave']).toContain(message.type);
    expect(message.sessionId).toBeDefined();
    expect(message.senderId).toBeDefined();
    expect(typeof message.timestamp).toBe('number');
  },

  /**
   * Assert that authentication data is valid
   */
  validAuthData: (authData: any) => {
    expect(authData).toBeDefined();
    expect(authData.userId).toBeDefined();
    expect(['doctor', 'patient']).toContain(authData.role);
    expect(authData.token).toBeDefined();
    expect(typeof authData.token).toBe('string');
    expect(authData.token.length).toBeGreaterThan(10);
  }
};

/**
 * Mock factory for WebRTC components used in property tests
 */
export const MockFactory = {
  /**
   * Create a mock RTCPeerConnection for property testing
   */
  createMockPeerConnection: () => ({
    connectionState: 'new' as RTCPeerConnectionState,
    iceConnectionState: 'new' as RTCIceConnectionState,
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    addTrack: vi.fn(),
    createDataChannel: vi.fn().mockReturnValue({
      readyState: 'connecting',
      send: vi.fn(),
      close: vi.fn()
    }),
    close: vi.fn(),
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
    ondatachannel: null
  }),

  /**
   * Create a mock WebSocket for property testing
   */
  createMockWebSocket: () => ({
    readyState: WebSocket.CONNECTING,
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null
  }),

  /**
   * Create a mock MediaStream for property testing
   */
  createMockMediaStream: () => ({
    id: 'mock-stream-id',
    active: true,
    getTracks: vi.fn().mockReturnValue([]),
    getVideoTracks: vi.fn().mockReturnValue([]),
    getAudioTracks: vi.fn().mockReturnValue([]),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn()
  })
};

/**
 * Property test patterns for common WebRTC scenarios
 */
export const PropertyPatterns = {
  /**
   * Round-trip property pattern for serialization/deserialization
   */
  roundTrip: <T>(
    generator: fc.Arbitrary<T>,
    serialize: (value: T) => string,
    deserialize: (serialized: string) => T,
    equals: (a: T, b: T) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  ) => fc.property(generator, (original) => {
    const serialized = serialize(original);
    const deserialized = deserialize(serialized);
    return equals(original, deserialized);
  }),

  /**
   * Idempotence property pattern
   */
  idempotent: <T>(
    generator: fc.Arbitrary<T>,
    operation: (value: T) => T,
    equals: (a: T, b: T) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  ) => fc.property(generator, (value) => {
    const once = operation(value);
    const twice = operation(once);
    return equals(once, twice);
  }),

  /**
   * Invariant property pattern
   */
  invariant: <T>(
    generator: fc.Arbitrary<T>,
    operation: (value: T) => T,
    invariantCheck: (value: T) => boolean
  ) => fc.property(generator, (value) => {
    fc.pre(invariantCheck(value)); // Precondition
    const result = operation(value);
    return invariantCheck(result); // Postcondition
  })
};