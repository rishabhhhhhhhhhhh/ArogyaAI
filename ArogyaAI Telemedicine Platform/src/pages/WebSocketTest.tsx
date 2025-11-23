import { useState } from 'react';
import { Button } from '../components/ui/button';
import { GlassCard } from '../components/GlassCard';
import { SignalingClient } from '../services/signalingClient';

export function WebSocketTest() {
  const [status, setStatus] = useState('Disconnected');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [signalingClient, setSignalingClient] = useState<SignalingClient | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testConnection = async () => {
    try {
      setError(null);
      setStatus('Connecting...');
      addLog('Starting WebSocket connection test...');

      // Get token from localStorage
      const token = localStorage.getItem('aai_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      addLog('Token found, creating signaling client...');

      const client = new SignalingClient();
      
      // Set up event handlers
      client.onConnectionStateChange = (connected: boolean) => {
        setStatus(connected ? 'Connected' : 'Disconnected');
        addLog(`Connection state changed: ${connected ? 'Connected' : 'Disconnected'}`);
      };

      client.onError = (errorMessage: string) => {
        setError(errorMessage);
        addLog(`Error: ${errorMessage}`);
      };

      addLog('Attempting to connect...');
      await client.connect('test-session-123', token);
      
      setSignalingClient(client);
      addLog('Connection successful!');
      
    } catch (err: any) {
      setError(err.message);
      setStatus('Failed');
      addLog(`Connection failed: ${err.message}`);
    }
  };

  const disconnect = () => {
    if (signalingClient) {
      signalingClient.disconnect();
      setSignalingClient(null);
      setStatus('Disconnected');
      addLog('Disconnected');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen pt-16 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-['Poppins'] font-semibold mb-8">
          WebSocket Connection Test
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Controls */}
          <GlassCard>
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-4">
              Connection Control
            </h2>
            
            <div className="space-y-4">
              <div>
                <strong>Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  status === 'Connected' ? 'bg-green-500/20 text-green-400' :
                  status === 'Connecting...' ? 'bg-yellow-500/20 text-yellow-400' :
                  status === 'Failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {status}
                </span>
              </div>

              {error && (
                <div className="p-3 rounded bg-red-500/20 border border-red-500/20 text-red-400">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={testConnection}
                  disabled={status === 'Connecting...' || status === 'Connected'}
                  className="bg-primary hover:bg-primary/90"
                >
                  Connect
                </Button>
                
                <Button 
                  onClick={disconnect}
                  disabled={status !== 'Connected'}
                  variant="outline"
                >
                  Disconnect
                </Button>
                
                <Button 
                  onClick={clearLogs}
                  variant="outline"
                >
                  Clear Logs
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Connection Info */}
          <GlassCard>
            <h2 className="text-2xl font-['Poppins'] font-semibold mb-4">
              Connection Info
            </h2>
            
            <div className="space-y-2 text-sm">
              <div>
                <strong>API URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}
              </div>
              <div>
                <strong>WebSocket URL:</strong> {(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}
              </div>
              <div>
                <strong>Token:</strong> {localStorage.getItem('aai_token') ? 'Present' : 'Missing'}
              </div>
              <div>
                <strong>Environment:</strong> {import.meta.env.MODE}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Logs */}
        <GlassCard className="mt-6">
          <h2 className="text-2xl font-['Poppins'] font-semibold mb-4">
            Connection Logs
          </h2>
          
          <div className="bg-black/20 rounded p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}