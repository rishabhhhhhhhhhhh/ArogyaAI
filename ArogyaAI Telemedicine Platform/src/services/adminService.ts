import api from './api';

export interface AdminStats {
  totalUsers: number;
  verifiedDoctors: number;
  pendingDoctors: number;
  totalAppointments: number;
  newUsersThisMonth: number;
  newDoctorsThisMonth: number;
  appointmentsThisMonth: number;
}

export interface PendingDoctor {
  _id: string;
  userId: {
    _id: string;
    email: string;
    name?: string;
  };
  firstName: string;
  lastName: string;
  specialization: string;
  registrationNumber: string;
  experience: number;
  profileImage?: string;
  verificationDocuments?: {
    medicalLicense?: string;
    degreeCertificate?: string;
    idProof?: string;
    additionalCertifications?: string[];
  };
  verificationStatus: string;
  verificationSubmittedAt: string;
  phoneNumber?: string;
  address?: string;
  languages?: string[];
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  qualifications?: string[];
  clinic?: {
    name: string;
    address: string;
    phone: string;
  };
  bio?: string;
}

export interface VerifiedDoctor {
  _id: string;
  userId: {
    _id: string;
    email: string;
    name?: string;
  };
  firstName: string;
  lastName: string;
  specialization: string;
  profileImage?: string;
  experience: number;
  rating: number;
  verified: boolean;
  isActive: boolean;
}

export interface DoctorDetails extends PendingDoctor {
  appointmentCount: number;
  createdAt: string;
  updatedAt: string;
}

class AdminService {
  async getStats(): Promise<AdminStats> {
    const response = await api.get('/admin/stats');
    return response.data.data;
  }

  async getPendingDoctors(): Promise<PendingDoctor[]> {
    const response = await api.get('/admin/doctors/pending');
    return response.data.data;
  }

  async getVerifiedDoctors(page = 1, limit = 50): Promise<{ doctors: VerifiedDoctor[]; total: number }> {
    const response = await api.get('/admin/doctors/verified', {
      params: { page, limit }
    });
    return {
      doctors: response.data.data,
      total: response.data.meta.total
    };
  }

  async getDoctorDetails(doctorId: string): Promise<DoctorDetails> {
    const response = await api.get(`/admin/doctors/${doctorId}`);
    return response.data.data;
  }

  async verifyDoctor(doctorId: string): Promise<void> {
    await api.post(`/admin/doctors/verify/${doctorId}`, {
      action: 'verify'
    });
  }

  async rejectDoctor(doctorId: string, reason: string): Promise<void> {
    await api.post(`/admin/doctors/verify/${doctorId}`, {
      action: 'reject',
      reason
    });
  }

  async listUsers(page = 1, limit = 50, query?: string) {
    const response = await api.get('/admin/users', {
      params: { page, limit, q: query }
    });
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  }

  async promoteToAdmin(userId: string): Promise<void> {
    await api.post(`/admin/promote/${userId}`);
  }
}

export default new AdminService();
