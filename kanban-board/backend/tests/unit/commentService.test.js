/**
 * Unit tests — commentService
 */

jest.mock('../../src/models/Comment');
jest.mock('../../src/models/Task');
jest.mock('../../src/services/workspaceService');
jest.mock('../../src/services/activityLogService');

const Comment          = require('../../src/models/Comment');
const Task             = require('../../src/models/Task');
const workspaceService = require('../../src/services/workspaceService');
const commentService   = require('../../src/services/commentService');

workspaceService.assertWorkspaceMember.mockResolvedValue({});

const makeTask = () => ({
  _id: 'task1', title: 'A task', workspace: 'ws1', isArchived: false,
});

const makeComment = (override = {}) => ({
  _id: 'c1',
  task: 'task1',
  workspace: 'ws1',
  author: { _id: 'user1', toString: () => 'user1' },
  content: 'Hello world',
  isDeleted: false,
  isEdited: false,
  editedAt: null,
  save: jest.fn().mockResolvedValue(true),
  populate: jest.fn().mockReturnThis(),
  ...override,
});

// ── addComment ────────────────────────────────────────────────────────────────
describe('commentService.addComment', () => {
  it('creates a comment and returns it populated', async () => {
    Task.findOne = jest.fn().mockResolvedValue(makeTask());
    const mock = makeComment();
    mock.populate.mockResolvedValue(mock);
    Comment.create = jest.fn().mockResolvedValue(mock);

    const result = await commentService.addComment({
      taskId: 'task1', workspaceId: 'ws1', userId: 'user1', content: 'Hello world',
    });

    expect(Comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Hello world', task: 'task1' })
    );
    expect(result).toBeDefined();
  });
});

// ── editComment ───────────────────────────────────────────────────────────────
describe('commentService.editComment', () => {
  it('edits own comment', async () => {
    const mock = makeComment();
    mock.populate.mockResolvedValue(mock);
    Comment.findOne = jest.fn().mockResolvedValue(mock);

    const result = await commentService.editComment({
      commentId: 'c1', workspaceId: 'ws1', userId: 'user1', content: 'Updated!',
    });

    expect(mock.content).toBe('Updated!');
    expect(mock.isEdited).toBe(true);
    expect(mock.save).toHaveBeenCalled();
  });

  it('throws 403 when a different user tries to edit', async () => {
    const mock = makeComment();
    Comment.findOne = jest.fn().mockResolvedValue(mock);

    await expect(
      commentService.editComment({
        commentId: 'c1', workspaceId: 'ws1', userId: 'other', content: 'Hack!',
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── deleteComment ─────────────────────────────────────────────────────────────
describe('commentService.deleteComment', () => {
  it('soft-deletes own comment', async () => {
    const mock = makeComment();
    Comment.findOne = jest.fn().mockResolvedValue(mock);

    await commentService.deleteComment({
      commentId: 'c1', workspaceId: 'ws1', userId: 'user1', userRole: 'member',
    });

    expect(mock.isDeleted).toBe(true);
    expect(mock.save).toHaveBeenCalled();
  });

  it('allows admin to delete another user\'s comment', async () => {
    const mock = makeComment();
    Comment.findOne = jest.fn().mockResolvedValue(mock);

    await commentService.deleteComment({
      commentId: 'c1', workspaceId: 'ws1', userId: 'admin1', userRole: 'admin',
    });

    expect(mock.isDeleted).toBe(true);
  });

  it('throws 403 when a member tries to delete someone else\'s comment', async () => {
    const mock = makeComment();
    Comment.findOne = jest.fn().mockResolvedValue(mock);

    await expect(
      commentService.deleteComment({
        commentId: 'c1', workspaceId: 'ws1', userId: 'other', userRole: 'member',
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
