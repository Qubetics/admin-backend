import cron from "node-cron";
import axios from "axios";
import geoip from "geoip-lite";
import countries from "i18n-iso-countries";
import Worker from "../../../src/worker";
import { saveNodes, saveProvider } from "../../../src/helper/node.helper";
import prisma from "../../../src/lib/db";
import authService from "../../../src/module/auth/auth.service";

// Mock external dependencies FIRST
jest.mock("node-cron");
jest.mock("axios");
jest.mock("geoip-lite");
jest.mock("i18n-iso-countries");
jest.mock("../../../src/helper/node.helper");
jest.mock("../../../src/module/auth/auth.service");

// Mock the utility functions that cause bech32 errors
jest.mock("../../../src/Utility/common", () => ({
  convertNodeToWallet: jest
    .fn()
    .mockImplementation((nodeAddress: string) => `qubetics:${nodeAddress}`),
  extractIP: jest.fn().mockImplementation((url: string) => "1.2.3.4"),
}));

// Mock prisma EXACTLY like the reference - at module level with all methods
jest.mock("../../../src/lib/db", () => ({
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  nodeRequest: {
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    upsert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  },
  activity: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  },
}));

describe("Worker", () => {
  let workerInstance: typeof Worker;
  const mockAxios = axios as jest.Mocked<typeof axios>;
  const mockSaveNodes = saveNodes as jest.MockedFunction<typeof saveNodes>;
  const mockSaveProvider = saveProvider as jest.MockedFunction<typeof saveProvider>;
  const mockAuthService = authService as jest.Mocked<typeof authService>;

  beforeEach(() => {
    jest.clearAllMocks();
    workerInstance = Worker;

    (cron.schedule as jest.Mock).mockImplementation((time, callback) => {
      // Store the callback to be called in tests
      (cron.schedule as any).lastCallback = callback;
      return { start: jest.fn(), stop: jest.fn() };
    });

    (global as any).environment = {
      evmHost: "https://test-api.example.com/",
      planHost: "http://test-host",
    };

    // Reset mocks to default values
    (prisma.$connect as jest.Mock).mockResolvedValue(undefined);
    (prisma.nodeRequest.upsert as jest.Mock).mockResolvedValue({});
    (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.activity.create as jest.Mock).mockResolvedValue({});

    // Reset utility mock
    const { convertNodeToWallet } = require("../../../src/Utility/common");
    (convertNodeToWallet as jest.Mock).mockImplementation((nodeAddress: string) => `qubetics:${nodeAddress}`);
  });

  describe("startNodeWorker", () => {
    it("should fetch and save nodes successfully", async () => {
      const mockNodes = [
        { id: 1, name: "Node 1" },
        { id: 2, name: "Node 2" }
      ];

      mockAxios.get.mockResolvedValueOnce({
        data: { nodes: mockNodes }
      });

      mockSaveNodes.mockResolvedValueOnce([{ status: "fulfilled", value: "success" }]);

      await workerInstance.startNodeWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockAxios.get).toHaveBeenCalledWith(
        "https://test-api.example.com//qubetics/node/v3/nodes"
      );
      expect(mockSaveNodes).toHaveBeenCalledWith(mockNodes);
    });

    it("should handle rejected results in forEach loop", async () => {
      const mockNodes = [{ id: 1, name: "Node 1" }];
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      mockAxios.get.mockResolvedValueOnce({
        data: { nodes: mockNodes }
      });

      mockSaveNodes.mockResolvedValueOnce([
        { status: "rejected", reason: new Error("Save failed") },
        { status: "fulfilled", value: "success" }
      ]);

      await workerInstance.startNodeWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(consoleErrorSpy).toHaveBeenCalledWith("Node  failed:", "Save failed");
      expect(consoleLogSpy).toHaveBeenCalledWith(" Node updated row(s))");

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should handle missing nodes data in response", async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {}
      });

      await workerInstance.startNodeWorker();
      const callback = (cron.schedule as any).lastCallback;

      await expect(callback()).rejects.toThrow("Response data missing");
    });

    it("should handle errors when fetching nodes", async () => {
      const error = new Error("Network error");
      mockAxios.get.mockRejectedValueOnce(error);

      await workerInstance.startNodeWorker();
      const callback = (cron.schedule as any).lastCallback;
      await expect(callback()).rejects.toThrow("Network error");
    });
  });

  describe("nodeRequestWorker", () => {
    const mockPlans = [
      {
        id: 1,
        prov_address: "provider1",
        hours: 720,
        gigabytes: 1000,
        prices: [{ quote_value: 100 }]
      }
    ];

    // ✅ FIXED: Use valid bech32-like address format
    const mockNode = {
      address: "qubetics1testnodeaddressherewithsufficientlength",
      status: "active",
      remote_url: "http://1.2.3.4:1234",
    };

    beforeEach(() => {
      // Mock geoip and countries
      (geoip.lookup as jest.Mock).mockReturnValue({
        country: "US"
      });
      (countries.getName as jest.Mock).mockReturnValue("United States");

      // Setup auth service mock methods
      (authService.addUser as jest.Mock).mockResolvedValue({});

      // Reset prisma mocks specifically for nodeRequestWorker
      (prisma.nodeRequest.upsert as jest.Mock).mockResolvedValue({});
      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.activity.create as jest.Mock).mockResolvedValue({});
    });

    it("should process node requests successfully", async () => {
      mockAxios.get
        .mockResolvedValueOnce({
          data: { plans: mockPlans },
        })
        .mockResolvedValueOnce({
          data: { nodes: [mockNode] },
        });

      await workerInstance.nodeRequestWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      // Wait for all promises to resolve inside the worker
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAxios.get).toHaveBeenCalledWith(
        "https://test-api.example.com//qubetics/plan/v3/plans"
      );
      expect(mockAxios.get).toHaveBeenCalledWith(
        "https://test-api.example.com//qubetics/node/v3/plans/1/nodes"
      );
      expect(authService.addUser).toHaveBeenCalledWith(
        expect.objectContaining({
          address: expect.stringContaining(
            "qubetics1testnodeaddressherewithsufficientlength"
          ),
        })
      );
      expect(prisma.nodeRequest.upsert).toHaveBeenCalled();
    });

    it("should handle empty nodes array", async () => {
      mockAxios.get
        .mockResolvedValueOnce({
          data: { plans: mockPlans },
        })
        .mockResolvedValueOnce({
          data: { nodes: [] },
        });

      await workerInstance.nodeRequestWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      await new Promise((resolve) => setImmediate(resolve));

      expect(authService.addUser).not.toHaveBeenCalled();
      expect(prisma.nodeRequest.upsert).not.toHaveBeenCalled();
    });

    it("should use geo.country when countries.getName returns undefined", async () => {
      (geoip.lookup as jest.Mock).mockReturnValueOnce({ country: "XX" });
      (countries.getName as jest.Mock).mockReturnValueOnce(undefined);

      mockAxios.get
        .mockResolvedValueOnce({
          data: { plans: mockPlans },
        })
        .mockResolvedValueOnce({
          data: { nodes: [mockNode] },
        });

      await workerInstance.nodeRequestWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      await new Promise((resolve) => setImmediate(resolve));

      expect(prisma.nodeRequest.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            location: "XX",
          }),
        })
      );
    });

    it("should handle multiple plans and nodes", async () => {
      const multiplePlans = [
        {
          id: 1,
          prov_address: "provider1",
          hours: 720,
          gigabytes: 1000,
          prices: [{ quote_value: 100 }]
        },
        {
          id: 2,
          prov_address: "provider2",
          hours: 1440,
          gigabytes: 2000,
          prices: [{ quote_value: 200 }]
        }
      ];

      const node2 = {
        address: "qubetics1anothernodetestaddresswithsufficientlength",
        status: "active",
        remote_url: "http://5.6.7.8:5678",
      };

      mockAxios.get
        .mockResolvedValueOnce({
          data: { plans: multiplePlans },
        })
        .mockResolvedValueOnce({
          data: { nodes: [mockNode] },
        })
        .mockResolvedValueOnce({
          data: { nodes: [node2] },
        });

      await workerInstance.nodeRequestWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAxios.get).toHaveBeenCalledTimes(3); // 1 for plans, 2 for nodes
      expect(authService.addUser).toHaveBeenCalledTimes(2);
      expect(prisma.nodeRequest.upsert).toHaveBeenCalledTimes(2);
    });

    it("should handle errors in Promise.all for individual plans", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockAxios.get
        .mockResolvedValueOnce({
          data: { plans: mockPlans },
        })
        .mockRejectedValueOnce(new Error("Node fetch failed for plan 1"));

      await workerInstance.nodeRequestWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      await new Promise((resolve) => setImmediate(resolve));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching nodes for plan 1:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle errors during node request processing", async () => {
      mockAxios.get.mockRejectedValueOnce(new Error("API error"));

      await workerInstance.nodeRequestWorker();
      const callback = (cron.schedule as any).lastCallback;
      await expect(callback()).rejects.toThrow("API error");
    });
  });

  describe("startProviderWorker", () => {
    it("should fetch and save providers successfully", async () => {
      const mockProviders = [
        { id: 1, name: "Provider 1" },
        { id: 2, name: "Provider 2" }
      ];

      mockAxios.get.mockResolvedValueOnce({
        data: { providers: mockProviders }
      });

      mockSaveProvider.mockResolvedValueOnce(undefined);

      await workerInstance.startProviderWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockAxios.get).toHaveBeenCalledWith(
        "https://test-api.example.com//qubetics/provider/v2/providers"
      );
      expect(mockSaveProvider).toHaveBeenCalledWith(mockProviders);
    });

    it("should handle provider fetch errors", async () => {
      mockAxios.get.mockRejectedValueOnce(new Error("Provider error"));

      await workerInstance.startProviderWorker();
      const callback = (cron.schedule as any).lastCallback;
      await expect(callback()).rejects.toThrow("Provider error");
    });

    it("should handle empty providers array", async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { providers: [] }
      });

      mockSaveProvider.mockResolvedValueOnce(undefined);

      await workerInstance.startProviderWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockSaveProvider).toHaveBeenCalledWith([]);
    });

    it("should handle missing providers in response", async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {}
      });

      mockSaveProvider.mockResolvedValueOnce(undefined);

      await workerInstance.startProviderWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockSaveProvider).toHaveBeenCalledWith([]);
    });
  });
});
