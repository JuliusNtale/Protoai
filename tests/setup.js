'use strict';

// Set all env vars before any module is loaded.
// server.js reads these at require-time via process.env.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jest-minimum-32-chars-ok';
process.env.JWT_EXPIRY = '1h';
process.env.PORT = '0';           // OS picks a free port — avoids conflicts
process.env.EMAIL_MODE = 'test';
process.env.STORAGE_PATH = '/tmp/proctoring-test-storage';
