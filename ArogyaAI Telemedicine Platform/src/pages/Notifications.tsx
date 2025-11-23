// src/pages/Notifications.tsx
import React, { useState, useEffect } from 'react';
import { Bell, Calendar, FileText, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

type NotificationType = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'appointment' | 'prescription' | 'system' | 'ai';
  read: boolean;
  priority: 'high' | 'medium' | 'low';
};

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Mock notifications based on user data
        // In a real app, you'd fetch these from the API
        const mockNotifications: NotificationType[] = [
          { 
            id: '1', 
            title: 'Appointment Reminder', 
            body: `Dr. Sarah Johnson — Cardiology consultation tomorrow at 10:00 AM`, 
            time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            type: 'appointment',
            read: false,
            priority: 'high'
          },
          { 
            id: '2', 
            title: 'New Prescription Available', 
            body: 'Prescription for Amoxicillin 500mg uploaded by Dr. Michael Chen', 
            time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            type: 'prescription',
            read: false,
            priority: 'medium'
          },
          { 
            id: '3', 
            title: 'Welcome to ArogyaAI!', 
            body: `Hello ${user.name || 'Patient'}, your account has been successfully created`, 
            time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
            type: 'system',
            read: true,
            priority: 'low'
          },
          { 
            id: '4', 
            title: 'AI Health Assessment Complete', 
            body: 'Your recent health assessment results are now available for review', 
            time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            type: 'ai',
            read: true,
            priority: 'medium'
          },
        ];

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setNotifications(mockNotifications);
      } catch (err) {
        setError('Failed to load notifications. Please try again.');
        console.error('Notifications fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return Calendar;
      case 'prescription':
        return FileText;
      case 'ai':
        return CheckCircle;
      default:
        return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-destructive text-destructive';
      case 'medium':
        return 'border-[#FF7A59] text-[#FF7A59]';
      default:
        return 'border-accent text-accent';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-16">
        <DashboardSidebar userType="patient" />
        <div className="ml-20 p-6">
          <div className="max-w-4xl mx-auto">
            <GlassCard>
              <div className="text-center py-12">
                <div className="text-destructive text-lg mb-4">{error}</div>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <DashboardSidebar userType="patient" />
      
      <div className="ml-20 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Bell className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-['Poppins'] font-semibold">Notifications</h1>
              {unreadCount > 0 && (
                <Badge className="bg-destructive text-destructive-foreground">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Stay updated with your health journey</p>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-4 mb-6">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}
            >
              All Notifications ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              onClick={() => setFilter('unread')}
              className={filter === 'unread' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}
            >
              Unread ({unreadCount})
            </Button>
          </div>

          {/* Notifications List */}
          <GlassCard>
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-['Poppins'] font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {filter === 'unread' ? 'All caught up! No unread notifications.' : 'You have no notifications at the moment.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-xl transition-all hover:bg-muted/70 ${
                        !notification.read ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          notification.type === 'appointment' ? 'bg-accent/10' :
                          notification.type === 'prescription' ? 'bg-primary/10' :
                          notification.type === 'ai' ? 'bg-[#23C4F8]/10' :
                          'bg-muted'
                        }`}>
                          <IconComponent className={`w-5 h-5 ${
                            notification.type === 'appointment' ? 'text-accent' :
                            notification.type === 'prescription' ? 'text-primary' :
                            notification.type === 'ai' ? 'text-[#23C4F8]' :
                            'text-muted-foreground'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-['Poppins'] font-semibold">{notification.title}</h3>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{notification.body}</p>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {new Date(notification.time).toLocaleString()}
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={getPriorityColor(notification.priority)}
                                >
                                  {notification.priority}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-primary hover:text-primary/80 hover:bg-primary/10"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteNotification(notification.id)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Quick Actions */}
          {unreadCount > 0 && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All as Read
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
