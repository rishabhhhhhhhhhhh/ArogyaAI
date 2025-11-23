import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { GlassCard } from '../components/GlassCard';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: contextRegister, setUser } = useAuth();
  const [userType, setUserType] = useState<'patient' | 'doctor'>('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate password confirmation
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Call API directly with role
      const res = await api.post('/auth/register', { 
        name, 
        email, 
        password, 
        role: userType 
      });
      const { token, user } = res.data.data;
      
      // Persist token + user
      localStorage.setItem('aai_token', token);
      localStorage.setItem('aai_user', JSON.stringify(user));
      setUser && setUser(user);
      
      if (userType === 'doctor') {
        toast.success('Doctor account created! Please complete your profile and await verification.');
        navigate('/doctor/dashboard');
      } else {
        toast.success('Account created successfully — welcome!');
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const msg = err?.response?.data?.message || 'Registration failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    toast.info('Accessing AI Demo as guest');
    navigate('/ai-demo');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
      <div className="absolute inset-0 backdrop-blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="p-3 rounded-xl bg-primary/10 glow-teal">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <span className="font-['Poppins'] font-semibold text-2xl">
            Arogya<span className="text-primary">AI</span>
          </span>
        </div>

        <GlassCard glow="teal">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl font-['Poppins'] font-semibold mb-2">Create Account</h1>
              <p className="text-muted-foreground">Join ArogyaAI for smart healthcare</p>
            </div>

            {/* User Type Selection */}
            <div className="space-y-3">
              <Label>Sign up as</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('patient')}
                  className={`p-4 rounded-lg border transition-all ${
                    userType === 'patient'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <User className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Patient</span>
                  <p className="text-xs text-muted-foreground mt-1">Book appointments & manage health</p>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('doctor')}
                  className={`p-4 rounded-lg border transition-all ${
                    userType === 'doctor'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Activity className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Doctor</span>
                  <p className="text-xs text-muted-foreground mt-1">Provide consultations & care</p>
                </button>
              </div>
              {userType === 'doctor' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Doctor accounts require verification. You'll need to provide your medical credentials after registration.
                  </p>
                </div>
              )}
            </div>

            {/* Register Form */}
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-input-background border-input focus:border-primary focus:glow-teal"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-input-background border-input focus:border-primary focus:glow-teal"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-input-background border-input focus:border-primary focus:glow-teal"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-input-background border-input focus:border-primary focus:glow-teal"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                By signing up, you agree to our{' '}
                <a href="#" className="text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 glow-teal"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full border-primary/20 hover:bg-primary/10"
                onClick={handleGuestAccess}
                disabled={loading}
              >
                Continue as Guest (AI Demo)
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}