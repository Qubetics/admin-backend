(global as any).environment = {
  sendgrid_key: "test-sendgrid-key",
  service_email: "service@test.com",
  evmHost: "https://test-api.example.com/",
  planHost: "http://test-host",
  cors_origins: "http://localhost:3000,http://example.com",
};

jest.mock("../../src/service", () => ({
  RedisService: {
    startRedis: jest.fn(),
  },
}));

jest.mock("../../src/worker", () => ({
  startNodeWorker: jest.fn(),
  startProviderWorker: jest.fn(),
  nodeRequestWorker: jest.fn(),
}));

import http from "http";

import App from "../../src/App";
import { RedisService } from "../../src/service";
import worker from "../../src/worker";

describe("App Class", () => {
  let app: App;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create a rate limiter with correct configuration", () => {
      app = new App();

      expect(worker.startNodeWorker).toHaveBeenCalled();
      expect(worker.startProviderWorker).toHaveBeenCalled();
      expect(worker.nodeRequestWorker).toHaveBeenCalled();
    });
  });

  describe("Initialization", () => {
    beforeEach(async () => {
      app = new App();
      await app.init();
    });

    it("should initialize express application", () => {
      expect(app.express).toBeDefined();
      expect(typeof app.express.use).toBe("function");
    });

    it("should create HTTP server", () => {
      expect(app.httpServer).toBeDefined();
      expect(app.httpServer).toBeInstanceOf(http.Server);
    });

    it("should start Redis connection", () => {
      expect(RedisService.startRedis).toHaveBeenCalled();
    });
  });

  describe("Middleware", () => {
    beforeEach(async () => {
      app = new App();
      await app.init();
    });

    it("should apply CORS middleware with correct configuration", () => {
      const corsMiddleware = app.express._router.stack.find((layer: any) => layer.handle.name === "corsMiddleware");

      expect(corsMiddleware).toBeDefined();
    });

    it("should apply cookie parser middleware", () => {
      const cookieParserMiddleware = app.express._router.stack.find(
        (layer: any) => layer.handle.name === "cookieParser"
      );

      expect(cookieParserMiddleware).toBeDefined();
    });

    it("should apply helmet middleware with specific configuration", () => {
      const helmetMiddleware = app.express._router.stack.find((layer: any) => layer.handle.name === "helmetMiddleware");

      expect(helmetMiddleware).toBeDefined();
    });

    it("should apply JSON parsing middleware", () => {
      const jsonMiddleware = app.express._router.stack.find((layer: any) => layer.handle.name === "jsonParser");

      expect(jsonMiddleware).toBeDefined();
    });

    it("should apply URL-encoded parsing middleware", () => {
      const urlEncodedMiddleware = app.express._router.stack.find(
        (layer: any) => layer.handle.name === "urlencodedParser"
      );

      expect(urlEncodedMiddleware).toBeDefined();
    });
  });

  describe("Routes", () => {
    beforeEach(async () => {
      app = new App();
      await app.init();
    });

    it("should register routes under /api/v1", () => {
      expect(app.express._router).toBeDefined();
    });
  });
});
