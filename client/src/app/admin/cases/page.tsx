'use client';

import React, { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { Select, Input, Button, Row, Col, Table, Modal, notification } from 'antd';
import { Edit } from 'lucide-react';

const { Option } = Select;

interface Case {
  _id: string;
  caseNumber: string;
  caseType: string;
  status: string;
}

const CaseManagement: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [status, setStatus] = useState<string>(''); // Default status for modal
  const [filters, setFilters] = useState({
    status: '',
    caseType: '',
    priority: '',
    search: '',
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    fetchCases(filters);
  }, [filters]);

  // Fetch cases with filters
  const fetchCases = async (filters: any) => {
    setIsLoading(true);
    try {
      const response = await adminAPI.getAllCases(filters);
      setCases(response.data.cases);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch cases',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle case status update
  const handleUpdateStatus = async () => {
    if (!selectedCase || !status) return;

    try {
      await adminAPI.updateCaseStatus(selectedCase._id, { status, notes: '' });
      notification.success({
        message: 'Success',
        description: `Case status updated to ${status}`,
      });
      fetchCases(filters); // Refresh case list after update
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to update case status',
      });
    } finally {
      setStatusModalVisible(false);
    }
  };

  // Handle Filter Change
  const handleFilterChange = (value: string, key: string) => {
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters, [key]: value, page: 1 }; // Reset to page 1 when filters change
      fetchCases(updatedFilters); // Call API with updated filters
      return updatedFilters;
    });
  };

  // Handle Search Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters, search: searchValue, page: 1 };
      fetchCases(updatedFilters); // Call API with updated search
      return updatedFilters;
    });
  };

  // Handle Pagination
  const handlePaginationChange = (page: number) => {
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters, page };
      fetchCases(updatedFilters); // Fetch new page of cases
      return updatedFilters;
    });
  };

  // Columns for the Table
  const columns = [
    {
      title: 'Case Number',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
    },
    {
      title: 'Case Type',
      dataIndex: 'caseType',
      key: 'caseType',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Case) => (
        <Button 
          onClick={() => openStatusModal(record)} 
          icon={<Edit size={16} />}
          type="default"
        >
          Update Status
        </Button>
      ),
    },
  ];

  // Open status update modal
  const openStatusModal = (record: Case) => {
    setSelectedCase(record);
    setStatus(record.status); // Set current status
    setStatusModalVisible(true);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Case Management</h1>

      {/* Filter Section */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Select
            placeholder="Filter by Status"
            value={filters.status}
            onChange={(value) => handleFilterChange(value, 'status')}
            style={{ width: '100%' }}
          >
            <Option value="registered">Registered</Option>
            <Option value="under_review">Under Review</Option>
            <Option value="awaiting_response">Awaiting Response</Option>
            <Option value="accepted">Accepted</Option>
            <Option value="witness_nomination">Witness Nomination</Option>
            <Option value="panel_formation">Panel Formation</Option>
            <Option value="mediation_in_progress">Mediation in Progress</Option>
            <Option value="resolved">Resolved</Option>
            <Option value="unresolved">Unresolved</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
        </Col>

        <Col span={6}>
          <Select
            placeholder="Filter by Case Type"
            value={filters.caseType}
            onChange={(value) => handleFilterChange(value, 'caseType')}
            style={{ width: '100%' }}
          >
            <Option value="criminal">Criminal</Option>
            <Option value="civil">Civil</Option>
            <Option value="family">Family</Option>
          </Select>
        </Col>

        <Col span={6}>
          <Select
            placeholder="Filter by Priority"
            value={filters.priority}
            onChange={(value) => handleFilterChange(value, 'priority')}
            style={{ width: '100%' }}
          >
            <Option value="low">Low</Option>
            <Option value="medium">Medium</Option>
            <Option value="high">High</Option>
          </Select>
        </Col>

        <Col span={6}>
          <Input
            placeholder="Search by case number or title"
            value={filters.search}
            onChange={handleSearchChange}
            style={{ width: '100%' }}
          />
        </Col>
      </Row>

      {/* Table Section */}
      <Table
        columns={columns}
        dataSource={cases}
        rowKey="_id"
        loading={isLoading}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total: cases.length,
          onChange: handlePaginationChange,
        }}
      />

      <Modal
        title="Update Case Status"
        open={statusModalVisible}
        onOk={handleUpdateStatus}
        onCancel={() => setStatusModalVisible(false)}
      >
        <Select value={status} onChange={setStatus} style={{ width: '100%' }}>
          <Option value="registered">Registered</Option>
          <Option value="under_review">Under Review</Option>
          <Option value="awaiting_response">Awaiting Response</Option>
          <Option value="accepted">Accepted</Option>
          <Option value="witness_nomination">Witness Nomination</Option>
          <Option value="panel_formation">Panel Formation</Option>
          <Option value="mediation_in_progress">Mediation in Progress</Option>
          <Option value="resolved">Resolved</Option>
          <Option value="unresolved">Unresolved</Option>
          <Option value="cancelled">Cancelled</Option>
        </Select>
      </Modal>
    </div>
  );
};

export default CaseManagement;