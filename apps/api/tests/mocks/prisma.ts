import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create mock Prisma client
export const prismaMock = mockDeep<PrismaClient>();

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Mock the actual Prisma client
jest.mock('../src/utils/prisma', () => ({
  prisma: prismaMock,
}));
