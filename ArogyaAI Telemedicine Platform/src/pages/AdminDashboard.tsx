import { useState, useEffect } from 'react';
import { Users, UserCheck, TrendingUp, FileText, CheckCircle, XCircle, Eye, RefreshCw, Loader2 } from 'lucide-react';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { MetricCard } from '../components/MetricCard';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import adminService, { PendingDoctor, VerifiedDoctor, AdminStats, DoctorDetails } from '../services/adminService';

export function AdminDashboard() {
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [verifiedDoctors, setVerifiedDoctors] = useState<VerifiedDoctor[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [doctorToReject, setDoctorToReject] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsData, pendingData, verifiedData] = await Promise.all([
        adminService.getStats(),
        adminService.getPendingDoctors(),
        adminService.getVerifiedDoctors()
      ]);
      
      setStats(statsData);
      setPendingDoctors(pendingData);
      setVerifiedDoctors(verifiedData.doctors);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAllData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewDetails = async (doctorId: string) => {
    try {
      const details = await adminService.getDoctorDetails(doctorId);
      setSelectedDoctor(details);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch doctor details');
    }
  };

  const handleApprove = async (doctorId: string, doctorName: string) => {
    try {
      await adminService.verifyDoctor(doctorId);
      toast.success(`${doctorName} has been approved and verified!`);
      setSelectedDoctor(null);
      await fetchAllData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve doctor');
    }
  };

  const handleRejectClick = (doctorId: string) => {
    setDoctorToReject(doctorId);
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!doctorToReject) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const doctor = pendingDoctors.find(d => d._id === doctorToReject);
      await adminService.rejectDoctor(doctorToReject, rejectionReason);
      toast.error(`${doctor?.firstName} ${doctor?.lastName}'s application has been rejected`);
      setShowRejectDialog(false);
      setRejectionReason('');
      setDoctorToReject(null);
      setSelectedDoctor(null);
      await fetchAllData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject doctor');
    }
  };

  const getDoctorName = (doctor: PendingDoctor | VerifiedDoctor) => {
    return `Dr. ${doctor.firstName} ${doctor.lastName}`;
  };

  const getDocumentsList = (docs?: any) => {
    if (!docs) return [];
    const list = [];
    if (docs.medicalLicense) list.push('Medical License');
    if (docs.degreeCertificate) list.push('Degree Certificate');
    if (docs.idProof) list.push('ID Proof');
    if (docs.additionalCertifications?.length) list.push('Additional Certifications');
    return list;
  };

  return (
    <div className="min-h-screen pt-16">
      <DashboardSidebar userType="admin" />
      
      <div className="ml-20 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-['Poppins'] font-semibold mb-2">Admin Dashboard</h1>
                <p className="text-muted-foreground">Platform overview and management</p>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                variant="outline"
                className="border-primary/20 hover:bg-primary/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Metrics */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <MetricCard
                icon={Users}
                label="Total Users"
                value={stats?.totalUsers.toLocaleString() || '0'}
                change={`+${stats?.newUsersThisMonth || 0} this month`}
                trend="up"
                glow="teal"
              />
              <MetricCard
                icon={UserCheck}
                label="Verified Doctors"
                value={stats?.verifiedDoctors.toString() || '0'}
                change={`+${stats?.newDoctorsThisMonth || 0} this month`}
                trend="up"
                glow="emerald"
              />
              <MetricCard
                icon={UserCheck}
                label="Pending Approvals"
                value={stats?.pendingDoctors.toString() || '0'}
                change={pendingDoctors.length > 0 ? `${pendingDoctors.length} awaiting review` : 'All clear'}
                trend="neutral"
                glow="cyan"
              />
              <MetricCard
                icon={TrendingUp}
                label="Total Appointments"
                value={stats?.totalAppointments.toLocaleString() || '0'}
                change={`${stats?.appointmentsThisMonth || 0} this month`}
                trend="up"
                glow="none"
              />
            </div>
          )}

          <Tabs defaultValue="verification" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="verification">Doctor Verification</TabsTrigger>
              <TabsTrigger value="doctors">Verified Doctors</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="verification" className="space-y-6">
              {/* Pending Verifications */}
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-['Poppins'] font-semibold">Pending Doctor Verifications</h2>
                    <p className="text-muted-foreground">Review and approve doctor applications</p>
                  </div>
                  <Badge className="bg-[#FF7A59]/10 text-[#FF7A59] border-[#FF7A59]/20">
                    {pendingDoctors.length} Pending
                  </Badge>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : pendingDoctors.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending verifications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDoctors.map((doctor) => (
                      <div
                        key={doctor._id}
                        className="p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12 border-2 border-primary/20">
                            <AvatarImage src={doctor.profileImage} alt={getDoctorName(doctor)} />
                            <AvatarFallback>{doctor.firstName[0]}{doctor.lastName[0]}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-['Poppins'] font-semibold">{getDoctorName(doctor)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {doctor.specialization} • {doctor.experience} years experience
                                </p>
                              </div>
                              <Badge variant="outline" className="border-[#FF7A59] text-[#FF7A59] bg-[#FF7A59]/10">
                                {doctor.verificationStatus}
                              </Badge>
                            </div>

                            <div className="grid md:grid-cols-2 gap-2 mb-3">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Email: </span>
                                <span>{doctor.userId.email}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">License: </span>
                                <span>{doctor.registrationNumber || 'N/A'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Documents: {getDocumentsList(doctor.verificationDocuments).join(', ') || 'None uploaded'}
                              </span>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-primary/20"
                                onClick={() => handleViewDetails(doctor._id)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Review Details
                              </Button>
                              <Button
                                size="sm"
                                className="bg-accent hover:bg-accent/90 glow-emerald"
                                onClick={() => handleApprove(doctor._id, getDoctorName(doctor))}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive/10"
                                onClick={() => handleRejectClick(doctor._id)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
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

            <TabsContent value="doctors" className="space-y-6">
              {/* Verified Doctors */}
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-['Poppins'] font-semibold">Verified Doctors</h2>
                  <Badge className="bg-accent/10 text-accent border-accent/20">
                    {verifiedDoctors.length} Active
                  </Badge>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : verifiedDoctors.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No verified doctors yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {verifiedDoctors.map((doctor) => (
                      <div
                        key={doctor._id}
                        className="p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 border-2 border-accent/20">
                            <AvatarImage src={doctor.profileImage} alt={getDoctorName(doctor)} />
                            <AvatarFallback>{doctor.firstName[0]}{doctor.lastName[0]}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-['Poppins'] font-semibold">{getDoctorName(doctor)}</p>
                                <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                              </div>
                              <Badge variant="outline" className="border-accent text-accent bg-accent/10">
                                {doctor.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-6 mt-2">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Experience: </span>
                                <span className="font-['Poppins'] font-semibold">{doctor.experience} years</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Rating: </span>
                                <span className="font-['Poppins'] font-semibold text-primary">{doctor.rating}/5.0</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              {/* Reports & Analytics */}
              <div className="grid md:grid-cols-2 gap-6">
                <GlassCard>
                  <h3 className="text-xl font-['Poppins'] font-semibold mb-4">Platform Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Consultations</span>
                      <span className="font-['Poppins'] font-semibold">8,542</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">AI Assessments</span>
                      <span className="font-['Poppins'] font-semibold">15,234</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active Prescriptions</span>
                      <span className="font-['Poppins'] font-semibold">3,421</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">User Satisfaction</span>
                      <span className="font-['Poppins'] font-semibold text-accent">94%</span>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <h3 className="text-xl font-['Poppins'] font-semibold mb-4">Revenue Breakdown</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Consultations</span>
                      <span className="font-['Poppins'] font-semibold">$32,400</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">AI Subscriptions</span>
                      <span className="font-['Poppins'] font-semibold">$8,500</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Premium Features</span>
                      <span className="font-['Poppins'] font-semibold">$4,300</span>
                    </div>
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-muted-foreground">Total Revenue</span>
                      <span className="font-['Poppins'] font-semibold text-primary">$45,200</span>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="md:col-span-2">
                  <h3 className="text-xl font-['Poppins'] font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[
                      { action: 'New doctor registered', name: 'Dr. Emily Roberts', time: '5 min ago', type: 'info' },
                      { action: 'Doctor verified', name: 'Dr. Michael Chen', time: '1 hour ago', type: 'success' },
                      { action: 'Payment received', name: 'Subscription #1234', time: '2 hours ago', type: 'success' },
                      { action: 'User report', name: 'Issue #456', time: '3 hours ago', type: 'warning' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-['Poppins'] font-semibold text-sm">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.name}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Doctor Detail Modal */}
      <Dialog open={!!selectedDoctor} onOpenChange={() => setSelectedDoctor(null)}>
        <DialogContent className="glass-panel max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl font-['Poppins']">Doctor Verification Review</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <div className="space-y-4 overflow-y-auto pr-2 flex-1" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              {/* Doctor Header - Compact */}
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <Avatar className="w-14 h-14 border-2 border-primary/20">
                  <AvatarImage src={selectedDoctor.profileImage} alt={getDoctorName(selectedDoctor)} />
                  <AvatarFallback>{selectedDoctor.firstName[0]}{selectedDoctor.lastName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-['Poppins'] font-semibold">{getDoctorName(selectedDoctor)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDoctor.specialization} • {selectedDoctor.experience} years
                  </p>
                </div>
                <Badge variant="outline" className="border-[#FF7A59] text-[#FF7A59] bg-[#FF7A59]/10">
                  {selectedDoctor.verificationStatus}
                </Badge>
              </div>

              {/* Contact & Credentials - Compact Grid */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-['Poppins'] font-semibold text-sm mb-2">Contact</h4>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">Email:</span> {selectedDoctor.userId.email}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedDoctor.phoneNumber || 'N/A'}</p>
                    <p><span className="text-muted-foreground">Applied:</span> {new Date(selectedDoctor.verificationSubmittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-['Poppins'] font-semibold text-sm mb-2">Credentials</h4>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">License:</span> {selectedDoctor.registrationNumber || 'N/A'}</p>
                    <p><span className="text-muted-foreground">Experience:</span> {selectedDoctor.experience} years</p>
                    <p><span className="text-muted-foreground">Languages:</span> {selectedDoctor.languages?.join(', ') || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Qualifications - Compact */}
              {selectedDoctor.qualifications && selectedDoctor.qualifications.length > 0 && (
                <div>
                  <h4 className="font-['Poppins'] font-semibold text-sm mb-2">Qualifications</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDoctor.qualifications.map((qual, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{qual}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Education - Compact */}
              {selectedDoctor.education && selectedDoctor.education.length > 0 && (
                <div>
                  <h4 className="font-['Poppins'] font-semibold text-sm mb-2">Education</h4>
                  <div className="space-y-1.5">
                    {selectedDoctor.education.map((edu, index) => (
                      <div key={index} className="p-2 rounded-lg bg-muted/30 text-xs">
                        <p className="font-semibold">{edu.degree}</p>
                        <p className="text-muted-foreground">{edu.institution} • {edu.year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinic - Compact */}
              {selectedDoctor.clinic && (
                <div>
                  <h4 className="font-['Poppins'] font-semibold text-sm mb-2">Clinic</h4>
                  <div className="p-2 rounded-lg bg-muted/30 text-xs space-y-0.5">
                    <p><span className="text-muted-foreground">Name:</span> {selectedDoctor.clinic.name}</p>
                    <p><span className="text-muted-foreground">Address:</span> {selectedDoctor.clinic.address}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedDoctor.clinic.phone}</p>
                  </div>
                </div>
              )}

              {/* Bio - Compact */}
              {selectedDoctor.bio && (
                <div>
                  <h4 className="font-['Poppins'] font-semibold text-sm mb-2">Bio</h4>
                  <p className="text-xs text-muted-foreground p-2 rounded-lg bg-muted/30 line-clamp-3">
                    {selectedDoctor.bio}
                  </p>
                </div>
              )}

              {/* Documents - With View Functionality */}
              <div>
                <h4 className="font-['Poppins'] font-semibold text-sm mb-2">Documents</h4>
                <div className="grid md:grid-cols-2 gap-2">
                  {selectedDoctor.verificationDocuments?.medicalLicense && (
                    <a 
                      href={selectedDoctor.verificationDocuments.medicalLicense} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-xs flex-1">Medical License</span>
                      <Eye className="w-4 h-4 text-primary" />
                    </a>
                  )}
                  {selectedDoctor.verificationDocuments?.degreeCertificate && (
                    <a 
                      href={selectedDoctor.verificationDocuments.degreeCertificate} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-xs flex-1">Degree Certificate</span>
                      <Eye className="w-4 h-4 text-primary" />
                    </a>
                  )}
                  {selectedDoctor.verificationDocuments?.idProof && (
                    <a 
                      href={selectedDoctor.verificationDocuments.idProof} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-xs flex-1">ID Proof</span>
                      <Eye className="w-4 h-4 text-primary" />
                    </a>
                  )}
                  {selectedDoctor.verificationDocuments?.additionalCertifications?.map((cert, index) => (
                    <a 
                      key={index}
                      href={cert} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-xs flex-1">Certificate {index + 1}</span>
                      <Eye className="w-4 h-4 text-primary" />
                    </a>
                  ))}
                  {!selectedDoctor.verificationDocuments?.medicalLicense && 
                   !selectedDoctor.verificationDocuments?.degreeCertificate && 
                   !selectedDoctor.verificationDocuments?.idProof && (
                    <p className="text-xs text-muted-foreground col-span-2">No documents uploaded</p>
                  )}
                </div>
              </div>

              {/* Action Buttons - Sticky at bottom */}
              <div className="flex gap-2 pt-2 border-t border-border sticky bottom-0 bg-background/95 backdrop-blur">
                <Button
                  className="flex-1 bg-accent hover:bg-accent/90 glow-emerald"
                  onClick={() => handleApprove(selectedDoctor._id, getDoctorName(selectedDoctor))}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => handleRejectClick(selectedDoctor._id)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="glass-panel max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-['Poppins']">Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Please provide a reason for rejecting this doctor's application. This will be sent to the doctor.
            </p>
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Incomplete documentation, Invalid license number, etc."
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim()}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Confirm Rejection
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-primary/20"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                  setDoctorToReject(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
