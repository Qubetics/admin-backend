import { Request, Response } from "express";
import BigNumber from "bignumber.js";

jest.mock("../.././../../src/constant", () => ({
  RES_MSG: {
    NODE_REQUESTLIST: "node request list",
    ERROR: "internal error",
  },
  WALLET_PREFIX: "wallet:",
}));

jest.mock("../.././../../src/Utility/common", () => ({
  parseAndConvertPlan: jest.fn((p: any) => `converted-${p}`),
  bytesToGb: jest.fn(() => "10GB"),
  convertNodeToWallet: jest.fn((prov: any, prefix: any) => `${prefix}${prov}`),
}));

jest.mock("../.././../../src/lib/db", () => {
  // provide shape for prisma used in the service
  return {
    __esModule: true,
    default: {
      user: {
        findUnique: jest.fn(),
      },
      activity: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    },
  };
});

describe("ActivityService.getActivityList", () => {
  const prisma = require("../.././../../src/lib/db").default;
  const { parseAndConvertPlan, bytesToGb, convertNodeToWallet } = require("../.././../../src/Utility/common");
  const { RES_MSG } = require("../.././../../src/constant");

  let activityService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // require service after mocks so imports are replaced
    activityService = require("../.././../../src/module/activity/activity.service").default;
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("returns error when user not found", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await activityService.getActivityList(1, 10, "0xnope");

    expect(res).toEqual({ error: true, message: "User not found" });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { address: "0xnope" },
      select: { id: true },
    });
  });

  it("returns empty activity list and count 0", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1" });
    (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.activity.count as jest.Mock).mockResolvedValue(0);

    const res = await activityService.getActivityList(1, 10, "0xuser");

    expect(res.error).toBe(false);
    expect(res.data).toMatchObject({ activityList: [], count: 0 });
    expect(res.message).toBe(RES_MSG.NODE_REQUESTLIST);
  });

  it("processes metaData.plan and metaData.bandwidth and sets providerName null when no provAddress", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-2" });
    const activity = {
      id: "a1",
      type: "NODE",
      action: "CREATE",
      role: 1,
      metaData: { plan: "100000000000000000000000000000", bandwidth: "1024" },
      userId: "user-2",
      targetUid: null,
      createdAt: new Date(),
    };
    (prisma.activity.findMany as jest.Mock).mockResolvedValue([activity]);
    (prisma.activity.count as jest.Mock).mockResolvedValue(1);

    const res = await activityService.getActivityList(1, 10, "0xuser2");

    expect(parseAndConvertPlan).toHaveBeenCalledWith("100000000000000000000000000000");
    expect(bytesToGb).toHaveBeenCalled();
    expect(res.error).toBe(false);
    expect(res.data.activityList[0].metaData.plan).toBe(parseAndConvertPlan("100000000000000000000000000000"));
    expect(res.data.activityList[0].metaData.bandwidth).toBe(bytesToGb(new BigNumber("1024")));
    expect(res.data.activityList[0].providerName).toBeNull();
  });

  it("fetches provider user and includes providerName when provAddress present", async () => {
    // prisma.user.findUnique is called twice:
    // 1) find user by address (select id)
    // 2) inside mapping find provider user (select name)
    (prisma.user.findUnique as jest.Mock).mockImplementation(async (args: any) => {
      if (args.select && args.select.id) return { id: "user-3" };
      if (args.select && args.select.name) return { name: "Provider Joe" };
      return null;
    });

    const activity = {
      id: "a2",
      type: "NODE",
      action: "UPDATE",
      role: 1,
      metaData: { provAddress: "node-1" },
      userId: "user-3",
      targetUid: null,
      createdAt: new Date(),
    };

    (prisma.activity.findMany as jest.Mock).mockResolvedValue([activity]);
    (prisma.activity.count as jest.Mock).mockResolvedValue(1);

    const res = await activityService.getActivityList(1, 10, "0xuser3");

    expect(convertNodeToWallet).toHaveBeenCalledWith("node-1", "wallet:");
    expect(res.error).toBe(false);
    expect(res.data.activityList[0].providerName).toBe("Provider Joe");
  });

  it("returns error with RES_MSG.ERROR when an exception is thrown", async () => {
    (prisma.user.findUnique as jest.Mock).mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await activityService.getActivityList(1, 10, "0xbad");

    expect(res).toEqual({ error: true, message: RES_MSG.ERROR });
  });
});
