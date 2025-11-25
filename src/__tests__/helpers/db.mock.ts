const mockPrismaClient = {
  user: {
    // Mock all methods used in the service layer
    findUnique: jest.fn(),
    // Add other models and methods (create, update, findMany, etc.) as needed
  },
  // Mock the connection methods
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Export the mock client instance so it can be imported in test files
export const prismaMock = mockPrismaClient;
