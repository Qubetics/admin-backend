import NodeService from "../../../../src/module/node/node.service";
import prisma from "../../../../src/lib/db";
import AuthService from "../../../../src/module/auth/auth.service";
import mailService from "../../../../src/module/mail/mail.service";
import {
  verifyKeplrSignature,
  fetchRequest,
  getWalletAddressFromNodeAddress,
  canSubmitNodeRequest,
  extractIP,
} from "../../../../src/Utility/common";
import {
  ACTIVE,
  APPROVED,
  INACTIVE,
  LINK,
  PENDING,
  REJECTED,
  RES_MSG,
  UNDEFINED,
  UNLINK,
  FETCH_METHODS,
} from "../../../../src/constant";
import geoip from "geoip-lite";
import countries from "i18n-iso-countries";

// Mock dependencies
jest.mock("../../../../src/lib/db", () => ({
  nodeRequest: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  activity: {
    create: jest.fn(),
  },
}));

jest.mock("../../../../src/module/auth/auth.service");
jest.mock("../../../../src/module/mail/mail.service", () => ({
  sendApprovalMail: jest.fn().mockResolvedValue({ error: false }),
}));

jest.mock("../../../../src/Utility/common");
jest.mock("geoip-lite");
jest.mock("i18n-iso-countries");

describe("NodeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment before each test
    (global as any).environment = {
      sendgrid_key: "test-sendgrid-key",
      evmHost: "https://test-api.example.com/",
    };
  });

  describe("nodeFormRequest", () => {
    const mockParams = {
      orgName: "Test Org",
      email: "test@example.com",
      nodeAddress: "node123",
      choosePlan: {
        plan: "basic",
        planId: "plan1",
        provAddress: "prov123",
        bandwidth: 100,
        hours: 24,
      },
      address: "wallet123",
      pubKey: "pubkey123",
      signature: { signature: "sig123" },
      request: LINK,
    };

    it("should return error when signature verification fails", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: false });

      const result = await NodeService.nodeFormRequest(
        mockParams.orgName,
        mockParams.email,
        mockParams.nodeAddress,
        mockParams.choosePlan,
        mockParams.address,
        mockParams.pubKey,
        mockParams.signature,
        mockParams.request
      );

      expect(result).toEqual({
        error: true,
        message: RES_MSG.NOT_VERIFY,
      });
    });

    it("should return error when email is disposable", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });

      const result = await NodeService.nodeFormRequest(
        mockParams.orgName,
        "test@mailinator.com",
        mockParams.nodeAddress,
        mockParams.choosePlan,
        mockParams.address,
        mockParams.pubKey,
        mockParams.signature,
        mockParams.request
      );

      expect(result).toEqual({
        error: true,
        message: RES_MSG.DISPOSBLE_EMAIL,
      });
    });

    it("should return error when node is not present on chain", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (fetchRequest as jest.Mock).mockResolvedValue({
        error: true,
      });

      const result = await NodeService.nodeFormRequest(
        mockParams.orgName,
        mockParams.email,
        mockParams.nodeAddress,
        mockParams.choosePlan,
        mockParams.address,
        mockParams.pubKey,
        mockParams.signature,
        mockParams.request
      );

      expect(result).toEqual({
        error: true,
        message: RES_MSG.NOT_PRESENT_ON_CHAIN,
      });
    });

    it("should return error when wallet address is not linked to node address", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (fetchRequest as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          node: {
            status: "active",
            remote_url: "http://1.2.3.4:8080",
          },
        },
      });
      (prisma.nodeRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (getWalletAddressFromNodeAddress as jest.Mock).mockReturnValue("different_wallet");

      const result = await NodeService.nodeFormRequest(
        mockParams.orgName,
        mockParams.email,
        mockParams.nodeAddress,
        mockParams.choosePlan,
        mockParams.address,
        mockParams.pubKey,
        mockParams.signature,
        mockParams.request
      );

      expect(result).toEqual({
        error: true,
        message: RES_MSG.NOT_LINKED,
      });
    });

    it("should return error when previous request cannot be overridden", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (fetchRequest as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          node: {
            status: "active",
            remote_url: "http://1.2.3.4:8080",
          },
        },
      });
      (prisma.nodeRequest.findFirst as jest.Mock).mockResolvedValue({
        status: PENDING,
        requestFor: LINK,
      });
      (canSubmitNodeRequest as jest.Mock).mockResolvedValue({
        ok: false,
        message: "Cannot submit request",
      });
      (getWalletAddressFromNodeAddress as jest.Mock).mockReturnValue(mockParams.address);

      const result = await NodeService.nodeFormRequest(
        mockParams.orgName,
        mockParams.email,
        mockParams.nodeAddress,
        mockParams.choosePlan,
        mockParams.address,
        mockParams.pubKey,
        mockParams.signature,
        mockParams.request
      );

      expect(result).toEqual({
        error: true,
        message: "Cannot submit request",
      });
    });

    it("should return error when unable to save user", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (fetchRequest as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          node: {
            status: "active",
            remote_url: "http://1.2.3.4:8080",
          },
        },
      });
      (prisma.nodeRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (getWalletAddressFromNodeAddress as jest.Mock).mockReturnValue(mockParams.address);
      (AuthService.addUser as jest.Mock).mockResolvedValue({ error: true });

      const result = await NodeService.nodeFormRequest(
        mockParams.orgName,
        mockParams.email,
        mockParams.nodeAddress,
        mockParams.choosePlan,
        mockParams.address,
        mockParams.pubKey,
        mockParams.signature,
        mockParams.request
      );

      expect(result).toEqual({
        error: true,
        message: RES_MSG.UNABLE_TO_SAVE_THE_USER,
      });
    });

    it("should return error when location cannot be determined", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (fetchRequest as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          node: {
            status: "active",
            remote_url: "http://1.2.3.4:8080",
          },
        },
      });
      (prisma.nodeRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (getWalletAddressFromNodeAddress as jest.Mock).mockReturnValue(mockParams.address);
      (AuthService.addUser as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          user: { id: "user1", role: "user" },
          provider: { id: "prov1" },
        },
      });
      (extractIP as jest.Mock).mockReturnValue("1.2.3.4");
      (geoip.lookup as jest.Mock).mockReturnValue(null);

      const result = await NodeService.nodeFormRequest(
        mockParams.orgName,
        mockParams.email,
        mockParams.nodeAddress,
        mockParams.choosePlan,
        mockParams.address,
        mockParams.pubKey,
        mockParams.signature,
        mockParams.request
      );

      expect(result).toEqual({
        error: true,
        message: RES_MSG.UNABLE_TO_FIND_LOC,
      });
    });

    it("should successfully create node request", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (fetchRequest as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          node: {
            status: "active",
            remote_url: "http://1.2.3.4:8080",
          },
        },
      });
      (prisma.nodeRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (getWalletAddressFromNodeAddress as jest.Mock).mockReturnValue(mockParams.address);
      (AuthService.addUser as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          user: { id: "user1", role: "user" },
          provider: { id: "prov1" },
        },
      });
      (extractIP as jest.Mock).mockReturnValue("1.2.3.4");
      (geoip.lookup as jest.Mock).mockReturnValue({ country: "US" });
      (countries.getName as jest.Mock).mockReturnValue("United States");
      (prisma.activity.create as jest.Mock).mockResolvedValue({});
      (prisma.nodeRequest.upsert as jest.Mock).mockResolvedValue({});

      const result = await NodeService.nodeFormRequest(
        mockParams.orgName,
        mockParams.email,
        mockParams.nodeAddress,
        mockParams.choosePlan,
        mockParams.address,
        mockParams.pubKey,
        mockParams.signature,
        mockParams.request
      );

      expect(result).toEqual({
        error: false,
        message: RES_MSG.SUCCESS_REQUEST,
      });
      expect(prisma.activity.create).toHaveBeenCalled();
      expect(prisma.nodeRequest.upsert).toHaveBeenCalled();
    });

    it("should handle UNLINK request without choosePlan", async () => {
      (verifyKeplrSignature as jest.Mock).mockReturnValue({ verify: true });
      (fetchRequest as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          node: {
            status: "active",
            remote_url: "http://1.2.3.4:8080",
          },
        },
      });
      (prisma.nodeRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.nodeRequest.findUnique as jest.Mock).mockResolvedValue({
        plan: "basic",
        planId: "plan1",
        provAddress: "prov123",
        bandwidth: 100,
        hours: 24,
      });
      (getWalletAddressFromNodeAddress as jest.Mock).mockReturnValue(mockParams.address);
      (AuthService.addUser as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          user: { id: "user1", role: "user" },
          provider: { id: "prov1" },
        },
      });
      (extractIP as jest.Mock).mockReturnValue("1.2.3.4");
      (geoip.lookup as jest.Mock).mockReturnValue({ country: "US" });
      (countries.getName as jest.Mock).mockReturnValue("United States");
      (prisma.activity.create as jest.Mock).mockResolvedValue({});
      (prisma.nodeRequest.upsert as jest.Mock).mockResolvedValue({});

      const result = await NodeService.nodeFormRequest(
        mockParams.orgName,
        mockParams.email,
        mockParams.nodeAddress,
        {},
        mockParams.address,
        mockParams.pubKey,
        mockParams.signature,
        UNLINK
      );

      expect(result.error).toBe(false);
    });
  });

  describe("getAllNodeRequestList", () => {
    it("should return all node requests with pagination", async () => {
      const mockNodes = [
        {
          orgName: "Org1",
          email: "org1@example.com",
          nodeAddress: "node1",
          requestFor: LINK,
          bandwidth: 100,
          plan: "basic",
          location: "US",
          planId: "plan1",
          provAddress: "prov1",
          hours: 24,
        },
      ];

      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue(mockNodes);
      (prisma.nodeRequest.count as jest.Mock).mockResolvedValue(10);

      const result = await NodeService.getAllNodeRequestList(1, 10, LINK, UNDEFINED);

      expect(result).toEqual({
        error: false,
        data: {
          nodeList: mockNodes,
          count: 10,
        },
        message: RES_MSG.NODE_REQUESTLIST,
      });
    });

    it("should filter by provider address", async () => {
      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.nodeRequest.count as jest.Mock).mockResolvedValue(0);

      await NodeService.getAllNodeRequestList(1, 10, LINK, "prov123");

      expect(prisma.nodeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provAddress: "prov123",
          }),
        })
      );
    });

    it("should handle errors gracefully", async () => {
      (prisma.nodeRequest.findMany as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await NodeService.getAllNodeRequestList(1, 10, LINK, UNDEFINED);

      expect(result).toEqual({
        error: true,
        message: RES_MSG.ERROR,
      });
    });
  });

  describe("getAllNodeForAddress", () => {
    it("should return error when provider address is missing", async () => {
      const result = await NodeService.getAllNodeForAddress(UNDEFINED, 1, 10);

      expect(result).toEqual({
        error: true,
        message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT,
      });
    });

    it("should return nodes for provider address with pagination", async () => {
      const mockNodes = [
        {
          orgName: "Org1",
          nodeAddress: "node1",
          requestFor: LINK,
          status: PENDING,
        },
      ];

      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue(mockNodes);
      (prisma.nodeRequest.count as jest.Mock).mockResolvedValue(5);

      const result = await NodeService.getAllNodeForAddress("prov123", 1, 10);

      expect(result).toEqual({
        error: false,
        message: RES_MSG.SUCCESS,
        data: {
          response: mockNodes,
          total: 5,
        },
      });
    });

    it("should filter by status when provided", async () => {
      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.nodeRequest.count as jest.Mock).mockResolvedValue(0);

      await NodeService.getAllNodeForAddress("prov123", 1, 10, ACTIVE);

      expect(prisma.nodeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            nodeStatus: ACTIVE,
          }),
        })
      );
    });

    it("should filter by request status when provided", async () => {
      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.nodeRequest.count as jest.Mock).mockResolvedValue(0);

      await NodeService.getAllNodeForAddress("prov123", 1, 10, UNDEFINED, PENDING);

      expect(prisma.nodeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PENDING,
          }),
        })
      );
    });
  });

  describe("updateNodeStatus", () => {
    it("should return error when nodeAddress is missing", async () => {
      const result = await NodeService.updateNodeStatus(UNDEFINED, "prov123", APPROVED);

      expect(result).toEqual({
        error: true,
        message: RES_MSG.NODE_ADRES_IS_NOT_PRESENT,
      });
    });

    it("should update node status and send approval email", async () => {
      const mockUpdatedNode = {
        email: "test@example.com",
        nodeAddress: "node123",
        address: "wallet123",
        requestFor: LINK,
        plan: "basic",
        planId: "plan1",
        provAddress: "prov123",
        bandwidth: 100,
        hours: 24,
      };

      (prisma.nodeRequest.update as jest.Mock).mockResolvedValue(mockUpdatedNode);
      (mailService.sendApprovalMail as jest.Mock).mockResolvedValue({ error: false });
      (AuthService.addUser as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          user: { id: "user1", role: "user" },
          provider: { id: "prov1" },
        },
      });
      (prisma.activity.create as jest.Mock).mockResolvedValue({});

      const result = await NodeService.updateNodeStatus("node123", "prov123", APPROVED);

      expect(result).toEqual({
        error: false,
        message: RES_MSG.SUCCESS,
      });
      expect(mailService.sendApprovalMail).toHaveBeenCalledWith("test@example.com", "node123", true);
      expect(prisma.activity.create).toHaveBeenCalled();
    });

    it("should handle rejection status", async () => {
      const mockUpdatedNode = {
        email: "test@example.com",
        nodeAddress: "node123",
        address: "wallet123",
        requestFor: LINK,
        plan: "basic",
        planId: "plan1",
        provAddress: "prov123",
        bandwidth: 100,
        hours: 24,
      };

      (prisma.nodeRequest.update as jest.Mock).mockResolvedValue(mockUpdatedNode);
      (mailService.sendApprovalMail as jest.Mock).mockResolvedValue({ error: false });
      (AuthService.addUser as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          user: { id: "user1", role: "user" },
          provider: { id: "prov1" },
        },
      });
      (prisma.activity.create as jest.Mock).mockResolvedValue({});

      await NodeService.updateNodeStatus("node123", "prov123", REJECTED);

      expect(mailService.sendApprovalMail).toHaveBeenCalledWith("test@example.com", "node123", false);
    });

    it("should return success message when email is not present", async () => {
      (prisma.nodeRequest.update as jest.Mock).mockResolvedValue({
        email: null,
        nodeAddress: "node123",
      });

      const result = await NodeService.updateNodeStatus("node123", "prov123", APPROVED);

      expect(result).toEqual({
        error: false,
        message: RES_MSG.NODE_REQUEST_ACTION_DONE_NO_EMAIL,
      });
    });

    it("should handle email sending failure", async () => {
      const mockUpdatedNode = {
        email: "test@example.com",
        nodeAddress: "node123",
        address: "wallet123",
        requestFor: LINK,
        plan: "basic",
        planId: "plan1",
        provAddress: "prov123",
        bandwidth: 100,
        hours: 24,
      };

      (prisma.nodeRequest.update as jest.Mock).mockResolvedValue(mockUpdatedNode);
      (mailService.sendApprovalMail as jest.Mock).mockResolvedValue({ error: true });
      (AuthService.addUser as jest.Mock).mockResolvedValue({
        error: false,
        data: {
          user: { id: "user1", role: "user" },
          provider: { id: "prov1" },
        },
      });
      (prisma.activity.create as jest.Mock).mockResolvedValue({});

      const result = await NodeService.updateNodeStatus("node123", "prov123", APPROVED);

      expect(result).toEqual({
        error: false,
        message: RES_MSG.UNABLE_TO_SEND_EMAIL,
      });
    });
  });

  describe("getAllCountForAddress", () => {
    it("should return error when provider address is missing", async () => {
      const result = await NodeService.getAllCountForAddress(UNDEFINED);

      expect(result).toEqual({
        error: true,
        message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT,
      });
    });

    it("should return counts for provider address", async () => {
      (prisma.nodeRequest.count as jest.Mock)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(3);

      const result = await NodeService.getAllCountForAddress("prov123");

      expect(result).toEqual({
        error: false,
        message: RES_MSG.SUCCESS,
        data: {
          totalCount: 10,
          activeCount: 7,
          inactiveCount: 3,
        },
      });
    });

    it("should handle errors gracefully", async () => {
      (prisma.nodeRequest.count as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await NodeService.getAllCountForAddress("prov123");

      expect(result).toEqual({
        error: true,
        message: RES_MSG.ERROR,
      });
    });
  });

  describe("getNodeRequestStatus", () => {
    it("should return error when wallet address is missing", async () => {
      const result = await NodeService.getNodeRequestStatus(UNDEFINED);

      expect(result).toEqual({
        error: true,
        message: RES_MSG.WALLET_ADDRESS_IS_NOT_PRESENT,
      });
    });

    it("should return error when node is not found", async () => {
      (prisma.nodeRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await NodeService.getNodeRequestStatus("wallet123");

      expect(result).toEqual({
        error: true,
        message: RES_MSG.WALLET_ADDRESS,
      });
    });

    it("should return node request status", async () => {
      (prisma.nodeRequest.findUnique as jest.Mock).mockResolvedValue({
        status: PENDING,
        requestFor: LINK,
      });

      const result = await NodeService.getNodeRequestStatus("wallet123");

      expect(result).toEqual({
        error: false,
        message: RES_MSG.SUCCESS,
        data: {
          requestFor: LINK,
          status: PENDING,
        },
      });
    });
  });

  describe("getNodeRequestCount", () => {
    it("should return error when provider address is missing", async () => {
      const result = await NodeService.getNodeRequestCount(UNDEFINED);

      expect(result).toEqual({
        error: true,
        message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT,
      });
    });

    it("should return pending request counts", async () => {
      (prisma.nodeRequest.count as jest.Mock)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);

      const result = await NodeService.getNodeRequestCount("prov123");

      expect(result).toEqual({
        error: false,
        message: RES_MSG.SUCCESS,
        data: {
          totalCount: 15,
          linkCount: 10,
          UnlinkCount: 5,
        },
      });
    });

    it("should handle errors gracefully", async () => {
      (prisma.nodeRequest.count as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await NodeService.getNodeRequestCount("prov123");

      expect(result).toEqual({
        error: true,
        message: RES_MSG.ERROR,
      });
    });
  });

  describe("getPrefillValues", () => {
    it("should return prefill values for address", async () => {
      const mockRecord = {
        orgName: "Test Org",
        email: "test@example.com",
        nodeAddress: "node123",
        provAddress: "prov123",
      };

      (prisma.nodeRequest.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const result = await NodeService.getPrefillValues("wallet123");

      expect(result).toEqual({
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: { data: mockRecord },
      });
    });

    it("should return null when record not found", async () => {
      (prisma.nodeRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await NodeService.getPrefillValues("wallet123");

      expect(result).toEqual({
        error: true,
        message: RES_MSG.NO_RECORDS,
      });
    });
  });
});
