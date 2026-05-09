'use strict';

// ── Mock external dependencies BEFORE requiring the app ──────────────────────
// jest.mock() calls are hoisted to the top of the file by Babel/Jest transform,
// so these mocks are in place before any require() below executes.

jest.mock('../backend/config/mailer', () => ({
  createTransporter: jest.fn().mockResolvedValue(null),
  getTransporter: jest.fn().mockReturnValue(null)
}));

jest.mock('../backend/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock Sequelize models entirely so no database connection is ever attempted.
// User.scope('withPassword').findOne() returns null by default (no user found).
jest.mock('../backend/models', () => {
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined)
  };
  return {
    User: {
      scope: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        findByPk: jest.fn().mockResolvedValue(null)
      }),
      create: jest.fn().mockResolvedValue({
        id: 42,
        full_name: 'Test Student',
        registration_number: 'T22-03-99999',
        email: 'test@student.udom.ac.tz',
        role: 'student'
      })
    },
    FacialImage: {
      create: jest.fn().mockResolvedValue({})
    },
    sequelize: {
      transaction: jest.fn().mockResolvedValue(mockTransaction)
    }
  };
});

// ── Load app and helpers ──────────────────────────────────────────────────────
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../backend/server');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  test('returns 200 with service name', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('proctoring-backend');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('POST /api/auth/register — input validation', () => {
  test('rejects request with no name field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ registration_number: 'T22-03-99999', password: 'SecurePass1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/name/i);
  });

  test('rejects password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice Tester', registration_number: 'T22-03-99999', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/8 characters/i);
  });

  test('rejects invalid email when email field is provided', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Tester',
        registration_number: 'T22-03-99999',
        password: 'SecurePass1',
        email: 'not-an-email'
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/email/i);
  });
});

describe('POST /api/auth/login — input validation', () => {
  test('rejects request with neither registration_number nor email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'anypassword' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/registration number/i);
  });

  test('returns 401 INVALID_CREDENTIALS when user does not exist', async () => {
    // Default mock: User.scope().findOne() → null (user not found)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ registration_number: 'T22-03-GHOST', password: 'somepassword' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('Protected routes — authentication middleware', () => {
  test('GET /api/exams returns 401 when no Authorization header', async () => {
    const res = await request(app).get('/api/exams');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('GET /api/test-auth returns 401 for a malformed token', async () => {
    const res = await request(app)
      .get('/api/test-auth')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('GET /api/test-auth returns 200 for a valid JWT', async () => {
    const token = jwt.sign(
      { user_id: 1, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/test-auth')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.user_id).toBe(1);
    expect(res.body.user.role).toBe('student');
  });
});

describe('404 handler', () => {
  test('unknown route returns 404 with NOT_FOUND code', async () => {
    const res = await request(app).get('/api/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
