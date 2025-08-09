// /src/app/admin/settings.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api/admin'; // Import the API client
import { AdminUser } from '@/lib/api/admin'; // Import AdminUser type

const Settings: React.FC = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await adminAPI.getAllUsers({ role: 'admin' });
        const fetchedUser = response.data.users[0];

        // Ensure the user has a valid _id before setting state
        if (fetchedUser && fetchedUser._id) {
          setUser(fetchedUser);
        } else {
          console.error('User data missing _id');
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setIsLoading(false);
      }
    };
    
    fetchUserDetails();
  }, []);

  const handleSaveChanges = async () => {
    if (!user) return;

    // Ensure user._id is valid before making the API call
    if (!user._id) {
      alert('User _id is missing');
      return;
    }

    try {
      // Save changes to the backend
      await adminAPI.updateUser(user._id, { name: user.name, email: user.email });
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving user details:', error);
      alert('Failed to save changes');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            id="name"
            value={user?.name || ''}
            onChange={(e) => setUser({ ...user!, name: e.target.value })} // Use non-null assertion because user is not null
            className="mt-1 p-2 w-full border rounded-md"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            value={user?.email || ''}
            onChange={(e) => setUser({ ...user!, email: e.target.value })} // Use non-null assertion
            className="mt-1 p-2 w-full border rounded-md"
          />
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSaveChanges}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
