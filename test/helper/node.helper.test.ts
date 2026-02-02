import { saveNodes, saveProvider, batchUpdateNodeRequests } from "../../src/helper/node.helper";
import prisma from "../../src/lib/db";
import * as commonUtil from "../../src/Utility/common";
import { WALLET_PREFIX } from "../../src/constant";
import logger from "../../src/lib/logger";

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    nodeRequest: {
      updateMany: jest.fn(),
    },
    user: {
      upsert: jest.fn(),
    },
  },
}));
jest.mock("../../src/Utility/common");
jest.mock("../../src/lib/logger");

const mockedConvertNodeToWallet = jest.mocked(commonUtil.convertNodeToWallet);

describe("saveNodes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call prisma.nodeRequest.updateMany for each node and return results", async () => {
    const nodeData = [
      { address: "addr1", status: "active" },
      { address: "addr2", status: "inactive" },
    ];

    (prisma.nodeRequest.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await saveNodes(nodeData);

    expect(prisma.nodeRequest.updateMany).toHaveBeenCalledTimes(nodeData.length);
    expect(prisma.nodeRequest.updateMany).toHaveBeenCalledWith({
      where: { nodeAddress: "addr1" },
      data: { nodeStatus: "active" },
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should handle errors and log them", async () => {
    const nodeData = [{ address: "addr1", status: "active" }];
    const error = new Error("Map error");

    // Mock the map/Promise.allSettled to throw directly
    jest.spyOn(Promise, "allSettled").mockRejectedValue(error);

    const result = await saveNodes(nodeData);

    expect(logger.error).toHaveBeenCalledWith(error, "error in the saving the node data");
    expect(result).toBe(error);

    // Restore the original Promise.allSettled
    (Promise.allSettled as any).mockRestore();
  });
});

describe("saveProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedConvertNodeToWallet.mockReset();
  });

  it("should call prisma.user.upsert for each provider and return results", async () => {
    const providers = [
      {
        address: "prov1",
        name: "Provider One",
        identity: "email1@example.com",
        website: "https://provider1.com",
        description: "desc1",
      },
      {
        address: "prov2",
        name: "Provider Two",
        identity: "email2@example.com",
        website: "https://provider2.com",
        description: "desc2",
      },
    ];

    mockedConvertNodeToWallet.mockImplementation((address, prefix) => prefix + address);
    (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await saveProvider(providers);

    expect(mockedConvertNodeToWallet).toHaveBeenCalledTimes(providers.length * 2);
    expect(prisma.user.upsert).toHaveBeenCalledTimes(providers.length);
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { address: WALLET_PREFIX + "prov1" },
      update: {
        role: 1,
        name: "Provider One",
        email: "email1@example.com",
        url: "https://provider1.com",
        description: "desc1",
      },
      create: {
        address: WALLET_PREFIX + "prov1",
        name: "Provider One",
        email: "email1@example.com",
        url: "https://provider1.com",
        description: "desc1",
        role: 1,
      },
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should return early if providers array is empty", async () => {
    const result = await saveProvider([]);
    expect(result).toBeUndefined();
  });

  it("should handle errors and log them", async () => {
    const providers = [
      {
        address: "prov1",
        name: "Provider One",
        identity: "email1@example.com",
        website: "https://provider1.com",
        description: "desc1",
      },
    ];
    const error = new Error("Map error");

    mockedConvertNodeToWallet.mockImplementation((address, prefix) => prefix + address);
    // Mock the map/Promise.allSettled to throw directly
    jest.spyOn(Promise, "allSettled").mockRejectedValue(error);

    const result = await saveProvider(providers);

    expect(logger.error).toHaveBeenCalledWith(error, "error in the saving the node data");
    expect(result).toBe(error);

    // Restore the original Promise.allSettled
    (Promise.allSettled as any).mockRestore();
  });
});

describe("batchUpdateNodeRequests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return early if nodeIds array is empty", async () => {
    await batchUpdateNodeRequests([], { status: "APPROVED" }, "Test Update");

    expect(prisma.nodeRequest.updateMany).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("should update nodes in batches with default batch size", async () => {
    const nodeIds = Array.from({ length: 150 }, (_, i) => `node${i}`);
    const updateData = { status: "APPROVED" };
    const logMessage = "Approving nodes";

    (prisma.nodeRequest.updateMany as jest.Mock).mockResolvedValue({ count: 100 });

    await batchUpdateNodeRequests(nodeIds, updateData, logMessage);

    // Should create 2 batches: 100 and 50
    expect(prisma.nodeRequest.updateMany).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith("Approving nodes: Batch 1/2 - 100 records updated");
    expect(logger.info).toHaveBeenCalledWith("Approving nodes: Batch 2/2 - 50 records updated");
  });

  it("should update nodes with custom batch size", async () => {
    const nodeIds = Array.from({ length: 25 }, (_, i) => `node${i}`);
    const updateData = { status: "REJECTED" };
    const logMessage = "Rejecting nodes";
    const batchSize = 10;

    (prisma.nodeRequest.updateMany as jest.Mock).mockResolvedValue({ count: 10 });

    await batchUpdateNodeRequests(nodeIds, updateData, logMessage, batchSize);

    // Should create 3 batches: 10, 10, and 5
    expect(prisma.nodeRequest.updateMany).toHaveBeenCalledTimes(3);
    expect(logger.info).toHaveBeenCalledTimes(3);
  });

  it("should handle errors in individual batches and continue processing", async () => {
    const nodeIds = ["node1", "node2", "node3"];
    const updateData = { status: "APPROVED" };
    const logMessage = "Updating nodes";
    const error = new Error("Database error");

    (prisma.nodeRequest.updateMany as jest.Mock)
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ count: 1 });

    await batchUpdateNodeRequests(nodeIds, updateData, logMessage, 1);

    expect(prisma.nodeRequest.updateMany).toHaveBeenCalledTimes(3);
    expect(logger.error).toHaveBeenCalledWith("Error processing batch 2:", error);
    expect(logger.info).toHaveBeenCalledTimes(2); // Only successful batches log info
  });

  it("should update nodes with correct data structure", async () => {
    const nodeIds = ["node1", "node2"];
    const updateData = { status: "PENDING", action: true };
    const logMessage = "Test update";

    (prisma.nodeRequest.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

    await batchUpdateNodeRequests(nodeIds, updateData, logMessage, 10);

    expect(prisma.nodeRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["node1", "node2"] },
      },
      data: updateData,
    });
  });
});
