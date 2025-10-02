'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function ApiTestWidget() {
  const { data: session } = useSession();
  const [testResult, setTestResult] = useState<string>('Not tested');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setTestResult('Testing...');
    
    try {
      console.log('Testing API endpoint...');
      const response = await fetch('/api/test');
      const data = await response.json();
      
      if (response.ok) {
        setTestResult(`✅ Test API works: ${data.message}`);
      } else {
        setTestResult(`❌ Test API failed: ${response.status}`);
      }
    } catch (error) {
      setTestResult(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testSalesApi = async () => {
    setLoading(true);
    setTestResult('Testing sales API...');
    
    try {
      console.log('Testing Sales API endpoint...');
      const response = await fetch('/api/sales-reports');
      console.log('Sales API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ Sales API works: ${data.success ? 'Success' : 'Failed'}`);
      } else if (response.status === 401) {
        setTestResult(`⚠️ Sales API auth required (${response.status})`);
      } else {
        setTestResult(`❌ Sales API failed: ${response.status}`);
      }
    } catch (error) {
      setTestResult(`❌ Sales API error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded">
      <h3 className="font-medium">API Test Widget</h3>
      
      <div className="text-sm">
        <strong>Session:</strong> {session?.user?.email || 'Not logged in'}
      </div>
      
      <div className="text-sm">
        <strong>Result:</strong> {testResult}
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={testApi}
          disabled={loading}
        >
          Test Basic API
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={testSalesApi}
          disabled={loading}
        >
          Test Sales API
        </Button>
      </div>
    </div>
  );
}


