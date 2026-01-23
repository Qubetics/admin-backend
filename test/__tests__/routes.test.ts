const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const mockCreateController = () => {
  return jest.fn().mockImplementation(() => ({
    router: mockRouter,
  }));
};

jest.mock("express", () => {
  const actual = jest.requireActual("express");
  return {
    ...actual,
    Router: jest.fn(() => mockRouter),
  };
});

jest.mock("../../src/module/auth/auth.controller", () => ({
  __esModule: true,
  default: mockCreateController(),
}));

jest.mock("../../src/module/plan/plan.controller", () => ({
  __esModule: true,
  default: mockCreateController(),
}));

jest.mock("../../src/module/node/node.controller", () => ({
  __esModule: true,
  default: mockCreateController(),
}));


jest.mock("../../src/module/provider/provider.controller", () => ({
  __esModule: true,
  default: mockCreateController(),
}));

jest.mock("../../src/module/activity/activity.controller", () => ({
  __esModule: true,
  default: mockCreateController(),
}));

describe("registerRoutes", () => {
  let registerRoutes: any;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.isolateModules(() => {
      registerRoutes = require("../../src/routes").default;
    });
  });

  it("should register all routes and return a router", () => {
    const router = registerRoutes();

    expect(router).toBeDefined();
    expect(router).toBe(mockRouter);
    expect(router.use).toHaveBeenCalledWith("/status", expect.any(Function));
  });

  it("should register controller routes", () => {
    registerRoutes();

    expect(mockRouter.use).toHaveBeenCalledWith("/auth", mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith("/plans", mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith("/activity", mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith("/node", mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith("/provider", mockRouter);
  });

  it("should instantiate all controllers", () => {
    registerRoutes();
  });
});
