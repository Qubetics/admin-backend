jest.mock("../../../src/Utility/common", () => ({
  log: jest.fn(),
}));

jest.mock("../../../src/lib/logger", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

// Import mocked versions
const { log } = require("../../../src/Utility/common");
const logger = require("../../../src/lib/logger").default;

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: mockConnect,
    $disconnect: mockDisconnect,
  })),
}));

describe("Prisma Client Connection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
  });

  it("should log a success message when connected to the database", async () => {
    jest.isolateModules(() => {
      require("../../../src/lib/db");
    });

    await new Promise(process.nextTick);

    expect(mockConnect).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("Database connected ", expect.any(String), true, expect.any(String));
  });

  it("should log an error message when connection fails", async () => {
    const mockError = new Error("Connection failed");
    mockConnect.mockRejectedValueOnce(mockError);

    jest.isolateModules(() => {
      require("../../../src/lib/db");
    });

    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Error"), mockError);
  });
});
