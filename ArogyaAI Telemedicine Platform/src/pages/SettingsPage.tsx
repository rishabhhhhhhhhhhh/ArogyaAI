import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Upload, Shield, Bell, Moon, Sun } from 'lucide-react';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { settingsService, UserProfile, UserPreferences } from '../services/settingsService';

export function SettingsPage() {
  const { user } = useAuth();
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    avatar: ''
  });
  
  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    darkMode: true,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    language: 'en-US',
    timezone: 'America/Los_Angeles',
    twoFactorAuth: false
  });

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<any[]>([]);

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Load profile and preferences in parallel
        const [profileData, preferencesData, devicesData] = await Promise.all([
          settingsService.getProfile(),
          settingsService.getPreferences(),
          settingsService.getConnectedDevices()
        ]);
        
        setProfile(profileData);
        setPreferences(preferencesData);
        setConnectedDevices(devicesData);
      } catch (error: any) {
        console.error('Failed to load user data:', error);
        toast.error('Failed to load settings data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await settingsService.updateProfile(profile);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setSaving(true);
      await settingsService.changePassword(passwordData);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = async (key: keyof UserPreferences, value: boolean | string) => {
    try {
      const updatedPreferences = { ...preferences, [key]: value };
      setPreferences(updatedPreferences);
      
      // Save to backend
      await settingsService.updatePreferences({ [key]: value });
      toast.success('Preference updated');
    } catch (error: any) {
      // Revert on error
      setPreferences(preferences);
      toast.error(error.message || 'Failed to update preference');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    try {
      setSaving(true);
      const avatarUrl = await settingsService.uploadAvatar(file);
      setProfile({ ...profile, avatar: avatarUrl });
      toast.success('Profile picture updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await settingsService.removeDevice(deviceId);
      setConnectedDevices(devices => devices.filter(d => d.id !== deviceId));
      toast.success('Device removed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove device');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16">
        <DashboardSidebar userType={(user?.role as 'patient' | 'doctor' | 'admin') || 'patient'} />
        <div className="ml-20 p-6 flex items-center justify-center">
          <LoadingSpinner message="Loading settings..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <DashboardSidebar userType={(user?.role as 'patient' | 'doctor' | 'admin') || 'patient'} />
      
      <div className="ml-20 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-['Poppins'] font-semibold mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              {/* Avatar Upload */}
              <GlassCard>
                <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Profile Picture</h2>
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24 border-4 border-primary/20">
                    <AvatarImage src={profile.avatar} alt="Profile" />
                    <AvatarFallback>
                      {profile.firstName?.[0]}{profile.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Button 
                      variant="outline" 
                      className="border-primary/20"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={saving}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {saving ? 'Uploading...' : 'Upload New Photo'}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Recommended: Square image, at least 400x400px
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Personal Information */}
              <GlassCard>
                <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Personal Information</h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          value={profile.firstName}
                          onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                          className="pl-10 bg-input-background border-input focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="lastName"
                          value={profile.lastName}
                          onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                          className="pl-10 bg-input-background border-input focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="pl-10 bg-input-background border-input focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="pl-10 bg-input-background border-input focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="address"
                        value={profile.address || ''}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className="pl-10 bg-input-background border-input focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={saving}
                      className="bg-primary hover:bg-primary/90 glow-teal"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              {/* Change Password */}
              <GlassCard>
                <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Change Password</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="bg-input-background border-input focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="bg-input-background border-input focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="bg-input-background border-input focus:border-primary"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="bg-primary hover:bg-primary/90 glow-teal"
                    >
                      {saving ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>
              </GlassCard>

              {/* Two-Factor Authentication */}
              <GlassCard>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <h2 className="text-2xl font-['Poppins'] font-semibold">Two-Factor Authentication</h2>
                    </div>
                    <p className="text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch
                    checked={preferences.twoFactorAuth}
                    onCheckedChange={(value) => handlePreferenceChange('twoFactorAuth', value)}
                  />
                </div>
                {preferences.twoFactorAuth && (
                  <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication is enabled. You'll receive a code via SMS when logging in.
                    </p>
                  </div>
                )}
              </GlassCard>

              {/* Connected Devices */}
              <GlassCard>
                <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Connected Devices</h2>
                <div className="space-y-3">
                  {connectedDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-['Poppins'] font-semibold">{device.device}</p>
                          {device.current && (
                            <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{device.location}</p>
                        <p className="text-xs text-muted-foreground">Last active: {device.lastActive}</p>
                      </div>
                      {!device.current && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemoveDevice(device.id)}
                          className="border-destructive text-destructive hover:bg-destructive/10"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              {/* Theme */}
              <GlassCard>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {preferences.darkMode ? (
                        <Moon className="w-5 h-5 text-primary" />
                      ) : (
                        <Sun className="w-5 h-5 text-primary" />
                      )}
                      <h2 className="text-2xl font-['Poppins'] font-semibold">Dark Mode</h2>
                    </div>
                    <p className="text-muted-foreground">
                      Switch between light and dark themes
                    </p>
                  </div>
                  <Switch
                    checked={preferences.darkMode}
                    onCheckedChange={(value) => handlePreferenceChange('darkMode', value)}
                  />
                </div>
              </GlassCard>

              {/* Notifications */}
              <GlassCard>
                <div className="flex items-center gap-2 mb-6">
                  <Bell className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-['Poppins'] font-semibold">Notifications</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-['Poppins'] font-semibold">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about appointments and prescriptions
                      </p>
                    </div>
                    <Switch
                      checked={preferences.emailNotifications}
                      onCheckedChange={(value) => handlePreferenceChange('emailNotifications', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-['Poppins'] font-semibold">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Get instant alerts on your device
                      </p>
                    </div>
                    <Switch
                      checked={preferences.pushNotifications}
                      onCheckedChange={(value) => handlePreferenceChange('pushNotifications', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-['Poppins'] font-semibold">SMS Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive text messages for urgent updates
                      </p>
                    </div>
                    <Switch
                      checked={preferences.smsNotifications}
                      onCheckedChange={(value) => handlePreferenceChange('smsNotifications', value)}
                    />
                  </div>
                </div>
              </GlassCard>

              {/* Language & Region */}
              <GlassCard>
                <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Language & Region</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <select 
                      value={preferences.language}
                      onChange={(e) => handlePreferenceChange('language', e.target.value)}
                      className="w-full p-2 rounded-lg bg-input-background border border-input focus:border-primary focus:outline-none"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <select 
                      value={preferences.timezone}
                      onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                      className="w-full p-2 rounded-lg bg-input-background border border-input focus:border-primary focus:outline-none"
                    >
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                    </select>
                  </div>
                </div>
              </GlassCard>

              {/* Danger Zone */}
              <GlassCard>
                <h2 className="text-2xl font-['Poppins'] font-semibold mb-6 text-destructive">Danger Zone</h2>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                    Deactivate Account
                  </Button>
                  <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                    Delete Account Permanently
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
