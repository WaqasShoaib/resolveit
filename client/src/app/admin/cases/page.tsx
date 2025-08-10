// /src/app/admin/cases/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { Select, Input, Button, Row, Col, Table, Modal, notification, Progress, Tooltip } from 'antd';
import { Edit, Plus, Users as UsersIcon, Gavel } from 'lucide-react';
import type { AdminUser } from '@/lib/api/admin';

const PANEL_ROLES = ['lawyer', 'scholar', 'community'] as const;
const { Option } = Select;

interface Case {
  _id: string;
  caseNumber: string;
  caseType: string;
  status: string;
  oppositeParty?: { name?: string; email?: string; phone?: string };
}

type WitnessInput = {
  name: string;
  email?: string;
  phone?: string;
  relation?: string;
  side: 'complainant' | 'opposite';
};

type PanelMemberInput = {
  userId: string;
  role: 'lawyer' | 'scholar' | 'community';
};

const CaseManagement: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Status update modal
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [status, setStatus] = useState<string>('');

  // Filters + polling
  const [filters, setFilters] = useState({
    status: '',
    caseType: '',
    priority: '',
    search: '',
    page: 1,
    limit: 10,
  });
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    fetchCases(filters);
  }, [filters]);

  useEffect(() => {
    const id = setInterval(() => fetchCases(filtersRef.current), 8000);
    return () => clearInterval(id);
  }, []);

  // ---- Witness/Panel UI state ----
  const [witnessModalOpen, setWitnessModalOpen] = useState(false);
  const [newWitnesses, setNewWitnesses] = useState<WitnessInput[]>([{ name: '', side: 'complainant' }]);

  const [panelModalOpen, setPanelModalOpen] = useState(false);
  const [panelMembers, setPanelMembers] = useState<PanelMemberInput[]>([
    { userId: '', role: 'lawyer' },
    { userId: '', role: 'scholar' },
    { userId: '', role: 'community' },
  ]);
  const [panelCandidates, setPanelCandidates] = useState<AdminUser[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Fetch cases with filters
  const fetchCases = async (params: any) => {
    setIsLoading(true);
    try {
      const response = await adminAPI.getAllCases(params);
      setCases(response.data.cases);
    } catch {
      notification.error({ message: 'Error', description: 'Failed to fetch cases' });
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Status update flow ----
  const validTransitions: Record<string, string[]> = {
    registered: ['under_review', 'awaiting_response', 'cancelled'],
    under_review: ['awaiting_response', 'accepted', 'cancelled'],
    awaiting_response: ['accepted', 'witness_nomination', 'cancelled'],
    accepted: ['witness_nomination', 'panel_formation', 'cancelled'],
    witness_nomination: ['panel_formation', 'cancelled'],
    panel_formation: ['mediation_in_progress', 'cancelled'],
    mediation_in_progress: ['resolved', 'unresolved', 'cancelled'],
    resolved: [],
    unresolved: [],
    cancelled: [],
  };

  const handleUpdateStatus = async () => {
    if (!selectedCase || !status) return;
    const allowed = validTransitions[selectedCase.status] || [];
    if (!allowed.includes(status)) {
      notification.error({
        message: 'Invalid Status Transition',
        description: `You cannot move from "${selectedCase.status}" to "${status}".`,
      });
      return;
    }
    try {
      await adminAPI.updateCaseStatus(selectedCase._id, { status, notes: '' });
      notification.success({ message: 'Success', description: `Case status updated to ${status}` });
      fetchCases(filters);
    } catch {
      notification.error({ message: 'Error', description: 'Failed to update case status' });
    } finally {
      setStatusModalVisible(false);
    }
  };

  const openStatusModal = (record: Case) => {
    setSelectedCase(record);
    setStatus(record.status);
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
  const missingContact = (r: Case) => {
    if (!r.oppositeParty) return false;
    return !(r.oppositeParty.email || r.oppositeParty.phone);
  };
  const handleNotify = async (record: Case) => {
    try {
      await adminAPI.notifyOppositeParty(record._id);
      notification.success({
        message: 'Invitation sent',
        description: 'Consent link created (check server logs or DB).',
      });
      fetchCases(filters);
    } catch {
      notification.error({ message: 'Failed', description: 'Could not send invitation' });
    }
  };

  // ---- Panel candidates (users with role panel_member) ----
  const loadCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const { data } = await adminAPI.getAllUsers({ role: 'panel_member', page: 1, limit: 100 });
      setPanelCandidates(data.users || []);
    } catch {
      notification.error({ message: 'Failed to load panel candidates' });
    } finally {
      setLoadingCandidates(false);
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

    // add this near other state
  const [creatingPanel, setCreatingPanel] = useState(false);

  // add this function above the return:
  const handleCreatePanel = async () => {
    console.log('[UI] createPanel onOk', {
      selectedCaseId: selectedCase?._id,
      panelMembers,
    });

    if (!selectedCase) {
      notification.error({ message: 'No case selected' });
      return;
    }

    // require all three
    const filled = panelMembers.every((m) => m.userId);
    if (!filled) {
      notification.error({ message: 'Pick all three members' });
      return;
    }

    // ensure all unique
    const ids = panelMembers.map((m) => m.userId);
    if (new Set(ids).size !== ids.length) {
      notification.error({ message: 'Each role must be a different person' });
      return;
    }

    try {
      setCreatingPanel(true);
      const res = await adminAPI.createPanel(selectedCase._id, panelMembers);
      console.log('[UI] createPanel response', res);
      notification.success({ message: 'Panel created' });
      setPanelModalOpen(false);
      fetchCases(filters);
    } catch (err: any) {
      console.error('[UI] createPanel error', err);
      notification.error({
        message: 'Failed to create panel',
        description: err?.response?.data?.message || 'Request failed',
      });
    } finally {
      setCreatingPanel(false);
    }
  };


  // ---- Actions column helpers ----
  const canAddWitnesses = (s: string) => ['accepted', 'witness_nomination'].includes(s);
  const canCreatePanel = (s: string) => ['witness_nomination', 'panel_formation'].includes(s);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Case Management</h1>

      {/* Filters */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
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

      {/* Table */}
      <Table
        columns={[
          { title: 'Case Number', dataIndex: 'caseNumber', key: 'caseNumber' },
          { title: 'Case Type', dataIndex: 'caseType', key: 'caseType' },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (text: string) => (
              <Progress percent={getProgressPercentage(text)} status="active" style={{ marginBottom: 16 }} />
            ),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Case) => {
              const notifyDisabled = !canNotify(record) || missingContact(record);
              const notifyReason = !canNotify(record)
                ? 'Allowed only from Registered / Under Review / Awaiting Response'
                : 'Opposite party contact is missing';
              const witnessesDisabled = !canAddWitnesses(record.status);
              const panelDisabled = !canCreatePanel(record.status);

              return (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button onClick={() => openStatusModal(record)} icon={<Edit size={16} />}>
                    Update
                  </Button>
                  <Tooltip title={notifyDisabled ? notifyReason : ''}>
                    <Button
                      type="primary"
                      disabled={notifyDisabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotify(record);
                      }}
                    >
                      Notify Opposite Party
                    </Button>
                  </Tooltip>
                  <Tooltip title={witnessesDisabled ? 'Enable after Accepted' : ''}>
                    <Button
                      icon={<UsersIcon size={16} />}
                      disabled={witnessesDisabled}
                      onClick={() => {
                        setSelectedCase(record);
                        setNewWitnesses([{ name: '', side: 'complainant' }]);
                        setWitnessModalOpen(true);
                      }}
                    >
                      Add Witnesses
                    </Button>
                  </Tooltip>
                  <Tooltip title={panelDisabled ? 'Enable after Witness Nomination' : ''}>
                    <Button
                      icon={<Gavel size={16} />}
                      disabled={panelDisabled}
                      onClick={async () => {
                        setSelectedCase(record);
                        await loadCandidates();
                        setPanelMembers([
                          { userId: '', role: 'lawyer' },
                          { userId: '', role: 'scholar' },
                          { userId: '', role: 'community' },
                        ]);
                        setPanelModalOpen(true);
                      }}
                    >
                      Create Panel
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
        <Select value={status} onChange={(v) => setStatus(v as string)} style={{ width: '100%' }}>
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

      {/* Add Witnesses Modal */}
      <Modal
        title="Add Witnesses"
        open={witnessModalOpen}
        onOk={async () => {
          if (!selectedCase) return;
          const valid = newWitnesses.every((w) => w.name && w.side);
          if (!valid) {
            notification.error({ message: 'Name and side are required for each witness' });
            return;
          }
          try {
            await adminAPI.addWitnesses(selectedCase._id, newWitnesses);
            notification.success({ message: 'Witnesses added' });
            setWitnessModalOpen(false);
            fetchCases(filters);
          } catch {
            notification.error({ message: 'Failed to add witnesses' });
          }
        }}
        onCancel={() => setWitnessModalOpen(false)}
      >
        {newWitnesses.map((w, idx) => (
          <Row key={idx} gutter={8} style={{ marginBottom: 8 }}>
            <Col span={8}>
              <Input
                placeholder="Name"
                value={w.name}
                onChange={(e) =>
                  setNewWitnesses((prev) => prev.map((it, i) => (i === idx ? { ...it, name: e.target.value } : it)))
                }
              />
            </Col>
            <Col span={6}>
              <Select
                value={w.side}
                onChange={(v) =>
                  setNewWitnesses((prev) => prev.map((it, i) => (i === idx ? { ...it, side: v as any } : it)))
                }
                style={{ width: '100%' }}
                options={[
                  { label: 'Complainant', value: 'complainant' },
                  { label: 'Opposite', value: 'opposite' },
                ]}
              />
            </Col>
            <Col span={10}>
              <Input
                placeholder="Email (optional)"
                value={w.email || ''}
                onChange={(e) =>
                  setNewWitnesses((prev) => prev.map((it, i) => (i === idx ? { ...it, email: e.target.value } : it)))
                }
              />
            </Col>
          </Row>
        ))}
        <Button icon={<Plus size={16} />} onClick={() => setNewWitnesses((p) => [...p, { name: '', side: 'complainant' }])}>
          Add Row
        </Button>
      </Modal>

        <Modal
    title="Create Panel"
    open={panelModalOpen}
    onOk={handleCreatePanel}
    okButtonProps={{ loading: creatingPanel }}
    onCancel={() => setPanelModalOpen(false)}
  >
    {PANEL_ROLES.map((role, index) => (
      <div key={role} style={{ marginBottom: 12 }}>
        <div className="text-sm mb-1 capitalize">{role}</div>
        <Select
          loading={loadingCandidates}
          value={panelMembers[index]?.userId || ''}
          onOpenChange={(open) => { if (open && panelCandidates.length === 0) loadCandidates(); }}
          onFocus={() => { if (panelCandidates.length === 0) loadCandidates(); }}
          getPopupContainer={(trigger) => (trigger?.parentElement as HTMLElement) || document.body}
          onChange={(val) => {
            const r = role as PanelMemberInput['role'];
            setPanelMembers(prev => prev.map((m, i) => (i === index ? { userId: val as string, role: r } : m)));
          }}
          style={{ width: '100%' }}
          placeholder={`Select ${role}`}
          notFoundContent="No panel members found. Go to Admin → Users and set role to 'panel_member'."
          options={panelCandidates.map((u) => ({ label: `${u.name} (${u.email})`, value: u._id }))}
        />
      </div>
    ))}
  </Modal>

    </div>
  );
};

export default CaseManagement;
