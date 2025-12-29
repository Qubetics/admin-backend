console.warn = jest.fn();
jest.mock("winston", () => ({
  __esModule: true,
  default: {
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      silly: jest.fn(),
      log: jest.fn(),
    }),
    format: {
      json: jest.fn(),
      simple: jest.fn(() => ({})),
      combine: jest.fn((...args) => ({})),
      timestamp: jest.fn(() => ({})),
      printf: jest.fn(() => ({})),
      colorize: jest.fn(() => ({})),
      label: jest.fn(() => ({})),
      prettyPrint: jest.fn(() => ({})),
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
      Http: jest.fn(),
      Stream: jest.fn(),
    },
  },
  format: {
    json: jest.fn(),
    simple: jest.fn(() => ({})),
    combine: jest.fn((...args) => ({})),
    timestamp: jest.fn(() => ({})),
    printf: jest.fn(() => ({})),
    colorize: jest.fn(() => ({})),
    label: jest.fn(() => ({})),
    prettyPrint: jest.fn(() => ({})),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
    Http: jest.fn(),
    Stream: jest.fn(),
  },
}));
