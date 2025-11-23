import { useState } from 'react';
import { Users, UserCheck, DollarSign, TrendingUp, FileText, CheckCircle, XCircle, Eye } from 'lucide-react';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { MetricCard } from '../components/MetricCard';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner@2.0.3';

export function AdminDashboard() {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  const pendingDoctors = [
    {
      id: 1,
      name: 'Dr. Emily Roberts',
      specialty: 'Dermatologist',
      experience: '8 years',
      email: 'emily.roberts@example.com',
      license: 'MD-12345-2015',
      documents: ['License', 'Degree', 'ID Proof'],
      avatar: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=100',
      appliedDate: 'Oct 5, 2025',
    },
    {
      id: 2,
      name: 'Dr. David Kumar',
      specialty: 'Neurologist',
      experience: '12 years',
      email: 'david.kumar@example.com',
      license: 'MD-67890-2011',
      documents: ['License', 'Degree', 'ID Proof', 'Certification'],
      avatar: 'https://images.unsplash.com/photo-1758691463606-1493d79cc577?w=100',
      appliedDate: 'Oct 7, 2025',
    },
  ];

  const verifiedDoctors = [
    {
      id: 3,
      name: 'Dr. Sarah Johnson',
      specialty: 'Cardiologist',
      patients: 331,
      rating: 4.9,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=100',
    },
    {
      id: 4,
      name: 'Dr. Michael Chen',
      specialty: 'General Physician',
      patients: 287,
      rating: 4.8,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1758691463606-1493d79cc577?w=100',
    },
  ];

  const handleApprove = (doctorId: number, doctorName: string) => {
    toast.success(`${doctorName} has been approved and verified!`);
    setSelectedDoctor(null);
  };

  const handleReject = (doctorId: number, doctorName: string) => {
    toast.error(`${doctorName}'s application has been rejected`);
    setSelectedDoctor(null);
  };

  return (
    <div className="min-h-screen pt-16">
      <DashboardSidebar userType="admin" />
      
      <div className="ml-20 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-['Poppins'] font-semibold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform overview and management</p>
          </div>

          {/* Metrics */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <MetricCard
              icon={Users}
              label="Total Users"
              value="12,458"
              change="+324 this month"
              trend="up"
              glow="teal"
            />
            <MetricCard
              icon={UserCheck}
              label="Verified Doctors"
              value="156"
              change="+12 this month"
              trend="up"
              glow="emerald"
            />
            <MetricCard
              icon={UserCheck}
              label="Pending Approvals"
              value="8"
              change="2 new today"
              trend="neutral"
              glow="cyan"
            />
            <MetricCard
              icon={DollarSign}
              label="Revenue (MTD)"
              value="$45.2K"
              change="+18% vs last month"
              trend="up"
              glow="none"
            />
          </div>

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

                <div className="space-y-4">
                  {pendingDoctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarImage src={doctor.avatar} alt={doctor.name} />
                          <AvatarFallback>{doctor.name[4]}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-['Poppins'] font-semibold">{doctor.name}</p>
                              <p className="text-sm text-muted-foreground">{doctor.specialty} • {doctor.experience} experience</p>
                            </div>
                            <Badge variant="outline" className="border-[#FF7A59] text-[#FF7A59] bg-[#FF7A59]/10">
                              Pending
                            </Badge>
                          </div>

                          <div className="grid md:grid-cols-2 gap-2 mb-3">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Email: </span>
                              <span>{doctor.email}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">License: </span>
                              <span>{doctor.license}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Documents: {doctor.documents.join(', ')}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary/20"
                              onClick={() => setSelectedDoctor(doctor)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review Details
                            </Button>
                            <Button
                              size="sm"
                              className="bg-accent hover:bg-accent/90 glow-emerald"
                              onClick={() => handleApprove(doctor.id, doctor.name)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive text-destructive hover:bg-destructive/10"
                              onClick={() => handleReject(doctor.id, doctor.name)}
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

                <div className="space-y-4">
                  {verifiedDoctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border-2 border-accent/20">
                          <AvatarImage src={doctor.avatar} alt={doctor.name} />
                          <AvatarFallback>{doctor.name[4]}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-['Poppins'] font-semibold">{doctor.name}</p>
                              <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                            </div>
                            <Badge variant="outline" className="border-accent text-accent bg-accent/10">
                              {doctor.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-6 mt-2">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Patients: </span>
                              <span className="font-['Poppins'] font-semibold">{doctor.patients}</span>
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
        <DialogContent className="glass-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-['Poppins']">Doctor Verification Review</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                  <AvatarImage src={selectedDoctor.avatar} alt={selectedDoctor.name} />
                  <AvatarFallback>{selectedDoctor.name[4]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-['Poppins'] font-semibold">{selectedDoctor.name}</h3>
                  <p className="text-muted-foreground">{selectedDoctor.specialty} • {selectedDoctor.experience} experience</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-['Poppins'] font-semibold mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      <span>{selectedDoctor.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Applied: </span>
                      <span>{selectedDoctor.appliedDate}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-['Poppins'] font-semibold mb-2">Credentials</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">License: </span>
                      <span>{selectedDoctor.license}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Experience: </span>
                      <span>{selectedDoctor.experience}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-['Poppins'] font-semibold mb-3">Uploaded Documents</h4>
                <div className="grid md:grid-cols-2 gap-2">
                  {selectedDoctor.documents.map((doc: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm">{doc}</span>
                      <Button size="sm" variant="ghost" className="ml-auto">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-accent hover:bg-accent/90 glow-emerald"
                  onClick={() => handleApprove(selectedDoctor.id, selectedDoctor.name)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Verify
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => handleReject(selectedDoctor.id, selectedDoctor.name)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Application
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
