import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Video, Phone, MapPin, Filter, Search, Plus, Edit, X } from 'lucide-react';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { patientService } from '../services/patientService';

interface Appointment {
  id: string;
  doctor: {
    name: string;
    specialty: string;
    avatar?: string;
  };
  scheduledAt: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  mode: 'video' | 'audio' | 'in_person';
  reason?: string;
  notes?: string;
  createdAt: string;
}

export function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'upcoming' | 'all'>('upcoming');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    scheduledAt: '',
    reason: ''
  });
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    reason: ''
  });
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchAppointments = async () => {
    if (!user || user.role !== 'patient') return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(viewMode === 'upcoming' && { upcoming: true })
      };

      const response = await patientService.getMyAppointments(params);
      setAppointments(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
      console.error('Appointments fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user, statusFilter, viewMode, pagination.page]);

  // Refresh appointments when page becomes visible (user returns from consultation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAppointments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'border-blue-500 text-blue-400 bg-blue-500/10';
      case 'in_progress':
        return 'border-purple-500 text-purple-400 bg-purple-500/10';
      case 'completed':
        return 'border-green-500 text-green-400 bg-green-500/10';
      case 'cancelled':
        return 'border-red-500 text-red-400 bg-red-500/10';
      case 'no_show':
        return 'border-orange-500 text-orange-400 bg-orange-500/10';
      default:
        return 'border-gray-500 text-gray-400 bg-gray-500/10';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Phone className="w-4 h-4" />;
      case 'in_person':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const filteredAppointments = appointments.filter(appointment =>
    appointment.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReschedule = (appointment: any) => {
    setSelectedAppointment(appointment);
    setRescheduleForm({
      scheduledAt: '',
      reason: ''
    });
    setShowRescheduleModal(true);
  };

  const handleCancel = (appointment: any) => {
    setSelectedAppointment(appointment);
    setCancelForm({
      reason: ''
    });
    setShowCancelModal(true);
  };

  const submitReschedule = async () => {
    if (!selectedAppointment || !rescheduleForm.scheduledAt) {
      toast.error('Please select a new date and time');
      return;
    }

    setRescheduleLoading(true);
    try {
      await patientService.rescheduleAppointment(selectedAppointment.id, rescheduleForm);
      toast.success('Appointment rescheduled successfully');
      setShowRescheduleModal(false);
      fetchAppointments(); // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const submitCancel = async () => {
    if (!selectedAppointment) return;

    setCancelLoading(true);
    try {
      await patientService.cancelAppointment(selectedAppointment.id, cancelForm);
      toast.success('Appointment cancelled successfully');
      setShowCancelModal(false);
      fetchAppointments(); // Refresh the list
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel appointment';
      toast.error(errorMessage);
    } finally {
      setCancelLoading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes from now
    return now.toISOString().slice(0, 16);
  };

  if (loading && appointments.length === 0) {
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
              My Appointments
            </h1>
            <p className="text-muted-foreground">
              Manage your healthcare appointments
            </p>
          </div>

          {/* Controls */}
          <GlassCard className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search appointments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={viewMode} onValueChange={(value: 'upcoming' | 'all') => setViewMode(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Link to="/patient/book-consultation">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </Link>
            </div>
          </GlassCard>

          {/* Error State */}
          {error && (
            <GlassCard className="mb-6">
              <div className="text-center py-8">
                <div className="text-destructive text-lg mb-4">{error}</div>
                <Button onClick={fetchAppointments}>
                  Try Again
                </Button>
              </div>
            </GlassCard>
          )}

          {/* Appointments List */}
          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => {
                const { date, time } = formatDate(appointment.scheduledAt);
                
                return (
                  <GlassCard key={appointment.id} hoverable className="group">
                    <div className="flex items-center gap-6">
                      {/* Doctor Avatar */}
                      <Avatar className="w-16 h-16 border-2 border-primary/20">
                        <AvatarImage src={appointment.doctor.avatar} alt={appointment.doctor.name} />
                        <AvatarFallback className="text-lg">
                          {appointment.doctor.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      {/* Appointment Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-['Poppins'] font-semibold">
                              {appointment.doctor.name}
                            </h3>
                            <p className="text-muted-foreground">
                              {appointment.doctor.specialty}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status.replace('_', ' ')}
                            </Badge>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              {getModeIcon(appointment.mode)}
                              <span className="text-sm capitalize">{appointment.mode.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{time}</span>
                          </div>
                        </div>

                        {appointment.reason && (
                          <div className="mb-3">
                            <p className="text-sm">
                              <span className="font-medium">Reason:</span> {appointment.reason}
                            </p>
                          </div>
                        )}

                        {appointment.notes && (
                          <div className="mb-3">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Notes:</span> {appointment.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {(appointment.status === 'scheduled' || appointment.status === 'in_progress') && (
                          <>
                            {(appointment.mode === 'video' || appointment.mode === 'audio') && (
                              <Link to={`/consultation/${appointment.id}`}>
                                <Button size="sm" className={appointment.status === 'in_progress' 
                                  ? "bg-green-600 hover:bg-green-700 text-white" 
                                  : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                                }>
                                  {appointment.mode === 'video' ? <Video className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
                                  {appointment.status === 'in_progress' ? 'Join Call' : 'Start Call'}
                                </Button>
                              </Link>
                            )}
                            {appointment.status === 'scheduled' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleReschedule(appointment)}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Reschedule
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleCancel(appointment)}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            )}
                          </>
                        )}
                        
                        {appointment.status === 'completed' && (
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <GlassCard>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} appointments
                    </p>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>
          ) : (
            /* Empty State */
            <GlassCard>
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-['Poppins'] font-semibold mb-2">
                  {searchTerm ? 'No appointments found' : 'No appointments yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search or filters'
                    : 'Book your first appointment to get started'
                  }
                </p>
                {!searchTerm && (
                  <Link to="/patient/book-consultation">
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>
                  </Link>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRescheduleModal(false)}
          />
          
          <div className="relative z-10 w-full max-w-md mx-4">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-['Poppins'] font-semibold">
                  Reschedule Appointment
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRescheduleModal(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="font-semibold">{selectedAppointment.doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.doctor.specialty}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Current: {formatDate(selectedAppointment.scheduledAt).date} at {formatDate(selectedAppointment.scheduledAt).time}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-datetime">New Date & Time *</Label>
                  <Input
                    id="new-datetime"
                    type="datetime-local"
                    min={getMinDateTime()}
                    value={rescheduleForm.scheduledAt}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                    className="bg-input-background border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reschedule-reason">Reason for Rescheduling</Label>
                  <Textarea
                    id="reschedule-reason"
                    placeholder="Optional: Why are you rescheduling this appointment?"
                    value={rescheduleForm.reason}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="min-h-[80px] bg-input-background border-input resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-primary/20"
                    onClick={() => setShowRescheduleModal(false)}
                    disabled={rescheduleLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={submitReschedule}
                    disabled={rescheduleLoading || !rescheduleForm.scheduledAt}
                  >
                    {rescheduleLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Reschedule
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCancelModal(false)}
          />
          
          <div className="relative z-10 w-full max-w-md mx-4">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-['Poppins'] font-semibold text-destructive">
                  Cancel Appointment
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancelModal(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <p className="font-semibold">{selectedAppointment.doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.doctor.specialty}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Scheduled: {formatDate(selectedAppointment.scheduledAt).date} at {formatDate(selectedAppointment.scheduledAt).time}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Warning:</strong> This action cannot be undone. You will need to book a new appointment if you change your mind.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancel-reason">Reason for Cancellation</Label>
                  <Textarea
                    id="cancel-reason"
                    placeholder="Optional: Why are you cancelling this appointment?"
                    value={cancelForm.reason}
                    onChange={(e) => setCancelForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="min-h-[80px] bg-input-background border-input resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-primary/20"
                    onClick={() => setShowCancelModal(false)}
                    disabled={cancelLoading}
                  >
                    Keep Appointment
                  </Button>
                  <Button
                    className="flex-1 bg-destructive hover:bg-destructive/90"
                    onClick={submitCancel}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel Appointment
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