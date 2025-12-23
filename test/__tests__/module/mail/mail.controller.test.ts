import MailController from "../../../../src/module/mail/mail.controller";
import MailService from "../../../../src/module/mail/mail.service";
import * as Helpers from "../../../../src/service/index";
import { Request, Response } from "express";

jest.mock("../../../../src/module/mail/mail.service", () => ({
  __esModule: true,
  default: {
    sendApprovalMail: jest.fn(),
  },
}));

const mockSuccess = jest.fn();
const mockError = jest.fn();

jest.mock("../../../../src/service/index", () => ({
  ResponseHelper: {
    success: jest.fn((res, data) => mockSuccess(res, data)),
    error: jest.fn((res, data) => mockError(res, data)),
  },
}));

describe("MailController - sendApprovalMail", () => {
  let controller: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new MailController();
    req = {
      body: {
        email: "test@example.com",
        nodeName: "Node-123",
        isApproved: true,
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("should call MailService and return success response", async () => {
    (MailService.sendApprovalMail as jest.Mock).mockResolvedValue({
      error: false,
      message: "Email sent successfully",
    });

    await controller["sendApprovalMail"](req as Request, res as Response);

    expect(MailService.sendApprovalMail).toHaveBeenCalledWith("test@example.com", "Node-123", true);

    expect(Helpers.ResponseHelper.success).toHaveBeenCalledWith(res, {
      error: false,
      message: "Email sent successfully",
    });
  });

  it("should return error response when MailService returns error", async () => {
    (MailService.sendApprovalMail as jest.Mock).mockResolvedValue({
      error: true,
      message: "Failed to send email",
    });

    await controller["sendApprovalMail"](req as Request, res as Response);

    expect(MailService.sendApprovalMail).toHaveBeenCalled();

    expect(Helpers.ResponseHelper.error).toHaveBeenCalledWith(res, {
      error: true,
      message: "Failed to send email",
    });
  });

  it("should pass correct values even when body fields are missing", async () => {
    req.body = {
      email: undefined,
      nodeName: undefined,
      isApproved: undefined,
    };

    (MailService.sendApprovalMail as jest.Mock).mockResolvedValue({
      error: false,
      message: "OK",
    });

    await controller["sendApprovalMail"](req as Request, res as Response);

    expect(MailService.sendApprovalMail).toHaveBeenCalledWith(undefined, undefined, undefined);
  });
});
