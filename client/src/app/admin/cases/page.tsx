// /src/app/admin/cases/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { Select, Input, Button, Row, Col, Table, Modal, notification, Progress, Tooltip } from 'antd';
import { Edit } from 'lucide-react';

const { Option } = Select;

interface Case {
  _id: string;
  caseNumber: string;
  caseType: string;
  status: string;
  oppositeParty?: { name?: string; email?: string; phone?: string }; // optional in list payload
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

  // keep latest filters for polling loop
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    fetchCases(filters);
  }, [filters]);

  // Polling loop: refresh list every 8s (meets “real-time via polling”)
  useEffect(() => {
    const id = setInterval(() => {
      fetchCases(filtersRef.current);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // Fetch cases with filters
  const fetchCases = async (params: any) => {
    setIsLoading(true);
    try {
      const response = await adminAPI.getAllCases(params);
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

  // ---- Status update flow ----
  const validTransitions: { [key: string]: string[] } = {
    registered: ['under_review', 'awaiting_response', 'cancelled'],
    under_review: ['awaiting_response', 'accepted', 'cancelled'],
    awaiting_response: ['accepted', 'witness_nomination', 'cancelled'],
    accepted: ['panel_formation', 'cancelled'],
    witness_nomination: ['panel_formation', 'cancelled'],
    panel_formation: ['mediation_in_progress', 'cancelled'],
    mediation_in_progress: ['resolved', 'unresolved', 'cancelled'],
    resolved: [],
    unresolved: [],
    cancelled: [],
  };

  const handleUpdateStatus = async () => {
    if (!selectedCase || !status) return;

    const allowedStatuses = validTransitions[selectedCase.status] || [];

    if (!allowedStatuses.includes(status)) {
      notification.error({
        message: 'Invalid Status Transition',
        description: `You cannot move from "${selectedCase.status}" to "${status}".`,
      });
      return;
    }

    try {
      await adminAPI.updateCaseStatus(selectedCase._id, { status, notes: '' });
      notification.success({
        message: 'Success',
        description: `Case status updated to ${status}`,
      });
      // refresh immediately after update (don’t wait for next poll)
      fetchCases(filters);
    } catch {
      notification.error({
        message: 'Error',
        description: 'Failed to update case status',
      });
    } finally {
      setStatusModalVisible(false);
    }
  };

  const openStatusModal = (record: Case) => {
    setSelectedCase(record);
    setStatus(record.status); // Set current status
    setStatusModalVisible(true);
  };

  const getProgressPercentage = (s: string) => {
    const order = [
      'registered',
      'under_review',
      'awaiting_response',
      'accepted',
      'witness_nomination',
      'panel_formation',
      'mediation_in_progress',
      'resolved',
      'unresolved',
    ];
    const idx = order.indexOf(s);
    return ((idx + 1) / order.length) * 100;
  };

  // ---- Notify Opposite Party ----
  const canNotify = (r: Case) => {
    const s = (r.status || '').toLowerCase();
    return ['registered', 'under_review', 'awaiting_response'].includes(s);
  };

  // Only block when we KNOW both are missing; if not present in list payload, allow
  const missingContact = (r: Case) => {
    if (!r.oppositeParty) return false;
    return !(r.oppositeParty.email || r.oppositeParty.phone);
  };

  const handleNotify = async (record: Case) => {
    try {
      await adminAPI.notifyOppositeParty(record._id);
      notification.success({
        message: 'Invitation sent',
        description: 'Consent link was generated (see server logs).',
      });
      fetchCases(filters); // move to awaiting_response if applicable
    } catch {
      notification.error({ message: 'Failed', description: 'Could not send invitation' });
    }
  };

  // Filters
  const handleFilterChange = (value: string, key: string) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value, page: 1 };
      fetchCases(updated);
      return updated;
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setFilters((prev) => {
      const updated = { ...prev, search: searchValue, page: 1 };
      fetchCases(updated);
      return updated;
    });
  };

  const handlePaginationChange = (page: number) => {
    setFilters((prev) => {
      const updated = { ...prev, page };
      fetchCases(updated);
      return updated;
    });
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
            allowClear
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
            allowClear
          >
            <Option value="criminal">Criminal</Option>
            <Option value="civil">Civil</Option>
            <Option value="family">Family</Option>
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
        columns={[
          { title: 'Case Number', dataIndex: 'caseNumber', key: 'caseNumber' },
          { title: 'Case Type', dataIndex: 'caseType', key: 'caseType' },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (text: string) => (
              <Progress percent={getProgressPercentage(text)} status="active" style={{ marginBottom: '16px' }} />
            ),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Case) => {
              const disabled = !canNotify(record) || missingContact(record);
              const reason = !canNotify(record)
                ? 'Allowed only from Registered / Under Review / Awaiting Response'
                : 'Opposite party contact is missing';

              return (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={() => openStatusModal(record)} icon={<Edit size={16} />} type="default">
                    Update Status
                  </Button>
                  <Tooltip title={disabled ? reason : ''}>
                    <Button
                      type="primary"
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotify(record);
                      }}
                    >
                      Notify Opposite Party
                    </Button>
                  </Tooltip>
                </div>
              );
            },
          },
        ]}
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

      {/* Status Update Modal */}
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
