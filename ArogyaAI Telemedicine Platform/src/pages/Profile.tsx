// src/pages/Profile.tsx
import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Heart, Edit3, Save, X, Camera, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile, PatientProfile } from '../hooks/useProfile';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { CustomSelect } from '../components/ui/custom-select';

import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'sonner';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading, error, updateProfile } = useProfile();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedProfile, setEditedProfile] = useState<PatientProfile>({});
  const [saving, setSaving] = useState<boolean>(false);

  // Initialize edited profile when profile loads
  React.useEffect(() => {
    if (profile) {
      setEditedProfile(profile);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(editedProfile);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
  };

  const updateField = (field: string, value: any) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    setEditedProfile(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof PatientProfile] as any || {}),
        [field]: value
      }
    }));
  };



  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen pt-16">
        <DashboardSidebar userType="patient" />
        <div className="ml-20 p-6">
          <div className="max-w-4xl mx-auto">
            <GlassCard>
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4 opacity-50" />
                <div className="text-destructive text-lg mb-4">{error}</div>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  // Show profile even if some data is missing - allow editing to complete it
  const displayProfile = profile || {
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ')[1] || '',
    email: user?.email || ''
  };

  return (
    <div className="min-h-screen pt-16">
      <DashboardSidebar userType="patient" />
      
      <div className="ml-20 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-4xl font-['Poppins'] font-semibold">My Profile</h1>
                  <p className="text-muted-foreground">Manage your personal information</p>
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={saving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      className="bg-primary text-primary-foreground"
                      disabled={saving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Avatar */}
          <GlassCard className="mb-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src="" alt={`${displayProfile.firstName} ${displayProfile.lastName}`} />
                  <AvatarFallback className="text-2xl font-['Poppins'] font-semibold bg-primary/10 text-primary">
                    {displayProfile.firstName?.[0] || 'P'}{displayProfile.lastName?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-primary text-primary-foreground"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-['Poppins'] font-semibold">
                  {displayProfile.firstName || 'Patient'} {displayProfile.lastName || ''}
                </h2>
                <p className="text-muted-foreground">{displayProfile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-accent/10 text-accent border-accent">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified Patient
                  </Badge>
                  {!displayProfile.isProfileComplete && (
                    <Badge variant="outline" className="border-orange-500 text-orange-500">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Incomplete Profile
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <GlassCard>
              <h3 className="text-xl font-['Poppins'] font-semibold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">First Name</Label>
                    {isEditing ? (
                      <Input
                        value={editedProfile.firstName || ''}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        className="mt-1"
                        placeholder="Enter first name"
                      />
                    ) : (
                      <div className="font-medium mt-1">{displayProfile.firstName || '—'}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Name</Label>
                    {isEditing ? (
                      <Input
                        value={editedProfile.lastName || ''}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        className="mt-1"
                        placeholder="Enter last name"
                      />
                    ) : (
                      <div className="font-medium mt-1">{displayProfile.lastName || '—'}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </Label>
                  <div className="font-medium mt-1 text-muted-foreground">{displayProfile.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">Email cannot be changed</div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.phone || ''}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className="mt-1"
                      placeholder="Enter phone number"
                      type="tel"
                    />
                  ) : (
                    <div className="font-medium mt-1">{displayProfile.phone || '—'}</div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Date of Birth
                    </Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedProfile.dob || ''}
                        onChange={(e) => updateField('dob', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <div className="font-medium mt-1">
                        {displayProfile.dob ? new Date(displayProfile.dob).toLocaleDateString() : '—'}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative', zIndex: isEditing ? 1000 : 'auto' }}>
                    <Label className="text-xs text-muted-foreground">Gender</Label>
                    {isEditing ? (
                      <div style={{ position: 'relative', zIndex: 1001 }}>
                        <CustomSelect
                          value={editedProfile.gender || ''}
                          onValueChange={(value: string) => updateField('gender', value)}
                          placeholder="Select gender"
                          className="mt-1"
                          options={[
                            { value: 'male', label: 'Male' },
                            { value: 'female', label: 'Female' },
                            { value: 'other', label: 'Other' },
                            { value: 'prefer_not_say', label: 'Prefer not to say' }
                          ]}
                        />
                      </div>
                    ) : (
                      <div className="font-medium mt-1 capitalize">{displayProfile.gender?.replace('_', ' ') || '—'}</div>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Address Information */}
            <GlassCard>
              <h3 className="text-xl font-['Poppins'] font-semibold mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Address
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Street Address</Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.address?.line1 || ''}
                      onChange={(e) => updateNestedField('address', 'line1', e.target.value)}
                      className="mt-1"
                      placeholder="Enter street address"
                    />
                  ) : (
                    <div className="font-medium mt-1">{displayProfile.address?.line1 || '—'}</div>
                  )}
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Address Line 2</Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.address?.line2 || ''}
                      onChange={(e) => updateNestedField('address', 'line2', e.target.value)}
                      className="mt-1"
                      placeholder="Apartment, suite, etc. (optional)"
                    />
                  ) : (
                    <div className="font-medium mt-1">{displayProfile.address?.line2 || '—'}</div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    {isEditing ? (
                      <Input
                        value={editedProfile.address?.city || ''}
                        onChange={(e) => updateNestedField('address', 'city', e.target.value)}
                        className="mt-1"
                        placeholder="Enter city"
                      />
                    ) : (
                      <div className="font-medium mt-1">{displayProfile.address?.city || '—'}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">State</Label>
                    {isEditing ? (
                      <Input
                        value={editedProfile.address?.state || ''}
                        onChange={(e) => updateNestedField('address', 'state', e.target.value)}
                        className="mt-1"
                        placeholder="Enter state"
                      />
                    ) : (
                      <div className="font-medium mt-1">{displayProfile.address?.state || '—'}</div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Postal Code</Label>
                    {isEditing ? (
                      <Input
                        value={editedProfile.address?.postalCode || ''}
                        onChange={(e) => updateNestedField('address', 'postalCode', e.target.value)}
                        className="mt-1"
                        placeholder="Enter postal code"
                      />
                    ) : (
                      <div className="font-medium mt-1">{displayProfile.address?.postalCode || '—'}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    {isEditing ? (
                      <Input
                        value={editedProfile.address?.country || ''}
                        onChange={(e) => updateNestedField('address', 'country', e.target.value)}
                        className="mt-1"
                        placeholder="Enter country"
                      />
                    ) : (
                      <div className="font-medium mt-1">{displayProfile.address?.country || '—'}</div>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Medical Information */}
            <GlassCard>
              <h3 className="text-xl font-['Poppins'] font-semibold mb-6 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Medical Information
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Height (cm)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedProfile.vitals?.heightCm || ''}
                        onChange={(e) => updateNestedField('vitals', 'heightCm', parseInt(e.target.value) || '')}
                        className="mt-1"
                        placeholder="Enter height in cm"
                      />
                    ) : (
                      <div className="font-medium mt-1">{displayProfile.vitals?.heightCm ? `${displayProfile.vitals.heightCm} cm` : '—'}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedProfile.vitals?.weightKg || ''}
                        onChange={(e) => updateNestedField('vitals', 'weightKg', parseInt(e.target.value) || '')}
                        className="mt-1"
                        placeholder="Enter weight in kg"
                      />
                    ) : (
                      <div className="font-medium mt-1">{displayProfile.vitals?.weightKg ? `${displayProfile.vitals.weightKg} kg` : '—'}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Blood Pressure</Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.vitals?.bp || ''}
                      onChange={(e) => updateNestedField('vitals', 'bp', e.target.value)}
                      className="mt-1"
                      placeholder="e.g., 120/80"
                    />
                  ) : (
                    <div className="font-medium mt-1">{displayProfile.vitals?.bp || '—'}</div>
                  )}
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Medical Conditions</Label>
                  <div className="mt-2">
                    {displayProfile.medicalHistory?.conditions?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {displayProfile.medicalHistory.conditions.map((condition, i) => (
                          <Badge key={i} variant="outline" className="border-[#FF7A59] text-[#FF7A59]">
                            {condition}
                            {isEditing && (
                              <button
                                onClick={() => {
                                  const updatedConditions = (editedProfile.medicalHistory?.conditions || []).filter((_, index) => index !== i);
                                  updateField('medicalHistory', {
                                    ...editedProfile.medicalHistory,
                                    conditions: updatedConditions
                                  });
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No recorded conditions</div>
                    )}
                    {isEditing && (
                      <div className="mt-2">
                        <Input
                          placeholder="Add medical condition"
                          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              const value = (e.target as HTMLInputElement).value;
                              if (value.trim()) {
                                updateField('medicalHistory', {
                                  ...editedProfile.medicalHistory,
                                  conditions: [...(editedProfile.medicalHistory?.conditions || []), value.trim()]
                                });
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Allergies</Label>
                  <div className="mt-2">
                    {displayProfile.allergies?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {displayProfile.allergies.map((allergy, i) => (
                          <Badge key={i} variant="outline" className="border-destructive text-destructive">
                            {allergy.name}
                            {isEditing && (
                              <button
                                onClick={() => {
                                  const updatedAllergies = (editedProfile.allergies || []).filter((_, index) => index !== i);
                                  updateField('allergies', updatedAllergies);
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No known allergies</div>
                    )}
                    {isEditing && (
                      <div className="mt-2">
                        <Input
                          placeholder="Add allergy"
                          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              const value = (e.target as HTMLInputElement).value;
                              if (value.trim()) {
                                updateField('allergies', [
                                  ...(editedProfile.allergies || []),
                                  { name: value.trim(), reaction: '' }
                                ]);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Emergency Contact */}
            <GlassCard>
              <h3 className="text-xl font-['Poppins'] font-semibold mb-6 flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Emergency Contact
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.emergencyContact?.name || ''}
                      onChange={(e) => updateNestedField('emergencyContact', 'name', e.target.value)}
                      className="mt-1"
                      placeholder="Enter emergency contact name"
                    />
                  ) : (
                    <div className="font-medium mt-1">{displayProfile.emergencyContact?.name || '—'}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  {isEditing ? (
                    <Input
                      type="tel"
                      value={editedProfile.emergencyContact?.phone || ''}
                      onChange={(e) => updateNestedField('emergencyContact', 'phone', e.target.value)}
                      className="mt-1"
                      placeholder="Enter emergency contact phone"
                    />
                  ) : (
                    <div className="font-medium mt-1">{displayProfile.emergencyContact?.phone || '—'}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Relationship</Label>
                  {isEditing ? (
                    <CustomSelect
                      value={editedProfile.emergencyContact?.relation || ''}
                      onValueChange={(value: string) => updateNestedField('emergencyContact', 'relation', value)}
                      placeholder="Select relationship"
                      className="mt-1"
                      options={[
                        { value: 'spouse', label: 'Spouse' },
                        { value: 'parent', label: 'Parent' },
                        { value: 'child', label: 'Child' },
                        { value: 'sibling', label: 'Sibling' },
                        { value: 'friend', label: 'Friend' },
                        { value: 'other', label: 'Other' }
                      ]}
                    />
                  ) : (
                    <div className="font-medium mt-1 capitalize">{displayProfile.emergencyContact?.relation || '—'}</div>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
