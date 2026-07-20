/**
 * Unit tests — taskService CRUD
 * Mocks mongoose models and socket so no real DB connection is required.
 */

jest.mock('../../src/models/Task');
jest.mock('../../src/services/workspaceService');
jest.mock('../../src/services/activityLogService');
jest.mock('../../src/config/socket', () => ({
  getIo: () => ({ to: () => ({ emit: jest.fn() }) }),
}));

const Task              = require('../../src/models/Task');
const workspaceService  = require('../../src/services/workspaceService');
const taskService       = require('../../src/services/taskService');

// Ensure workspace membership always passes by default
workspaceService.assertWorkspaceMember.mockResolvedValue({ _id: 'ws1' });

// ── Helper: create a chainable mock ──────────────────────────────────────────
const makeTaskMock = (fields = {}) => {
  const task = {
    _id: 'task1',
    title: 'Test task',
    status: 'todo',
    priority: 'medium',
    workspace: 'ws1',
    isArchived: false,
    labels: [],
    ...fields,
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockReturnThis(),
  };
  // Make populate() chain-friendly
  task.populate.mockImplementation(() => Promise.resolve(task));
  return task;
};

// ── createTask ────────────────────────────────────────────────────────────────
describe('taskService.createTask', () => {
  it('creates and returns a populated task', async () => {
    const mockTask = makeTaskMock();
    Task.create = jest.fn().mockResolvedValue(mockTask);

    const result = await taskService.createTask({
      data: { workspaceId: 'ws1', title: 'Test task' },
      userId: 'user1',
    });

    expect(Task.create).toHaveBeenCalledWith(expect.objectContaining({ workspace: 'ws1' }));
    expect(result).toBeDefined();
  });
});

// ── updateTask ────────────────────────────────────────────────────────────────
describe('taskService.updateTask', () => {
  it('updates allowed fields and saves', async () => {
    const mockTask = makeTaskMock();
    Task.findById = jest.fn().mockResolvedValue(mockTask);

    await taskService.updateTask({
      taskId: 'task1',
      data: { status: 'in_progress', priority: 'high' },
      userId: 'user1',
    });

    expect(mockTask.status).toBe('in_progress');
    expect(mockTask.priority).toBe('high');
    expect(mockTask.save).toHaveBeenCalled();
  });

  it('throws 404 when task is not found', async () => {
    Task.findById = jest.fn().mockResolvedValue(null);
    await expect(
      taskService.updateTask({ taskId: 'missing', data: {}, userId: 'user1' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 when task is archived', async () => {
    Task.findById = jest.fn().mockResolvedValue(makeTaskMock({ isArchived: true }));
    await expect(
      taskService.updateTask({ taskId: 'task1', data: {}, userId: 'user1' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── deleteTask ────────────────────────────────────────────────────────────────
describe('taskService.deleteTask', () => {
  it('archives the task (soft delete)', async () => {
    const mockTask = makeTaskMock();
    Task.findById = jest.fn().mockResolvedValue(mockTask);

    const result = await taskService.deleteTask({ taskId: 'task1', userId: 'user1' });
    expect(mockTask.isArchived).toBe(true);
    expect(mockTask.save).toHaveBeenCalled();
    expect(result.message).toMatch(/deleted/i);
  });
});
