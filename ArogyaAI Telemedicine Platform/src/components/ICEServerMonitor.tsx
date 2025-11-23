/**
 * ICE Server Monitor Component
 * Admin component for monitoring and managing ICE server configuration
 * Requirements: 5.1, 5.2, 5.3 - ICE server monitoring and health checks
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, RefreshCw, Server, AlertTriangle, CheckCircle } from 'lucide-react';
import { iceServerService, ICEServerHealthStatus } from '../services/iceServerService';
import { useAuth } from '../hooks/useAuth';

interface ICEServerMonitorProps {
  className?: string;
}

export const ICEServerMonitor: React.FC<ICEServerMonitorProps> = ({ className }) => {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState<ICEServerHealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Only show for admin users
  if (!user || user.role !== 'admin') {
    return null;
  }

  const fetchHealthStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const status = await iceServerService.getIceServerHealth();
      setHealthStatus(status);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  const forceHealthCheck = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const status = await iceServerService.forceHealthCheck();
      setHealthStatus(status);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform health check');
    } finally {
      setLoading(false);
    }
  };

  const rotateCredentials = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await iceServerService.forceTurnCredentialRotation();
      // Refresh health status after rotation
      await fetchHealthStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate credentials');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchHealthStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getServerTypeIcon = (type: 'STUN' | 'TURN') => {
    return type === 'STUN' ? <Server className="h-4 w-4" /> : <Server className="h-4 w-4 text-blue-500" />;
  };

  const getHealthBadge = (healthy: boolean) => {
    return healthy ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Healthy
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Unhealthy
      </Badge>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            ICE Server Monitor
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={fetchHealthStatus}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button
              onClick={forceHealthCheck}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Force Health Check
            </Button>
            <Button
              onClick={rotateCredentials}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Rotate TURN Credentials
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {healthStatus && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {healthStatus.summary.healthyServers}
                  </div>
                  <div className="text-sm text-gray-600">Healthy Servers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {healthStatus.summary.totalServers}
                  </div>
                  <div className="text-sm text-gray-600">Total Servers</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Last Check</div>
                  <div className="text-xs text-gray-600">
                    {new Date(healthStatus.summary.lastCheck).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Next Rotation</div>
                  <div className="text-xs text-gray-600">
                    {new Date(healthStatus.summary.credentialRotation.nextRotation).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Server Details */}
              <div className="space-y-2">
                <h4 className="font-medium">Server Details</h4>
                {Object.entries(healthStatus.servers).map(([url, server]) => (
                  <div key={url} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getServerTypeIcon(server.type)}
                      <div>
                        <div className="font-medium text-sm">{url}</div>
                        <div className="text-xs text-gray-600">
                          Type: {server.type}
                          {server.responseTime && ` • Response: ${server.responseTime}ms`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getHealthBadge(server.healthy)}
                      {server.error && (
                        <span className="text-xs text-red-600" title={server.error}>
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Last Update */}
              {lastUpdate && (
                <div className="text-xs text-gray-500 text-center">
                  Last updated: {lastUpdate.toLocaleString()}
                </div>
              )}
            </div>
          )}

          {loading && !healthStatus && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading health status...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ICEServerMonitor;