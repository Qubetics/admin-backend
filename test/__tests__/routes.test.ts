import { Router } from 'express';

// Define mock router to be used in tests
// Must start with 'mock' to be used in jest.mock factory
const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Helper to create a mock controller class
// Must start with 'mock' to be used in jest.mock factory
const mockCreateController = () => {
  return jest.fn().mockImplementation(() => ({
    router: mockRouter,
  }));
};

// Mock Express
jest.mock('express', () => {
  const actual = jest.requireActual('express');
  return {
    ...actual,
    Router: jest.fn(() => mockRouter),
  };
});

// Mock all controllers
jest.mock('../../src/module/auth/auth.controller', () => ({
  __esModule: true,
  default: mockCreateController(),
}));

jest.mock('../../src/module/plan/plan.controller', () => ({
  __esModule: true,
  default: mockCreateController(),
}));

jest.mock('../../src/module/node/node.controller', () => ({
  __esModule: true,
  default: mockCreateController(),
}));

jest.mock('../../src/module/mail/mail.controller', () => ({
  __esModule: true,
  default: mockCreateController(),
}));

jest.mock('../../src/module/provider/provider.controller', () => ({
  __esModule: true,
  default: mockCreateController(),
}));

jest.mock('../../src/module/activity/activity.controller', () => ({
  __esModule: true,
  default: mockCreateController(),
}));

describe('registerRoutes', () => {
  let registerRoutes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Isolate modules to ensure mocks are used and factory runs after variables are defined
    jest.isolateModules(() => {
        registerRoutes = require('../../src/routes').default;
    });
  });

  it('should register all routes and return a router', () => {
    const router = registerRoutes();

    // Verify router is returned
    expect(router).toBeDefined();
    expect(router).toBe(mockRouter);
    expect(router.use).toHaveBeenCalledWith('/status', expect.any(Function));
  });

  it('should register controller routes', () => {
    registerRoutes();

    // Verify all controller routes are registered
    expect(mockRouter.use).toHaveBeenCalledWith('/auth', mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith('/plans', mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith('/activity', mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith('/node', mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith('', mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith('/provider', mockRouter);
  });

  it('should instantiate all controllers', () => {
    registerRoutes();
    // If code runs without error and registers routes, controllers were instantiated.
  });
});