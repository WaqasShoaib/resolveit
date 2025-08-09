// /client/src/components/admin/StatsCards.tsx
'use client';

import React from 'react';
import { FileText, Users, Clock, CheckCircle, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { AdminDashboardStats } from '@/lib/api/admin';

interface StatsCardsProps {
  stats: AdminDashboardStats | null;
  isLoading: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-300 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Failed to load statistics</p>
      </div>
    );
  }

  const { overview } = stats;

  const statCards = [
    {
      title: 'Total Cases',
      value: overview.totalCases,
      change: `+${overview.recentCases} this month`,
      changeType: 'positive' as const,
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'Active Cases',
      value: overview.activeCases,
      change: `${Math.round((overview.activeCases / overview.totalCases) * 100)}% of total`,
      changeType: 'neutral' as const,
      icon: Clock,
      color: 'yellow'
    },
    {
      title: 'Resolved Cases',
      value: overview.resolvedCases,
      change: `${Math.round((overview.resolvedCases / overview.totalCases) * 100)}% success rate`,
      changeType: 'positive' as const,
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Total Users',
      value: overview.totalUsers,
      change: 'Registered users',
      changeType: 'neutral' as const,
      icon: Users,
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        icon: 'bg-blue-100 text-blue-600',
        text: 'text-blue-600'
      },
      yellow: {
        bg: 'bg-yellow-50',
        icon: 'bg-yellow-100 text-yellow-600',
        text: 'text-yellow-600'
      },
      green: {
        bg: 'bg-green-50',
        icon: 'bg-green-100 text-green-600',
        text: 'text-green-600'
      },
      purple: {
        bg: 'bg-purple-50',
        icon: 'bg-purple-100 text-purple-600',
        text: 'text-purple-600'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getChangeIcon = (changeType: 'positive' | 'negative' | 'neutral') => {
    if (changeType === 'positive') return TrendingUp;
    if (changeType === 'negative') return AlertTriangle;
    return Calendar;
  };

  const getChangeColor = (changeType: 'positive' | 'negative' | 'neutral') => {
    if (changeType === 'positive') return 'text-green-600';
    if (changeType === 'negative') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card) => {
        const Icon = card.icon;
        const ChangeIcon = getChangeIcon(card.changeType);
        const colorClasses = getColorClasses(card.color);

        return (
          <div key={card.title} className={`${colorClasses.bg} rounded-lg border border-gray-200 p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${colorClasses.icon} rounded-lg flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
              <ChangeIcon className={`w-4 h-4 ${getChangeColor(card.changeType)}`} />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {card.value.toLocaleString()}
              </p>
              <p className={`text-sm ${getChangeColor(card.changeType)}`}>
                {card.change}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
