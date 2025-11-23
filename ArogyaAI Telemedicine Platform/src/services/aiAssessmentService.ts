import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';



export interface AIAnalysisRequest {
  symptoms: string;
  imageData?: string;
}

export interface AIAnalysisResponse {
  condition: string;
  severity: 'Low' | 'Medium' | 'High';
  confidence: number;
  recommendations: string[];
  shouldConsultDoctor: boolean;
  estimatedRecovery: string;
  summary: string;
}

export interface CreateAssessmentRequest {
  symptoms: string[];
  condition: string;
  severity: 'Low' | 'Medium' | 'High';
  confidence: number;
  recommendations: string[];
  followUpRequired: boolean;
  assessmentData: any;
  imageData?: string;
  summary?: string;
  estimatedRecovery?: string;
}

class AIAssessmentService {
  private getAuthHeaders() {
    const token = localStorage.getItem('aai_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async analyzeSymptoms(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const url = `${API_BASE_URL}/ai-assessments/analyze`;
      console.log('🔍 AI Service Debug:');
      console.log('- URL:', url);
      console.log('- Request data:', data);
      
      const response = await axios.post(
        url,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('- Response status:', response.status);
      console.log('- Response data:', response.data);
      console.log('- Returning:', response.data.data);
      
      return response.data.data;
    } catch (error: any) {
      console.error('AI Analysis error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to analyze symptoms'
      );
    }
  }

  async createAssessment(data: CreateAssessmentRequest) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/ai-assessments`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Create assessment error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to create assessment'
      );
    }
  }

  async getPatientAssessments(patientId: string, page = 1, limit = 10) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ai-assessments/patient/${patientId}?page=${page}&limit=${limit}`,
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Get assessments error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch assessments'
      );
    }
  }

  async getAssessmentById(id: string) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ai-assessments/${id}`,
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Get assessment error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch assessment'
      );
    }
  }

  // Helper method to convert file to base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
}

export const aiAssessmentService = new AIAssessmentService();