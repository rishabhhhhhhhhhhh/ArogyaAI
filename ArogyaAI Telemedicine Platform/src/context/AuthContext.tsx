// src/context/AuthContext.tsx
import React, { createContext, useEffect, useState } from 'react';
import api from '../services/api';

type User = { id: string; email: string; role: string; name?: string } | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; name?: string; role?: string }) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    try {
      const s = localStorage.getItem('aai_user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Validate token on mount (best effort)
    const init = async () => {
      const token = localStorage.getItem('aai_token');
      const storedUser = localStorage.getItem('aai_user');
      
      if (!token || !storedUser) return;
      
      setLoading(true);
      try {
        const userData = JSON.parse(storedUser);
        
        // Call appropriate endpoint based on user role
        let validationEndpoint = '/patients/me'; // default
        
        if (userData.role === 'doctor') {
          validationEndpoint = '/doctors/me';
        } else if (userData.role === 'admin') {
          validationEndpoint = '/admin/me'; // if this endpoint exists
        }
        
        // Validate token by calling role-specific endpoint
        await api.get(validationEndpoint);
        
        // Token is valid, set user
        setUser(userData);
      } catch (err) {
        console.warn('Token validation failed:', err);
        // invalid token: clear
        localStorage.removeItem('aai_token');
        localStorage.removeItem('aai_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user: u } = res.data.data;
      
      // Ensure user object has proper structure
      const userData = {
        id: u.id || u._id,
        email: u.email,
        role: u.role,
        name: u.name || u.firstName ? `${u.firstName} ${u.lastName}`.trim() : email.split('@')[0]
      };
      
      localStorage.setItem('aai_token', token);
      localStorage.setItem('aai_user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      // Handle login errors
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: { email: string; password: string; name?: string; role?: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', payload);
      const { token, user: u } = res.data.data;
      
      // Ensure user object has proper structure
      const userData = {
        id: u.id || u._id,
        email: u.email,
        role: u.role,
        name: u.name || payload.name || payload.email.split('@')[0]
      };
      
      localStorage.setItem('aai_token', token);
      localStorage.setItem('aai_user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      // Handle registration errors
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('aai_token');
    localStorage.removeItem('aai_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
