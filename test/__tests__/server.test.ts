// Define mocks before imports to avoid hoisting issues affecting variable access
const mockInit = jest.fn();
const mockExpressSet = jest.fn();
const mockServerOn = jest.fn();
const mockServerListen = jest.fn();
const mockServerAddress = jest.fn(() => ({ port: 3000 }));

const loggerInfoMock = jest.fn();
const loggerErrorMock = jest.fn();
const logMock = jest.fn();

jest.mock("../../src/environments/environment", () => {
  return {
    __esModule: true,
    default: class {
      env = "test";
      port = 3000;
      databaseUrl = "test-db-url";
      redisHost = "localhost";
      redisPort = "6379";
      redisExpiry = 3600;
      evmHost = "http://test-evm";
      secretKey = "test-secret";
      sendgrid_key = "test-sendgrid-key";
      service_email = "test@example.com";
      gitbook_url = "https://test.gitbook.com";
    },
  };
});

jest.mock("../../src/global", () => ({
  setGlobalEnvironment: jest.fn(),
}));

jest.mock("../../src/lib/logger", () => ({
  __esModule: true,
  default: {
    info: loggerInfoMock,
    error: loggerErrorMock,
  },
}));

jest.mock("../../src/Utility/common", () => ({
  __esModule: true,
  log: logMock,
}));

jest.mock("../../src/App", () => {
  return {
    __esModule: true,
    default: class MockApp {
      public express = {
        set: mockExpressSet,
      } as any;

      public httpServer = {
        on: mockServerOn,
        listen: mockServerListen,
        address: mockServerAddress,
      } as any;

      public init = mockInit;
    },
  };
});

describe("server bootstrap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("initializes app, sets port, registers listeners and starts server on success", async () => {
    mockInit.mockResolvedValue(undefined);

    // Re-import to trigger execution
    await import("../../src/server");

    expect(mockExpressSet).toHaveBeenCalledWith("port", 3000);
    expect(mockServerOn).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mockServerOn).toHaveBeenCalledWith("listening", expect.any(Function));
    expect(mockServerListen).toHaveBeenCalledWith(3000);
  });

  it("logs errors when app.init rejects", async () => {
    const error = new Error("init failed");
    mockInit.mockRejectedValue(error);

    await import("../../src/server");

    // Wait for promise rejection handling
    await new Promise((resolve) => setImmediate(resolve));

    expect(loggerInfoMock).toHaveBeenCalledWith("app.init error");
    expect(loggerErrorMock).toHaveBeenCalledWith(error.name);
    expect(loggerErrorMock).toHaveBeenCalledWith(error.message);
    expect(loggerErrorMock).toHaveBeenCalledWith(error.stack);
  });

  it("logs unhandled promise rejections via process handler", async () => {
    mockInit.mockResolvedValue(undefined);
    await import("../../src/server");

    const reason = new Error("unhandled");
    (process as any).emit("unhandledRejection", reason);

    expect(loggerErrorMock).toHaveBeenCalledWith("Unhandled Promise Rejection: reason:", reason.message);
    expect(loggerErrorMock).toHaveBeenCalledWith(reason.stack);
  });

  it("serverListening logs the address", async () => {
    mockInit.mockResolvedValue(undefined);
    await import("../../src/server");

    // Get the listening callback passed to server.on
    const listeningCallback = mockServerOn.mock.calls.find((call) => call[0] === "listening")[1];

    expect(listeningCallback).toBeDefined();

    // Execute the callback
    listeningCallback();

    expect(logMock).toHaveBeenCalled();
  });

  it("serverError throws error if syscall is not listen", async () => {
    mockInit.mockResolvedValue(undefined);
    await import("../../src/server");

    const errorCallback = mockServerOn.mock.calls.find((call) => call[0] === "error")[1];

    expect(errorCallback).toBeDefined();

    const error = new Error("some error") as any;
    error.syscall = "read";

    expect(() => errorCallback(error)).toThrow(error);
  });

  it("serverError throws error even if syscall is listen (default behavior)", async () => {
    mockInit.mockResolvedValue(undefined);
    await import("../../src/server");

    const errorCallback = mockServerOn.mock.calls.find((call) => call[0] === "error")[1];

    expect(errorCallback).toBeDefined();

    const error = new Error("listen error") as any;
    error.syscall = "listen";

    expect(() => errorCallback(error)).toThrow(error);
  });
});
