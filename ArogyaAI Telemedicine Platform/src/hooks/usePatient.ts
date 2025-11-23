// src/hooks/usePatient.ts
import { useState, useEffect } from 'react';
import { patientService, PatientDashboardData } from '../services/patientService';
import { useAuth } from './useAuth';

export const usePatientDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!user || user.role !== 'patient') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const dashboardData = await patientService.getDashboardData();
      setData(dashboardData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData
  };
};

export const usePatient = () => {
  return {
    createAIAssessment: patientService.createAIAssessment,
    createHealthMetric: patientService.createHealthMetric,
    getProfile: patientService.getProfile,
    updateProfile: patientService.updateProfile,
    getHealthTimeline: patientService.getHealthTimeline
  };
};