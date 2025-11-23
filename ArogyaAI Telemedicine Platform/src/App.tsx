// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// UI + layout
import { Toaster } from './components/ui/sonner';
import { Navbar } from './components/Navbar';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { AIDemo } from './pages/AIDemo';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ConsultationPage } from './pages/ConsultationPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import { Appointments } from './pages/Appointments';
import { Prescriptions } from './pages/Prescriptions';
import { BookConsultation } from './pages/BookConsultation';
import { WebSocketTest } from './pages/WebSocketTest';
import { ApiTest } from './pages/ApiTest';
import { WebRTCTest } from './pages/WebRTCTest';
import { SimpleWebRTCTest } from './pages/SimpleWebRTCTest';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Auth
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { JSX } from 'react/jsx-runtime';
import { JSX } from 'react/jsx-runtime';

function AppContent(): JSX.Element {
  const location = useLocation();
  
  // Hide navbar on consultation pages
  const hideNavbar = location.pathname.startsWith('/consultation/') || location.pathname.startsWith('/consult/');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!hideNavbar && <Navbar />}

        <Routes>
          {/* Public - redirect to dashboard if logged in */}
          <Route path="/" element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          } />
          <Route path="/auth" element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          } />
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } />
          <Route path="/ai-demo" element={<AIDemo />} />
          <Route path="/websocket-test" element={<WebSocketTest />} />
          <Route path="/api-test" element={<ApiTest />} />
          <Route path="/webrtc-test" element={<WebRTCTest />} />
          <Route path="/simple-webrtc-test" element={<SimpleWebRTCTest />} />

          {/* Patient routes */}
          <Route
            path="/patient/dashboard"
            element={
              <ProtectedRoute role="patient">
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute role="patient">
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/prescriptions"
            element={
              <ProtectedRoute role="patient">
                <Prescriptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/book-consultation"
            element={
              <ProtectedRoute role="patient">
                <BookConsultation />
              </ProtectedRoute>
            }
          />

          {/* Doctor routes */}
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute role="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/queue"
            element={
              <ProtectedRoute role="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/consultations"
            element={
              <ProtectedRoute role="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/analytics"
            element={
              <ProtectedRoute role="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verification"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Shared protected */}
          <Route
            path="/consultation/:id"
            element={
              <ProtectedRoute>
                <ConsultationPage />
              </ProtectedRoute>
            }
          />
          {/* Legacy route for backward compatibility */}
          <Route
            path="/consult/:id"
            element={
              <ProtectedRoute>
                <ConsultationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* New: Profile & Notifications */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'glass-panel border border-primary/20',
            style: {
              background: 'rgba(18, 18, 18, 0.95)',
              color: '#E8E8E8',
              border: '1px solid rgba(14, 122, 122, 0.2)',
            },
          }}
        />
      </div>
  );
}

export default function App(): JSX.Element {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
