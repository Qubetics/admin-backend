import * as Helpers from "../../../../src/service/index";
import providerService from "../../../../src/module/provider/provider.service";
import { Request, Response } from "express";

jest.mock("../../../../src/service/index", () => ({
  ResponseHelper: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../../src/module/provider/provider.service", () => ({
  __esModule: true,
  default: {
    getAllProvider: jest.fn(),
    getProviderDetails: jest.fn(),
    getActivePlanProviders: jest.fn(),
  },
}));

describe("ProviderController", () => {
  let controller: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    const ProviderController = require("../../../../src/module/provider/provider.controller").default;
    controller = new ProviderController();
    req = { query: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getAllProvider", () => {
    it("calls ResponseHelper.success when service returns success", async () => {
      const mockData = { error: false, data: [{ address: "0x123", name: "Provider A" }] };
      (providerService.getAllProvider as jest.Mock).mockResolvedValue(mockData);

      await (controller as any).getAllProvider(req as Request, res as Response);

      expect(providerService.getAllProvider).toHaveBeenCalledWith(req.query);
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
      expect(Helpers.ResponseHelper.error).not.toHaveBeenCalled();
    });

    it("calls ResponseHelper.error when service returns error", async () => {
      const mockError = { error: true, message: "Failed to fetch providers" };
      (providerService.getAllProvider as jest.Mock).mockResolvedValue(mockError);

      await (controller as any).getAllProvider(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockError);
      expect(Helpers.ResponseHelper.success).not.toHaveBeenCalled();
    });

    it("passes query params to service", async () => {
      req = { query: { page: "1", limit: "10", search: "test" } };
      (providerService.getAllProvider as jest.Mock).mockResolvedValue({ error: false, data: [] });

      await (controller as any).getAllProvider(req as Request, res as Response);

      expect(providerService.getAllProvider).toHaveBeenCalledWith(req.query);
    });
  });

  describe("getProviderDetails", () => {
    it("calls ResponseHelper.success when service returns success", async () => {
      const mockData = { error: false, data: { address: "0x123", details: {} } };
      (providerService.getProviderDetails as jest.Mock).mockResolvedValue(mockData);
      req = { params: { address: "0x123" }, query: { page: "1", limit: "10" } };

      await (controller as any).getProviderDetails(req as Request, res as Response);

      expect(providerService.getProviderDetails).toHaveBeenCalledWith("0x123", "1", "10");
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
      expect(Helpers.ResponseHelper.error).not.toHaveBeenCalled();
    });

    it("calls ResponseHelper.error when service returns error", async () => {
      const mockError = { error: true, message: "Provider not found" };
      (providerService.getProviderDetails as jest.Mock).mockResolvedValue(mockError);
      req = { params: { address: "0x999" }, query: { page: "1", limit: "10" } };

      await (controller as any).getProviderDetails(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockError);
      expect(Helpers.ResponseHelper.success).not.toHaveBeenCalled();
    });

    it("extracts address and pagination params from request", async () => {
      req = { params: { address: "0xabc456" }, query: { page: "2", limit: "20" } };
      (providerService.getProviderDetails as jest.Mock).mockResolvedValue({ error: false, data: [] });

      await (controller as any).getProviderDetails(req as Request, res as Response);

      expect(providerService.getProviderDetails).toHaveBeenCalledWith("0xabc456", "2", "20");
    });

    it("handles missing page and limit query params", async () => {
      req = { params: { address: "0x123" }, query: {} };
      (providerService.getProviderDetails as jest.Mock).mockResolvedValue({ error: false, data: [] });

      await (controller as any).getProviderDetails(req as Request, res as Response);

      expect(providerService.getProviderDetails).toHaveBeenCalledWith("0x123", undefined, undefined);
    });
  });

  describe("getActivePlanProviders", () => {
    it("calls ResponseHelper.success when service returns success", async () => {
      const mockData = { error: false, data: [{ address: "0x111", activePlans: 5 }] };
      (providerService.getActivePlanProviders as jest.Mock).mockResolvedValue(mockData);

      await (controller as any).getActivePlanProviders(req as Request, res as Response);

      expect(providerService.getActivePlanProviders).toHaveBeenCalled();
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockData);
      expect(Helpers.ResponseHelper.error).not.toHaveBeenCalled();
    });

    it("calls ResponseHelper.error when service returns error", async () => {
      const mockError = { error: true, message: "Failed to fetch active plan providers" };
      (providerService.getActivePlanProviders as jest.Mock).mockResolvedValue(mockError);

      await (controller as any).getActivePlanProviders(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockError);
      expect(Helpers.ResponseHelper.success).not.toHaveBeenCalled();
    });

    it("does not pass any params to service", async () => {
      (providerService.getActivePlanProviders as jest.Mock).mockResolvedValue({ error: false, data: [] });

      await (controller as any).getActivePlanProviders(req as Request, res as Response);

      expect(providerService.getActivePlanProviders).toHaveBeenCalledWith();
    });
  });
});
