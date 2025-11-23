// src/components/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Settings, LogOut, User as UserIcon, ChevronDown, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

export function Navbar(): JSX.Element {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ddRef.current) return;
      if (!ddRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const handleLogoClick = () => navigate('/');

  const handleDashboard = () => {
    if (!user) return navigate('/login');
    if (user.role === 'doctor') return navigate('/doctor/dashboard');
    if (user.role === 'admin') return navigate('/admin/dashboard');
    return navigate('/patient/dashboard');
  };

  const handleLogout = async () => {
    try {
      // call backend to revoke / blacklist token
      await api.post('/auth/logout');
    } catch (err) {
      // ignore errors — still proceed to local logout
      // console.warn('Logout api error', err);
    } finally {
      logout(); // clear local storage and context
      setOpen(false);
      navigate('/login');
    }
  };

  const renderAvatar = () => {
    const name = user?.name || user?.email || 'User';
    const initials = name
      .split(' ')
      .map((p: string) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    const profileImage = (user as any)?.profileImage;
    if (profileImage) {
      return <img src={profileImage} alt="avatar" className="w-8 h-8 rounded-full object-cover" />;
    }
    return (
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
        {initials}
      </div>
    );
  };

  // inline styles for slide+fade animation
  const dropdownStyle: React.CSSProperties = {
    transition: 'opacity 180ms ease, transform 180ms ease',
    opacity: open ? 1 : 0,
    transform: open ? 'translateY(0px) scale(1)' : 'translateY(-6px) scale(.98)',
    pointerEvents: open ? 'auto' : 'none',
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b border-primary/10 bg-background/60">
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleLogoClick}>
          <div className="p-2.5 rounded-xl bg-primary/10 glow-teal">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="font-['Poppins'] font-bold text-xl leading-none">
              Arogya<span className="text-primary">AI</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Smart Triage & Telehealth</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            title="Notifications"
            className="relative p-2 rounded-md hover:bg-primary/6"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button>

          {!user && (
            <>
              <Link to="/login">
                <Button variant="outline" className="border-primary/30 hover:bg-primary/10 text-primary">
                  Login
                </Button>
              </Link>

              <Link to="/register">
                <Button className="bg-primary hover:bg-primary/90 glow-teal">
                  Register
                </Button>
              </Link>
            </>
          )}

          {user && (
            <div ref={ddRef} className="relative">
              <button
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => setOpen((s) => !s)}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-primary/6 focus:outline-none"
              >
                {renderAvatar()}
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-sm font-medium leading-none">{user.name || user.email}</span>
                  <span className="text-xs text-muted-foreground leading-none">{user.role}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              <div
                role="menu"
                aria-label="Profile menu"
                className="absolute right-0 mt-2 w-56 dropdown-menu-enhanced rounded-lg p-2 z-50"
                style={dropdownStyle}
              >
                <div className="px-3 py-2 border-b border-primary/6">
                  <div className="text-sm font-semibold">{user.name || user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>

                <div className="flex flex-col py-2">
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate('/profile');
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/6 rounded"
                  >
                    <UserIcon className="w-4 h-4" />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate('/settings');
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/6 rounded"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      setOpen(false);
                      handleDashboard();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/6 rounded"
                  >
                    <Activity className="w-4 h-4" />
                    Dashboard
                  </button>
                </div>

                <div className="px-3 pt-2 border-t border-primary/6">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-danger/10 hover:bg-danger/20 text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
