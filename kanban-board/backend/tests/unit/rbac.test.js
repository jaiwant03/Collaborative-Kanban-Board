/**
 * Unit tests — RBAC middleware
 */

jest.mock('../../src/models/Workspace');

const Workspace = require('../../src/models/Workspace');
const { checkWorkspaceRole, canManageTask, roleRank, ROLE_HIERARCHY } = require('../../src/middleware/rbac');

// ── roleRank ──────────────────────────────────────────────────────────────────
describe('roleRank', () => {
  it('returns -1 for unknown role', () => {
    expect(roleRank('superadmin')).toBe(-1);
  });

  it('viewer has lower rank than admin', () => {
    expect(roleRank('viewer')).toBeLessThan(roleRank('admin'));
  });

  it('owner has highest rank', () => {
    const ownerRank = roleRank('owner');
    ROLE_HIERARCHY.forEach((r) => {
      expect(roleRank(r)).toBeLessThanOrEqual(ownerRank);
    });
  });
});

// ── canManageTask ─────────────────────────────────────────────────────────────
describe('canManageTask', () => {
  const userId  = 'user1';
  const task    = { createdBy: 'user1', assignee: 'user2' };
  const taskOther = { createdBy: 'other', assignee: 'other2' };

  it('admin can always manage', () => {
    expect(canManageTask('admin', taskOther, userId)).toBe(true);
  });

  it('owner can always manage', () => {
    expect(canManageTask('owner', taskOther, userId)).toBe(true);
  });

  it('manager can always manage', () => {
    expect(canManageTask('manager', taskOther, userId)).toBe(true);
  });

  it('member can manage own task (creator)', () => {
    expect(canManageTask('member', task, userId)).toBe(true);
  });

  it('member cannot manage task they did not create/are not assigned to', () => {
    expect(canManageTask('member', taskOther, userId)).toBe(false);
  });

  it('viewer cannot manage any task', () => {
    expect(canManageTask('viewer', task, userId)).toBe(false);
  });
});

// ── checkWorkspaceRole middleware ─────────────────────────────────────────────
describe('checkWorkspaceRole middleware', () => {
  const mockWorkspace = {
    _id: 'ws1',
    owner: 'owner1',
    members: [
      { user: { toString: () => 'user1' }, role: 'member' },
      { user: { toString: () => 'admin1' }, role: 'admin' },
    ],
  };

  beforeEach(() => {
    Workspace.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(mockWorkspace),
    });
  });

  it('allows admin to pass a manager-level check', async () => {
    const req  = { params: { workspaceId: 'ws1' }, user: { _id: { toString: () => 'admin1' } }, body: {}, query: {} };
    const next = jest.fn();
    await checkWorkspaceRole('manager')(req, {}, next);
    expect(next).toHaveBeenCalledWith(); // no error arg
  });

  it('rejects a member trying to do a manager-level action', async () => {
    const req  = { params: { workspaceId: 'ws1' }, user: { _id: { toString: () => 'user1' } }, body: {}, query: {} };
    const next = jest.fn();
    await checkWorkspaceRole('manager')(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });

  it('rejects a non-member with 403', async () => {
    const req  = { params: { workspaceId: 'ws1' }, user: { _id: { toString: () => 'stranger' } }, body: {}, query: {} };
    const next = jest.fn();
    await checkWorkspaceRole('member')(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('throws a dev-time error for an invalid minimumRole string', () => {
    expect(() => checkWorkspaceRole('godmode')).toThrow();
  });
});
