// Mock dependencies BEFORE importing the service
jest.mock("../../../../src/lib/db", () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    user: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../../../src/Utility/common", () => ({
  convertNodeToWallet: jest.fn(),
  extractIP: jest.fn(),
  fetchRequest: jest.fn(),
  getOffset: jest.fn(),
  getWalletAddressFromNodeAddress: jest.fn(),
}));

jest.mock("geoip-lite", () => ({
  lookup: jest.fn(),
}));

// Import AFTER mocking
import ProviderService from "../../../../src/module/provider/provider.service";
import prisma from "../../../../src/lib/db";
import {
  convertNodeToWallet,
  extractIP,
  fetchRequest,
  getOffset,
  getWalletAddressFromNodeAddress,
} from "../../../../src/Utility/common";
import { FETCH_METHODS, RES_MSG, WALLET_PREFIX } from "../../../../src/constant";
import geoip from "geoip-lite";

describe("ProviderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment before each test
    (global as any).environment = {
      evmHost: "https://test-api.example.com/",
    };
  });

  describe("getAllProvider", () => {
    it("should fetch all providers successfully without pagination", async () => {
      const mockResponse = {
        data: {
          providers: [
            { address: "provider1", status: "active" },
            { address: "provider2", status: "inactive" },
          ],
          pagination: { total: 2 },
        },
      };

      (fetchRequest as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ProviderService.getAllProvider({});

      expect(fetchRequest).toHaveBeenCalledWith(
        "https://test-api.example.com/qubetics/provider/v2/providers",
        FETCH_METHODS.GET
      );
      expect(result).toEqual({
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: { providers: mockResponse.data.providers },
        total: mockResponse.data.pagination,
      });
    });

    it("should fetch providers with pagination and node counts", async () => {
      const mockResponse = {
        data: {
          providers: [
            { address: "provider1", status: "active" },
            { address: "provider2", status: "active" },
          ],
          pagination: { total: 2 },
        },
      };

      const mockNodeCounts = [
        { provAddress: "provider1", count: BigInt(5) },
        { provAddress: "provider2", count: BigInt(3) },
      ];

      (fetchRequest as jest.Mock).mockResolvedValue(mockResponse);
      (getOffset as jest.Mock).mockReturnValue(0);
      (getWalletAddressFromNodeAddress as jest.Mock).mockReturnValueOnce("wallet1").mockReturnValueOnce("wallet2");
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockNodeCounts);

      const result = await ProviderService.getAllProvider({ page: 1, limit: 10 });

      expect(getOffset).toHaveBeenCalledWith(1, 10);
      expect(fetchRequest).toHaveBeenCalledWith(
        expect.stringContaining("pagination.offset=0&pagination.limit=10"),
        FETCH_METHODS.GET
      );
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result.data.providers[0]).toHaveProperty("nodeCount", 5);
      expect(result.data.providers[1]).toHaveProperty("nodeCount", 3);
      expect(result.data.providers[0]).toHaveProperty("walletAddress", "wallet1");
      expect(result.data.providers[1]).toHaveProperty("walletAddress", "wallet2");
    });

    it("should handle empty providers list", async () => {
      const mockResponse = {
        data: {
          providers: [],
          pagination: { total: 0 },
        },
      };

      (fetchRequest as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ProviderService.getAllProvider({});

      expect(result).toEqual({
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: { providers: [] },
        total: mockResponse.data.pagination,
      });
    });

    it("should handle fetch request failure", async () => {
      (fetchRequest as jest.Mock).mockResolvedValue(null);

      const result = await ProviderService.getAllProvider({});

      expect(result).toEqual({
        error: true,
        message: RES_MSG.ERROR,
      });
    });

    it("should handle database query error", async () => {
      const mockResponse = {
        data: {
          providers: [{ address: "provider1", status: "active" }],
          pagination: { total: 1 },
        },
      };

      (fetchRequest as jest.Mock).mockResolvedValue(mockResponse);
      (getOffset as jest.Mock).mockReturnValue(0);
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await ProviderService.getAllProvider({ page: 1, limit: 10 });

      expect(result).toEqual({
        error: true,
        message: RES_MSG.ERROR,
      });
    });

    it("should handle providers with missing pagination data", async () => {
      const mockResponse = {
        data: {
          providers: [{ address: "provider1", status: "active" }],
        },
      };

      (fetchRequest as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ProviderService.getAllProvider({});

      expect(result.data.providers).toHaveLength(1);
    });
  });

  describe("getProviderDetails", () => {
    it("should return error when address is not provided", async () => {
      const result = await ProviderService.getProviderDetails("", "1", "10");

      expect(result).toEqual({
        error: true,
        message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT,
      });
    });

    it("should fetch provider details with nodes successfully", async () => {
      const mockCountResult = [{ count: BigInt(2) }];
      const mockNodeList = [
        {
          nodeAddress: "node1",
          location: "US",
          nodeStatus: "active",
          remoteUrl: "http://192.168.1.1:8080",
          orgName: "Org One",
        },
        {
          nodeAddress: "node2",
          location: "UK",
          nodeStatus: "inactive",
          remoteUrl: "http://192.168.1.2:8080",
          orgName: "Org Two",
        },
      ];

      (getOffset as jest.Mock).mockReturnValue(0);
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockCountResult).mockResolvedValueOnce(mockNodeList);
      (extractIP as jest.Mock).mockReturnValueOnce("192.168.1.1").mockReturnValueOnce("192.168.1.2");
      (geoip.lookup as jest.Mock).mockReturnValueOnce({ city: "New York" }).mockReturnValueOnce({ city: "London" });

      const result = await ProviderService.getProviderDetails("provider1", "1", "10");

      expect(getOffset).toHaveBeenCalledWith(1, 10);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: {
          total: 2,
          nodes: [
            { ...mockNodeList[0], city: "New York" },
            { ...mockNodeList[1], city: "London" },
          ],
        },
      });
    });

    it("should handle nodes with no IP extractable from remoteUrl", async () => {
      const mockCountResult = [{ count: BigInt(1) }];
      const mockNodeList = [
        {
          nodeAddress: "node1",
          location: "US",
          nodeStatus: "active",
          remoteUrl: "invalid-url",
          orgName: "Test Org",
        },
      ];

      (getOffset as jest.Mock).mockReturnValue(0);
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockCountResult).mockResolvedValueOnce(mockNodeList);
      (extractIP as jest.Mock).mockReturnValueOnce(null);

      const result = await ProviderService.getProviderDetails("provider1", "1", "10");

      expect(result.data.nodes[0]).toHaveProperty("city", null);
    });

    it("should handle nodes with IP but no geo data", async () => {
      const mockCountResult = [{ count: BigInt(1) }];
      const mockNodeList = [
        {
          nodeAddress: "node1",
          location: "US",
          nodeStatus: "active",
          remoteUrl: "http://192.168.1.1:8080",
          orgName: null,
        },
      ];

      (getOffset as jest.Mock).mockReturnValue(0);
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockCountResult).mockResolvedValueOnce(mockNodeList);
      (extractIP as jest.Mock).mockReturnValueOnce("192.168.1.1");
      (geoip.lookup as jest.Mock).mockReturnValueOnce(null);

      const result = await ProviderService.getProviderDetails("provider1", "1", "10");

      expect(result.data.nodes[0]).toHaveProperty("city", null);
    });

    it("should handle database error", async () => {
      (getOffset as jest.Mock).mockReturnValue(0);
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await ProviderService.getProviderDetails("provider1", "1", "10");

      expect(result).toEqual({
        error: true,
        message: RES_MSG.ERROR,
      });
    });

    it("should handle empty node list", async () => {
      const mockCountResult = [{ count: BigInt(0) }];
      const mockNodeList: any[] = [];

      (getOffset as jest.Mock).mockReturnValue(0);
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockCountResult).mockResolvedValueOnce(mockNodeList);

      const result = await ProviderService.getProviderDetails("provider1", "1", "10");

      expect(result).toEqual({
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: {
          total: 0,
          nodes: [],
        },
      });
    });

    it("should use default pagination when not provided", async () => {
      const mockCountResult = [{ count: BigInt(1) }];
      const mockNodeList = [
        {
          nodeAddress: "node1",
          location: "US",
          nodeStatus: "active",
          remoteUrl: "http://192.168.1.1:8080",
          orgName: "Test Org",
        },
      ];

      (getOffset as jest.Mock).mockReturnValue(0);
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockCountResult).mockResolvedValueOnce(mockNodeList);
      (extractIP as jest.Mock).mockReturnValueOnce("192.168.1.1");
      (geoip.lookup as jest.Mock).mockReturnValueOnce({ city: "New York" });

      const result = await ProviderService.getProviderDetails("provider1");

      expect(getOffset).toHaveBeenCalledWith(1, 10);
      expect(result.error).toBe(false);
    });
  });

  describe("getActivePlanProviders", () => {
    it("should fetch active plan providers successfully", async () => {
      const mockResponse = {
        data: {
          plans: [
            { prov_address: "provider1", status: "active" },
            { prov_address: "provider2", status: "active" },
            { prov_address: "provider3", status: "inactive" },
            { prov_address: "provider1", status: "active" }, // duplicate
          ],
        },
      };

      const mockUsers = [
        { name: "Provider One", address: "wallet1" },
        { name: "Provider Two", address: "wallet2" },
      ];

      (fetchRequest as jest.Mock).mockResolvedValue(mockResponse);
      (convertNodeToWallet as jest.Mock)
        .mockReturnValueOnce("wallet1")
        .mockReturnValueOnce("wallet2")
        .mockReturnValueOnce("wallet1")
        .mockReturnValueOnce("wallet2");
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await ProviderService.getActivePlanProviders();

      expect(fetchRequest).toHaveBeenCalledWith(
        "https://test-api.example.com//qubetics/plan/v3/plans",
        FETCH_METHODS.GET
      );
      expect(convertNodeToWallet).toHaveBeenCalledWith("provider1", WALLET_PREFIX);
      expect(convertNodeToWallet).toHaveBeenCalledWith("provider2", WALLET_PREFIX);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          address: { in: ["wallet1", "wallet2"] },
        },
        select: {
          name: true,
          address: true,
        },
      });
      expect(result.data.providers).toHaveLength(2);
      expect(result.data.providers[0]).toEqual({
        providerAddress: "provider1",
        name: "Provider One",
      });
    });

    it("should handle providers without user names", async () => {
      const mockResponse = {
        data: {
          plans: [{ prov_address: "provider1", status: "active" }],
        },
      };

      (fetchRequest as jest.Mock).mockResolvedValue(mockResponse);
      (convertNodeToWallet as jest.Mock).mockReturnValue("wallet1");
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await ProviderService.getActivePlanProviders();

      expect(result.data.providers[0]).toEqual({
        providerAddress: "provider1",
        name: null,
      });
    });

    it("should handle fetch request error", async () => {
      (fetchRequest as jest.Mock).mockResolvedValue({ error: true });

      const result = await ProviderService.getActivePlanProviders();

      expect(result).toEqual({
        error: true,
        message: RES_MSG.ERROR,
      });
    });

    it("should handle empty plans list", async () => {
      const mockResponse = {
        data: {
          plans: [],
        },
      };

      (fetchRequest as jest.Mock).mockResolvedValue(mockResponse);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await ProviderService.getActivePlanProviders();

      expect(result.data.providers).toEqual([]);
    });

    it("should handle database error when fetching users", async () => {
      const mockResponse = {
        data: {
          plans: [{ prov_address: "provider1", status: "active" }],
        },
      };

      (fetchRequest as jest.Mock).mockResolvedValue(mockResponse);
      (convertNodeToWallet as jest.Mock).mockReturnValue("wallet1");
      (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await ProviderService.getActivePlanProviders();

      expect(result).toEqual({
        error: true,
        message: RES_MSG.ERROR,
      });
    });

    it("should handle exception during processing", async () => {
      (fetchRequest as jest.Mock).mockRejectedValue(new Error("Network Error"));

      const result = await ProviderService.getActivePlanProviders();

      expect(result).toEqual({
        error: true,
        message: RES_MSG.ERROR,
      });
    });
  });
});
