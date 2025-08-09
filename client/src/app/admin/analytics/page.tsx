// /src/app/admin/analytics.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api/admin'; // Import API client to fetch data
import StatsCards from '@/components/admin/StatsCards'; // Import the StatsCards component
import { AdminDashboardStats } from '@/lib/api/admin'; // Import AdminDashboardStats type

const Analytics: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null); // Explicitly typing the state as AdminDashboardStats | null
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats on component mount
    const fetchStats = async () => {
      try {
        const { data } = await adminAPI.getDashboardStats();
        setStats(data); // Now, TypeScript knows that stats will be of type AdminDashboardStats or null
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
      <StatsCards stats={stats} isLoading={isLoading} />
    </div>
  );
};

export default Analytics;
