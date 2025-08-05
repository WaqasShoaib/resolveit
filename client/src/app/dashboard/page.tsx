'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to ResolveIt Dashboard
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Hello {user?.name}! Manage your dispute resolution cases here.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Quick Actions */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">+</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">New Case</h3>
                    <p className="text-sm text-gray-500">Register a new dispute</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/dashboard/cases/new"
                    className="btn-primary text-sm"
                  >
                    Create Case
                  </Link>
                </div>
              </div>
            </div>

            {/* My Cases */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">📋</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">My Cases</h3>
                    <p className="text-sm text-gray-500">View your cases</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/dashboard/cases"
                    className="btn-secondary text-sm"
                  >
                    View Cases
                  </Link>
                </div>
              </div>
            </div>

            {/* Profile */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">👤</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                    <p className="text-sm text-gray-500">Manage your account</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/dashboard/profile"
                    className="btn-secondary text-sm"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-8 bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <span className="font-medium text-gray-700">Name:</span>
                <span className="ml-2 text-gray-900">{user?.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <span className="ml-2 text-gray-900">{user?.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Phone:</span>
                <span className="ml-2 text-gray-900">{user?.phone}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Role:</span>
                <span className="ml-2 text-gray-900 capitalize">{user?.role}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email Verified:</span>
                <span className={`ml-2 ${user?.isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
                  {user?.isEmailVerified ? '✓ Verified' : '✗ Not Verified'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Phone Verified:</span>
                <span className={`ml-2 ${user?.isPhoneVerified ? 'text-green-600' : 'text-red-600'}`}>
                  {user?.isPhoneVerified ? '✓ Verified' : '✗ Not Verified'}
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">🎉 Authentication Complete!</h3>
            <p className="text-blue-800">
              Your login and registration system is working perfectly! You can now:
            </p>
            <ul className="mt-3 text-blue-800 text-left list-disc list-inside space-y-1">
              <li>Register new users</li>
              <li>Login with existing accounts</li>
              <li>Access protected dashboard routes</li>
              <li>Automatic token management</li>
              <li>Secure logout functionality</li>
            </ul>
            <p className="mt-3 text-blue-800 font-medium">
              Ready to add case registration forms! 🚀
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;