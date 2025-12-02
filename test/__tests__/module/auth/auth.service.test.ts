import AuthService from "../../../../src/module/auth/auth.service";
import prisma from "../../../../src/lib/db";
import redisHelper from "../../../../src/service/redis.helper";
import {
  convertNodeToWallet,
  encryptData,
  isValidProviderStatusTx,
  verifyKeplrSignature,
} from "../../../../src/Utility/common";
import { RES_MSG, COOKIE_NAMES } from "../../../../src/constant";

// --- START: TYPE DEFINITIONS TO FIX TS2339 ERRORS ---

// 1. General API Response Structure
interface ApiResponse<T = unknown> {
  error: boolean;
  message: string;
  data?: T;
}

// 2. Data Structure for AuthService.addUser success response
interface AddUserResponseData {
  provider?: {
    id: number;
    // ... potentially other provider user properties
  };
}

// 3. Data Structure for AuthService.loginUser rejection response
interface LoginUserResponseData {
  isExist?: boolean;
  // ... other successful login data properties
}

// 4. Combined Types for Assertion
type AddUserResult = ApiResponse<AddUserResponseData>;
type LoginUserResult = ApiResponse<LoginUserResponseData>;

// --- END: TYPE DEFINITIONS TO FIX TS2339 ERRORS ---

jest.mock("../../../../src/lib/db", () => ({
  user: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
}));

jest.mock("../../../../src/service/redis.helper", () => ({
  setString: jest.fn(),
  deleteRedisKey: jest.fn(),
}));

jest.mock("../../../../src/Utility/common", () => ({
  convertNodeToWallet: jest.fn(),
  encryptData: jest.fn(() => "encrypted"),
  verifyKeplrSignature: jest.fn(),
  isValidProviderStatusTx: jest.fn(),
}));

const mockResponse = () => {
  const res: any = {};
  res.cookie = jest.fn();
  res.clearCookie = jest.fn();
  return res;
};

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------
  // addAdmin()
  // ---------------------------------------------------------
  describe("addAdmin()", () => {
    const value = {
      address: "addr1",
      name: "John",
      // email: "john@gmail.com",
      description: "",
      url: "",
      pubKey: "pubkey",
      signature: { signature: "sig" },
      txHash: "txhash123",
    };

    it("should register admin when tx & signature are valid", async () => {
      (isValidProviderStatusTx as jest.Mock).mockResolvedValue(true);
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1 });

      const res = mockResponse();

      const result = await AuthService.addAdmin(value, res);

      expect(isValidProviderStatusTx).toHaveBeenCalled();
      expect(verifyKeplrSignature).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(COOKIE_NAMES.SESSION_ID, expect.any(String), expect.any(Object));
      expect(redisHelper.setString).toHaveBeenCalled();

      expect(result).toEqual({
        error: false,
        message: RES_MSG.USER_REGISTER_SUCCESS,
        data: {},
      });
    });

    it("should fail when provider-tx is invalid", async () => {
      (isValidProviderStatusTx as jest.Mock).mockResolvedValue(false);
      const res = mockResponse();

      const result = await AuthService.addAdmin(value, res);
      expect(result.error).toBe(true);
      expect(result.message).toBe(RES_MSG.UNAUTHORIZED);
    });

    it("should fail when signature is invalid", async () => {
      (isValidProviderStatusTx as jest.Mock).mockResolvedValue(true);
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: false });

      const res = mockResponse();
      const result = await AuthService.addAdmin(value, res);

      expect(result.error).toBe(true);
      expect(result.message).toBe(RES_MSG.UNAUTHORIZED);
    });
  });

  // ---------------------------------------------------------
  // addUser()
  // ---------------------------------------------------------
  describe("addUser()", () => {
    it("should create normal user successfully", async () => {
      (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await AuthService.addUser({
        address: "addr1",
      });

      expect(prisma.user.upsert).toHaveBeenCalled();
      expect(result.error).toBe(false);
      expect(result.message).toBe(RES_MSG.USER_REGISTER_SUCCESS);
    });

    it("should include provider user when provider exists", async () => {
      (convertNodeToWallet as jest.Mock).mockReturnValue("provWallet");
      (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 99 });

      // FIX: Apply type assertion to inform TypeScript about the 'provider' property on data
      const result = (await AuthService.addUser({
        address: "addr1",
        provider: "nodeName",
      })) as AddUserResult;

      expect(convertNodeToWallet).toHaveBeenCalled();
      // Error on line 127 is now fixed
      expect(result.data!.provider).toEqual({ id: 99 });
    });
  });

  // ---------------------------------------------------------
  // loginUser()
  // ---------------------------------------------------------
  describe("loginUser()", () => {
    const value = {
      address: "addr1",
      pubKey: "pubkey",
      signature: { signature: "sig" },
    };

    it("should login admin successfully", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        address: "addr1",
        role: 1,
        name: "admin",
      });

      const res = mockResponse();
      const result = await AuthService.loginUser(value, res);

      expect(verifyKeplrSignature).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalled();
      expect(redisHelper.setString).toHaveBeenCalled();
      expect(result.error).toBe(false);
      expect(result.message).toBe(RES_MSG.FETCH_SUCCESS);
    });

    it("should fail for invalid signature", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: false });

      const res = mockResponse();
      const result = await AuthService.loginUser(value, res);

      expect(result.error).toBe(true);
      expect(result.message).toBe(RES_MSG.ERROR);
    });

    it("should reject non-admin user", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: 0,
      });

      const res = mockResponse();
      // FIX: Apply type assertion to inform TypeScript about the 'isExist' property on data
      const result = (await AuthService.loginUser(value, res)) as LoginUserResult;

      expect(result.error).toBe(true);
      expect(result.message).toBe(RES_MSG.NOT_ADMIN);
      // Error on line 180 is now fixed
      expect(result.data!.isExist).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // logout()
  // ---------------------------------------------------------
  describe("logout()", () => {
    it("should logout successfully", async () => {
      const req: any = { cookies: { session_id: "123" } };
      const res = mockResponse();

      const result = await AuthService.logout(req, res);

      expect(redisHelper.deleteRedisKey).toHaveBeenCalledWith("123");
      expect(res.clearCookie).toHaveBeenCalled();
      expect(result).toEqual({
        error: false,
        message: RES_MSG.LOGOUT_SUCCESS,
      });
    });

    it("should return error on exception", async () => {
      (redisHelper.deleteRedisKey as jest.Mock).mockRejectedValue(new Error("Redis failed"));

      const req: any = { cookies: { session_id: "123" } };
      const res = mockResponse();

      const result = await AuthService.logout(req, res);

      expect(result.error).toBe(true);
      expect(result.message).toBe("Redis failed");
    });
  });
});
