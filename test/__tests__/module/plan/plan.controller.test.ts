import * as Helpers from "../../../../src/service/index";
import planService from "../../../../src/module/plan/plan.service";
import { Request, Response } from "express";

jest.mock("../../../../src/service/index", () => ({
  ResponseHelper: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../../src/module/plan/plan.service", () => ({
  __esModule: true,
  default: {
    getAllPlans: jest.fn(),
  },
}));

describe("PlanController.getAllPlans", () => {
  let controller: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    const PlanController = require("../../../../src/module/plan/plan.controller").default;
    controller = new PlanController();

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

  it("calls ResponseHelper.success when service returns success", async () => {
    const mockResult = { data: [{ id: 1 }], error: false };

    (planService.getAllPlans as jest.Mock).mockResolvedValue(mockResult);

    await controller.getAllPlans(req as Request, res as Response);

    expect(planService.getAllPlans).toHaveBeenCalledWith({
      page: "",
      limit: "",
      reverse: false,
      address: undefined,
    });

    expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockResult);
    expect(Helpers.ResponseHelper.error).not.toHaveBeenCalled();
  });

  it("calls ResponseHelper.error when service returns error", async () => {
    const mockErr = { error: true, message: "failed" };

    (planService.getAllPlans as jest.Mock).mockResolvedValue(mockErr);

    await controller.getAllPlans(req as Request, res as Response);

    expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockErr);
    expect(Helpers.ResponseHelper.success).not.toHaveBeenCalled();
  });

  it("parses query params before calling service", async () => {
    req = {
      query: {
        page: "3",
        limit: "20",
        reverse: "true",
        address: "0xabc",
      },
    };

    (planService.getAllPlans as jest.Mock).mockResolvedValue({
      data: [],
      error: false,
    });

    await controller.getAllPlans(req as Request, res as Response);

    expect(planService.getAllPlans).toHaveBeenCalledWith({
      page: 3,
      limit: 20,
      reverse: true,
      address: "0xabc",
    });
  });

  it("sets page and limit to empty string if missing", async () => {
    req = { query: { reverse: "false" } };

    (planService.getAllPlans as jest.Mock).mockResolvedValue({
      data: [],
      error: false,
    });

    await controller.getAllPlans(req as Request, res as Response);

    expect(planService.getAllPlans).toHaveBeenCalledWith({
      page: "",
      limit: "",
      reverse: false,
      address: undefined,
    });
  });
});
