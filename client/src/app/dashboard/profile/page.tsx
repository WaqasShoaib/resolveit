'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
            <p className="mt-1 text-sm text-gray-600">View and manage your account information</p>
          </div>
          <Link
            href="/dashboard/profile/edit"
            className="btn-primary"
          >
            Edit Profile
          </Link>
        </div>
        
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Information</h3>
              
              <div>
                <label className="form-label">Full Name</label>
                <div className="form-input bg-gray-50">{user.name}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Age</label>
                  <div className="form-input bg-gray-50">{user.age || 'Not provided'}</div>
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <div className="form-input bg-gray-50 capitalize">{user.gender || 'Not provided'}</div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Contact Information</h3>
              
              <div>
                <label className="form-label">Email</label>
                <div className="form-input bg-gray-50 flex justify-between items-center">
                  <span>{user.email}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${user.isEmailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.isEmailVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="form-label">Phone</label>
                <div className="form-input bg-gray-50 flex justify-between items-center">
                  <span>{user.phone}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${user.isPhoneVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.isPhoneVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Address Information */}
            {user.address && (
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Address Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Street Address</label>
                    <div className="form-input bg-gray-50">{user.address.street || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="form-label">City</label>
                    <div className="form-input bg-gray-50">{user.address.city || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="form-label">Zip Code</label>
                    <div className="form-input bg-gray-50">{user.address.zipCode || 'Not provided'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Information */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Account Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Account Role</label>
                  <div className="form-input bg-gray-50 capitalize">{user.role}</div>
                </div>
                <div>
                  <label className="form-label">Member Since</label>
                  <div className="form-input bg-gray-50">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="form-label">Account Status</label>
                  <div className="form-input bg-gray-50">
                    <span className="text-green-600">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Profile Management</h4>
            <p className="text-blue-800 text-sm mb-3">
              You can update your personal information, address, and other details. 
              Email and phone number changes require additional verification.
            </p>
            <div className="flex space-x-4">
              <Link
                href="/dashboard/profile/edit"
                className="btn-primary text-sm"
              >
                Edit Profile
              </Link>
              <button
                className="btn-secondary text-sm"
                onClick={() => alert('Password change functionality coming soon!')}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;