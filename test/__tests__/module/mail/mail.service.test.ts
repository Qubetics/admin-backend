import sgMail from "@sendgrid/mail";

// Mock the @sendgrid/mail module
jest.mock("@sendgrid/mail", () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

// Set up test environment before importing the service
(global as any).environment = {
  sendgrid_key: "test-sendgrid-key",
  service_email: "service@test.com",
};

// Now import the service after setting up the environment
import MailService from "../../../../src/module/mail/mail.service";
import { RES_MSG, approveTemplate, rejectedTemplate } from "../../../../src/constant";

describe("MailService", () => {
  const email = "test@example.com";
  const nodeName = "TestNode";
  const mockedSend = sgMail.send as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send approval email successfully", async () => {
    mockedSend.mockResolvedValueOnce(true);

    const result = await MailService.sendApprovalMail(email, nodeName, true);

    expect(mockedSend).toHaveBeenCalledTimes(1);

    const msgArg = mockedSend.mock.calls[0][0];

    expect(msgArg.to).toBe(email);
    expect(msgArg.from).toBe("service@test.com");
    expect(msgArg.subject).toContain("Successful");
    expect(msgArg.html).toBe(approveTemplate());
    expect(result).toEqual({
      error: false,
      message: RES_MSG.EMAIL_SENT_SUCCESS,
    });
  });

  it("should send rejection email successfully", async () => {
    mockedSend.mockResolvedValueOnce(true);

    const result = await MailService.sendApprovalMail(email, nodeName, false);

    expect(mockedSend).toHaveBeenCalledTimes(1);

    const msgArg = mockedSend.mock.calls[0][0];

    expect(msgArg.to).toBe(email);
    expect(msgArg.from).toBe("service@test.com");
    expect(msgArg.subject).toContain("Action Required");
    expect(msgArg.html).toBe(rejectedTemplate());
    expect(result).toEqual({
      error: false,
      message: RES_MSG.EMAIL_SENT_SUCCESS,
    });
  });

  it("should return an error when sgMail.send throws an Error", async () => {
    mockedSend.mockRejectedValueOnce(new Error("SendGrid failed"));

    const result = await MailService.sendApprovalMail(email, nodeName, true);

    expect(result).toEqual({
      error: true,
      message: "SendGrid failed",
    });
  });

  it("should return a generic error when a non-Error is thrown", async () => {
    mockedSend.mockRejectedValueOnce("UNKNOWN_ERROR");

    const result = await MailService.sendApprovalMail(email, nodeName, true);

    expect(result).toEqual({
      error: true,
      message: RES_MSG.ERROR,
    });
  });
});
