import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import doctorVerificationService, { VerificationDocuments } from '../services/doctorVerificationService';

export function DoctorVerification() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    registrationNumber: '',
    qualifications: '',
    specialization: '',
    experience: '',
    phoneNumber: '',
    address: '',
    languages: '',
    degree: '',
    institution: '',
    graduationYear: '',
    clinicName: '',
    clinicAddress: '',
    clinicPhone: '',
    bio: ''
  });

  const [documents, setDocuments] = useState<VerificationDocuments>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const status = await doctorVerificationService.getVerificationStatus();
      setVerificationStatus(status);
      
      if (status.verified || status.verificationStatus === 'verified') {
        toast.success('Your account is already verified!');
        setTimeout(() => navigate('/doctor/dashboard'), 2000);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: keyof VerificationDocuments) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    try {
      setUploadingDoc(docType);
      const url = await doctorVerificationService.uploadDocument(file, docType);
      setDocuments({
        ...documents,
        [docType]: url
      });
      toast.success(`${docType} uploaded successfully`);
    } catch (error) {
      toast.error(`Failed to upload ${docType}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.registrationNumber || !formData.specialization || !formData.phoneNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!documents.medicalLicense || !documents.degreeCertificate || !documents.idProof) {
      toast.error('Please upload all required documents');
      return;
    }

    setLoading(true);
    try {
      const submissionData = {
        registrationNumber: formData.registrationNumber,
        qualifications: formData.qualifications.split(',').map(q => q.trim()).filter(Boolean),
        specialization: formData.specialization,
        experience: parseInt(formData.experience) || 0,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        languages: formData.languages.split(',').map(l => l.trim()).filter(Boolean),
        education: formData.degree ? [{
          degree: formData.degree,
          institution: formData.institution,
          year: parseInt(formData.graduationYear) || new Date().getFullYear()
        }] : [],
        clinic: formData.clinicName ? {
          name: formData.clinicName,
          address: formData.clinicAddress,
          phone: formData.clinicPhone
        } : undefined,
        bio: formData.bio,
        verificationDocuments: documents
      };

      await doctorVerificationService.submitVerification(submissionData);
      toast.success('Verification documents submitted successfully!');
      setTimeout(() => navigate('/doctor/dashboard'), 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-['Poppins'] font-semibold mb-2">Doctor Verification</h1>
          <p className="text-muted-foreground">
            Complete your profile and upload required documents for verification
          </p>
          
          {verificationStatus && (
            <div className="mt-4">
              <Badge 
                variant="outline"
                className={
                  verificationStatus.verificationStatus === 'verified' ? 'border-green-500 text-green-600 bg-green-500/10' :
                  verificationStatus.verificationStatus === 'submitted' || verificationStatus.verificationStatus === 'under_review' ? 'border-yellow-500 text-yellow-600 bg-yellow-500/10' :
                  verificationStatus.verificationStatus === 'rejected' ? 'border-red-500 text-red-600 bg-red-500/10' :
                  'border-gray-500 text-gray-600 bg-gray-500/10'
                }
              >
                Status: {verificationStatus.verificationStatus}
              </Badge>
              {verificationStatus.rejectionReason && (
                <p className="text-sm text-destructive mt-2">
                  Rejection reason: {verificationStatus.rejectionReason}
                </p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <GlassCard>
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Personal Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="registrationNumber">Medical Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., MD-12345-2020"
                  required
                />
              </div>
              <div>
                <Label htmlFor="specialization">Specialization *</Label>
                <Input
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  placeholder="e.g., Cardiologist"
                  required
                />
              </div>
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  name="experience"
                  type="number"
                  value={formData.experience}
                  onChange={handleInputChange}
                  placeholder="e.g., 10"
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="+1 234 567 8900"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Your address"
                />
              </div>
              <div>
                <Label htmlFor="qualifications">Qualifications (comma-separated)</Label>
                <Input
                  id="qualifications"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleInputChange}
                  placeholder="MBBS, MD, Fellowship"
                />
              </div>
              <div>
                <Label htmlFor="languages">Languages Spoken (comma-separated)</Label>
                <Input
                  id="languages"
                  name="languages"
                  value={formData.languages}
                  onChange={handleInputChange}
                  placeholder="English, Spanish, Hindi"
                />
              </div>
            </div>
          </GlassCard>

          {/* Education */}
          <GlassCard>
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Education</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="degree">Degree</Label>
                <Input
                  id="degree"
                  name="degree"
                  value={formData.degree}
                  onChange={handleInputChange}
                  placeholder="e.g., MBBS"
                />
              </div>
              <div>
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  name="institution"
                  value={formData.institution}
                  onChange={handleInputChange}
                  placeholder="e.g., Harvard Medical School"
                />
              </div>
              <div>
                <Label htmlFor="graduationYear">Graduation Year</Label>
                <Input
                  id="graduationYear"
                  name="graduationYear"
                  type="number"
                  value={formData.graduationYear}
                  onChange={handleInputChange}
                  placeholder="e.g., 2015"
                />
              </div>
            </div>
          </GlassCard>

          {/* Clinic Information */}
          <GlassCard>
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Clinic Information (Optional)</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="clinicName">Clinic Name</Label>
                <Input
                  id="clinicName"
                  name="clinicName"
                  value={formData.clinicName}
                  onChange={handleInputChange}
                  placeholder="Your clinic name"
                />
              </div>
              <div>
                <Label htmlFor="clinicPhone">Clinic Phone</Label>
                <Input
                  id="clinicPhone"
                  name="clinicPhone"
                  value={formData.clinicPhone}
                  onChange={handleInputChange}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="clinicAddress">Clinic Address</Label>
                <Input
                  id="clinicAddress"
                  name="clinicAddress"
                  value={formData.clinicAddress}
                  onChange={handleInputChange}
                  placeholder="Clinic address"
                />
              </div>
            </div>
          </GlassCard>

          {/* Bio */}
          <GlassCard>
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Professional Bio</h2>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell patients about your experience, expertise, and approach to healthcare..."
              rows={5}
            />
          </GlassCard>

          {/* Document Upload */}
          <GlassCard>
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Upload Documents</h2>
            <div className="space-y-4">
              {/* Medical License */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Medical License *
                  </Label>
                  {documents.medicalLicense && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, 'medicalLicense')}
                  disabled={uploadingDoc === 'medicalLicense'}
                />
                {uploadingDoc === 'medicalLicense' && (
                  <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                )}
              </div>

              {/* Degree Certificate */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Degree Certificate *
                  </Label>
                  {documents.degreeCertificate && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, 'degreeCertificate')}
                  disabled={uploadingDoc === 'degreeCertificate'}
                />
                {uploadingDoc === 'degreeCertificate' && (
                  <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                )}
              </div>

              {/* ID Proof */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Government ID Proof *
                  </Label>
                  {documents.idProof && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, 'idProof')}
                  disabled={uploadingDoc === 'idProof'}
                />
                {uploadingDoc === 'idProof' && (
                  <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                )}
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-600 mb-1">Document Requirements:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>All documents must be clear and readable</li>
                    <li>Accepted formats: JPG, PNG, PDF (max 5MB each)</li>
                    <li>Documents will be reviewed by our admin team</li>
                  </ul>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 glow-teal"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/doctor/dashboard')}
              className="border-primary/20"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
