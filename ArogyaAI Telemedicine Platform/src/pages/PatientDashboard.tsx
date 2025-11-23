import { Link } from 'react-router-dom';
import { Brain, Calendar, FileText, Video, TrendingUp, Activity, Clock } from 'lucide-react';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { MetricCard } from '../components/MetricCard';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { usePatientDashboard } from '../hooks/usePatient';
import { PatientDashboardData, patientService } from '../services/patientService';
import { useState, useEffect } from 'react';

type PatientData = PatientDashboardData;

export function PatientDashboard() {
  const { user } = useAuth();
  const { data: patientData, loading, error, refetch } = usePatientDashboard();
  const [aiAssessments, setAiAssessments] = useState<any[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Fetch AI assessments separately
  useEffect(() => {
    const fetchAIAssessments = async () => {
      if (!user) return;
      
      setLoadingAssessments(true);
      try {
        // First get patient ID from user
        const patientId = user.id; // Assuming user.id is the patient ID
        const response = await patientService.getAIAssessments(patientId, 1, 5);
        
        // Transform the data to match the expected format
        const transformedAssessments = response.data.map((assessment: any) => ({
          id: assessment._id,
          condition: assessment.condition,
          severity: assessment.severity,
          date: new Date(assessment.createdAt).toLocaleDateString(),
          confidence: assessment.confidence
        }));
        
        setAiAssessments(transformedAssessments);
      } catch (error) {
        console.error('Failed to fetch AI assessments:', error);
        setAiAssessments([]); // Set empty array on error
      } finally {
        setLoadingAssessments(false);
      }
    };

    fetchAIAssessments();
  }, [user]);

  // Fetch appointments separately
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setLoadingAppointments(true);
      try {
        const response = await patientService.getMyAppointments({ 
          upcoming: true, 
          limit: 5 
        });
        
        // Transform the data to match the expected format
        const transformedAppointments = response.data.map((appointment: any) => ({
          id: appointment._id,
          doctor: appointment.doctor?.name || 'Dr. Unknown',
          specialty: appointment.doctor?.specialization || 'General',
          date: new Date(appointment.scheduledAt).toLocaleDateString(),
          time: new Date(appointment.scheduledAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          type: appointment.type || 'Video Consultation',
          avatar: appointment.doctor?.avatar
        }));
        
        setAppointments(transformedAppointments);
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
        setAppointments([]); // Set empty array on error
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchAppointments();
  }, [user]);

  // Fallback data for when API is not available
  const fallbackData: PatientData = {
    profile: {
      firstName: user?.name?.split(' ')[0] || 'Patient',
      lastName: user?.name?.split(' ')[1] || '',
      email: user?.email || '',
      phone: '+1 (555) 123-4567'
    },
    metrics: {
      aiAssessments: Math.floor(Math.random() * 20) + 5,
      upcomingAppointments: Math.floor(Math.random() * 5) + 1,
      activePrescriptions: Math.floor(Math.random() * 8) + 2,
      healthScore: Math.floor(Math.random() * 20) + 80
    },
    healthData: [
      { date: 'Jan', score: 85 },
      { date: 'Feb', score: 82 },
      { date: 'Mar', score: 88 },
      { date: 'Apr', score: 90 },
      { date: 'May', score: 87 },
      { date: 'Jun', score: 92 },
    ],
    appointments: [
      {
        id: '1',
        doctor: 'Dr. Sarah Johnson',
        specialty: 'Cardiologist',
        date: 'Nov 12, 2024',
        time: '10:00 AM',
        type: 'Video Consultation',
        avatar: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGhjYXJlJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2MDAwNDA3OHww&ixlib=rb-4.1.0&q=80&w=1080',
      },
      {
        id: '2',
        doctor: 'Dr. Michael Chen',
        specialty: 'General Physician',
        date: 'Nov 15, 2024',
        time: '2:30 PM',
        type: 'Video Consultation',
        avatar: 'https://images.unsplash.com/photo-1758691463606-1493d79cc577?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjB0ZWxlbWVkaWNpbmUlMjBjb25zdWx0YXRpb258ZW58MXx8fHwxNzU5OTg1OTU2fDA&ixlib=rb-4.1.0&q=80&w=1080',
      },
    ],
    aiResults: [
      {
        id: '1',
        condition: 'Common Cold',
        severity: 'Low',
        date: 'Nov 8, 2024',
        confidence: 87,
      },
      {
        id: '2',
        condition: 'Seasonal Allergies',
        severity: 'Low',
        date: 'Oct 28, 2024',
        confidence: 92,
      },
    ],
    prescriptions: [
      {
        id: '1',
        medication: 'Amoxicillin 500mg',
        doctor: 'Dr. Sarah Johnson',
        date: 'Nov 5, 2024',
        duration: '7 days',
      },
      {
        id: '2',
        medication: 'Vitamin D3 1000 IU',
        doctor: 'Dr. Michael Chen',
        date: 'Oct 20, 2024',
        duration: '30 days',
      },
    ],
  };

  // Use real data if available, otherwise fallback
  const displayData = patientData || fallbackData;
  
  // Override with real data if available
  const finalDisplayData = {
    ...displayData,
    aiResults: aiAssessments.length > 0 ? aiAssessments : displayData.aiResults,
    appointments: appointments.length > 0 ? appointments : displayData.appointments,
    metrics: {
      ...displayData.metrics,
      aiAssessments: aiAssessments.length,
      upcomingAppointments: appointments.length
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !patientData) {
    return (
      <div className="min-h-screen pt-16">
        <DashboardSidebar userType="patient" />
        <div className="ml-20 p-6">
          <div className="max-w-7xl mx-auto">
            <GlassCard>
              <div className="text-center py-12">
                <div className="text-destructive text-lg mb-4">{error}</div>
                <Button onClick={refetch}>
                  Try Again
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
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
              Welcome back, {displayData.profile.firstName}!
            </h1>
            <p className="text-muted-foreground">
              Here's your health overview
              {error && <span className="text-yellow-500 ml-2">(Demo Mode)</span>}
            </p>
          </div>

          {/* Metrics */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <MetricCard
              icon={Brain}
              label="AI Assessments"
              value={finalDisplayData.metrics.aiAssessments.toString()}
              change="+2 this month"
              trend="up"
              glow="teal"
            />
            <MetricCard
              icon={Calendar}
              label="Appointments"
              value={displayData.metrics.upcomingAppointments.toString()}
              change="Upcoming"
              trend="neutral"
              glow="emerald"
            />
            <MetricCard
              icon={FileText}
              label="Prescriptions"
              value={displayData.metrics.activePrescriptions.toString()}
              change="Active"
              trend="neutral"
              glow="cyan"
            />
            <MetricCard
              icon={TrendingUp}
              label="Health Score"
              value={displayData.metrics.healthScore.toString()}
              change="+5 pts this month"
              trend="up"
              glow="none"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link to="/ai-demo">
              <GlassCard hoverable glow="teal" className="group">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-all">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-['Poppins'] font-semibold mb-1">Start AI Checkup</h3>
                    <p className="text-muted-foreground">Get instant health insights</p>
                  </div>
                  <Activity className="w-6 h-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </GlassCard>
            </Link>

            <Link to="/patient/book-consultation">
              <GlassCard hoverable glow="emerald" className="group">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-all">
                    <Calendar className="w-8 h-8 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-['Poppins'] font-semibold mb-1">Book Consultation</h3>
                    <p className="text-muted-foreground">Connect with a doctor</p>
                  </div>
                  <Activity className="w-6 h-6 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </GlassCard>
            </Link>
          </div>

          {/* Health Timeline Chart */}
          <GlassCard className="mb-8">
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">AI Health Timeline</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={displayData.healthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 122, 122, 0.1)" />
                <XAxis dataKey="date" stroke="#A0A0A0" />
                <YAxis stroke="#A0A0A0" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(18, 18, 18, 0.95)',
                    border: '1px solid rgba(14, 122, 122, 0.2)',
                    borderRadius: '0.75rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#0E7A7A"
                  strokeWidth={3}
                  dot={{ fill: '#0E7A7A', r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Upcoming Appointments */}
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-['Poppins'] font-semibold">Upcoming Appointments</h2>
                <Link to="/patient/appointments">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="space-y-4">
                {loadingAppointments ? (
                  <div className="text-center py-8">
                    <LoadingSpinner message="Loading appointments..." />
                  </div>
                ) : finalDisplayData.appointments.length > 0 ? (
                  finalDisplayData.appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all"
                    >
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarImage src={appointment.avatar} alt={appointment.doctor} />
                        <AvatarFallback>{appointment.doctor[4]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-['Poppins'] font-semibold">{appointment.doctor}</p>
                        <p className="text-sm text-muted-foreground">{appointment.specialty}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {appointment.date} at {appointment.time}
                          </span>
                        </div>
                      </div>
                      <Link to={`/consult/${appointment.id}`}>
                        <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground">
                          <Video className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No upcoming appointments</p>
                    <Link to="/patient/book-consultation">
                      <Button className="mt-3" size="sm">Book Consultation</Button>
                    </Link>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Recent AI Results */}
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-['Poppins'] font-semibold">Recent AI Assessments</h2>
                <Link to="/ai-demo">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    New Assessment
                  </Button>
                </Link>
              </div>
              <div className="space-y-4">
                {loadingAssessments ? (
                  <div className="text-center py-8">
                    <LoadingSpinner message="Loading AI assessments..." />
                  </div>
                ) : finalDisplayData.aiResults.length > 0 ? (
                  finalDisplayData.aiResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-['Poppins'] font-semibold">{result.condition}</p>
                          <p className="text-sm text-muted-foreground">{result.date}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${
                            result.severity === 'Low'
                              ? 'border-accent text-accent'
                              : result.severity === 'Medium'
                              ? 'border-[#FF7A59] text-[#FF7A59]'
                              : 'border-destructive text-destructive'
                          }`}
                        >
                          {result.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${result.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{result.confidence}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No AI assessments yet</p>
                    <Link to="/ai-demo">
                      <Button className="mt-3" size="sm">Start Assessment</Button>
                    </Link>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Recent Prescriptions */}
            <GlassCard className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-['Poppins'] font-semibold">Active Prescriptions</h2>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  View All
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {displayData.prescriptions.length > 0 ? (
                  displayData.prescriptions.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-['Poppins'] font-semibold">{prescription.medication}</p>
                          <p className="text-sm text-muted-foreground">Prescribed by {prescription.doctor}</p>
                        </div>
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">{prescription.date}</span>
                        <Badge variant="outline" className="border-accent text-accent">
                          {prescription.duration}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 md:col-span-2">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No active prescriptions</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
