import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, Phone, FileText, Send, Brain, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { GlassCard } from '../components/GlassCard';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../hooks/useAuth';

export function ConsultationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [remoteTracksReceived, setRemoteTracksReceived] = useState(false);
  const [prescription, setPrescription] = useState({
    medication: '',
    dosage: '',
    duration: '',
    instructions: '',
  });

  // Video element refs for WebRTC streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Get authentication token for WebRTC signaling
  const token = localStorage.getItem('aai_token') || '';
  
  // Get user data from localStorage as fallback
  const getUserData = () => {
    try {
      const storedUser = localStorage.getItem('aai_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  };
  
  const currentUser = user || getUserData();
  
  // Determine if current user is the initiator (doctor)
  const isInitiator = currentUser?.role === 'doctor';
  const userRole = currentUser?.role === 'doctor' ? 'doctor' : 'patient';
  const userId = currentUser?.id || 'unknown-user';

  // Initialize session before WebRTC
  const initializeSession = async () => {
    if (!id) {
      setSessionError('No appointment ID provided');
      return;
    }

    try {
      setSessionError(null);
      
      // Call the joinAppointment endpoint to create/join the session
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/appointments/${id}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join appointment');
      }

      const data = await response.json();
      setAppointmentData(data.data);
      setSessionReady(true);
    } catch (error: any) {
      setSessionError(error.message);
      toast.error(`Failed to join session: ${error.message}`);
    }
  };

  // Initialize session on component mount
  useEffect(() => {
    initializeSession();
  }, [id, token]);

  // Initialize WebRTC with session information (only when session is ready)
  const {
    isConnected,
    connectionState,
    isSignalingConnected,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    startCall,
    endCall,
    sendChatMessage,
    chatMessages: webrtcChatMessages,
    error: webrtcError,
    clearError,
    networkQuality
  } = useWebRTC({
    sessionId: id || 'default-session',
    isInitiator,
    token,
    userId,
    userRole,
    enabled: sessionReady // Only initialize WebRTC when session is ready
  });

  // Use only WebRTC chat messages
  const allChatMessages = webrtcChatMessages;

  const aiNotes = [
    'Patient reports sore throat and mild fever (100°F)',
    'Symptoms started 2 days ago',
    'AI preliminary diagnosis: Common Cold with throat infection (87% confidence)',
    'No known allergies reported',
    'Patient is well-hydrated',
  ];

  // Set up video elements when streams are available
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {
        // Try to play again after a short delay
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.play().catch(() => {});
          }
        }, 1000);
      });
    }
  }, [localStream]);

  useEffect(() => {
    const videoElement = remoteVideoRef.current;
    
    if (videoElement && remoteStream) {
      if (videoElement.srcObject !== remoteStream) {
        videoElement.srcObject = remoteStream;
      }
      
      const handleCanPlay = () => {
        videoElement.play().catch(() => {});
      };
      
      videoElement.addEventListener('canplay', handleCanPlay);
      
      if (videoElement.readyState >= 2) {
        videoElement.play().catch(() => {});
      }
      
      return () => {
        videoElement.removeEventListener('canplay', handleCanPlay);
      };
    } else if (videoElement && !remoteStream) {
      videoElement.srcObject = null;
    }
  }, [remoteStream]);

  // Show WebRTC errors as toasts
  useEffect(() => {
    if (webrtcError) {
      toast.error(`WebRTC Error: ${webrtcError}`);
      clearError();
    }
  }, [webrtcError, clearError]);

  // Track when we receive remote stream
  useEffect(() => {
    if (remoteStream) {
      setRemoteTracksReceived(true);
    }
  }, [remoteStream]);

  // Auto-start call when session is ready and signaling is connected
  useEffect(() => {
    if (!callStarted && isSignalingConnected && sessionReady) {
      const timer = setTimeout(() => {
        handleStartCall();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [callStarted, isSignalingConnected, sessionReady]);

  const handleStartCall = async () => {
    try {
      if (!isSignalingConnected) {
        toast.error('Signaling not connected. Please wait...');
        return;
      }
      
      await startCall();
      setCallStarted(true);
      toast.success('Call started successfully');
    } catch (error) {
      toast.error(`Failed to start call: ${error}`);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    try {
      // Send through WebRTC if available
      sendChatMessage(message);
      toast.success('Message sent');
      setMessage('');
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Failed to send message:', error);
    }
  };

  const handleEndConsultation = async () => {
    try {
      // End WebRTC call before closing consultation
      endCall();
      
      // Update appointment status to completed
      if (id) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        await fetch(`${apiUrl}/appointments/${id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'completed',
            notes: 'Consultation completed via video call'
          })
        });
      }
      
      toast.success('Consultation ended. Summary generated.');
      
      // Navigate based on user role
      if (user?.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/appointments');
      }
    } catch (error) {
      toast.error('Consultation ended, but there was an issue updating the status.');
      
      // Still navigate even if status update fails
      if (user?.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/appointments');
      }
    }
  };

  const handleToggleVideo = () => {
    toggleVideo();
    toast.info(isVideoEnabled ? 'Video disabled' : 'Video enabled');
  };

  const handleToggleAudio = () => {
    toggleAudio();
    toast.info(isAudioEnabled ? 'Audio muted' : 'Audio unmuted');
  };

  // Helper functions to get participant information
  const getRemoteParticipantName = () => {
    if (!appointmentData?.appointment) return userRole === 'doctor' ? 'Patient' : 'Doctor';
    
    if (userRole === 'doctor') {
      // Doctor sees patient
      const patient = appointmentData.appointment.patient;
      return patient?.name?.replace(' undefined', '') || 'Patient';
    } else {
      // Patient sees doctor
      const doctor = appointmentData.appointment.doctor;
      return doctor?.name || 'Doctor';
    }
  };

  const getRemoteParticipantRole = () => {
    if (!appointmentData?.appointment) return userRole === 'doctor' ? 'Patient' : 'Doctor';
    
    if (userRole === 'doctor') {
      return 'Patient';
    } else {
      const doctor = appointmentData.appointment.doctor;
      return doctor?.specialization || 'Doctor';
    }
  };

  const getCurrentUserName = () => {
    if (!appointmentData?.appointment) return userRole === 'doctor' ? 'Doctor (You)' : 'Patient (You)';
    
    if (userRole === 'doctor') {
      const doctor = appointmentData.appointment.doctor;
      return doctor?.name || 'Doctor (You)';
    } else {
      const patient = appointmentData.appointment.patient;
      return patient?.name?.replace(' undefined', '') || 'Patient (You)';
    }
  };

  // Show loading or error state if session is not ready
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          {sessionError ? (
            <>
              <div className="text-destructive text-lg mb-4">Session Error</div>
              <p className="text-muted-foreground mb-4">{sessionError}</p>
              <Button onClick={() => navigate('/patient/appointments')}>
                Back to Appointments
              </Button>
            </>
          ) : (
            <>
              <div className="text-lg mb-4">Initializing Session...</div>
              <p className="text-muted-foreground">Please wait while we set up your consultation.</p>
            </>
          )}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass-panel border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive/10">
              <Video className="w-5 h-5 text-destructive pulse-glow" />
            </div>
            <div>
              <h2 className="font-['Poppins'] font-semibold">Active Consultation</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${isConnected ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'} pulse-glow`}>
              {isConnected ? 'Connected' : 'Connecting...'}
            </Badge>
            {networkQuality && (
              <Badge className={`${
                networkQuality === 'excellent' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                networkQuality === 'good' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                networkQuality === 'fair' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                'bg-red-500/10 text-red-600 border-red-500/20'
              }`}>
                {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)} Quality
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-5rem)]">
        {/* Main Video Area */}
        <div className="flex-1 relative">
          {/* Remote Video (Main) - Shows the other participant */}
          <div className="absolute inset-0">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                controls={false}
                muted={false}
                className="w-full h-full object-cover bg-black"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <div className="text-center">
                  <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary/20">
                    <AvatarImage src={userRole === 'doctor' ? "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200" : "https://images.unsplash.com/photo-1758691463606-1493d79cc577?w=200"} alt={userRole === 'doctor' ? "Patient" : "Doctor"} />
                    <AvatarFallback>
                      <User className="w-16 h-16" />
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-2xl font-['Poppins'] font-semibold">
                    {getRemoteParticipantName()}
                  </h3>
                  <p className="text-muted-foreground">
                    {getRemoteParticipantRole()}
                  </p>
                  {!isConnected && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {isSignalingConnected ? 'Connecting...' : 'Waiting for connection...'}
                    </p>
                  )}
                  {remoteStream && !isConnected && (
                    <p className="text-xs text-yellow-400 mt-2">
                      Remote stream received but not connected
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Local Video (Picture-in-Picture) - Shows current user */}
          <div className="absolute top-4 right-4 w-64 h-48 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg z-10">
            {localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                className="w-full h-full object-cover bg-black"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-2 border-2 border-accent/20">
                    <AvatarImage src={userRole === 'doctor' ? "https://images.unsplash.com/photo-1758691463606-1493d79cc577?w=200" : "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200"} alt={userRole === 'doctor' ? "Doctor" : "Patient"} />
                    <AvatarFallback>
                      <User className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-semibold text-white">
                    {getCurrentUserName()}
                  </p>
                  <p className="text-xs text-white/70">
                    {userRole === 'doctor' ? 'Doctor (You)' : 'Patient (You)'}
                  </p>
                </div>
              </div>
            )}
            {!isVideoEnabled && localStream && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-white" />
              </div>
            )}
          </div>



          {/* Video Controls - Fixed at bottom */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md rounded-full px-6 py-3 border border-white/10">
              <Button
                size="lg"
                variant="ghost"
                className={`rounded-full w-12 h-12 p-0 ${!isVideoEnabled ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                onClick={handleToggleVideo}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
              
              <Button
                size="lg"
                variant="ghost"
                className={`rounded-full w-12 h-12 p-0 ${!isAudioEnabled ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                onClick={handleToggleAudio}
                title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
              
              <Button
                size="lg"
                className="rounded-full w-12 h-12 p-0 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setShowEndDialog(true)}
                title="End call"
              >
                <Phone className="w-5 h-5 rotate-[135deg]" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-96 border-l border-border glass-panel p-6">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="rx">Rx</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
              <div className="flex-1 space-y-3 overflow-y-auto mb-4">
                {allChatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Start the conversation by sending a message</p>
                    </div>
                  </div>
                ) : (
                  allChatMessages.map((msg) => {
                    const isCurrentUser = msg.senderRole === userRole;
                    const displayTime = msg.timestamp instanceof Date 
                      ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            isCurrentUser
                              ? 'bg-primary/10 border border-primary/20'
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {msg.senderRole === 'doctor' ? 'Doctor' : 'Patient'}
                              {isCurrentUser && ' (You)'}
                            </p>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{displayTime}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="bg-input-background border-input"
                />
                <Button 
                  size="icon" 
                  onClick={handleSendMessage} 
                  className="bg-primary hover:bg-primary/90"
                  disabled={!message.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="flex-1 overflow-y-auto mt-0">
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <h4 className="font-['Poppins'] font-semibold text-sm">AI Notes</h4>
                  </div>
                  <ul className="space-y-2">
                    {aiNotes.map((note, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Textarea
                  placeholder="Add your consultation notes here..."
                  className="min-h-[300px] bg-input-background border-input resize-none"
                />
              </div>
            </TabsContent>

            <TabsContent value="rx" className="flex-1 overflow-y-auto mt-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Medication</Label>
                  <Input
                    placeholder="e.g., Amoxicillin"
                    value={prescription.medication}
                    onChange={(e) => setPrescription({ ...prescription, medication: e.target.value })}
                    className="bg-input-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dosage</Label>
                  <Input
                    placeholder="e.g., 500mg"
                    value={prescription.dosage}
                    onChange={(e) => setPrescription({ ...prescription, dosage: e.target.value })}
                    className="bg-input-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    placeholder="e.g., 7 days"
                    value={prescription.duration}
                    onChange={(e) => setPrescription({ ...prescription, duration: e.target.value })}
                    className="bg-input-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instructions</Label>
                  <Textarea
                    placeholder="e.g., Take twice daily after meals"
                    value={prescription.instructions}
                    onChange={(e) => setPrescription({ ...prescription, instructions: e.target.value })}
                    className="min-h-[100px] bg-input-background border-input resize-none"
                  />
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90 glow-teal"
                  onClick={() => toast.success('Prescription saved')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Save Prescription
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* End Consultation Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="glass-panel">
          <DialogHeader>
            <DialogTitle className="text-2xl font-['Poppins']">End Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to end this session?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-primary/20"
                onClick={() => setShowEndDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90"
                onClick={handleEndConsultation}
              >
                End Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
