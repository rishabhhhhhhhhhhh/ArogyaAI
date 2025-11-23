import { useState } from 'react';
import { Button } from '../components/ui/button';
import { GlassCard } from '../components/GlassCard';
import { patientService } from '../services/patientService';

export function ApiTest() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnectivity = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/health');
      const data = await response.json();
      setResult(`Connectivity: ${response.ok ? 'SUCCESS' : 'FAILED'} - ${JSON.stringify(data)}`);
    } catch (error: any) {
      setResult(`Connectivity Error: ${error.message}`);
      console.error('Connectivity error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testGetAppointments = async () => {
    setLoading(true);
    try {
      const response = await patientService.getMyAppointments();
      setResult(`Success: Found ${response.data.length} appointments`);
      console.log('Appointments:', response.data);
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testCancelAppointment = async () => {
    setLoading(true);
    try {
      // First get appointments
      const response = await patientService.getMyAppointments();
      if (response.data.length === 0) {
        setResult('No appointments found to cancel');
        return;
      }

      const firstAppointment = response.data[0];
      console.log('Attempting to cancel appointment:', firstAppointment);
      
      await patientService.cancelAppointment(firstAppointment.id, { reason: 'API test' });
      setResult(`Success: Cancelled appointment ${firstAppointment.id}`);
    } catch (error: any) {
      setResult(`Error: ${error.response?.data?.message || error.message || error.toString()}`);
      console.error('Full error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-['Poppins'] font-semibold mb-8">
          API Test
        </h1>

        <GlassCard>
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Button 
                onClick={testConnectivity}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Test Connectivity
              </Button>
              
              <Button 
                onClick={testGetAppointments}
                disabled={loading}
                className="bg-primary hover:bg-primary/90"
              >
                Test Get Appointments
              </Button>
              
              <Button 
                onClick={testCancelAppointment}
                disabled={loading}
                className="bg-destructive hover:bg-destructive/90"
              >
                Test Cancel First Appointment
              </Button>
            </div>

            <div className="p-4 bg-black/20 rounded min-h-[100px]">
              <strong>Result:</strong>
              <pre className="mt-2 text-sm">{result || 'No test run yet'}</pre>
            </div>

            <div className="text-sm text-muted-foreground">
              <strong>Token:</strong> {localStorage.getItem('aai_token') ? 'Present' : 'Missing'}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}