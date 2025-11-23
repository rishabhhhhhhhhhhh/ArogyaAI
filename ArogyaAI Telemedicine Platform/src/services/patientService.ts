// src/services/patientService.ts
import api from './api';

export interface PatientDashboardData {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  metrics: {
    aiAssessments: number;
    upcomingAppointments: number;
    activePrescriptions: number;
    healthScore: number;
  };
  healthData: Array<{ date: string; score: number }>;
  appointments: Array<{
    id: string;
    doctor: string;
    specialty: string;
    date: string;
    time: string;
    type: string;
    avatar?: string;
  }>;
  aiResults: Array<{
    id: string;
    condition: string;
    severity: string;
    date: string;
    confidence: number;
  }>;
  prescriptions: Array<{
    id: string;
    medication: string;
    doctor: string;
    date: string;
    duration: string;
  }>;
}

export const patientService = {
  // Get patient dashboard data
  getDashboardData: async (): Promise<PatientDashboardData> => {
    try {
      const response = await api.get('/patients/me/dashboard');
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch dashboard data');
    } catch (error: any) {
      console.error('Dashboard API Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get patient profile
  getProfile: async () => {
    try {
      const response = await api.get('/patients/me');
      return response.data.data;
    } catch (error: any) {
      console.error('Profile fetch error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Update patient profile
  updateProfile: async (data: any) => {
    try {
      const response = await api.patch('/patients/me', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Profile update error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Create AI assessment
  createAIAssessment: async (assessmentData: {
    symptoms: string[];
    condition: string;
    severity: 'Low' | 'Medium' | 'High';
    confidence: number;
    recommendations?: string[];
  }) => {
    const response = await api.post('/ai-assessments', assessmentData);
    return response.data.data;
  },

  // Get AI assessments for patient
  getAIAssessments: async (patientId: string, page = 1, limit = 10) => {
    const response = await api.get(`/ai-assessments/patient/${patientId}?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Create health metric
  createHealthMetric: async (metricData: {
    healthScore: number;
    metrics?: any;
    notes?: string;
  }) => {
    const response = await api.post('/health-metrics', metricData);
    return response.data.data;
  },

  // Get health timeline
  getHealthTimeline: async (patientId: string, months: number = 6) => {
    const response = await api.get(`/health-metrics/patient/${patientId}/timeline?months=${months}`);
    return response.data.data;
  },

  // Get patient appointments
  getMyAppointments: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    upcoming?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.upcoming) queryParams.append('upcoming', params.upcoming.toString());

    const response = await api.get(`/appointments/me?${queryParams.toString()}`);
    return response.data;
  },

  // Get patient prescriptions
  getMyPrescriptions: async (params?: {
    page?: number;
    limit?: number;
    recent?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.recent) queryParams.append('recent', params.recent.toString());

    const response = await api.get(`/prescriptions/me?${queryParams.toString()}`);
    return response.data;
  },

  // Book appointment with doctor
  bookAppointment: async (appointmentData: {
    doctorId: string;
    scheduledAt: string;
    mode: 'video' | 'audio' | 'in_person';
    reason: string;
    notes?: string;
  }) => {
    try {
      const response = await api.post('/appointments', appointmentData);
      return response.data;
    } catch (error: any) {
      console.error('Appointment booking error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Reschedule appointment
  rescheduleAppointment: async (appointmentId: string, rescheduleData: {
    scheduledAt: string;
    reason?: string;
  }) => {
    try {
      const response = await api.patch(`/appointments/${appointmentId}/reschedule`, rescheduleData);
      return response.data;
    } catch (error: any) {
      console.error('Appointment reschedule error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId: string, cancelData?: {
    reason?: string;
  }) => {
    try {
      const response = await api.patch(`/appointments/${appointmentId}/cancel`, cancelData || {});
      return response.data;
    } catch (error: any) {
      console.error('Appointment cancellation error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default patientService;