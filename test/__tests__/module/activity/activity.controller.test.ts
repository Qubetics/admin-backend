import * as Helpers from "../../../../src/service/index";
import activityService from "../../../../src/module/activity/activity.service";
import { Request, Response } from "express";

jest.mock("../.././../../src/service/index", () => ({
  ResponseHelper: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../.././../../src/module/activity/activity.service", () => ({
  __esModule: true,
  default: {
    getActivityList: jest.fn(),
  },
}));

describe("ActivityController.getActivityList", () => {
  let controller: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  const mockActivity = {
    id: "4f5a1b2c-1234-5678-9abc-def012345678",
    type: "NODE",
    action: "CREATE",
    role: 1,
    metaData: { nodeAddress: "0xabc123", plan: "pro" },
    userId: "9e8d7c6b-4321-8765-0fed-cba987654321",
    targetUid: "target-uid-1",
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    const ActivityController = require("../.././../../src/module/activity/activity.controller").default;
    controller = new ActivityController();
    req = { query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("calls ResponseHelper.success when service returns success with prisma-shaped activity", async () => {
    (activityService.getActivityList as jest.Mock).mockResolvedValue({ data: [mockActivity], error: false });

    await (controller as any).getActivityList(req as Request, res as Response);

    expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, { data: [mockActivity], error: false });
    expect(Helpers.ResponseHelper.error).not.toHaveBeenCalled();
    expect(activityService.getActivityList).toHaveBeenCalledWith(1, 10, "");
  });

  it("calls ResponseHelper.error when service returns error", async () => {
    (activityService.getActivityList as jest.Mock).mockResolvedValue({ data: null, error: true, message: "fail" });

    await (controller as any).getActivityList(req as Request, res as Response);

    expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, { data: null, error: true, message: "fail" });
    expect(Helpers.ResponseHelper.success).not.toHaveBeenCalled();
  });

  it("parses query params page, limit and address before calling service", async () => {
    req = { query: { page: "2", limit: "5", address: "0x123" } };
    (activityService.getActivityList as jest.Mock).mockResolvedValue({ data: [], error: false });

    await (controller as any).getActivityList(req as Request, res as Response);

    expect(activityService.getActivityList).toHaveBeenCalledWith(2, 5, "0x123");
  });
});
