/**
 * Notification System for WebRTC Video Calling
 * Provides user notifications for connection status, errors, and system events
 * Requirements: 5.5, User notification system for connection status and errors
 */

export enum NotificationType {
  SUCCESS = 'SUCCESS',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

export enum NotificationCategory {
  CONNECTION = 'CONNECTION',
  MEDIA = 'MEDIA',
  QUALITY = 'QUALITY',
  CHAT = 'CHAT',
  SYSTEM = 'SYSTEM'
}

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: Date;
  duration?: number; // Auto-dismiss after duration (ms)
  persistent?: boolean; // Don't auto-dismiss
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'destructive';
}

export interface NotificationOptions {
  enableToasts: boolean;
  enableBrowserNotifications: boolean;
  enableSounds: boolean;
  maxNotifications: number;
  defaultDuration: number;
  onNotification?: (notification: Notification) => void;
}

export class NotificationSystem {
  private notifications: Notification[] = [];
  private options: NotificationOptions;
  private notificationPermission: NotificationPermission = 'default';

  constructor(options: Partial<NotificationOptions> = {}) {
    this.options = {
      enableToasts: true,
      enableBrowserNotifications: false,
      enableSounds: false,
      maxNotifications: 10,
      defaultDuration: 5000,
      ...options
    };

    this.requestNotificationPermission();
  }

  /**
   * Request browser notification permission
   */
  private async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window) {
      this.notificationPermission = await Notification.requestPermission();
    }
  }

  /**
   * Show a notification
   */
  notify(
    type: NotificationType,
    category: NotificationCategory,
    title: string,
    message: string,
    options?: {
      duration?: number;
      persistent?: boolean;
      actions?: NotificationAction[];
      metadata?: Record<string, any>;
    }
  ): string {
    const notification: Notification = {
      id: this.generateId(),
      type,
      category,
      title,
      message,
      timestamp: new Date(),
      duration: options?.duration ?? this.options.defaultDuration,
      persistent: options?.persistent ?? false,
      actions: options?.actions,
      metadata: options?.metadata
    };

    // Add to notifications list
    this.notifications.unshift(notification);

    // Limit number of notifications
    if (this.notifications.length > this.options.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.options.maxNotifications);
    }

    // Show toast notification
    if (this.options.enableToasts) {
      this.showToast(notification);
    }

    // Show browser notification
    if (this.options.enableBrowserNotifications && this.notificationPermission === 'granted') {
      this.showBrowserNotification(notification);
    }

    // Play sound
    if (this.options.enableSounds) {
      this.playNotificationSound(type);
    }

    // Call notification callback
    if (this.options.onNotification) {
      this.options.onNotification(notification);
    }

    // Auto-dismiss if not persistent
    if (!notification.persistent && notification.duration) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, notification.duration);
    }

    return notification.id;
  }

  /**
   * Connection status notifications
   */
  notifyConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'failed', details?: string): string {
    switch (status) {
      case 'connecting':
        return this.notify(
          NotificationType.INFO,
          NotificationCategory.CONNECTION,
          'Connecting...',
          details || 'Establishing connection to the call',
          { duration: 3000 }
        );
      
      case 'connected':
        return this.notify(
          NotificationType.SUCCESS,
          NotificationCategory.CONNECTION,
          'Connected',
          details || 'Successfully connected to the call',
          { duration: 3000 }
        );
      
      case 'disconnected':
        return this.notify(
          NotificationType.WARNING,
          NotificationCategory.CONNECTION,
          'Disconnected',
          details || 'Connection to the call was lost',
          { 
            persistent: true,
            actions: [
              {
                label: 'Reconnect',
                action: () => this.triggerReconnect(),
                style: 'primary'
              }
            ]
          }
        );
      
      case 'failed':
        return this.notify(
          NotificationType.ERROR,
          NotificationCategory.CONNECTION,
          'Connection Failed',
          details || 'Failed to establish connection',
          { 
            persistent: true,
            actions: [
              {
                label: 'Retry',
                action: () => this.triggerRetry(),
                style: 'primary'
              },
              {
                label: 'Report Issue',
                action: () => this.reportIssue(),
                style: 'secondary'
              }
            ]
          }
        );
      
      default:
        return '';
    }
  }

  /**
   * Media device notifications
   */
  notifyMediaStatus(
    device: 'camera' | 'microphone',
    status: 'enabled' | 'disabled' | 'error' | 'permission_denied',
    details?: string
  ): string {
    const deviceName = device === 'camera' ? 'Camera' : 'Microphone';
    
    switch (status) {
      case 'enabled':
        return this.notify(
          NotificationType.SUCCESS,
          NotificationCategory.MEDIA,
          `${deviceName} Enabled`,
          details || `${deviceName} is now active`,
          { duration: 2000 }
        );
      
      case 'disabled':
        return this.notify(
          NotificationType.INFO,
          NotificationCategory.MEDIA,
          `${deviceName} Disabled`,
          details || `${deviceName} has been turned off`,
          { duration: 2000 }
        );
      
      case 'error':
        return this.notify(
          NotificationType.ERROR,
          NotificationCategory.MEDIA,
          `${deviceName} Error`,
          details || `There was an issue with your ${device}`,
          { 
            persistent: true,
            actions: [
              {
                label: 'Check Settings',
                action: () => this.openMediaSettings(),
                style: 'primary'
              }
            ]
          }
        );
      
      case 'permission_denied':
        return this.notify(
          NotificationType.ERROR,
          NotificationCategory.MEDIA,
          `${deviceName} Access Denied`,
          details || `Please allow access to your ${device} to continue`,
          { 
            persistent: true,
            actions: [
              {
                label: 'Grant Permission',
                action: () => this.requestMediaPermission(),
                style: 'primary'
              }
            ]
          }
        );
      
      default:
        return '';
    }
  }

  /**
   * Network quality notifications
   */
  notifyNetworkQuality(
    quality: 'excellent' | 'good' | 'fair' | 'poor',
    details?: string,
    metrics?: { bandwidth: number; latency: number; packetLoss: number }
  ): string {
    let type: NotificationType;
    let title: string;
    let message: string;

    switch (quality) {
      case 'excellent':
        type = NotificationType.SUCCESS;
        title = 'Excellent Connection';
        message = details || 'Network quality is excellent';
        break;
      
      case 'good':
        type = NotificationType.SUCCESS;
        title = 'Good Connection';
        message = details || 'Network quality is good';
        break;
      
      case 'fair':
        type = NotificationType.WARNING;
        title = 'Fair Connection';
        message = details || 'Network quality is fair - you may experience some issues';
        break;
      
      case 'poor':
        type = NotificationType.ERROR;
        title = 'Poor Connection';
        message = details || 'Network quality is poor - call quality may be affected';
        break;
    }

    const actions: NotificationAction[] = [];
    
    if (quality === 'poor' || quality === 'fair') {
      actions.push({
        label: 'Optimize Quality',
        action: () => this.optimizeQuality(),
        style: 'primary'
      });
    }

    return this.notify(type, NotificationCategory.QUALITY, title, message, {
      duration: quality === 'poor' ? undefined : 4000,
      persistent: quality === 'poor',
      actions: actions.length > 0 ? actions : undefined,
      metadata: { quality, metrics }
    });
  }

  /**
   * Chat message notifications
   */
  notifyChatMessage(senderName: string, preview: string): string {
    return this.notify(
      NotificationType.INFO,
      NotificationCategory.CHAT,
      `Message from ${senderName}`,
      preview,
      { duration: 4000 }
    );
  }

  /**
   * System notifications
   */
  notifySystem(level: 'info' | 'warning' | 'error', title: string, message: string): string {
    const type = level === 'info' ? NotificationType.INFO : 
                 level === 'warning' ? NotificationType.WARNING : 
                 NotificationType.ERROR;

    return this.notify(type, NotificationCategory.SYSTEM, title, message, {
      persistent: level === 'error'
    });
  }

  /**
   * Show toast notification (implementation depends on UI library)
   */
  private showToast(notification: Notification): void {
    // This would integrate with your toast system (e.g., sonner, react-hot-toast)
    // For now, we'll use console logging as a placeholder
    console.log(`[Toast] ${notification.type}: ${notification.title} - ${notification.message}`);
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: Notification): void {
    if (this.notificationPermission !== 'granted') return;

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico', // Adjust path as needed
      tag: notification.category, // Prevents duplicate notifications
      requireInteraction: notification.persistent
    });

    // Auto-close after duration
    if (!notification.persistent && notification.duration) {
      setTimeout(() => {
        browserNotification.close();
      }, notification.duration);
    }
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(type: NotificationType): void {
    // Create audio context and play appropriate sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different notification types
      const frequency = type === NotificationType.ERROR ? 400 :
                       type === NotificationType.WARNING ? 600 :
                       type === NotificationType.SUCCESS ? 800 : 700;

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  /**
   * Dismiss a notification
   */
  dismissNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notifications = [];
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get notifications by category
   */
  getNotificationsByCategory(category: NotificationCategory): Notification[] {
    return this.notifications.filter(n => n.category === category);
  }

  /**
   * Update notification options
   */
  updateOptions(options: Partial<NotificationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Generate unique ID for notifications
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Action handlers (to be implemented based on your app's architecture)
   */
  private triggerReconnect(): void {
    console.log('Triggering reconnect...');
    // Implement reconnection logic
  }

  private triggerRetry(): void {
    console.log('Triggering retry...');
    // Implement retry logic
  }

  private reportIssue(): void {
    console.log('Reporting issue...');
    // Implement issue reporting
  }

  private openMediaSettings(): void {
    console.log('Opening media settings...');
    // Implement media settings dialog
  }

  private requestMediaPermission(): void {
    console.log('Requesting media permission...');
    // Implement permission request
  }

  private optimizeQuality(): void {
    console.log('Optimizing quality...');
    // Implement quality optimization
  }
}