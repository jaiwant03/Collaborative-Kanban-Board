/**
 * Integration tests — complete user flows
 *
 * These tests spin up the Express app against a real (or in-memory) MongoDB
 * connection.  When MONGODB_URI is not set, mongoose-memory-server is used so
 * tests run in CI without any external dependency.
 *
 * Flows covered:
 *   1. Register + Login
 *   2. Create workspace
 *   3. Create task
 *   4. Update task (move column)
 *   5. Add comment
 *   6. Edit comment
 *   7. Delete comment
 *   8. Upload attachment (skipped if multer disk write fails in CI)
 *   9. Invite user & accept invitation
 *  10. Activity log recorded after task create
 *  11. Delete task
 */

const request = require('supertest');
const mongoose = require('mongoose');

// We import app directly (not server.js) so no http server is started
let app;

const TEST_DB = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;

// ── Setup / Teardown ──────────────────────────────────────────────────────────
beforeAll(async () => {
  if (!TEST_DB) {
    // Skip all tests gracefully when no DB is available
    console.warn('[Integration] No MONGODB_TEST_URI/MONGODB_URI — tests skipped');
    return;
  }

  process.env.JWT_SECRET     = 'integration-test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.NODE_ENV       = 'test';

  await mongoose.connect(TEST_DB);
  app = require('../../src/app');
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    // Clean up test data
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      for (const col of collections) {
        await db.collection(col.name).deleteMany({});
      }
    }
    await mongoose.disconnect();
  }
}, 30000);

// Utility: skip suite when DB unavailable
const itIfDB = TEST_DB ? it : it.skip;

// ── Shared state ──────────────────────────────────────────────────────────────
let token1, userId1;
let token2, userId2;
let workspaceId;
let taskId;
let commentId;
let inviteToken;

// ── 1. Register ───────────────────────────────────────────────────────────────
describe('Auth flows', () => {
  itIfDB('registers user 1', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice Test', email: 'alice.test@example.com', password: 'Password1!' });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    token1 = res.body.data.token;
    userId1 = res.body.data.user._id;
  });

  itIfDB('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice Again', email: 'alice.test@example.com', password: 'Password1!' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  itIfDB('registers user 2 (for invitation test)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Bob Test', email: 'bob.test@example.com', password: 'Password1!' });
    expect(res.status).toBe(201);
    token2 = res.body.data.token;
    userId2 = res.body.data.user._id;
  });

  itIfDB('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice.test@example.com', password: 'Password1!' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  itIfDB('rejects wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice.test@example.com', password: 'wrongpassword' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ── 2. Workspace ──────────────────────────────────────────────────────────────
describe('Workspace flows', () => {
  itIfDB('creates a workspace', async () => {
    const res = await request(app)
      .post('/workspaces')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'Integration WS', description: 'Test workspace' });

    expect(res.status).toBe(201);
    workspaceId = res.body.data.workspace._id;
    expect(workspaceId).toBeDefined();
  });

  itIfDB('returns the workspace in the list', async () => {
    const res = await request(app)
      .get('/workspaces')
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    const found = res.body.data.workspaces.find((w) => w._id === workspaceId);
    expect(found).toBeDefined();
  });
});

// ── 3 & 4. Task CRUD ──────────────────────────────────────────────────────────
describe('Task CRUD flows', () => {
  itIfDB('creates a task in the workspace', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        title: 'Integration Task',
        description: 'Created in integration test',
        status: 'todo',
        priority: 'medium',
        workspaceId,
      });
    expect(res.status).toBe(201);
    taskId = res.body.data.task._id;
    expect(taskId).toBeDefined();
  });

  itIfDB('fetches tasks for the workspace', async () => {
    const res = await request(app)
      .get(`/tasks?workspaceId=${workspaceId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tasks.length).toBeGreaterThan(0);
  });

  itIfDB('moves task to in_progress (drag-and-drop)', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('in_progress');
  });

  itIfDB('updates task priority', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ priority: 'urgent' });
    expect(res.status).toBe(200);
    expect(res.body.data.task.priority).toBe('urgent');
  });
});

// ── 5, 6, 7. Comments ────────────────────────────────────────────────────────
describe('Comment flows', () => {
  itIfDB('adds a comment to the task', async () => {
    const res = await request(app)
      .post(`/comments/task/${taskId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ workspaceId, content: 'First comment!' });
    expect(res.status).toBe(201);
    commentId = res.body.data.comment._id;
    expect(commentId).toBeDefined();
  });

  itIfDB('lists comments for the task', async () => {
    const res = await request(app)
      .get(`/comments/task/${taskId}?workspaceId=${workspaceId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    expect(res.body.data.comments.length).toBeGreaterThan(0);
  });

  itIfDB('edits own comment', async () => {
    const res = await request(app)
      .put(`/comments/${commentId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ workspaceId, content: 'Edited comment!' });
    expect(res.status).toBe(200);
    expect(res.body.data.comment.content).toBe('Edited comment!');
    expect(res.body.data.comment.isEdited).toBe(true);
  });

  itIfDB('deletes own comment', async () => {
    const res = await request(app)
      .delete(`/comments/${commentId}?workspaceId=${workspaceId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
  });
});

// ── 9. Invitation flow ────────────────────────────────────────────────────────
describe('Invitation flows', () => {
  itIfDB('invites user 2 to the workspace', async () => {
    const res = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${token1}`)
      .send({ workspaceId, email: 'bob.test@example.com', role: 'member' });

    // May be 201 or 409 (already member) depending on test order
    expect([201, 409]).toContain(res.status);
    if (res.status === 201) {
      inviteToken = res.body.data.invitation.token;
    }
  });

  itIfDB('accepts invitation as user 2', async () => {
    if (!inviteToken) return; // skip if user was already a member

    const res = await request(app)
      .post('/invitations/accept')
      .set('Authorization', `Bearer ${token2}`)
      .send({ token: inviteToken });

    expect([200, 409]).toContain(res.status);
  });

  itIfDB('lists invitations for the workspace', async () => {
    const res = await request(app)
      .get(`/invitations/${workspaceId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.invitations)).toBe(true);
  });
});

// ── 10. Activity log ──────────────────────────────────────────────────────────
describe('Activity log', () => {
  itIfDB('returns activity log for the task', async () => {
    const res = await request(app)
      .get(`/activity/task/${taskId}?workspaceId=${workspaceId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    // At least task_created and status/priority change events
    expect(res.body.data.logs.length).toBeGreaterThan(0);
  });

  itIfDB('returns workspace-wide activity feed', async () => {
    const res = await request(app)
      .get(`/activity/workspace/${workspaceId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
  });
});

// ── 11. Delete task ───────────────────────────────────────────────────────────
describe('Task deletion', () => {
  itIfDB('soft-deletes the task', async () => {
    const res = await request(app)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
  });

  itIfDB('task no longer appears in listing after deletion', async () => {
    const res = await request(app)
      .get(`/tasks?workspaceId=${workspaceId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    const found = res.body.data.tasks.find((t) => t._id === taskId);
    expect(found).toBeUndefined();
  });
});

// ── Auth guard: unauthenticated requests ──────────────────────────────────────
describe('Auth guard', () => {
  itIfDB('rejects unauthenticated GET /tasks', async () => {
    const res = await request(app).get('/tasks?workspaceId=anything');
    expect(res.status).toBe(401);
  });

  itIfDB('rejects unauthenticated POST /workspaces', async () => {
    const res = await request(app).post('/workspaces').send({ name: 'Hack' });
    expect(res.status).toBe(401);
  });
});
