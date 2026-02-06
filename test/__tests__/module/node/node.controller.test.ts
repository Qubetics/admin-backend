import * as Helpers from "../../../../src/service/index";
import nodeService from "../../../../src/module/node/node.service";
import { Request, Response } from "express";
import { convertNodeToWallet, decryptData } from "../../../../src/Utility/common";
import redisHelper from "../../../../src/service/redis.helper";

jest.mock("../../../../src/service/index", () => ({
  ResponseHelper: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../../src/module/node/node.service", () => ({
  __esModule: true,
  default: {
    nodeFormRequest: jest.fn(),
    getAllNodeRequestList: jest.fn(),
    getAllNodeForAddress: jest.fn(),
    updateNodeStatus: jest.fn(),
    getAllCountForAddress: jest.fn(),
    getNodeRequestStatus: jest.fn(),
    getNodeRequestCount: jest.fn(),
    getPrefillValues: jest.fn(),
  },
}));

jest.mock("../../../../src/Utility/common", () => ({
  convertNodeToWallet: jest.fn(),
  decryptData: jest.fn(),
}));

jest.mock("../../../../src/service/redis.helper", () => ({
  getString: jest.fn(),
  updateRedisTime: jest.fn(),
}));

jest.mock("../../../../src/lib/db", () => ({
  user: {
    findUnique: jest.fn(),
  },
}));

describe("NodeController", () => {
  let controller: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  const mockAdminUser = {
    id: "admin-id-123",
    address: "0x123abc",
    name: "Admin User",
    email: "admin@example.com",
    role: 1, // Admin role
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    const NodeController = require("../../../../src/module/node/node.controller").default;
    controller = new NodeController();
    req = {
      query: {},
      body: {},
      cookies: { session_id: "token123" },
      user: {
        address: mockAdminUser.address,
        role: mockAdminUser.role,
      },
    } as any;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("nodeFormRequest", () => {
    it("calls ResponseHelper.success when service returns success", async () => {
      const mockData = { error: false, message: "Node request submitted" };
      (nodeService.nodeFormRequest as jest.Mock).mockResolvedValue(mockData);
      req.body = {
        orgName: "Test Org",
        emailAddress: "test@example.com",
        nodeAddress: "0x123",
        choosePlan: "pro",
        address: "0xabc",
        pubKey: "pubkey123",
        request: "request_data",
        signature: "sig123",
      };

      await (controller as any).nodeFormRequest(req as Request, res as Response);

      expect(nodeService.nodeFormRequest).toHaveBeenCalledWith(
        "Test Org",
        "test@example.com",
        "0x123",
        "pro",
        "0xabc",
        "sig123",
        "request_data"
      );
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
      expect(Helpers.ResponseHelper.error).not.toHaveBeenCalled();
    });

    it("calls ResponseHelper.error when service returns error", async () => {
      const mockError = { error: true, message: "Invalid request" };
      (nodeService.nodeFormRequest as jest.Mock).mockResolvedValue(mockError);
      req.body = {};

      await (controller as any).nodeFormRequest(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockError);
      expect(Helpers.ResponseHelper.success).not.toHaveBeenCalled();
    });

    it("handles missing body parameters", async () => {
      const mockData = { error: false };
      (nodeService.nodeFormRequest as jest.Mock).mockResolvedValue(mockData);
      req.body = {};

      await (controller as any).nodeFormRequest(req as Request, res as Response);

      expect(nodeService.nodeFormRequest).toHaveBeenCalledWith(
        "undefined",
        "undefined",
        "undefined",
        undefined,
        "undefined",
        undefined,
        "undefined"
      );
    });
  });

  describe("getAllNodeRequestList", () => {
    it("calls ResponseHelper.success when service returns success with admin user", async () => {
      const mockData = { error: false, data: [], total: 0 };
      (nodeService.getAllNodeRequestList as jest.Mock).mockResolvedValue(mockData);
      (convertNodeToWallet as jest.Mock).mockReturnValue("prov-wallet-123");
      req.query = { page: "1", limit: "10", status: "PENDING" };

      await (controller as any).getAllNodeRequestList(req as Request, res as Response);

      expect(convertNodeToWallet).toHaveBeenCalledWith(mockAdminUser.address, expect.any(String));
      expect(nodeService.getAllNodeRequestList).toHaveBeenCalledWith(1, 10, "PENDING", "prov-wallet-123");
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
    });

    it("uses default pagination values", async () => {
      const mockData = { error: false, data: [] };
      (nodeService.getAllNodeRequestList as jest.Mock).mockResolvedValue(mockData);
      (convertNodeToWallet as jest.Mock).mockReturnValue("prov-wallet");
      req.query = {};

      await (controller as any).getAllNodeRequestList(req as Request, res as Response);

      expect(nodeService.getAllNodeRequestList).toHaveBeenCalledWith(1, 10, expect.any(String), "prov-wallet");
    });

    it("calls ResponseHelper.error when service returns error", async () => {
      const mockError = { error: true, message: "Failed to fetch" };
      (nodeService.getAllNodeRequestList as jest.Mock).mockResolvedValue(mockError);
      (convertNodeToWallet as jest.Mock).mockReturnValue("prov-wallet");

      await (controller as any).getAllNodeRequestList(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockError);
    });
  });

  describe("getAllNodeForAddress", () => {
    it("calls ResponseHelper.success with correct parameters from admin user", async () => {
      const mockData = { error: false, data: [{ nodeAddress: "0x456" }] };
      (nodeService.getAllNodeForAddress as jest.Mock).mockResolvedValue(mockData);
      (convertNodeToWallet as jest.Mock).mockReturnValue("prov-wallet");
      req.query = { page: "2", limit: "20", status: "active", nodeStatus: "APPROVED" };

      await (controller as any).getAllNodeForAddress(req as Request, res as Response);

      expect(convertNodeToWallet).toHaveBeenCalledWith(mockAdminUser.address, expect.any(String));
      expect(nodeService.getAllNodeForAddress).toHaveBeenCalledWith("prov-wallet", 2, 20, "active", "APPROVED");
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
    });

    it("calls ResponseHelper.error when service returns error", async () => {
      const mockError = { error: true, message: "No nodes found" };
      (nodeService.getAllNodeForAddress as jest.Mock).mockResolvedValue(mockError);
      (convertNodeToWallet as jest.Mock).mockReturnValue("prov-wallet");

      await (controller as any).getAllNodeForAddress(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockError);
    });
  });

  describe("updateNodeStatus", () => {
    it("updates node status with valid status using admin credentials", async () => {
      const mockData = { error: false, message: "Status updated" };
      (nodeService.updateNodeStatus as jest.Mock).mockResolvedValue(mockData);
      (redisHelper.getString as jest.Mock).mockResolvedValue("encrypted_data");
      (decryptData as jest.Mock).mockReturnValue({ address: mockAdminUser.address });
      req.query = { address: "0x456", status: "APPROVED" };
      req.cookies = { session_id: "token123" };

      await (controller as any).updateNodeStatus(req as Request, res as Response);

      expect(redisHelper.getString).toHaveBeenCalledWith("token123");
      expect(decryptData).toHaveBeenCalledWith("encrypted_data");
      expect(nodeService.updateNodeStatus).toHaveBeenCalledWith("0x456", mockAdminUser.address, "APPROVED");
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
    });

    it("rejects invalid status values", async () => {
      req.query = { address: "0x456", status: "INVALID" };
      req.cookies = { session_id: "token123" };
      (redisHelper.getString as jest.Mock).mockResolvedValue("encrypted_data");
      (decryptData as jest.Mock).mockReturnValue({ address: mockAdminUser.address });

      await (controller as any).updateNodeStatus(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          error: true,
          message: expect.stringContaining("Invalid status value"),
        })
      );
    });

    it("allows all valid status values", async () => {
      const validStatuses = ["PENDING", "APPROVED", "REJECTED"];
      (nodeService.updateNodeStatus as jest.Mock).mockResolvedValue({ error: false });
      (redisHelper.getString as jest.Mock).mockResolvedValue("encrypted_data");
      (decryptData as jest.Mock).mockReturnValue({ address: mockAdminUser.address });
      req.cookies = { session_id: "token123" };

      for (const status of validStatuses) {
        req.query = { address: "0x456", status };
        await (controller as any).updateNodeStatus(req as Request, res as Response);
        expect(nodeService.updateNodeStatus).toHaveBeenCalledWith("0x456", mockAdminUser.address, status);
      }
    });
  });

  describe("getAllCountForAddress", () => {
    it("calls ResponseHelper.success with admin user address", async () => {
      const mockData = { error: false, counts: { pending: 5, approved: 10 } };
      (nodeService.getAllCountForAddress as jest.Mock).mockResolvedValue(mockData);
      (convertNodeToWallet as jest.Mock).mockReturnValue("prov-wallet");

      await (controller as any).getAllCountForAddress(req as Request, res as Response);

      expect(convertNodeToWallet).toHaveBeenCalledWith(mockAdminUser.address, expect.any(String));
      expect(nodeService.getAllCountForAddress).toHaveBeenCalledWith("prov-wallet");
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
    });

    it("calls ResponseHelper.error when service fails", async () => {
      const mockError = { error: true, message: "Database error" };
      (nodeService.getAllCountForAddress as jest.Mock).mockResolvedValue(mockError);
      (convertNodeToWallet as jest.Mock).mockReturnValue("prov-wallet");

      await (controller as any).getAllCountForAddress(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockError);
    });
  });

  describe("getNodeRequestStatus", () => {
    it("calls service with wallet address from query", async () => {
      const mockData = { error: false, status: "APPROVED" };
      (nodeService.getNodeRequestStatus as jest.Mock).mockResolvedValue(mockData);
      req.query = { wallet_address: "0xabc123" };

      await (controller as any).getNodeRequestStatus(req as Request, res as Response);

      expect(nodeService.getNodeRequestStatus).toHaveBeenCalledWith("0xabc123");
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
    });

    it("calls ResponseHelper.error when service fails", async () => {
      const mockError = { error: true, message: "Not found" };
      (nodeService.getNodeRequestStatus as jest.Mock).mockResolvedValue(mockError);
      req.query = { wallet_address: "0xabc123" };

      await (controller as any).getNodeRequestStatus(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockError);
    });
  });

  describe("getNodeRequestCount", () => {
    it("calls ResponseHelper.success with admin user address", async () => {
      const mockData = { error: false, count: 5 };
      (nodeService.getNodeRequestCount as jest.Mock).mockResolvedValue(mockData);
      (convertNodeToWallet as jest.Mock).mockReturnValue("prov-wallet");

      await (controller as any).getNodeRequestCount(req as Request, res as Response);

      expect(convertNodeToWallet).toHaveBeenCalledWith(mockAdminUser.address, expect.any(String));
      expect(nodeService.getNodeRequestCount).toHaveBeenCalledWith("prov-wallet");
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
    });
  });

  describe("getPrefillValues", () => {
    it("returns prefill values when address is provided and found", async () => {
      const mockData = {
        error: false,
        data: { name: "Test", email: "test@example.com" },
      };
      (nodeService.getPrefillValues as jest.Mock).mockResolvedValue(mockData);
      req.query = { address: "0x123" };

      await (controller as any).getPrefillValues(req as Request, res as Response);

      expect(nodeService.getPrefillValues).toHaveBeenCalledWith("0x123");
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
    });

    it("returns error when service returns error", async () => {
      const mockError = {
        error: true,
        message: "No records found for the given address",
      };
      (nodeService.getPrefillValues as jest.Mock).mockResolvedValue(mockError);
      req.query = { address: "0x123" };

      await (controller as any).getPrefillValues(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockError);
    });

    it("handles service errors gracefully", async () => {
      const mockError = new Error("Database error");
      (nodeService.getPrefillValues as jest.Mock).mockRejectedValue(mockError);
      req.query = { address: "0x123" };

      await (controller as any).getPrefillValues(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          message: "Database error",
          error: true,
        })
      );
    });
  });
});
