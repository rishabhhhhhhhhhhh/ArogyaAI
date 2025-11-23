/**
 * Comprehensive Error Handler for WebRTC Video Calling System
 * Implements Requirements: 5.5, Error Handling Requirements
 * Provides centralized error handling, recovery mechanisms, and user notifications
 */

export enum ErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  MEDIA_ACCESS_DENIED = 'MEDIA_ACCESS_DENIED',
  MEDIA_DEVICE_ERROR = 'MEDIA_DEVICE_ERROR',
  SIGNALING_ERROR = 'SIGNALING_ERROR',
  ICE_CONNECTION_FAILED = 'ICE_CONNECTION_FAILED',
  DATA_CHANNEL_ERROR = 'DATA_CHANNEL_ERROR',
  BANDWIDTH_INSUFFICIENT = 'BANDWIDTH_INSUFFICIENT',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface WebRTCError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  timestamp: Date;
  context?: Record<string, any>;
  recoverable: boolean;
  retryCount?: number;
}

export interface ErrorHandlerOptions {
  maxRetryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  onError?: (error: WebRTCError) => void;
  onRecovery?: (error: WebRTCError) => void;
}

export interface RecoveryStrategy {
  canRecover: (error: WebRTCError) => boolean;
  recover: (error: WebRTCError, context?: any) => Promise<boolean>;
  maxAttempts: number;
}

export class WebRTCErrorHandler {
  private options: ErrorHandlerOptions;
  private recoveryStrategies: Map<ErrorType, RecoveryStrategy> = new Map();
  private errorHistory: WebRTCError[] = [];
  private activeRecoveries: Map<string, Promise<boolean>> = new Map();

  constructor(options: Partial<ErrorHandlerOptions> = {}) {
    this.options = {
      maxRetryAttempts: 3,
      retryDelay: 1000,
      enableLogging: true,
      ...options
    };

    this.setupRecoveryStrategies();
  }

  /**
   * Handle an error with automatic recovery attempts
   */
  async handleError(
    type: ErrorType,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ): Promise<WebRTCError> {
    const error: WebRTCError = {
      type,
      severity: this.determineSeverity(type),
      message,
      originalError,
      timestamp: new Date(),
      context,
      recoverable: this.isRecoverable(type),
      retryCount: 0
    };

    // Log the error
    this.logError(error);

    // Add to error history
    this.errorHistory.push(error);

    // Notify error callback
    if (this.options.onError) {
      this.options.onError(error);
    }

    // Attempt recovery if possible
    if (error.recoverable) {
      await this.attemptRecovery(error, context);
    }

    return error;
  }

  /**
   * Attempt to recover from an error
   */
  private async attemptRecovery(error: WebRTCError, context?: any): Promise<boolean> {
    const recoveryKey = `${error.type}-${error.timestamp.getTime()}`;
    
    // Prevent duplicate recovery attempts
    if (this.activeRecoveries.has(recoveryKey)) {
      return this.activeRecoveries.get(recoveryKey)!;
    }

    const recoveryPromise = this.executeRecovery(error, context);
    this.activeRecoveries.set(recoveryKey, recoveryPromise);

    try {
      const recovered = await recoveryPromise;
      
      if (recovered && this.options.onRecovery) {
        this.options.onRecovery(error);
      }

      return recovered;
    } finally {
      this.activeRecoveries.delete(recoveryKey);
    }
  }

  /**
   * Execute recovery strategy for an error
   */
  private async executeRecovery(error: WebRTCError, context?: any): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.type);
    
    if (!strategy || !strategy.canRecover(error)) {
      return false;
    }

    let attempts = 0;
    const maxAttempts = Math.min(strategy.maxAttempts, this.options.maxRetryAttempts);

    while (attempts < maxAttempts) {
      try {
        error.retryCount = attempts + 1;
        
        // Wait before retry (exponential backoff)
        if (attempts > 0) {
          const delay = this.options.retryDelay * Math.pow(2, attempts - 1);
          await this.delay(delay);
        }

        const recovered = await strategy.recover(error, context);
        
        if (recovered) {
          this.logRecovery(error, attempts + 1);
          return true;
        }

        attempts++;
      } catch (recoveryError) {
        this.logError({
          type: ErrorType.UNKNOWN_ERROR,
          severity: ErrorSeverity.MEDIUM,
          message: `Recovery attempt failed: ${recoveryError}`,
          originalError: recoveryError as Error,
          timestamp: new Date(),
          recoverable: false
        });
        
        attempts++;
      }
    }

    this.logRecoveryFailure(error, attempts);
    return false;
  }

  /**
   * Setup recovery strategies for different error types
   */
  private setupRecoveryStrategies(): void {
    // ICE Connection Failed Recovery
    this.recoveryStrategies.set(ErrorType.ICE_CONNECTION_FAILED, {
      canRecover: (error) => error.retryCount === undefined || error.retryCount < 3,
      recover: async (error, context) => {
        if (context?.webrtcManager && context?.signalingClient) {
          try {
            // Attempt ICE restart
            const offer = await context.webrtcManager.createOffer({ iceRestart: true });
            context.signalingClient.sendOffer(offer);
            return true;
          } catch (err) {
            return false;
          }
        }
        return false;
      },
      maxAttempts: 3
    });

    // Media Access Denied Recovery
    this.recoveryStrategies.set(ErrorType.MEDIA_ACCESS_DENIED, {
      canRecover: (error) => error.retryCount === undefined || error.retryCount < 2,
      recover: async (error, context) => {
        if (context?.webrtcManager) {
          try {
            // Try audio-only mode
            const constraints = { video: false, audio: true };
            await context.webrtcManager.startLocalMedia(constraints);
            return true;
          } catch (err) {
            return false;
          }
        }
        return false;
      },
      maxAttempts: 2
    });

    // Signaling Error Recovery
    this.recoveryStrategies.set(ErrorType.SIGNALING_ERROR, {
      canRecover: (error) => error.retryCount === undefined || error.retryCount < 5,
      recover: async (error, context) => {
        if (context?.signalingClient && context?.sessionId && context?.token) {
          try {
            await context.signalingClient.connect(context.sessionId, context.token);
            return true;
          } catch (err) {
            return false;
          }
        }
        return false;
      },
      maxAttempts: 5
    });

    // Network Error Recovery
    this.recoveryStrategies.set(ErrorType.NETWORK_ERROR, {
      canRecover: (error) => error.retryCount === undefined || error.retryCount < 3,
      recover: async (error, context) => {
        // Wait for network to stabilize, then retry connection
        await this.delay(2000);
        
        if (context?.signalingClient && context?.sessionId && context?.token) {
          try {
            await context.signalingClient.connect(context.sessionId, context.token);
            return true;
          } catch (err) {
            return false;
          }
        }
        return false;
      },
      maxAttempts: 3
    });

    // Data Channel Error Recovery
    this.recoveryStrategies.set(ErrorType.DATA_CHANNEL_ERROR, {
      canRecover: (error) => error.retryCount === undefined || error.retryCount < 2,
      recover: async (error, context) => {
        // Data channel errors are usually not recoverable, fallback to WebSocket
        return true; // WebSocket fallback is handled in WebRTCManager
      },
      maxAttempts: 1
    });
  }

  /**
   * Determine error severity based on type
   */
  private determineSeverity(type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.AUTHENTICATION_ERROR:
        return ErrorSeverity.CRITICAL;
      case ErrorType.CONNECTION_FAILED:
      case ErrorType.ICE_CONNECTION_FAILED:
        return ErrorSeverity.HIGH;
      case ErrorType.MEDIA_ACCESS_DENIED:
      case ErrorType.SIGNALING_ERROR:
      case ErrorType.NETWORK_ERROR:
        return ErrorSeverity.MEDIUM;
      case ErrorType.DATA_CHANNEL_ERROR:
      case ErrorType.BANDWIDTH_INSUFFICIENT:
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Check if error type is recoverable
   */
  private isRecoverable(type: ErrorType): boolean {
    return this.recoveryStrategies.has(type);
  }

  /**
   * Log error with context
   */
  private logError(error: WebRTCError): void {
    if (!this.options.enableLogging) return;

    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[WebRTC Error] ${error.type}: ${error.message}`;
    
    console[logLevel](logMessage, {
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      originalError: error.originalError,
      recoverable: error.recoverable
    });
  }

  /**
   * Log successful recovery
   */
  private logRecovery(error: WebRTCError, attempts: number): void {
    if (!this.options.enableLogging) return;

    console.info(`[WebRTC Recovery] Successfully recovered from ${error.type} after ${attempts} attempts`);
  }

  /**
   * Log recovery failure
   */
  private logRecoveryFailure(error: WebRTCError, attempts: number): void {
    if (!this.options.enableLogging) return;

    console.error(`[WebRTC Recovery] Failed to recover from ${error.type} after ${attempts} attempts`);
  }

  /**
   * Get appropriate console log level for error severity
   */
  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'warn';
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): WebRTCError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): Record<ErrorType, number> {
    const stats: Record<string, number> = {};
    
    for (const error of this.errorHistory) {
      stats[error.type] = (stats[error.type] || 0) + 1;
    }
    
    return stats as Record<ErrorType, number>;
  }

  /**
   * Check if system is in a healthy state
   */
  isSystemHealthy(): boolean {
    const recentErrors = this.errorHistory.filter(
      error => Date.now() - error.timestamp.getTime() < 60000 // Last minute
    );
    
    const criticalErrors = recentErrors.filter(
      error => error.severity === ErrorSeverity.CRITICAL
    );
    
    const highSeverityErrors = recentErrors.filter(
      error => error.severity === ErrorSeverity.HIGH
    );
    
    // System is unhealthy if there are critical errors or too many high severity errors
    return criticalErrors.length === 0 && highSeverityErrors.length < 3;
  }
}