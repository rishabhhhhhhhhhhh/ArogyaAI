import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Upload, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { GlassCard } from '../components/GlassCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { aiAssessmentService, AIAnalysisResponse } from '../services/aiAssessmentService';

export function AIDemo() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Check if user is logged in from localStorage (dynamic check)
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('aai_token');
    const userData = localStorage.getItem('aai_user');
    return token && userData ? JSON.parse(userData) : null;
  });

  // Update user state when component mounts or when localStorage changes
  React.useEffect(() => {
    const checkUserStatus = () => {
      const token = localStorage.getItem('aai_token');
      const userData = localStorage.getItem('aai_user');
      const currentUser = token && userData ? JSON.parse(userData) : null;
      setUser(currentUser);
    };

    // Check on mount
    checkUserStatus();

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener('storage', checkUserStatus);
    
    // Also check periodically in case user logs in on same tab
    const interval = setInterval(checkUserStatus, 1000);

    return () => {
      window.removeEventListener('storage', checkUserStatus);
      clearInterval(interval);
    };
  }, []);
  const [symptoms, setSymptoms] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResponse | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processAI = async () => {
    setIsProcessing(true);
    
    // IMMEDIATELY hide previous steps and show processing
    setStep(3.5); // Use intermediate step for processing
    
    try {
      // Simple, direct API call
      const response = await fetch('http://localhost:5000/api/ai-assessments/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: symptoms,
          imageData: selectedImage || undefined
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data) {
        throw new Error('Invalid API response format');
      }
      
      const analysisResult = responseData.data;
      
      // Set the analysis result
      setAiResult({
        condition: analysisResult.condition,
        severity: analysisResult.severity,
        confidence: analysisResult.confidence,
        recommendations: analysisResult.recommendations,
        shouldConsultDoctor: analysisResult.shouldConsultDoctor,
        estimatedRecovery: analysisResult.estimatedRecovery,
        summary: analysisResult.summary
      });
      
      setStep(4);
      toast.success(`Analysis Complete: ${analysisResult.condition}`);
      
    } catch (error: any) {
      toast.error(`Analysis failed: ${error.message}`);
      
      // Only show fallback if there's actually an error
      setAiResult({
        condition: 'Analysis Failed - Please Try Again',
        severity: 'Medium',
        confidence: 0,
        recommendations: [
          'Please try the analysis again',
          'Check your internet connection',
          'Contact support if the issue persists'
        ],
        shouldConsultDoctor: true,
        estimatedRecovery: 'Try again',
        summary: 'Analysis could not be completed due to technical issues.'
      });
      setStep(4);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }
    if (step === 3) {
      processAI();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const resetDemo = () => {
    setStep(1);
    setSymptoms('');
    setSelectedImage(null);
    setSelectedFile(null);
    setAiResult(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low':
        return 'text-accent';
      case 'medium':
        return 'text-[#FF7A59]';
      case 'high':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const saveAssessment = async () => {
    if (!aiResult || !user) {
      toast.error('Please log in to save your assessment');
      return;
    }

    try {
      await aiAssessmentService.createAssessment({
        symptoms: [symptoms],
        condition: aiResult.condition,
        severity: aiResult.severity,
        confidence: aiResult.confidence,
        recommendations: aiResult.recommendations,
        followUpRequired: aiResult.shouldConsultDoctor,
        assessmentData: {
          originalSymptoms: symptoms,
          imageUploaded: !!selectedImage,
        },
        imageData: selectedImage || undefined,
        summary: aiResult.summary,
        estimatedRecovery: aiResult.estimatedRecovery
      });
      
      toast.success('Assessment saved successfully! Check your dashboard.');
    } catch (error: any) {
      console.error('Save assessment error:', error);
      toast.error(error.message || 'Failed to save assessment');
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-primary/10 mb-4 glow-teal">
            <Brain className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-['Poppins'] font-semibold mb-2">AI Health Assessment</h1>
          <p className="text-muted-foreground">Get instant AI-powered health insights in minutes</p>
          

        </div>

        {/* Progress Bar */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {step === 3.5 ? 'Analyzing...' : `Step ${Math.floor(step)} of 3`}
              </span>
              <span className="text-sm text-muted-foreground">
                {step === 3.5 ? 'Processing' : `${Math.round((step / 3) * 100)}%`}
              </span>
            </div>
            <Progress 
              value={step === 3.5 ? 90 : (step / 3) * 100} 
              className="h-2" 
            />
          </div>
        )}

        {/* Step 1: Symptoms */}
        {step === 1 && (
          <GlassCard glow="teal">
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-4">Describe Your Symptoms</h2>
            <p className="text-muted-foreground mb-6">
              Please provide a detailed description of what you're experiencing. Include when symptoms started, their severity, and any other relevant information.
            </p>
            <Textarea
              placeholder="Example: I've been experiencing a sore throat and mild fever since yesterday morning. The fever is around 100°F and I have slight body aches..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="min-h-[200px] bg-input-background border-input focus:border-primary focus:glow-teal resize-none"
            />
            <div className="flex justify-end mt-6">
              <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 glow-teal group">
                Next Step
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Step 2: Image Upload */}
        {step === 2 && (
          <GlassCard glow="emerald">
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-4">Upload Medical Images (Optional)</h2>
            <p className="text-muted-foreground mb-6">
              Upload any relevant photos (skin conditions, rashes, etc.) to help our AI provide better analysis.
            </p>

            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-all">
              {selectedImage ? (
                <div className="space-y-4">
                  <img src={selectedImage} alt="Uploaded" className="max-h-64 mx-auto rounded-lg" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedFile(null);
                    }}
                    className="border-primary/20"
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack} className="border-primary/20">
                <ArrowLeft className="mr-2 w-5 h-5" />
                Back
              </Button>
              <Button onClick={handleNext} className="bg-accent hover:bg-accent/90 glow-emerald group">
                Next Step
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <GlassCard glow="cyan">
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-4">Review & Analyze</h2>
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-['Poppins'] font-semibold mb-2">Symptoms Described:</h3>
                <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg">{symptoms}</p>
              </div>
              {selectedImage && (
                <div>
                  <h3 className="font-['Poppins'] font-semibold mb-2">Image Uploaded:</h3>
                  <img src={selectedImage} alt="Review" className="max-h-32 rounded-lg" />
                </div>
              )}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-['Poppins'] font-semibold mb-1">Important Note</p>
                  <p className="text-muted-foreground">
                    This AI assessment is for informational purposes only and does not replace professional medical advice. Please consult with a healthcare provider for proper diagnosis and treatment.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack} className="border-primary/20">
                <ArrowLeft className="mr-2 w-5 h-5" />
                Back
              </Button>
              <Button onClick={handleNext} className="bg-[#23C4F8] hover:bg-[#23C4F8]/90 glow-cyan">
                <Brain className="mr-2 w-5 h-5" />
                Analyze with AI
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Processing - Show immediately when AI analysis starts */}
        {step === 3.5 && (
          <GlassCard glow="teal">
            <div className="py-12">
              <LoadingSpinner message="AI is analyzing your symptoms..." neural />
              <div className="mt-8 space-y-2 text-center text-muted-foreground">
                <p>Processing medical data...</p>
                <p>Analyzing patterns...</p>
                <p>Generating recommendations...</p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Step 4: Results */}
        {step === 4 && aiResult && (
          <div className="space-y-6">
            <GlassCard glow="teal">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-['Poppins'] font-semibold">AI Analysis Complete</h2>
                    <p className="text-sm text-muted-foreground">Based on your symptoms</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-3xl font-['Poppins'] font-semibold text-primary">{aiResult.confidence}%</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Possible Condition</p>
                  <p className="font-['Poppins'] font-semibold text-lg">{aiResult.condition}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Severity Level</p>
                  <p className={`font-['Poppins'] font-semibold text-lg ${getSeverityColor(aiResult.severity)}`}>
                    {aiResult.severity}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-['Poppins'] font-semibold mb-3">AI Recommendations</h3>
                <ul className="space-y-2">
                  {aiResult.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {aiResult.shouldConsultDoctor && (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-['Poppins'] font-semibold text-accent mb-1">
                        Consultation Recommended
                      </p>
                      <p className="text-sm text-muted-foreground">
                        We recommend consulting with a healthcare professional for proper diagnosis and treatment.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>

            <div className="space-y-4">
              {user && (
                <Button
                  onClick={saveAssessment}
                  variant="outline"
                  className="w-full border-accent/20 hover:bg-accent/10 text-accent"
                >
                  Save Assessment to Profile
                </Button>
              )}
              
              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    if (user) {
                      navigate('/patient/book-consultation');
                    } else {
                      navigate('/auth');
                    }
                  }}
                  className="flex-1 bg-primary hover:bg-primary/90 glow-teal"
                >
                  <Calendar className="mr-2 w-5 h-5" />
                  {user ? 'Book Consultation' : 'Login to Book'}
                </Button>
                <Button
                  onClick={resetDemo}
                  variant="outline"
                  className="flex-1 border-primary/20 hover:bg-primary/10"
                >
                  Try Another Assessment
                </Button>
              </div>
              
              {!user && (
                <p className="text-center text-sm text-muted-foreground">
                  <span className="text-accent">Login</span> to save your assessments and book consultations with doctors
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
