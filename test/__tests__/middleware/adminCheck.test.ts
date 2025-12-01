import { Request, Response, NextFunction } from "express";
import { adminCheck } from "../../../src/middleware/adminCheck";
import * as Helpers from "../../../src/service/index";
import redisHelper from "../../../src/service/redis.helper";
import { decryptData } from "../../../src/Utility/common";
import { RESPONSES, RES_MSG } from "../../../src/constant";

// Mock dependencies
// Mock dependencies
jest.mock("../../../src/service/redis.helper");
jest.mock("../../../src/lib/db", () => ({
  user: {
    findUnique: jest.fn(),
  },
}));
jest.mock("../../../src/Utility/common");
jest.mock("../../../src/service/index", () => {
  const originalModule = jest.requireActual("../../../src/service/index");
  return {
    ...originalModule,
    ResponseHelper: {
      error: jest.fn(),
    },
  };
});

// Get the mocked Prisma instance
const mockPrisma = require("../../../src/lib/db");
describe("adminCheck Middleware", () => {
  let req: Partial<Request> & { user?: any; cookies: any };
  let res: Response;
  let next: jest.Mock<NextFunction>;
  let mockDecryptData: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default request
    req = {
      cookies: {
        session_id: "test-session-token",
      },
      user: {},
    } as Request & { user?: any; cookies: any };

    // Setup response mock
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    // Setup next function
    next = jest.fn() as jest.Mock<NextFunction>;

    // Setup decryptData mock
    mockDecryptData = decryptData as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should call next() for valid admin user", async () => {
    // Mock redis helper
    (redisHelper.getString as jest.Mock).mockResolvedValue("encrypted-user-data");
    mockDecryptData.mockReturnValue({ address: "0x123" });
    
    // Mock prisma
    mockPrisma.user.findUnique.mockResolvedValue({
      address: "0x123",
      role: 1, // Admin role
    });

    // Mock redis update time
    (redisHelper.updateRedisTime as jest.Mock).mockResolvedValue(true);

    await adminCheck(req as Request, res as Response, next);

    expect(redisHelper.getString).toHaveBeenCalledWith("test-session-token");
    expect(decryptData).toHaveBeenCalledWith("encrypted-user-data");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { address: "0x123" },
    });
    expect(redisHelper.updateRedisTime).toHaveBeenCalledWith("test-session-token");
    expect(req.user).toEqual({
      address: "0x123",
      role: 1,
    });
    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if no session_id cookie", async () => {
    req.cookies = {};

    await adminCheck(req as Request, res as Response, next);

    expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, {
      message: RES_MSG.UNAUTHORIZED,
      status: RESPONSES.UN_AUTHORIZED,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if redis returns no value", async () => {
    (redisHelper.getString as jest.Mock).mockResolvedValue(null);

    await adminCheck(req as Request, res as Response, next);

    expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, {
      message: RES_MSG.UNAUTHORIZED,
      status: RESPONSES.UN_AUTHORIZED,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if decrypted value has no address", async () => {
    (redisHelper.getString as jest.Mock).mockResolvedValue("encrypted-user-data");
    mockDecryptData.mockReturnValue({});

    await adminCheck(req as Request, res as Response, next);

    expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, {
      message: RES_MSG.UNAUTHORIZED,
      status: RESPONSES.UN_AUTHORIZED,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if user is not found in database", async () => {
    (redisHelper.getString as jest.Mock).mockResolvedValue("encrypted-user-data");
    mockDecryptData.mockReturnValue({ address: "0x123" });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await adminCheck(req as Request, res as Response, next);

    expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, {
      message: RES_MSG.UNAUTHORIZED,
      status: RESPONSES.UN_AUTHORIZED,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if user is not an admin (role !== 1)", async () => {
    (redisHelper.getString as jest.Mock).mockResolvedValue("encrypted-user-data");
    mockDecryptData.mockReturnValue({ address: "0x123" });
    mockPrisma.user.findUnique.mockResolvedValue({
      address: "0x123",
      role: 0, // Non-admin role
    });

    await adminCheck(req as Request, res as Response, next);

    expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, {
      message: RES_MSG.UNAUTHORIZED,
      status: RESPONSES.UN_AUTHORIZED,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should handle errors and return 500", async () => {
    const error = new Error("Database error");
    (redisHelper.getString as jest.Mock).mockRejectedValue(error);

    await adminCheck(req as Request, res as Response, next);

    expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, {
      message: RES_MSG.SERVER_ERROR,
      status: RESPONSES.INTERNAL_SERVER,
    });
    expect(next).not.toHaveBeenCalled();
  });
});