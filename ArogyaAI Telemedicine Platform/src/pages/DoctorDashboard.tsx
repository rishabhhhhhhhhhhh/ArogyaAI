import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Clock, TrendingUp, Award, User, Video, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { MetricCard } from '../components/MetricCard';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDoctor } from '../hooks/useDoctor';
import { PatientInQueue } from '../services/doctorService';
import { toast } from 'sonner';

export function DoctorDashboard() {
  const location = useLocation();
  const [selectedCase, setSelectedCase] = useState<PatientInQueue | null>(null);
  const [activeTab, setActiveTab] = useState('queue');
  
  const {
    profile,
    dashboardData,
    patientQueue,
    analytics,
    loading,
    fetchDashboardData,
    fetchPatientQueue,
    fetchAnalytics,
    refreshAll
  } = useDoctor();

  // Set active tab based on route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (path.includes('/consultations')) {
      setActiveTab('consultations');
    } else {
      setActiveTab('queue');
    }
  }, [location.pathname]);

  // Fetch data on component mount
  useEffect(() => {
    refreshAll();
  }, []);

  // Refresh data based on active tab
  const handleRefresh = async () => {
    try {
      if (activeTab === 'queue') {
        await Promise.all([fetchDashboardData(), fetchPatientQueue()]);
      } else if (activeTab === 'analytics') {
        await fetchAnalytics();
      }
      toast.success('Data refreshed successfully');
    } catch (err) {
      // Error handling is done in the hook
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get patient display name
  const getPatientName = (patient: PatientInQueue['patient']) => {
    if (patient.firstName && patient.lastName) {
      return `${patient.firstName} ${patient.lastName}`;
    }
    return patient.userId?.name || 'Unknown Patient';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low':
        return 'border-accent text-accent bg-accent/10';
      case 'medium':
        return 'border-[#FF7A59] text-[#FF7A59] bg-[#FF7A59]/10';
      case 'high':
        return 'border-destructive text-destructive bg-destructive/10';
      default:
        return 'border-muted-foreground text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen pt-16">
      <DashboardSidebar userType="doctor" />
      
      <div className="ml-20 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-['Poppins'] font-semibold mb-2">
                  {profile ? `Dr. ${profile.firstName} ${profile.lastName}` : 'Doctor Dashboard'}
                </h1>
                <p className="text-muted-foreground">
                  {profile?.specialization || 'Medical Professional'} 
                  {profile?.verified ? ' • Verified' : ' • Pending Verification'}
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                className="border-primary/20 hover:bg-primary/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <MetricCard
              icon={Users}
              label="Patients Today"
              value={dashboardData?.stats.todayPatients.toString() || '0'}
              change={`${patientQueue.length} in queue`}
              trend="neutral"
              glow="teal"
            />
            <MetricCard
              icon={Clock}
              label="Avg Consult Time"
              value={`${dashboardData?.stats.avgConsultTime || 0}m`}
              change="-2m vs last week"
              trend="up"
              glow="emerald"
            />
            <MetricCard
              icon={TrendingUp}
              label="This Month"
              value={dashboardData?.stats.monthlyPatients.toString() || '0'}
              change={`${dashboardData?.stats.totalPatients || 0} total patients`}
              trend="up"
              glow="cyan"
            />
            <MetricCard
              icon={Award}
              label="Rating"
              value={dashboardData?.stats.rating.toString() || '0'}
              change={`${dashboardData?.stats.recentPrescriptions || 0} prescriptions`}
              trend="up"
              glow="none"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="queue">Patient Queue</TabsTrigger>
              <TabsTrigger value="consultations">Consultations</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="queue" className="space-y-6">
              {/* Patient Queue */}
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-['Poppins'] font-semibold">Patient Queue</h2>
                    <p className="text-muted-foreground">AI-prioritized by severity</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {patientQueue.length} Waiting
                  </Badge>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading patient queue...</span>
                  </div>
                ) : patientQueue.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No patients in queue today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientQueue.map((appointment) => (
                      <div
                        key={appointment._id}
                        className="p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all cursor-pointer"
                        onClick={() => setSelectedCase(appointment)}
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12 border-2 border-primary/20">
                            <AvatarImage src={appointment.patient.profileImage} alt={getPatientName(appointment.patient)} />
                            <AvatarFallback>
                              <User className="w-6 h-6" />
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-['Poppins'] font-semibold">{getPatientName(appointment.patient)}</p>
                                <p className="text-sm text-muted-foreground">
                                  Age: {appointment.patient.dateOfBirth ? calculateAge(appointment.patient.dateOfBirth) : 'N/A'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={getSeverityColor(appointment.aiAssessment.severity)}>
                                  {appointment.aiAssessment.severity}
                                </Badge>
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{appointment.waitTime}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-primary" />
                                <span className="text-sm">AI Diagnosis: {appointment.aiAssessment.condition}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${appointment.aiAssessment.confidence}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{appointment.aiAssessment.confidence}% confidence</span>
                              </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                              <Link to={`/consultation/${appointment._id}`} className="flex-1">
                                <Button size="sm" className="w-full bg-primary hover:bg-primary/90 glow-teal">
                                  <Video className="w-4 h-4 mr-2" />
                                  Start Consultation
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-primary/20"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  setSelectedCase(appointment);
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </TabsContent>

            <TabsContent value="consultations" className="space-y-6">
              {/* All Appointments */}
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-['Poppins'] font-semibold">All Appointments</h2>
                    <p className="text-muted-foreground">Scheduled, in-progress, and completed consultations</p>
                  </div>
                  <Button
                    onClick={handleRefresh}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="border-primary/20"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading appointments...</span>
                  </div>
                ) : dashboardData?.todayAppointments && dashboardData.todayAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.todayAppointments.map((appointment) => (
                      <div
                        key={appointment._id}
                        className="p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12 border-2 border-primary/20">
                            <AvatarImage src={appointment.patient?.profileImage} alt={getPatientName(appointment.patient)} />
                            <AvatarFallback>
                              <User className="w-6 h-6" />
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-['Poppins'] font-semibold">{getPatientName(appointment.patient)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(appointment.scheduledAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={
                                    appointment.status === 'scheduled' ? 'border-blue-500 text-blue-600 bg-blue-500/10' :
                                    appointment.status === 'in_progress' ? 'border-yellow-500 text-yellow-600 bg-yellow-500/10' :
                                    appointment.status === 'completed' ? 'border-green-500 text-green-600 bg-green-500/10' :
                                    'border-gray-500 text-gray-600 bg-gray-500/10'
                                  }
                                >
                                  {appointment.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                <span className="text-sm">Reason: {appointment.reason || 'General consultation'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Video className="w-4 h-4 text-primary" />
                                <span className="text-sm">Mode: {appointment.mode || 'video'}</span>
                              </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                              {(appointment.status === 'scheduled' || appointment.status === 'in_progress') && (
                                <Link to={`/consultation/${appointment._id}`} className="flex-1">
                                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90 glow-teal">
                                    <Video className="w-4 h-4 mr-2" />
                                    {appointment.status === 'in_progress' ? 'Rejoin Call' : 'Start Consultation'}
                                  </Button>
                                </Link>
                              )}
                              {appointment.status === 'completed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 border-primary/20"
                                  onClick={() => toast.info('Consultation summary feature coming soon')}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  View Summary
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-primary/20"
                                onClick={() => {
                                  // Find the appointment in patientQueue or create a mock one
                                  const queueItem = patientQueue.find(p => p._id === appointment._id) || {
                                    ...appointment,
                                    aiAssessment: {
                                      condition: 'General consultation',
                                      confidence: 85,
                                      severity: 'Medium',
                                      symptoms: 'Patient consultation'
                                    },
                                    waitTime: 'Now'
                                  };
                                  setSelectedCase(queueItem);
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No appointments found</p>
                    <p className="text-sm text-muted-foreground mt-2">Appointments will appear here when patients book consultations</p>
                  </div>
                )}
              </GlassCard>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Analytics Charts */}
              <GlassCard>
                <h2 className="text-2xl font-['Poppins'] font-semibold mb-6">Patients Treated (6 months)</h2>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading analytics...</span>
                  </div>
                ) : analytics?.monthlyData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 122, 122, 0.1)" />
                      <XAxis dataKey="month" stroke="#A0A0A0" />
                      <YAxis stroke="#A0A0A0" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(18, 18, 18, 0.95)',
                          border: '1px solid rgba(14, 122, 122, 0.2)',
                          borderRadius: '0.75rem',
                        }}
                      />
                      <Bar dataKey="patients" fill="#0E7A7A" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No analytics data available</p>
                  </div>
                )}
              </GlassCard>

              <div className="grid md:grid-cols-2 gap-6">
                <GlassCard>
                  <h3 className="text-xl font-['Poppins'] font-semibold mb-4">Performance Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Consultations</span>
                      <span className="font-['Poppins'] font-semibold">{analytics?.totalConsultations || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">AI Agreement Rate</span>
                      <span className="font-['Poppins'] font-semibold text-accent">{analytics?.aiAgreementRate || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Patient Satisfaction</span>
                      <span className="font-['Poppins'] font-semibold text-primary">{analytics?.patientSatisfaction || 0}/5.0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Response Time</span>
                      <span className="font-['Poppins'] font-semibold">{analytics?.avgResponseTime || 'N/A'}</span>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <h3 className="text-xl font-['Poppins'] font-semibold mb-4">Top Conditions Treated</h3>
                  <div className="space-y-3">
                    {analytics?.topConditions?.map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.condition}</span>
                          <span className="font-['Poppins'] font-semibold">{item.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ 
                              width: `${analytics.topConditions.length > 0 ? (item.count / Math.max(...analytics.topConditions.map(c => c.count))) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm">No condition data available</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Patient Detail Modal */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="glass-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-['Poppins']">Patient Case Details</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                  <AvatarImage src={selectedCase.patient.profileImage} alt={getPatientName(selectedCase.patient)} />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-['Poppins'] font-semibold">{getPatientName(selectedCase.patient)}</h3>
                  <p className="text-muted-foreground">
                    Age: {selectedCase.patient.dateOfBirth ? calculateAge(selectedCase.patient.dateOfBirth) : 'N/A'} • 
                    Wait time: {selectedCase.waitTime}
                  </p>
                </div>
                <Badge variant="outline" className={`ml-auto ${getSeverityColor(selectedCase.aiAssessment.severity)}`}>
                  {selectedCase.aiAssessment.severity} Severity
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <h4 className="font-['Poppins'] font-semibold">AI Analysis</h4>
                  </div>
                  <p className="text-muted-foreground mb-2">Condition: {selectedCase.aiAssessment.condition}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${selectedCase.aiAssessment.confidence}%` }}
                      />
                    </div>
                    <span className="text-sm">{selectedCase.aiAssessment.confidence}% confidence</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-['Poppins'] font-semibold mb-2">Reported Symptoms</h4>
                  <p className="text-muted-foreground p-4 rounded-lg bg-muted/50">
                    {selectedCase.aiAssessment.symptoms}
                  </p>
                </div>

                <div>
                  <h4 className="font-['Poppins'] font-semibold mb-2">Appointment Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Scheduled: {new Date(selectedCase.scheduledAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Mode: {selectedCase.mode}</span>
                    </div>
                    {selectedCase.reason && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Reason: {selectedCase.reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link to={`/consultation/${selectedCase._id}`} className="flex-1">
                  <Button className="w-full bg-primary hover:bg-primary/90 glow-teal">
                    <Video className="w-4 h-4 mr-2" />
                    Start Video Consultation
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setSelectedCase(null)} className="border-primary/20">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
