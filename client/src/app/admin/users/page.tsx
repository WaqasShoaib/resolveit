'use client';

import React, { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { Table, Button, Modal, Select, Input, Row, Col, notification } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Edit, Trash } from 'lucide-react';

const { Option } = Select;

type Role = 'user' | 'admin' | 'panel_member';

interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

interface Filters {
  role: '' | Role;
  search: string;
  page: number;
  limit: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filters, setFilters] = useState<Filters>({
    role: '',
    search: '',
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    fetchUsers(filters);
  }, [filters]);

  const fetchUsers = async (params: Filters) => {
    setIsLoading(true);
    try {
      const response = await adminAPI.getAllUsers({
        role: params.role || undefined,
        search: params.search || undefined,
        page: params.page,
        limit: params.limit,
      });
      setUsers(response.data.users);
      // If you want real pagination totals: keep response.data.pagination and use it below.
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error?.response?.data?.message || 'Failed to fetch users',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      // Only send allowed fields
      const payload = {
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role as Role,
      };
      await adminAPI.updateUser(selectedUser._id, payload);

      notification.success({
        message: 'Success',
        description: 'User details updated',
      });
      // Refresh via filters (useEffect will refetch)
      setFilters((prev) => ({ ...prev }));
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error?.response?.data?.message || 'Failed to update user details',
      });
    } finally {
      setEditModalVisible(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminAPI.deleteUser(userId);
      notification.success({
        message: 'Success',
        description: 'User deleted successfully',
      });
      // Refresh via filters (useEffect will refetch)
      setFilters((prev) => ({ ...prev }));
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error?.response?.data?.message || 'Failed to delete user',
      });
    }
  };

  // Filter handlers — do NOT call fetch directly; let useEffect handle it
  const handleFilterChange = (value: string, key: keyof Filters) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setFilters((prev) => ({
      ...prev,
      search: searchValue,
      page: 1,
    }));
  };

  const handlePaginationChange = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: Role) =>
        role === 'panel_member' ? 'Panel Member' : role.charAt(0).toUpperCase() + role.slice(1),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: User) => (
        <div>
          <Button
            onClick={() => openEditModal(record)}
            icon={<Edit size={16} />}
            type="default"
            style={{ marginRight: 8 }}
          >
            Edit
          </Button>
          <Button
            onClick={() => handleDeleteUser(record._id)}
            icon={<Trash size={16} />}
            type="primary"
            danger
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const openEditModal = (record: User) => {
    setSelectedUser(record);
    setEditModalVisible(true);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">User Management</h1>

      {/* Filters */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select
            placeholder="Filter by Role"
            value={filters.role}
            onChange={(value: '' | Role) => handleFilterChange(value, 'role')}
            style={{ width: '100%' }}
            allowClear
          >
            <Option value="admin">Admin</Option>
            <Option value="user">User</Option>
            <Option value="panel_member">Panel Member</Option>
          </Select>
        </Col>

        <Col span={6}>
          <Input
            placeholder="Search by name or email"
            value={filters.search}
            onChange={handleSearchChange}
            style={{ width: '100%' }}
          />
        </Col>
      </Row>

      {/* Table */}
      <Table<User>
        columns={columns}
        dataSource={users}
        rowKey="_id"
        loading={isLoading}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total: users.length, // swap with real total from API when available
          onChange: handlePaginationChange,
        }}
      />

      {/* Edit Modal */}
      <Modal
        title="Edit User"
        open={editModalVisible}
        onOk={handleEditUser}
        onCancel={() => setEditModalVisible(false)}
      >
        <div className="space-y-3">
          <div>
            <h3 className="mb-1">Name</h3>
            <Input
              value={selectedUser?.name}
              onChange={(e) =>
                setSelectedUser((prev) => (prev ? { ...prev, name: e.target.value } as User : prev))
              }
            />
          </div>

          <div>
            <h3 className="mb-1">Email</h3>
            <Input
              value={selectedUser?.email}
              onChange={(e) =>
                setSelectedUser((prev) => (prev ? { ...prev, email: e.target.value } as User : prev))
              }
            />
          </div>

          <div>
            <h3 className="mb-1">Role</h3>
            <Select
              value={selectedUser?.role}
              onChange={(value: Role) =>
                setSelectedUser((prev) => (prev ? { ...prev, role: value } as User : prev))
              }
              style={{ width: '100%' }}
            >
              <Option value="admin">Admin</Option>
              <Option value="user">User</Option>
              <Option value="panel_member">Panel Member</Option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
