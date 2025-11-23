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

export function LoginPage() {
  const navigate = useNavigate();
  const { login: contextLogin, setUser } = useAuth();
  const [userType, setUserType] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call backend login
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data.data;

      // Validate that the user's role matches the selected login type
      if (user.role !== userType) {
        toast.error(`This account is registered as a ${user.role}, but you're trying to login as ${userType}. Please select the correct role.`);
        setLoading(false);
        return;
      }

      // Persist token + user
      localStorage.setItem('aai_token', token);
      localStorage.setItem('aai_user', JSON.stringify(user));

      // Update context if available
      if (contextLogin) {
        try {
          await contextLogin(email, password);
        } catch {
          // Context login might re-call api; we already persisted token so we set user manually
          setUser && setUser(user);
        }
      } else {
        setUser && setUser(user);
      }

      toast.success(`Welcome back, ${user?.name || user?.email || 'user'}!`);

      // Navigate by role
      if (user.role === 'doctor') navigate('/doctor/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/patient/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed. Check credentials.';
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
              <h1 className="text-2xl font-['Poppins'] font-semibold mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">Sign in to your account</p>
            </div>

            {/* User Type Selection */}
            <div className="space-y-3">
              <Label>Login as</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUserType('patient')}
                  className={`p-3 rounded-lg border transition-all ${
                    userType === 'patient'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <User className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('doctor')}
                  className={`p-3 rounded-lg border transition-all ${
                    userType === 'doctor'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Activity className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('admin')}
                  className={`p-3 rounded-lg border transition-all ${
                    userType === 'admin'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Building2 className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">Admin</span>
                </button>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-input-background border-input focus:border-primary focus:glow-teal"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <a href="#" className="text-primary hover:underline">
                  Forgot password?
                </a>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 glow-teal"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
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
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Sign up here
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}