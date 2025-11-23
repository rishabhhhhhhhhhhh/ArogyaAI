import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, Filter, Calendar, Clock, Pill } from 'lucide-react';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { patientService } from '../services/patientService';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

interface Prescription {
  id: string;
  doctor: {
    name: string;
    specialty: string;
  };
  medications: Medication[];
  notes?: string;
  issuedAt: string;
  createdAt: string;
  appointment?: {
    date: string;
    reason: string;
  };
  files: Array<{
    url: string;
    type: string;
  }>;
}

export function Prescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'recent' | 'all'>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchPrescriptions = async () => {
    if (!user || user.role !== 'patient') return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(viewMode === 'recent' && { recent: true })
      };

      const response = await patientService.getMyPrescriptions(params);
      setPrescriptions(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load prescriptions');
      console.error('Prescriptions fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [user, viewMode, pagination.page]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const filteredPrescriptions = prescriptions.filter(prescription =>
    prescription.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.medications.some(med => 
      med.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    prescription.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && prescriptions.length === 0) {
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
              My Prescriptions
            </h1>
            <p className="text-muted-foreground">
              View and manage your medical prescriptions
            </p>
          </div>

          {/* Controls */}
          <GlassCard className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search prescriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={viewMode} onValueChange={(value: 'recent' | 'all') => setViewMode(value)}>
                  <SelectTrigger className="w-32">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </GlassCard>

          {/* Error State */}
          {error && (
            <GlassCard className="mb-6">
              <div className="text-center py-8">
                <div className="text-destructive text-lg mb-4">{error}</div>
                <Button onClick={fetchPrescriptions}>
                  Try Again
                </Button>
              </div>
            </GlassCard>
          )}

          {/* Prescriptions List */}
          {filteredPrescriptions.length > 0 ? (
            <div className="space-y-6">
              {filteredPrescriptions.map((prescription) => (
                <GlassCard key={prescription.id} hoverable className="group">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-['Poppins'] font-semibold">
                            {prescription.doctor.name}
                          </h3>
                          <p className="text-muted-foreground">
                            {prescription.doctor.specialty}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Issued: {formatDate(prescription.issuedAt)}</span>
                            </div>
                            {prescription.appointment && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>Visit: {formatDate(prescription.appointment.date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {prescription.files.length > 0 && (
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                        <Badge variant="outline" className="border-primary text-primary">
                          {prescription.medications.length} medication{prescription.medications.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    {/* Medications */}
                    <div className="space-y-3">
                      <h4 className="font-['Poppins'] font-semibold flex items-center gap-2">
                        <Pill className="w-4 h-4" />
                        Medications
                      </h4>
                      <div className="grid gap-3">
                        {prescription.medications.map((medication, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-xl bg-muted/30 border border-muted/50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h5 className="font-semibold text-lg">{medication.name}</h5>
                                <p className="text-muted-foreground">
                                  {medication.dosage} • {medication.frequency}
                                </p>
                              </div>
                              <Badge variant="outline" className="border-accent text-accent">
                                {medication.duration}
                              </Badge>
                            </div>
                            {medication.notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                <span className="font-medium">Instructions:</span> {medication.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prescription Notes */}
                    {prescription.notes && (
                      <div className="p-4 rounded-xl bg-muted/20 border border-muted/30">
                        <h5 className="font-semibold mb-2">Doctor's Notes</h5>
                        <p className="text-muted-foreground">{prescription.notes}</p>
                      </div>
                    )}

                    {/* Appointment Context */}
                    {prescription.appointment && (
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <h5 className="font-semibold mb-2 text-primary">Related Appointment</h5>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Reason:</span> {prescription.appointment.reason}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Date:</span> {formatDate(prescription.appointment.date)}
                        </p>
                      </div>
                    )}

                    {/* Files */}
                    {prescription.files.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-semibold">Attachments</h5>
                        <div className="flex gap-2">
                          {prescription.files.map((file, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="text-primary hover:text-primary"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {file.type || 'Document'}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <GlassCard>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} prescriptions
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
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-['Poppins'] font-semibold mb-2">
                  {searchTerm ? 'No prescriptions found' : 'No prescriptions yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search or filters'
                    : 'Your prescriptions will appear here after doctor consultations'
                  }
                </p>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}