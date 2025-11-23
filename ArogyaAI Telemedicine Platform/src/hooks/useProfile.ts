// src/hooks/useProfile.ts
import { useState, useEffect } from 'react';
import { patientService } from '../services/patientService';
import { useAuth } from './useAuth';

export interface PatientProfile {
  _id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_say';
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  emergencyContact?: {
    name?: string;
    relation?: string;
    phone?: string;
  };
  medicalHistory?: {
    conditions?: string[];
    surgeries?: string[];
    familyHistory?: string[];
    smokingStatus?: string;
    alcoholUse?: string;
  };
  allergies?: Array<{
    name?: string;
    reaction?: string;
  }>;
  medications?: Array<{
    name?: string;
    dosage?: string;
    frequency?: string;
  }>;
  vitals?: {
    heightCm?: number;
    weightKg?: number;
    bp?: string;
    pulse?: number;
    temperatureC?: number;
    lastUpdated?: string;
  };
  preferredLanguage?: string;
  timezone?: string;
  isProfileComplete?: boolean;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user || user.role !== 'patient') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const profileData = await patientService.getProfile();
      setProfile(profileData);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<PatientProfile>) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedProfile = await patientService.updateProfile(data);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      console.error('Profile update error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile
  };
};