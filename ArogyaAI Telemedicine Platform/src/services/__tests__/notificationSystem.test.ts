/**
 * Tests for Notification System
 * Validates user notification functionality for connection status and errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationSystem, NotificationType, NotificationCategory } from '../notificationSystem';

describe('NotificationSystem', () => {
  let notificationSystem: NotificationSystem;
  let mockOnNotification: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnNotification = vi.fn();
    
    notificationSystem = new NotificationSystem({
      enableToasts: true,
      enableBrowserNotifications: false,
      enableSounds: false,
      maxNotifications: 5,
      defaultDuration: 3000,
      onNotification: mockOnNotification
    });
  });

  describe('Basic Notifications', () => {
    it('should create and store notifications', () => {
      const id = notificationSystem.notify(
        NotificationType.INFO,
        NotificationCategory.CONNECTION,
        'Test Title',
        'Test message'
      );

      expect(id).toBeTruthy();
      expect(mockOnNotification).toHaveBeenCalled();
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Test Title');
      expect(notifications[0].message).toBe('Test message');
    });

    it('should limit number of notifications', () => {
      // Add more notifications than the limit
      for (let i = 0; i < 10; i++) {
        notificationSystem.notify(
          NotificationType.INFO,
          NotificationCategory.SYSTEM,
          `Title ${i}`,
          `Message ${i}`
        );
      }

      const notifications = notificationSystem.getNotifications();
      expect(notifications.length).toBeLessThanOrEqual(5);
    });

    it('should dismiss notifications', () => {
      const id = notificationSystem.notify(
        NotificationType.INFO,
        NotificationCategory.CONNECTION,
        'Test',
        'Test message'
      );

      expect(notificationSystem.getNotifications()).toHaveLength(1);
      
      notificationSystem.dismissNotification(id);
      expect(notificationSystem.getNotifications()).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      notificationSystem.notify(NotificationType.INFO, NotificationCategory.CONNECTION, 'Test 1', 'Message 1');
      notificationSystem.notify(NotificationType.INFO, NotificationCategory.CONNECTION, 'Test 2', 'Message 2');
      
      expect(notificationSystem.getNotifications()).toHaveLength(2);
      
      notificationSystem.clearAllNotifications();
      expect(notificationSystem.getNotifications()).toHaveLength(0);
    });
  });

  describe('Connection Status Notifications', () => {
    it('should notify connecting status', () => {
      const id = notificationSystem.notifyConnectionStatus('connecting', 'Establishing connection...');
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications[0].type).toBe(NotificationType.INFO);
      expect(notifications[0].category).toBe(NotificationCategory.CONNECTION);
      expect(notifications[0].title).toBe('Connecting...');
    });

    it('should notify connected status', () => {
      const id = notificationSystem.notifyConnectionStatus('connected', 'Successfully connected');
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications[0].type).toBe(NotificationType.SUCCESS);
      expect(notifications[0].title).toBe('Connected');
    });

    it('should notify disconnected status with actions', () => {
      const id = notificationSystem.notifyConnectionStatus('disconnected', 'Connection lost');
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications[0].type).toBe(NotificationType.WARNING);
      expect(notifications[0].title).toBe('Disconnected');
      expect(notifications[0].persistent).toBe(true);
      expect(notifications[0].actions).toBeDefined();
      expect(notifications[0].actions![0].label).toBe('Reconnect');
    });

    it('should notify failed status with actions', () => {
      const id = notificationSystem.notifyConnectionStatus('failed', 'Connection failed');
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications[0].type).toBe(NotificationType.ERROR);
      expect(notifications[0].title).toBe('Connection Failed');
      expect(notifications[0].persistent).toBe(true);
      expect(notifications[0].actions).toBeDefined();
      expect(notifications[0].actions!).toHaveLength(2);
    });
  });

  describe('Media Status Notifications', () => {
    it('should notify camera enabled', () => {
      const id = notificationSystem.notifyMediaStatus('camera', 'enabled', 'Camera is active');
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications[0].type).toBe(NotificationType.SUCCESS);
      expect(notifications[0].title).toBe('Camera Enabled');
    });

    it('should notify microphone error with actions', () => {
      const id = notificationSystem.notifyMediaStatus('microphone', 'error', 'Microphone issue');
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications[0].type).toBe(NotificationType.ERROR);
      expect(notifications[0].title).toBe('Microphone Error');
      expect(notifications[0].persistent).toBe(true);
      expect(notifications[0].actions).toBeDefined();
    });

    it('should notify permission denied with actions', () => {
      const id = notificationSystem.notifyMediaStatus('camera', 'permission_denied', 'Access denied');
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications[0].type).toBe(NotificationType.ERROR);
      expect(notifications[0].title).toBe('Camera Access Denied');
      expect(notifications[0].persistent).toBe(true);
      expect(notifications[0].actions).toBeDefined();
    });
  });

  describe('Network Quality Notifications', () => {
    it('should notify excellent quality', () => {
      const id = notificationSystem.notifyNetworkQuality('excellent', 'Great connection');
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications[0].type).toBe(NotificationType.SUCCESS);
      expect(notifications[0].title).toBe('Excellent Connection');
    });

    it('should notify poor quality with actions', () => {
      const id = notificationSystem.notifyNetworkQuality('poor', 'Bad connection', {
        bandwidth: 100,
        latency: 500,
        packetLoss: 10
      });
      
      const notifications = notificationSystem.getNotifications();
      expect(notifications[0].type).toBe(NotificationType.ERROR);
      expect(notifications[0].title).toBe('Poor Connection');
      expect(notifications[0].persistent).toBe(true);
      expect(notifications[0].actions).toBeDefined();
      expect(notifications[0].metadata).toBeDefined();
    });
  });

  describe('Filtering and Querying', () => {
    it('should filter notifications by category', () => {
      notificationSystem.notify(NotificationType.INFO, NotificationCategory.CONNECTION, 'Conn 1', 'Message 1');
      notificationSystem.notify(NotificationType.INFO, NotificationCategory.MEDIA, 'Media 1', 'Message 2');
      notificationSystem.notify(NotificationType.INFO, NotificationCategory.CONNECTION, 'Conn 2', 'Message 3');
      
      const connectionNotifications = notificationSystem.getNotificationsByCategory(NotificationCategory.CONNECTION);
      expect(connectionNotifications).toHaveLength(2);
      
      const mediaNotifications = notificationSystem.getNotificationsByCategory(NotificationCategory.MEDIA);
      expect(mediaNotifications).toHaveLength(1);
    });
  });

  describe('Options Management', () => {
    it('should update notification options', () => {
      notificationSystem.updateOptions({
        enableToasts: false,
        maxNotifications: 10
      });
      
      // Options should be updated internally
      // This would need access to private options to verify
    });
  });
});