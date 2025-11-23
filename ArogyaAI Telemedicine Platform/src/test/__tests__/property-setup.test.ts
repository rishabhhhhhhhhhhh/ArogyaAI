import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  sessionDataGenerator, 
  chatMessageGenerator, 
  iceServerGenerator,
  signalingMessageGenerator 
} from '../property-generators';
import { 
  createPropertyTest, 
  PropertyAssertions, 
  PropertyPatterns 
} from '../property-test-utils';

/**
 * Property-based testing setup verification
 * This file tests that the property-based testing framework is correctly configured
 */

describe('Property-Based Testing Setup', () => {
  describe('Fast-check integration', () => {
    it('should run basic property tests', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
          return a + b === b + a; // Commutative property
        }),
        { numRuns: 10 }
      );
    });

    it('should work with custom generators', () => {
      fc.assert(
        fc.property(sessionDataGenerator(), (session) => {
          PropertyAssertions.validSession(session);
          return true;
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('WebRTC Property Generators', () => {
    createPropertyTest(
      'session data generator produces valid sessions',
      fc.property(sessionDataGenerator(), (session) => {
        PropertyAssertions.validSession(session);
        return true;
      }),
      { numRuns: 20 }
    );

    createPropertyTest(
      'chat message generator produces valid messages',
      fc.property(chatMessageGenerator(), (message) => {
        PropertyAssertions.validChatMessage(message);
        return true;
      }),
      { numRuns: 20 }
    );

    createPropertyTest(
      'ICE server generator produces valid configurations',
      fc.property(fc.array(iceServerGenerator(), { minLength: 1, maxLength: 5 }), (iceServers) => {
        const config = { iceServers };
        PropertyAssertions.validIceServerConfig(config);
        return true;
      }),
      { numRuns: 20 }
    );

    createPropertyTest(
      'signaling message generator produces valid messages',
      fc.property(signalingMessageGenerator(), (message) => {
        PropertyAssertions.validSignalingMessage(message);
        return true;
      }),
      { numRuns: 20 }
    );
  });

  describe('Property Patterns', () => {
    it('should support round-trip patterns', () => {
      const roundTripProperty = PropertyPatterns.roundTrip(
        fc.record({ id: fc.uuid(), name: fc.string() }),
        (obj) => JSON.stringify(obj),
        (str) => JSON.parse(str)
      );

      fc.assert(roundTripProperty, { numRuns: 10 });
    });

    it('should support idempotent patterns', () => {
      const idempotentProperty = PropertyPatterns.idempotent(
        fc.array(fc.integer()),
        (arr) => [...arr].sort(),
        (a, b) => JSON.stringify(a) === JSON.stringify(b)
      );

      fc.assert(idempotentProperty, { numRuns: 10 });
    });

    it('should support invariant patterns', () => {
      const invariantProperty = PropertyPatterns.invariant(
        fc.array(fc.integer(), { minLength: 1 }),
        (arr) => [...arr, arr[0]], // Add first element to end
        (arr) => arr.length > 0 // Invariant: array is never empty
      );

      fc.assert(invariantProperty, { numRuns: 10 });
    });
  });
});