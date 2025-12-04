import * as Helpers from "../../../../src/service/index";
import AuthService from "../../../../src/module/auth/auth.service";
import { Request, Response } from "express";
import { adminCheck } from "../../../../src/middleware/adminCheck";

jest.mock("../../../../src/service/index", () => ({
  ResponseHelper: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../../src/module/auth/auth.service", () => ({
  __esModule: true,
  default: {
    addAdmin: jest.fn(),
    loginUser: jest.fn(),
    logout: jest.fn(),
    checkEmail: jest.fn(),
  },
}));

jest.mock("../../../../src/middleware/adminCheck", () => ({
  adminCheck: jest.fn(),
}));

describe("AuthController", () => {
  let controller: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    const AuthController = require("../../../../src/module/auth/auth.controller").default;
    controller = new AuthController();

    req = { body: {} };
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

  describe("addUser (register)", () => {
    it("calls ResponseHelper.success when service returns success", async () => {
      const mockResult = { id: 1, email: "test@example.com" };
      (AuthService.addAdmin as jest.Mock).mockResolvedValue(mockResult);

      await controller.addUser(req as Request, res as Response);

      expect(AuthService.addAdmin).toHaveBeenCalledWith(req.body, res);
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockResult);
      expect(Helpers.ResponseHelper.error).not.toHaveBeenCalled();
    });

    it("calls ResponseHelper.error when service returns error", async () => {
      const mockErr = { error: "User already exists" };
      (AuthService.addAdmin as jest.Mock).mockResolvedValue(mockErr);

      await controller.addUser(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockErr);
      expect(Helpers.ResponseHelper.success).not.toHaveBeenCalled();
    });
  });

  describe("loginUser", () => {
    it("calls ResponseHelper.success on successful login", async () => {
      const mockResult = { token: "jwt-token", user: { id: 1 } };
      (AuthService.loginUser as jest.Mock).mockResolvedValue(mockResult);

      await controller.loginUser(req as Request, res as Response);

      expect(AuthService.loginUser).toHaveBeenCalledWith(req.body, res);
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockResult);
    });

    it("calls ResponseHelper.error on login failure", async () => {
      const mockErr = { error: "Invalid credentials" };
      (AuthService.loginUser as jest.Mock).mockResolvedValue(mockErr);

      await controller.loginUser(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockErr);
    });
  });

  describe("logout", () => {
    it("calls ResponseHelper.success on successful logout", async () => {
      (adminCheck as jest.Mock).mockImplementation((req, res, next) => next());
      const mockResult = { message: "Logged out successfully" };
      (AuthService.logout as jest.Mock).mockResolvedValue(mockResult);

      await controller.logout(req as Request, res as Response);

      expect(AuthService.logout).toHaveBeenCalledWith(req, res);
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockResult);
    });

    it("calls ResponseHelper.error on logout failure", async () => {
      (adminCheck as jest.Mock).mockImplementation((req, res, next) => next());
      const mockErr = { error: "Logout failed" };
      (AuthService.logout as jest.Mock).mockResolvedValue(mockErr);

      await controller.logout(req as Request, res as Response);

      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockErr);
    });
  });

  describe("checkEmail", () => {
    it("calls ResponseHelper.success for valid email", async () => {
      const mockResult = { error: false, message: "Fetch success", data: { valid: true } };
      (AuthService.checkEmail as jest.Mock).mockResolvedValue(mockResult);

      req.body = { email: "user@example.com" };
      await controller.checkEmail(req as Request, res as Response);

      expect(AuthService.checkEmail).toHaveBeenCalledWith("user@example.com");
      expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, mockResult);
      expect(Helpers.ResponseHelper.error).not.toHaveBeenCalled();
    });

    it("calls ResponseHelper.error for disposable email", async () => {
      const mockErr = { error: true, message: "Sorry, but we do not accept your mail provider.", data: { valid: false } };
      (AuthService.checkEmail as jest.Mock).mockResolvedValue(mockErr);

      req.body = { email: "test@mailinator.com" };
      await controller.checkEmail(req as Request, res as Response);

      expect(AuthService.checkEmail).toHaveBeenCalledWith("test@mailinator.com");
      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockErr);
      expect(Helpers.ResponseHelper.success).not.toHaveBeenCalled();
    });

    it("calls ResponseHelper.error for missing email", async () => {
      const mockErr = { error: true, message: "Email is required" };
      (AuthService.checkEmail as jest.Mock).mockResolvedValue(mockErr);

      req.body = { email: "" };
      await controller.checkEmail(req as Request, res as Response);

      expect(AuthService.checkEmail).toHaveBeenCalledWith("");
      expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, mockErr);
    });
  });
});
