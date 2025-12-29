import cron from "node-cron";
import axios from "axios";
import geoip from "geoip-lite";
import countries from "i18n-iso-countries";
import Worker from "../../../src/worker";
import { saveNodes, saveProvider, batchUpdateNodeRequests } from "../../../src/helper/node.helper";
import prisma from "../../../src/lib/db";
import authService from "../../../src/module/auth/auth.service";

jest.mock("node-cron");
jest.mock("axios");
jest.mock("geoip-lite");
jest.mock("i18n-iso-countries");
jest.mock("../../../src/helper/node.helper");
jest.mock("../../../src/module/auth/auth.service");

jest.mock("../../../src/Utility/common", () => ({
  convertNodeToWallet: jest.fn().mockImplementation((nodeAddress: string) => `qubetics:${nodeAddress}`),
  extractIP: jest.fn().mockImplementation((url: string) => "1.2.3.4"),
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
    workerInstance = Worker;

    (cron.schedule as jest.Mock).mockImplementation((time, callback) => {
      (cron.schedule as any).lastCallback = callback;
      return { start: jest.fn(), stop: jest.fn() };
    });

    (global as any).environment = {
      evmHost: "https://test-api.example.com/",
      planHost: "http://test-host",
    };

    (prisma.$connect as jest.Mock).mockResolvedValue(undefined);
    (prisma.nodeRequest.upsert as jest.Mock).mockResolvedValue({});
    (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.activity.create as jest.Mock).mockResolvedValue({});

    const { convertNodeToWallet } = require("../../../src/Utility/common");
    (convertNodeToWallet as jest.Mock).mockImplementation((nodeAddress: string) => `qubetics:${nodeAddress}`);
  });

  describe("startNodeWorker", () => {
    it("should fetch and save nodes successfully", async () => {
      const mockNodes = [
        { id: 1, name: "Node 1" },
        { id: 2, name: "Node 2" },
      ];

      mockAxios.get.mockResolvedValueOnce({
        data: { nodes: mockNodes },
      });

      mockSaveNodes.mockResolvedValueOnce([{ status: "fulfilled", value: "success" }]);

      await workerInstance.startNodeWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockAxios.get).toHaveBeenCalledWith("https://test-api.example.com//qubetics/node/v3/nodes");
      expect(mockSaveNodes).toHaveBeenCalledWith(mockNodes);
    });

    it("should handle rejected results in forEach loop", async () => {
      const mockNodes = [{ id: 1, name: "Node 1" }];
      const logger = require("../../../src/lib/logger").default;
      const loggerInfoSpy = jest.spyOn(logger, "info");
      const loggerErrorSpy = jest.spyOn(logger, "error");

      mockAxios.get.mockResolvedValueOnce({
        data: { nodes: mockNodes },
      });

      mockSaveNodes.mockResolvedValueOnce([
        { status: "rejected", reason: new Error("Save failed") },
        { status: "fulfilled", value: "success" },
      ]);

      await workerInstance.startNodeWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(loggerInfoSpy).toHaveBeenCalledWith("Node updated row(s)");

      loggerInfoSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });

    it("should handle missing nodes data in response", async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {},
      });

      await workerInstance.startNodeWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockAxios.get).toHaveBeenCalled();
    });

    it("should handle errors when fetching nodes", async () => {
      const error = new Error("Network error");
      mockAxios.get.mockRejectedValueOnce(error);

      await workerInstance.startNodeWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockAxios.get).toHaveBeenCalled();
    });
  });

  describe("nodeRequestWorker", () => {
    const mockPlans = [
      {
        id: 1,
        prov_address: "provider1",
        hours: 720,
        gigabytes: 1000,
        prices: [{ quote_value: 100 }],
      },
    ];

    const mockNode = {
      address: "qubetics1testnodeaddressherewithsufficientlength",
      status: "active",
      remote_url: "http://1.2.3.4:1234",
    };

    beforeEach(() => {
      (geoip.lookup as jest.Mock).mockReturnValue({
        country: "US",
      });
      (countries.getName as jest.Mock).mockReturnValue("United States");

      (authService.addUser as jest.Mock).mockResolvedValue({});

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

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAxios.get).toHaveBeenCalledWith("https://test-api.example.com//qubetics/plan/v3/plans");
      expect(mockAxios.get).toHaveBeenCalledWith("https://test-api.example.com//qubetics/node/v3/plans/1/nodes");
      expect(authService.addUser).toHaveBeenCalledWith(
        expect.objectContaining({
          address: expect.stringContaining("qubetics1testnodeaddressherewithsufficientlength"),
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
          prices: [{ quote_value: 100 }],
        },
        {
          id: 2,
          prov_address: "provider2",
          hours: 1440,
          gigabytes: 2000,
          prices: [{ quote_value: 200 }],
        },
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
      mockAxios.get
        .mockResolvedValueOnce({
          data: { plans: mockPlans },
        })
        .mockRejectedValueOnce(new Error("Node fetch failed for plan 1"));

      await workerInstance.nodeRequestWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAxios.get).toHaveBeenCalled();
    });

    it("should handle errors during node request processing", async () => {
      const error = new Error("API error");
      mockAxios.get.mockRejectedValueOnce(error);

      await workerInstance.nodeRequestWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockAxios.get).toHaveBeenCalled();
    });
  });

  describe("startProviderWorker", () => {
    it("should fetch and save providers successfully", async () => {
      const mockProviders = [
        { id: 1, name: "Provider 1" },
        { id: 2, name: "Provider 2" },
      ];

      mockAxios.get.mockResolvedValueOnce({
        data: { providers: mockProviders },
      });

      mockSaveProvider.mockResolvedValueOnce(undefined);

      await workerInstance.startProviderWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockAxios.get).toHaveBeenCalledWith("https://test-api.example.com//qubetics/provider/v2/providers");
      expect(mockSaveProvider).toHaveBeenCalledWith(mockProviders);
    });

    it("should handle provider fetch errors", async () => {
      const error = new Error("Provider error");
      mockAxios.get.mockRejectedValueOnce(error);

      await workerInstance.startProviderWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockAxios.get).toHaveBeenCalled();
    });

    it("should handle empty providers array", async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { providers: [] },
      });

      mockSaveProvider.mockResolvedValueOnce(undefined);

      await workerInstance.startProviderWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockSaveProvider).toHaveBeenCalledWith([]);
    });

    it("should handle missing providers in response", async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {},
      });

      mockSaveProvider.mockResolvedValueOnce(undefined);

      await workerInstance.startProviderWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockSaveProvider).toHaveBeenCalledWith([]);
    });
  });

  describe("nodeUnlinkWorker", () => {
    const mockBatchUpdate = batchUpdateNodeRequests as jest.MockedFunction<typeof batchUpdateNodeRequests>;

    beforeEach(() => {
      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue([]);
      mockBatchUpdate.mockResolvedValue(undefined);
    });

    it("should process nodes unlinked via CLI successfully", async () => {
      const mockRequests = [
        {
          id: "req1",
          planId: "plan1",
          nodeAddress: "node1",
          requestFor: "Link",
          status: "APPROVED",
        },
        {
          id: "req2",
          planId: "plan1",
          nodeAddress: "node2",
          requestFor: "Unlink",
          status: "REJECTED",
        },
      ];

      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValueOnce(mockRequests);

      mockAxios.get.mockResolvedValueOnce({
        data: { nodes: [{ address: "node1" }] },
      });

      await workerInstance.nodeUnlinkWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAxios.get).toHaveBeenCalledWith("https://test-api.example.com//qubetics/node/v3/plans/plan1/nodes");
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        ["req2"],
        expect.objectContaining({
          status: "APPROVED",
          requestFor: "Unlink",
        }),
        "Nodes unlinked"
      );
    });

    it("should handle empty node requests", async () => {
      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValueOnce([]);

      await workerInstance.nodeUnlinkWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockBatchUpdate).not.toHaveBeenCalled();
    });

    it("should handle errors when fetching plan nodes", async () => {
      const mockRequests = [
        {
          id: "req1",
          planId: "plan1",
          nodeAddress: "node1",
          requestFor: "Link",
          status: "APPROVED",
        },
      ];

      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValueOnce(mockRequests);
      mockAxios.get.mockRejectedValueOnce(new Error("API error"));

      await workerInstance.nodeUnlinkWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAxios.get).toHaveBeenCalled();
    });
  });

  describe("nodeTerminationWorker", () => {
    const mockBatchUpdate = batchUpdateNodeRequests as jest.MockedFunction<typeof batchUpdateNodeRequests>;

    beforeEach(() => {
      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValue([]);
      mockBatchUpdate.mockResolvedValue(undefined);
    });

    it("should process terminated nodes successfully", async () => {
      const mockRequests = [
        { id: "req1", nodeAddress: "node1" },
        { id: "req2", nodeAddress: "node2" },
        { id: "req3", nodeAddress: "node3" },
      ];

      const mockActiveNodes = [{ address: "node1" }, { address: "node2" }];

      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValueOnce(mockRequests);
      mockAxios.get.mockResolvedValueOnce({
        data: { nodes: mockActiveNodes },
      });

      await workerInstance.nodeTerminationWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAxios.get).toHaveBeenCalledWith("https://test-api.example.com//qubetics/node/v3/nodes");
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        ["req3"],
        expect.objectContaining({
          status: "APPROVED",
          requestFor: "Unlink",
        }),
        "Nodes terminated"
      );
    });

    it("should handle empty node requests in database", async () => {
      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValueOnce([]);

      await workerInstance.nodeTerminationWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockBatchUpdate).not.toHaveBeenCalled();
    });

    it("should handle all nodes being active", async () => {
      const mockRequests = [
        { id: "req1", nodeAddress: "node1" },
        { id: "req2", nodeAddress: "node2" },
      ];

      const mockActiveNodes = [{ address: "node1" }, { address: "node2" }];

      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValueOnce(mockRequests);
      mockAxios.get.mockResolvedValueOnce({
        data: { nodes: mockActiveNodes },
      });

      await workerInstance.nodeTerminationWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockBatchUpdate).toHaveBeenCalledWith([], expect.anything(), "Nodes terminated");
    });

    it("should handle errors when fetching active nodes", async () => {
      const mockRequests = [{ id: "req1", nodeAddress: "node1" }];

      (prisma.nodeRequest.findMany as jest.Mock).mockResolvedValueOnce(mockRequests);
      mockAxios.get.mockRejectedValueOnce(new Error("API error"));

      await workerInstance.nodeTerminationWorker();
      const callback = (cron.schedule as any).lastCallback;
      await callback();

      expect(mockAxios.get).toHaveBeenCalled();
    });
  });
});
