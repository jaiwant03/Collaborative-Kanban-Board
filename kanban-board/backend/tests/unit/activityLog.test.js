/**
 * Unit tests — activityLogService
 */

jest.mock('../../src/models/ActivityLog');
jest.mock('../../src/services/workspaceService');

const ActivityLog      = require('../../src/models/ActivityLog');
const workspaceService = require('../../src/services/workspaceService');
const activityService  = require('../../src/services/activityLogService');

workspaceService.assertWorkspaceMember.mockResolvedValue({});

// ── logActivity ───────────────────────────────────────────────────────────────
describe('logActivity', () => {
  it('creates an activity log entry', async () => {
    ActivityLog.create = jest.fn().mockResolvedValue({ _id: 'log1' });

    await activityService.logActivity({
      workspaceId: 'ws1',
      taskId: 'task1',
      userId: 'user1',
      action: 'task_updated',
      description: 'Changed status',
    });

    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: 'ws1',
        action: 'task_updated',
      })
    );
  });

  it('does not throw when ActivityLog.create fails', async () => {
    ActivityLog.create = jest.fn().mockRejectedValue(new Error('DB error'));
    // Should not throw — logging is best-effort
    await expect(
      activityService.logActivity({
        workspaceId: 'ws1', taskId: 'task1', userId: 'u1', action: 'task_created',
      })
    ).resolves.toBeUndefined();
  });
});

// ── getTaskActivity ───────────────────────────────────────────────────────────
describe('getTaskActivity', () => {
  it('returns logs and pagination', async () => {
    const mockLogs = [{ _id: 'l1', action: 'task_created' }];

    ActivityLog.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      skip:     jest.fn().mockReturnThis(),
      limit:    jest.fn().mockResolvedValue(mockLogs),
    });
    ActivityLog.countDocuments = jest.fn().mockResolvedValue(1);

    const result = await activityService.getTaskActivity({
      taskId: 'task1', workspaceId: 'ws1', userId: 'user1',
    });

    expect(result.logs).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });
});
