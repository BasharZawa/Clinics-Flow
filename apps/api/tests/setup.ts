// Test setup and utilities
import { prismaMock } from './mocks/prisma';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Global test utilities
declare global {
  var prismaMock: typeof prismaMock;
}

(global as any).prismaMock = prismaMock;

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
