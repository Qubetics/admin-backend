// Mock environment FIRST
const mockEnvironment = {
  redisHost: "localhost",
  redisPort: "6379",
  redisExpiry: 3600,
};

jest.mock("../../../src/global", () => ({
  __esModule: true,
  default: mockEnvironment,
}));

// Ensure environment is available globally
(global as any).environment = mockEnvironment;

// Mock the logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

jest.mock("../../../src/lib/logger", () => ({
  __esModule: true,
  default: mockLogger,
}));

// Mock the common utility
jest.mock("../../../src/Utility/common", () => ({
  log: jest.fn(),
}));

// Mock redis client
const mockRedisClient = {
  connect: jest.fn(),
  select: jest.fn(),
  on: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
};

jest.mock("redis", () => ({
  __esModule: true,
  createClient: jest.fn(() => mockRedisClient),
}));

describe("RedisService", () => {
  let RedisService: any;
  let redisServiceInstance: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clear module cache to get fresh instance
    jest.resetModules();
    
    // Re-setup mocks
    (global as any).environment = mockEnvironment;
    
    // Dynamically import to get the module
    const module = await import("../../../src/service/redis.helper");
    redisServiceInstance = module.default;
    
    // Get the class constructor for testing static methods
    RedisService = (redisServiceInstance as any).constructor;
  });

  describe("singleton pattern", () => {
    it("should export a singleton instance", () => {
      expect(redisServiceInstance).toBeDefined();
      expect(typeof redisServiceInstance).toBe("object");
    });
  });

  describe("startRedis", () => {
    beforeEach(() => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.select.mockResolvedValue(undefined);
      mockRedisClient.on.mockReturnValue(undefined);
    });

    it("should connect and select redis DB", async () => {
      await redisServiceInstance.startRedis();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.select).toHaveBeenCalledWith(1);
      expect(mockRedisClient.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith("ready", expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith("reconnecting", expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith("end", expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("should handle connection error gracefully", async () => {
      mockRedisClient.connect.mockRejectedValue(new Error("Connection failed"));

      await expect(redisServiceInstance.startRedis()).resolves.toBeUndefined();
    });

    it("should trigger error event handler", async () => {
      await redisServiceInstance.startRedis();

      const errorHandler = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === "error"
      )?.[1];

      expect(errorHandler).toBeDefined();
      
      // Trigger the error handler
      errorHandler(new Error("Redis error"));
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("setString", () => {
    beforeEach(() => {
      redisServiceInstance.client = mockRedisClient;
      mockRedisClient.set.mockResolvedValue("OK");
    });

    it("should call client.set with correct arguments", async () => {
      const key = "testKey";
      const data = { foo: "bar" };

      await redisServiceInstance.setString(key, data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(data),
        { EX: mockEnvironment.redisExpiry }
      );
    });

    it("should handle set error and log it", async () => {
      mockRedisClient.set.mockRejectedValue(new Error("Set failed"));

      await redisServiceInstance.setString("key", { a: 1 });

      expect(mockLogger.error).toHaveBeenCalledWith(
        "error while setting the data into redis: ",
        expect.any(Error)
      );
    });
  });

  describe("getString", () => {
    beforeEach(() => {
      redisServiceInstance.client = mockRedisClient;
    });

    it("should return parsed data from redis", async () => {
      const data = { foo: "bar" };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

      const result = await redisServiceInstance.getString("mykey");

      expect(mockRedisClient.get).toHaveBeenCalledWith("mykey");
      expect(result).toEqual(data);
    });

    it("should handle error and return empty array", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Get failed"));

      const result = await redisServiceInstance.getString("mykey");

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "error while getting the data from redis: ",
        expect.any(Error)
      );
    });

    it("should handle null response", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisServiceInstance.getString("nonexistent");

      // getString returns null when JSON.parse(null) is called
      expect(result).toBeNull();
    });
  });

  describe("updateRedisTime", () => {
    beforeEach(() => {
      redisServiceInstance.client = mockRedisClient;
    });

    it("should expire key and return true", async () => {
      mockRedisClient.expire.mockResolvedValue(true);

      const result = await redisServiceInstance.updateRedisTime("token");

      expect(mockRedisClient.expire).toHaveBeenCalledWith("token", mockEnvironment.redisExpiry);
      expect(result).toBe(true);
    });

    it("should return false if key does not exist", async () => {
      mockRedisClient.expire.mockResolvedValue(false);

      const result = await redisServiceInstance.updateRedisTime("nonexistent");

      expect(result).toBe(false);
    });

    it("should handle error and return null", async () => {
      mockRedisClient.expire.mockRejectedValue(new Error("Expire failed"));

      const result = await redisServiceInstance.updateRedisTime("token");

      expect(result).toBeNull();
    });
  });

  describe("deleteRedisKey", () => {
    beforeEach(() => {
      redisServiceInstance.client = mockRedisClient;
    });

    it("should delete key and return true if deleted", async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await redisServiceInstance.deleteRedisKey("key");

      expect(mockRedisClient.del).toHaveBeenCalledWith("key");
      expect(result).toBe(true);
    });

    it("should return false if no keys deleted", async () => {
      mockRedisClient.del.mockResolvedValue(0);

      const result = await redisServiceInstance.deleteRedisKey("nonexistent");

      expect(result).toBe(false);
    });

    it("should handle error and return null", async () => {
      mockRedisClient.del.mockRejectedValue(new Error("Delete failed"));

      const result = await redisServiceInstance.deleteRedisKey("key");

      expect(result).toBeNull();
    });
  });
});

