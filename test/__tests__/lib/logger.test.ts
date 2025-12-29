import { existsSync, mkdirSync } from "fs";

jest.mock("fs");

jest.mock("winston", () => ({
  __esModule: true,
  default: {
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }),
    format: {
      json: jest.fn(),
      simple: jest.fn(),
      colorize: jest.fn(() => ({})),
      combine: jest.fn((...args) => ({})),
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  },
}));

describe("Logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates logs directory if missing", () => {
    (existsSync as jest.Mock).mockReturnValue(false);

    require("../../../src/lib/logger");

    expect(existsSync).toHaveBeenCalledWith("./logs");
    expect(mkdirSync).toHaveBeenCalledWith("./logs");
  });

  it("does not create logs directory if it already exists", () => {
    (existsSync as jest.Mock).mockReturnValue(true);

    require("../../../src/lib/logger");

    expect(mkdirSync).not.toHaveBeenCalled();
  });

  it("exports the logger instance", () => {
    (existsSync as jest.Mock).mockReturnValue(true);

    const logger = require("../../../src/lib/logger").default;

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });
});
