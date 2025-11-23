/**
 * Tests for WebRTC Error Handler
 * Validates error handling, recovery mechanisms, and logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCErrorHandler, ErrorType, ErrorSeverity } from '../errorHandler';

describe('WebRTCErrorHandler', () => {
  let errorHandler: WebRTCErrorHandler;
  let mockOnError: ReturnType<typeof vi.fn>;
  let mockOnRecovery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnError = vi.fn();
    mockOnRecovery = vi.fn();
    
    errorHandler = new WebRTCErrorHandler({
      maxRetryAttempts: 3,
      retryDelay: 100, // Shorter delay for tests
      enableLogging: false, // Disable logging for tests
      onError: mockOnError,
      onRecovery: mockOnRecovery
    });
  });

  describe('Error Handling', () => {
    it('should handle errors and call onError callback', async () => {
      const error = new Error('Test error');
      
      const webrtcError = await errorHandler.handleError(
        ErrorType.ICE_CONNECTION_FAILED,
        'Test ICE connection failure',
        error,
        { testContext: 'value' }
      );

      expect(webrtcError.type).toBe(ErrorType.ICE_CONNECTION_FAILED);
      expect(webrtcError.message).toBe('Test ICE connection failure');
      expect(webrtcError.originalError).toBe(error);
      expect(webrtcError.context).toEqual({ testContext: 'value' });
      expect(webrtcError.severity).toBe(ErrorSeverity.HIGH);
      expect(webrtcError.recoverable).toBe(true); // ICE_CONNECTION_FAILED is recoverable
      expect(mockOnError).toHaveBeenCalledWith(webrtcError);
    });

    it('should determine correct severity levels', async () => {
      const authError = await errorHandler.handleError(
        ErrorType.AUTHENTICATION_ERROR,
        'Auth failed'
      );
      expect(authError.severity).toBe(ErrorSeverity.CRITICAL);

      const mediaError = await errorHandler.handleError(
        ErrorType.MEDIA_ACCESS_DENIED,
        'Media denied'
      );
      expect(mediaError.severity).toBe(ErrorSeverity.MEDIUM);

      const dataChannelError = await errorHandler.handleError(
        ErrorType.DATA_CHANNEL_ERROR,
        'Data channel failed'
      );
      expect(dataChannelError.severity).toBe(ErrorSeverity.LOW);
    });

    it('should track error history', async () => {
      await errorHandler.handleError(ErrorType.CONNECTION_FAILED, 'Error 1');
      await errorHandler.handleError(ErrorType.MEDIA_DEVICE_ERROR, 'Error 2');
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Error 1');
      expect(history[1].message).toBe('Error 2');
    });

    it('should provide error statistics', async () => {
      await errorHandler.handleError(ErrorType.CONNECTION_FAILED, 'Error 1');
      await errorHandler.handleError(ErrorType.CONNECTION_FAILED, 'Error 2');
      await errorHandler.handleError(ErrorType.MEDIA_DEVICE_ERROR, 'Error 3');
      
      const stats = errorHandler.getErrorStatistics();
      expect(stats[ErrorType.CONNECTION_FAILED]).toBe(2);
      expect(stats[ErrorType.MEDIA_DEVICE_ERROR]).toBe(1);
    });
  });

  describe('System Health', () => {
    it('should report healthy system with no recent critical errors', () => {
      expect(errorHandler.isSystemHealthy()).toBe(true);
    });

    it('should report unhealthy system with critical errors', async () => {
      await errorHandler.handleError(
        ErrorType.AUTHENTICATION_ERROR,
        'Critical auth error'
      );
      
      expect(errorHandler.isSystemHealthy()).toBe(false);
    });

    it('should report unhealthy system with too many high severity errors', async () => {
      // Add multiple high severity errors
      for (let i = 0; i < 4; i++) {
        await errorHandler.handleError(
          ErrorType.CONNECTION_FAILED,
          `High severity error ${i}`
        );
      }
      
      expect(errorHandler.isSystemHealthy()).toBe(false);
    });
  });

  describe('Error History Management', () => {
    it('should clear error history', async () => {
      await errorHandler.handleError(ErrorType.CONNECTION_FAILED, 'Error 1');
      expect(errorHandler.getErrorHistory()).toHaveLength(1);
      
      errorHandler.clearErrorHistory();
      expect(errorHandler.getErrorHistory()).toHaveLength(0);
    });
  });
});