import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { GlassCard } from '../components/GlassCard';
import { toast } from 'sonner@2.0.3'; // keep same import you had
import { useAuth } from '../hooks/useAuth'; // <-- requires the AuthContext hook
import api from '../services/api'; // <-- axios client

export function AuthPage() {
  const navigate = useNavigate();
  const { login: contextLogin, register: contextRegister, setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<'patient' | 'doctor' | 'admin'>('patient');

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // call backend login
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data.data;

      // persist token + user
      localStorage.setItem('aai_token', token);
      localStorage.setItem('aai_user', JSON.stringify(user));

      // update context if available
      if (contextLogin) {
        // prefer context login so that state is consistent; but avoid double-call
        try {
          await contextLogin(email, password);
        } catch {
          // context login might re-call api; we already persisted token so we set user manually
          setUser && setUser(user);
        }
      } else {
        setUser && setUser(user);
      }

      toast.success(`Welcome back, ${user?.name || user?.email || 'user'}!`);

      // navigate by role
      if (user.role === 'doctor') navigate('/doctor/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/patient/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed. Check credentials.';
      toast.error(msg);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce: public signup only creates patients.
    if (userType === 'admin') {
      toast.error('Admin accounts cannot be created via public signup. Contact the system administrator.');
      return;
    }

    // If doctor selected, guide user to "apply for doctor" flow
    if (userType === 'doctor') {
      toast.info('Doctor accounts require verification. Please sign up as a patient and apply for doctor verification in your profile or contact support.');
      // Optionally still create a patient account so doctor can be linked later.
      // We'll proceed to create a patient account (public register only creates patient role).
    }

    try {
      // Use the context register if available (it will persist token + user)
      if (contextRegister) {
        await contextRegister({ name: signupName, email: signupEmail, password: signupPassword });
        const raw = localStorage.getItem('aai_user');
        const u = raw ? JSON.parse(raw) : null;
        toast.success('Account created — welcome!');
        navigate('/patient/dashboard');
        return;
      }

      // fallback: call API directly
      const res = await api.post('/auth/register', { name: signupName, email: signupEmail, password: signupPassword });
      const { token, user } = res.data.data;
      localStorage.setItem('aai_token', token);
      localStorage.setItem('aai_user', JSON.stringify(user));
      setUser && setUser(user);
      toast.success('Account created — welcome!');
      navigate('/patient/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Registration failed.';
      toast.error(msg);
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
          <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={(v) => setIsLogin(v === 'login')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* -------- LOGIN TAB -------- */}
            <TabsContent value="login" className="space-y-6">
              {/* User Type Selection (keeps existing UI but does not change backend rules) */}
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

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 glow-teal">
                  Login
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-primary/20 hover:bg-primary/10"
                  onClick={handleGuestAccess}
                >
                  Continue as Guest (AI Demo)
                </Button>
              </form>
            </TabsContent>

            {/* -------- SIGNUP TAB -------- */}
            <TabsContent value="signup" className="space-y-6">
              {/* User Type Selection */}
              <div className="space-y-3">
                <Label>Sign up as</Label>
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

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="pl-10 bg-input-background border-input focus:border-primary focus:glow-teal"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10 bg-input-background border-input focus:border-primary focus:glow-teal"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 bg-input-background border-input focus:border-primary focus:glow-teal"
                      required
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

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 glow-teal">
                  Create Account
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-primary/20 hover:bg-primary/10"
                  onClick={handleGuestAccess}
                >
                  Continue as Guest (AI Demo)
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </GlassCard>
      </div>
    </div>
  );
}
