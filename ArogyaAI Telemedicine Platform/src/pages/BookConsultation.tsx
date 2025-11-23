import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Star, Search, Filter, User, Stethoscope } from 'lucide-react';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
// Dialog component replaced with custom modal to avoid ref forwarding issues
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'sonner';
// useAuth removed as it's not needed in this component
import { doctorService } from '../services/doctorService';
import { patientService } from '../services/patientService';

interface Doctor {
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

interface BookingForm {
  doctorId: string;
  scheduledAt: string;
  mode: 'video' | 'audio' | 'in_person';
  reason: string;
  notes: string;
  aiAssessmentId?: string;
}

interface AIAssessment {
  _id: string;
  condition: string;
  severity: string;
  confidence: number;
  summary: string;
  createdAt: string;
}

export function BookConsultation() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState<string>('all');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    doctorId: '',
    scheduledAt: '',
    mode: 'video',
    reason: '',
    notes: '',
    aiAssessmentId: undefined
  });
  const [aiAssessments, setAiAssessments] = useState<AIAssessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  const specializations = [
    'Cardiology',
    'Dermatology',
    'Endocrinology',
    'Gastroenterology',
    'General Medicine',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Pulmonology'
  ];

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        ...(specializationFilter !== 'all' && { specialization: specializationFilter }),
        available: true
      };

      const response = await doctorService.getAllDoctors(params);
      setDoctors(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load doctors');
      console.error('Doctors fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [specializationFilter]);

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchRecentAIAssessments = async () => {
    setLoadingAssessments(true);
    try {
      // First, get the patient profile to get the correct patient ID
      const patientProfile = await patientService.getProfile();
      
      if (patientProfile && patientProfile._id) {
        const patientId = patientProfile._id;
        
        // Fetch AI assessments using the correct patient ID
        const response = await patientService.getAIAssessments(patientId, 1, 5);
        
        if (response && response.data && response.data.length > 0) {
          setAiAssessments(response.data);
        } else {
          setAiAssessments([]);
        }
      } else {
        setAiAssessments([]);
      }
    } catch (error) {
      setAiAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const handleSelectAIAssessment = (assessmentId: string) => {
    if (assessmentId === 'none') {
      setBookingForm(prev => ({
        ...prev,
        aiAssessmentId: undefined,
        reason: ''
      }));
      return;
    }

    const assessment = aiAssessments.find(a => a._id === assessmentId);
    if (assessment) {
      setBookingForm(prev => ({
        ...prev,
        aiAssessmentId: assessmentId,
        reason: assessment.condition // Only fill the title/condition
      }));
    }
  };

  const handleBookConsultation = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setBookingForm(prev => ({
      ...prev,
      doctorId: doctor.id,
      scheduledAt: '',
      mode: 'video',
      reason: '',
      notes: '',
      aiAssessmentId: undefined
    }));
    setShowBookingDialog(true);
    
    // Fetch recent AI assessments when dialog opens
    fetchRecentAIAssessments();
  };

  const handleSubmitBooking = async () => {
    if (!bookingForm.scheduledAt || !bookingForm.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setBookingLoading(true);

    try {
      await patientService.bookAppointment(bookingForm);
      toast.success('Consultation booked successfully!');
      setShowBookingDialog(false);
      navigate('/patient/appointments');
    } catch (err: any) {
      toast.error(err.message || 'Failed to book consultation');
      console.error('Booking error:', err);
    } finally {
      setBookingLoading(false);
    }
  };

  // Removed unused getModeIcon function

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes from now
    return now.toISOString().slice(0, 16);
  };

  // Truncate long text for dropdown display
  const truncateText = (text: string, maxLength: number = 35) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <DashboardSidebar userType="patient" />
      
      <div className="ml-20 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-['Poppins'] font-semibold mb-2">
              Book Consultation
            </h1>
            <p className="text-muted-foreground">
              Choose from our verified healthcare professionals
            </p>
          </div>

          {/* Search and Filters */}
          <GlassCard className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search doctors or specializations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specializations</SelectItem>
                  {specializations.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </GlassCard>

          {/* Error State */}
          {error && (
            <GlassCard className="mb-6">
              <div className="text-center py-8">
                <div className="text-destructive text-lg mb-4">{error}</div>
                <Button onClick={fetchDoctors}>
                  Try Again
                </Button>
              </div>
            </GlassCard>
          )}

          {/* Doctors Grid */}
          {filteredDoctors.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doctor) => (
                <GlassCard key={doctor.id} hoverable className="group">
                  <div className="text-center mb-4">
                    <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary/20">
                      <AvatarImage src={doctor.profileImage} alt={doctor.name} />
                      <AvatarFallback className="text-lg">
                        {doctor.firstName[0]}{doctor.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="text-xl font-['Poppins'] font-semibold mb-1">
                      {doctor.name}
                    </h3>
                    
                    <Badge className="mb-2 bg-primary/10 text-primary border-primary/20">
                      <Stethoscope className="w-3 h-3 mr-1" />
                      {doctor.specialization}
                    </Badge>
                    
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{doctor.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{doctor.experience}+ years</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {doctor.bio}
                    </p>
                    
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="font-semibold text-accent">₹{doctor.consultationFee}</span>
                      <span className="text-sm text-muted-foreground">per session</span>
                    </div>
                    
                    <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
                      {doctor.availability}
                    </Badge>
                  </div>
                  
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => handleBookConsultation(doctor)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Consultation
                  </Button>
                </GlassCard>
              ))}
            </div>
          ) : (
            /* Empty State */
            <GlassCard>
              <div className="text-center py-12">
                <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-['Poppins'] font-semibold mb-2">
                  {searchTerm || specializationFilter !== 'all' ? 'No doctors found' : 'No doctors available'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || specializationFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Please check back later for available doctors'
                  }
                </p>
                {(searchTerm || specializationFilter !== 'all') && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setSpecializationFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Booking Dialog */}
      {showBookingDialog && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowBookingDialog(false)}
          />
          
          {/* Dialog Content - Scrollable */}
          <div className="relative z-10 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-lg">
            <GlassCard className="p-6 m-0">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-['Poppins'] font-semibold">
                  Book Consultation
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBookingDialog(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Doctor Info */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Avatar className="w-16 h-16 border-2 border-primary/20">
                    <AvatarImage src={selectedDoctor.profileImage} alt={selectedDoctor.name} />
                    <AvatarFallback>
                      {selectedDoctor.firstName[0]}{selectedDoctor.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-['Poppins'] font-semibold">{selectedDoctor.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-accent">₹{selectedDoctor.consultationFee}</span>
                    </div>
                  </div>
                </div>

                {/* Booking Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="datetime">Date & Time *</Label>
                    <Input
                      id="datetime"
                      type="datetime-local"
                      min={getMinDateTime()}
                      value={bookingForm.scheduledAt}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                      className="bg-input-background border-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mode">Consultation Mode</Label>
                    <Select 
                      value={bookingForm.mode} 
                      onValueChange={(value: 'video' | 'audio' | 'in_person') => 
                        setBookingForm(prev => ({ ...prev, mode: value }))
                      }
                    >
                      <SelectTrigger className="bg-input-background border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video Call</SelectItem>
                        <SelectItem value="audio">Audio Call</SelectItem>
                        <SelectItem value="in_person">In-Person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* AI Assessment Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="aiAssessment">Select from Recent AI Assessments (Optional)</Label>
                    {loadingAssessments ? (
                      <div className="text-sm text-muted-foreground">Loading assessments...</div>
                    ) : aiAssessments.length > 0 ? (
                      <Select
                        value={bookingForm.aiAssessmentId || 'none'}
                        onValueChange={handleSelectAIAssessment}
                      >
                        <SelectTrigger className="bg-input-background border-input">
                          <SelectValue placeholder="Choose an AI assessment or enter manually" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Enter reason manually</SelectItem>
                          {aiAssessments.map((assessment) => {
                            const displayText = `${truncateText(assessment.condition, 30)} - ${new Date(assessment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                            return (
                              <SelectItem key={assessment._id} value={assessment._id} title={assessment.condition}>
                                {displayText}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-muted-foreground">No recent AI assessments found</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Consultation *</Label>
                    <Input
                      id="reason"
                      placeholder="e.g., Follow-up, General checkup, Specific symptoms..."
                      value={bookingForm.reason}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="bg-input-background border-input"
                      disabled={!!bookingForm.aiAssessmentId}
                    />
                    {bookingForm.aiAssessmentId && (
                      <p className="text-xs text-muted-foreground">
                        Reason auto-filled from AI assessment. Select "Enter reason manually" to edit.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional information you'd like to share..."
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[80px] bg-input-background border-input resize-none"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-primary/20"
                    onClick={() => setShowBookingDialog(false)}
                    disabled={bookingLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={handleSubmitBooking}
                    disabled={bookingLoading || !bookingForm.scheduledAt || !bookingForm.reason}
                  >
                    {bookingLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}