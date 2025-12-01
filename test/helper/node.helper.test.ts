import { saveNodes, saveProvider } from "../../src/helper/node.helper";
import prisma from "../../src/lib/db";
import * as commonUtil from "../../src/Utility/common";
import { WALLET_PREFIX } from "../../src/constant";

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

const mockedConvertNodeToWallet = jest.mocked(commonUtil.convertNodeToWallet);

describe("saveNodes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call prisma.nodeRequest.updateMany for each node and return results", async () => {
    const nodeData = [
      { address: "addr1", status: "active" },
      { address: "addr2", status: "inactive" }
    ];

    (prisma.nodeRequest.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await saveNodes(nodeData);

    expect(prisma.nodeRequest.updateMany).toHaveBeenCalledTimes(nodeData.length);
    expect(prisma.nodeRequest.updateMany).toHaveBeenCalledWith({
      where: { nodeAddress: "addr1" },
      data: { nodeStatus: "active" }
    });
    expect(Array.isArray(result)).toBe(true);
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
        description: "desc1"
      },
      {
        address: "prov2",
        name: "Provider Two",
        identity: "email2@example.com",
        website: "https://provider2.com",
        description: "desc2"
      }
    ];

    mockedConvertNodeToWallet.mockImplementation((address, prefix) => prefix + address);
    (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await saveProvider(providers);

    expect(mockedConvertNodeToWallet).toHaveBeenCalledTimes(providers.length * 2); // Called twice per provider (where + create)
    expect(prisma.user.upsert).toHaveBeenCalledTimes(providers.length);
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { address: WALLET_PREFIX + "prov1" },
      update: {},
      create: {
        address: WALLET_PREFIX + "prov1",
        name: "Provider One",
        email: "email1@example.com",
        url: "https://provider1.com",
        description: "desc1",
        role: 1
      }
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should return early if providers array is empty", async () => {
    const result = await saveProvider([]);
    expect(result).toBeUndefined();
  });
});
