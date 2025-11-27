import api from './api';

export interface VerificationDocuments {
  medicalLicense?: string;
  degreeCertificate?: string;
  idProof?: string;
  additionalCertifications?: string[];
}

export interface VerificationSubmission {
  registrationNumber: string;
  qualifications: string[];
  specialization: string;
  experience: number;
  phoneNumber: string;
  address: string;
  languages: string[];
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  clinic?: {
    name: string;
    address: string;
    phone: string;
  };
  bio: string;
  verificationDocuments: VerificationDocuments;
}

export interface VerificationStatus {
  verificationStatus: string;
  verificationSubmittedAt?: string;
  verificationCompletedAt?: string;
  rejectionReason?: string;
  verified: boolean;
  isVerified: boolean;
}

class DoctorVerificationService {
  async submitVerification(data: VerificationSubmission): Promise<void> {
    await api.post('/doctors/verification/submit', data);
  }

  async getVerificationStatus(): Promise<VerificationStatus> {
    const response = await api.get('/doctors/verification/status');
    return response.data.data;
  }

  // Mock file upload - in production, this would upload to cloud storage
  async uploadDocument(file: File, documentType: string): Promise<string> {
    // For now, return a mock URL
    // In production, implement actual file upload to S3, Cloudinary, etc.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://storage.example.com/documents/${documentType}/${file.name}`);
      }, 1000);
    });
  }
}

export default new DoctorVerificationService();
