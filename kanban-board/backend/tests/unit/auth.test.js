/**
 * Unit tests — Authentication
 * Tests the authService functions and password hashing without hitting a DB.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../src/models/User');
jest.mock('../../src/config/database', () => jest.fn());
jest.mock('jsonwebtoken');

const User   = require('../../src/models/User');
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createError } = require('../../src/utils/errorHandler');

// ── Helpers ───────────────────────────────────────────────────────────────────
describe('createError utility', () => {
  it('creates an Error with the given message and statusCode', () => {
    const err = createError('Not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
  });

  it('defaults statusCode to 500', () => {
    const err = createError('oops');
    expect(err.statusCode).toBe(500);
  });
});

// ── asyncHandler ──────────────────────────────────────────────────────────────
describe('asyncHandler utility', () => {
  const { asyncHandler } = require('../../src/utils/errorHandler');

  it('calls next with error when async fn throws', async () => {
    const err  = new Error('boom');
    const fn   = asyncHandler(async () => { throw err; });
    const next = jest.fn();
    await fn({}, {}, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('does not call next when async fn resolves', async () => {
    const fn   = asyncHandler(async (_req, res) => { res.json({ ok: true }); });
    const next = jest.fn();
    const res  = { json: jest.fn() };
    await fn({}, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});

// ── Password hashing ──────────────────────────────────────────────────────────
describe('bcryptjs password hashing', () => {
  it('hashes a password and verifies it correctly', async () => {
    const plain  = 'SecurePass123!';
    const hashed = await bcrypt.hash(plain, 10);
    expect(hashed).not.toBe(plain);
    const match = await bcrypt.compare(plain, hashed);
    expect(match).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hashed = await bcrypt.hash('correct', 10);
    const match  = await bcrypt.compare('wrong', hashed);
    expect(match).toBe(false);
  });
});

// ── JWT generation ────────────────────────────────────────────────────────────
describe('generateToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET     = 'test-secret';
    process.env.JWT_EXPIRES_IN = '7d';
    jwt.sign.mockReturnValue('mock.token.string');
  });

  it('calls jwt.sign with user id and secret', () => {
    // generateToken is a default export
    const generateToken = require('../../src/utils/generateToken');
    const token = generateToken('user123');
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 'user123' },
      expect.any(String),
      expect.objectContaining({ expiresIn: expect.any(String) })
    );
    expect(token).toBe('mock.token.string');
  });
});
