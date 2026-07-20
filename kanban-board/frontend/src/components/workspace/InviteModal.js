import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import invitationService from '../../services/invitationService';
import workspaceService from '../../services/workspaceService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ROLE_OPTIONS = [
  { value: 'admin',   label: 'Admin',   description: 'Full access' },
  { value: 'manager', label: 'Manager', description: 'Manage tasks & invite' },
  { value: 'member',  label: 'Member',  description: 'Create & edit assigned tasks' },
  { value: 'viewer',  label: 'Viewer',  description: 'Read-only' },
];

const STATUS_COLORS = {
  pending:   { bg: '#EDE9FE', color: '#5B21B6' },
  accepted:  { bg: '#D1FAE5', color: '#065F46' },
  expired:   { bg: '#F1F5F9', color: '#475569' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B' },
};

const ROLE_BADGE_COLORS = {
  owner:   { bg: '#FEF3C7', color: '#92400E' },
  admin:   { bg: '#DBEAFE', color: '#1E40AF' },
  manager: { bg: '#EDE9FE', color: '#5B21B6' },
  member:  { bg: '#D1FAE5', color: '#065F46' },
  viewer:  { bg: '#F1F5F9', color: '#475569' },
};

function InviteModal({ isOpen, onClose }) {
  const { activeWorkspace }              = useWorkspace();
  const { user }                         = useAuth();
  const { toast }                        = useToast();
  const workspaceId                      = activeWorkspace?._id;
  const isOwner                          = activeWorkspace?.owner?._id === user?._id
                                        || activeWorkspace?.owner === user?._id;

  // Tab state: 'invite' | 'members'
  const [activeTab, setActiveTab] = useState('invite');

  // Invite form state
  const [email,      setEmail]      = useState('');
  const [role,       setRole]       = useState('member');
  const [sending,    setSending]    = useState(false);
  const [emailError, setEmailError] = useState('');

  // Invitations list state
  const [invitations, setInvitations] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  // Members list state
  const [members,        setMembers]        = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [updatingRole,   setUpdatingRole]   = useState(null); // memberId being updated

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchInvitations = useCallback(async () => {
    if (!workspaceId) return;
    setListLoading(true);
    try {
      const res = await invitationService.listInvitations(workspaceId);
      setInvitations(res.data.invitations || []);
    } catch (_) {}
    finally { setListLoading(false); }
  }, [workspaceId]);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;
    setMembersLoading(true);
    try {
      const res = await workspaceService.getMembers(workspaceId);
      setMembers(res.data.members || []);
    } catch (_) {}
    finally { setMembersLoading(false); }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
      fetchMembers();
    }
  }, [isOpen, fetchInvitations, fetchMembers]);

  // ── Invite form handlers ─────────────────────────────────────────────────────

  const handleSend = async (e) => {
    e.preventDefault();
    setEmailError('');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const res = await invitationService.inviteUser(workspaceId, email.trim(), role);
      setInvitations((prev) => [res.data.invitation, ...prev]);
      setEmail('');
      toast.success('Invitation sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation.');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (id) => {
    try {
      await invitationService.resendInvitation(id, workspaceId);
      toast.success('Invitation resent.');
      fetchInvitations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend.');
    }
  };

  const handleCancel = async (id) => {
    try {
      await invitationService.cancelInvitation(id, workspaceId);
      setInvitations((prev) =>
        prev.map((inv) => inv._id === id ? { ...inv, status: 'cancelled' } : inv)
      );
      toast.success('Invitation cancelled.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel.');
    }
  };

  // ── Member role change handler ───────────────────────────────────────────────

  const handleRoleChange = async (memberId, newRole) => {
    setUpdatingRole(memberId);
    try {
      const res = await workspaceService.updateMemberRole(workspaceId, memberId, newRole);
      setMembers(res.data.members || []);
      toast.success('Role updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setUpdatingRole(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite & Members" size="large">

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color, #e2e8f0)' }}>
        {['invite', 'members'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary, #7C3AED)' : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === tab ? 'var(--color-primary, #7C3AED)' : 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'color 0.15s',
            }}
          >
            {tab === 'invite' ? 'Send Invitations' : `Members (${members.length})`}
          </button>
        ))}
      </div>

      {/* ── INVITE TAB ── */}
      {activeTab === 'invite' && (
        <>
          <form onSubmit={handleSend} noValidate>
            <div className="form-row">
              <Input
                id="invite-email"
                type="email"
                label="Email address"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                error={emailError}
                required
              />
              <div className="form-group">
                <label htmlFor="invite-role" className="form-label">Role</label>
                <select
                  id="invite-role"
                  className="form-input form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" variant="primary" isLoading={sending} className="btn--full">
              Send Invitation
            </Button>
          </form>

          <hr className="divider" style={{ margin: '1.5rem 0' }} />

          <h4 style={{ marginBottom: '0.75rem', fontFamily: 'Poppins, sans-serif', fontSize: '0.9rem' }}>
            Sent Invitations
          </h4>

          {listLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Loading…</p>
          ) : invitations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>No invitations sent yet.</p>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {invitations.map((inv) => {
                const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.expired;
                return (
                  <li key={inv._id} className="invitation-item">
                    <div className="invitation-item__info">
                      <span className="invitation-item__email">{inv.email}</span>
                      <span className="invitation-item__role">{inv.role}</span>
                      <span
                        className="invitation-item__status"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {inv.status}
                      </span>
                    </div>
                    {inv.status === 'pending' && (
                      <div className="invitation-item__actions">
                        <button
                          className="invitation-item__btn"
                          onClick={() => handleResend(inv._id)}
                          title="Resend"
                        >
                          🔄
                        </button>
                        <button
                          className="invitation-item__btn invitation-item__btn--danger"
                          onClick={() => handleCancel(inv._id)}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ── MEMBERS TAB ── */}
      {activeTab === 'members' && (
        <>
          {membersLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Loading…</p>
          ) : members.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>No members found.</p>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {members.map((m) => {
                const rc   = ROLE_BADGE_COLORS[m.role] || ROLE_BADGE_COLORS.member;
                const isMe = m._id === user?._id;
                const canChangeRole = isOwner && m.role !== 'owner';

                return (
                  <li
                    key={m._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background: 'var(--bg-subtle, #f8fafc)',
                      border: '1px solid var(--border-color, #e2e8f0)',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      aria-hidden="true"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--color-primary, #7C3AED)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {(m.name || m.email).charAt(0).toUpperCase()}
                    </div>

                    {/* Name + email */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary, #1e293b)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {m.name || '—'}
                        {isMe && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', fontWeight: 400 }}>(you)</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.email}
                      </div>
                    </div>

                    {/* Role — dropdown for owner to change, badge otherwise */}
                    {canChangeRole ? (
                      <select
                        value={m.role}
                        disabled={updatingRole === m._id}
                        onChange={(e) => handleRoleChange(m._id, e.target.value)}
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color, #e2e8f0)',
                          background: rc.bg,
                          color: rc.color,
                          cursor: 'pointer',
                          flexShrink: 0,
                          opacity: updatingRole === m._id ? 0.6 : 1,
                        }}
                        aria-label={`Change role for ${m.name || m.email}`}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          background: rc.bg,
                          color: rc.color,
                          flexShrink: 0,
                          textTransform: 'capitalize',
                        }}
                      >
                        {m.role}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

export default InviteModal;
