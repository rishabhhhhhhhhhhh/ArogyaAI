import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Brain,
  Users,
  Settings,
  LogOut,
  Stethoscope,
  BarChart3,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

interface DashboardSidebarProps {
  userType: 'patient' | 'doctor' | 'admin';
}

export function DashboardSidebar({ userType }: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      // Call backend to revoke/blacklist token
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore errors — still proceed to local logout
      console.warn('Logout API error:', err);
    } finally {
      // Clear local storage and context
      logout();
      navigate('/auth');
    }
  };

  const patientNav = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/patient/dashboard' },
    { icon: Brain, label: 'AI Checkup', path: '/ai-demo' },
    { icon: Calendar, label: 'Appointments', path: '/patient/appointments' },
    { icon: FileText, label: 'Prescriptions', path: '/patient/prescriptions' },
  ];

  const doctorNav = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/doctor/dashboard' },
    { icon: Users, label: 'Patient Queue', path: '/doctor/queue' },
    { icon: Stethoscope, label: 'Consultations', path: '/doctor/consultations' },
    { icon: BarChart3, label: 'Analytics', path: '/doctor/analytics' },
  ];

  const adminNav = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  ];

  const navItems = userType === 'patient' ? patientNav : userType === 'doctor' ? doctorNav : adminNav;

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 glass-panel border-r border-border z-30">
      <div className="flex flex-col items-center py-6 space-y-4">
        <TooltipProvider delayDuration={100}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      active
                        ? 'bg-primary text-primary-foreground glow-teal'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className="flex-1" />

          {/* Show Settings button only for patient and doctor, not for admin */}
          {userType !== 'admin' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/settings"
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    isActive('/settings')
                      ? 'bg-primary text-primary-foreground glow-teal'
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                  }`}
                >
                  <Settings className="w-6 h-6" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-200"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}
