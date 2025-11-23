// src/hooks/useDoctor.ts
import { useState } from 'react';
import { toast } from 'sonner';
import doctorService, { 
  DoctorProfile, 
  DashboardData, 
  PatientInQueue, 
  AnalyticsData 
} from '../services/doctorService';

export function useDoctor() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [patientQueue, setPatientQueue] = useState<PatientInQueue[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch doctor profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorService.getMyProfile();
      setProfile(data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch profile';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorService.getDashboardData();
      setDashboardData(data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch dashboard data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patient queue
  const fetchPatientQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorService.getPatientQueue();
      setPatientQueue(data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch patient queue';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorService.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch analytics';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (data: Partial<DoctorProfile>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedProfile = await doctorService.updateProfile(data);
      setProfile(updatedProfile);
      toast.success('Profile updated successfully');
      return updatedProfile;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update profile';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      fetchProfile(),
      fetchDashboardData(),
      fetchPatientQueue(),
      fetchAnalytics()
    ]);
  };

  return {
    // Data
    profile,
    dashboardData,
    patientQueue,
    analytics,
    loading,
    error,

    // Actions
    fetchProfile,
    fetchDashboardData,
    fetchPatientQueue,
    fetchAnalytics,
    updateProfile,
    refreshAll,

    // Computed values
    stats: dashboardData?.stats,
    todayAppointments: dashboardData?.todayAppointments || []
  };
}

export default useDoctor;