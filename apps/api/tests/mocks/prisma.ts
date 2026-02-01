import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create mock Prisma client
export const prismaMock = mockDeep<PrismaClient>();

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Mock the actual Prisma client using module alias
jest.mock('@/utils/prisma', () => ({
  prisma: prismaMock,
}));
