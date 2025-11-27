// src/services/doctorService.ts
import api from './api';

export interface DoctorProfile {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  firstName: string;
  lastName: string;
  qualifications: string[];
  specialization: string;
  registrationNumber: string;
  clinic: {
    name: string;
    address: string;
    phone: string;
  };
  profileImage?: string;
  verified: boolean;
  verificationStatus?: string;
  availableSlots: Array<{
    date: Date;
    slots: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PatientInQueue {
  _id: string;
  patient: {
    _id: string;
    userId: {
      name: string;
      email: string;
    };
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    profileImage?: string;
  };
  scheduledAt: string;
  status: string;
  mode: string;
  reason: string;
  aiAssessment: {
    condition: string;
    confidence: number;
    severity: 'Low' | 'Medium' | 'High';
    symptoms: string;
  };
  waitTime: string;
}

export interface DashboardStats {
  todayPatients: number;
  monthlyPatients: number;
  totalPatients: number;
  avgConsultTime: number;
  recentPrescriptions: number;
  rating: number;
}

export interface DashboardData {
  doctor: DoctorProfile;
  todayAppointments: PatientInQueue[];
  stats: DashboardStats;
}

export interface AnalyticsData {
  monthlyData: Array<{
    month: string;
    patients: number;
  }>;
  topConditions: Array<{
    condition: string;
    count: number;
  }>;
  totalConsultations: number;
  aiAgreementRate: number;
  patientSatisfaction: number;
  avgResponseTime: string;
}

export interface Doctor {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  specialization: string;
  profileImage?: string;
  experience: number;
  rating: number;
  consultationFee: number;
  availability: string;
  bio: string;
  email: string;
}

class DoctorService {
  // Get doctor's own profile
  async getMyProfile(): Promise<DoctorProfile> {
    const response = await api.get('/doctors/me');
    return response.data.data;
  }

  // Update doctor's profile
  async updateProfile(data: Partial<DoctorProfile>): Promise<DoctorProfile> {
    const response = await api.patch('/doctors/me', data);
    return response.data.data;
  }

  // Get dashboard data
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get('/doctors/dashboard');
    return response.data.data;
  }

  // Get patient queue
  async getPatientQueue(): Promise<PatientInQueue[]> {
    const response = await api.get('/doctors/queue');
    return response.data.data;
  }

  // Get analytics data
  async getAnalytics(): Promise<AnalyticsData> {
    const response = await api.get('/doctors/analytics');
    return response.data.data;
  }

  // Get all doctors for patient booking
  async getAllDoctors(params?: { specialization?: string; available?: boolean }): Promise<{
    data: Doctor[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/doctors', { params });
    return response.data;
  }
}

export const doctorService = new DoctorService();
export default doctorService;