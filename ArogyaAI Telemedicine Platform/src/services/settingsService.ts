import api from './api';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

export interface UserPreferences {
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  language: string;
  timezone: string;
  twoFactorAuth: boolean;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

class SettingsService {
  // Get user profile
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await api.get('/patients/me');
      return response.data.data;
    } catch (error: any) {
      console.error('Get profile error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch profile');
    }
  }

  // Update user profile
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await api.patch('/patients/me', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }

  // Change password
  async changePassword(data: PasswordChangeData): Promise<void> {
    try {
      await api.patch('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  }

  // Get user preferences
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await api.get('/patients/me/preferences');
      return response.data.data;
    } catch (error: any) {
      console.error('Get preferences error:', error);
      // Return default preferences if API fails
      return {
        darkMode: true,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        language: 'en-US',
        timezone: 'America/Los_Angeles',
        twoFactorAuth: false
      };
    }
  }

  // Update user preferences
  async updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await api.patch('/patients/me/preferences', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Update preferences error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update preferences');
    }
  }

  // Upload profile picture
  async uploadAvatar(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/patients/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.data.avatarUrl;
    } catch (error: any) {
      console.error('Upload avatar error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload avatar');
    }
  }

  // Get connected devices (mock for now)
  async getConnectedDevices() {
    // This would typically come from a real API
    return [
      { id: '1', device: 'MacBook Pro', location: 'San Francisco, CA', lastActive: '5 minutes ago', current: true },
      { id: '2', device: 'iPhone 14', location: 'San Francisco, CA', lastActive: '2 hours ago', current: false },
      { id: '3', device: 'iPad Air', location: 'San Francisco, CA', lastActive: '1 day ago', current: false },
    ];
  }

  // Remove connected device
  async removeDevice(deviceId: string): Promise<void> {
    try {
      await api.delete(`/auth/devices/${deviceId}`);
    } catch (error: any) {
      console.error('Remove device error:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove device');
    }
  }
}

export const settingsService = new SettingsService();