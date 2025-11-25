import request from "supertest";
import express, { Express, Response } from "express";
import AuthController from "../../module/auth/auth.controller";
import AuthService from "../../module/auth/auth.service";

// --- Mocking Constants/Dependencies from the Service Logic ---
// We define constants and mock helper functions to simulate the service's internal state
const MOCK_UUID = "mock-session-id-12345";
const COOKIE_NAMES = { SESSION_ID: "session_id" };
const checkCookieVariable = true; // Simulating environment flag for secure cookies

// Mock the entire service module
jest.mock("../../module/auth/auth.service");

// Note: In a real-world scenario, you would mock 'response.cookie' inside the service test,
// but here we simulate the side effect within the service mock for completeness
// in the controller test.

describe("AuthController /login", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Attach cookie parser middleware if the controller/service relied on request.cookies,
    // but for setting cookies, Supertest/Express is enough.
    const authController = new AuthController();
    app.use("/auth", authController.router);
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return success response and set session cookie for valid login", async () => {
    // 1. Mock the Service implementation to simulate success and side effects (cookie setting)
    (AuthService.loginUser as jest.Mock).mockImplementation(async (body, res: Response) => {
      // The real service sets the cookie and status, we simulate that here
      res.status(200);
      res.cookie(COOKIE_NAMES.SESSION_ID, MOCK_UUID, {
        httpOnly: checkCookieVariable,
        secure: checkCookieVariable,
        sameSite: checkCookieVariable ? "none" : "lax",
        // maxAge: environment.redisExpiry, // Not needed for mock
      });
      return {
        error: false,
        message: "Fetch success",
        data: { isExist: true, name: "John" },
      };
    });

    const response = await request(app)
      .post("/auth/login")
      .send({
        address: "userAddress",
        pubKey: "pubKeySample",
        signature: { signature: "signatureSample" },
      });

    // 2. Assertions
    expect(response.status).toBe(200);
    expect(response.body.error).toBe(false);
    expect(response.body.message).toBe("Fetch success");
    expect(response.body.data).toHaveProperty("isExist", true);
    expect(response.body.data).toHaveProperty("name", "John");

    // Assert that the session cookie was set in the response headers
    expect(response.headers["set-cookie"]).toBeDefined();
    // Check for the specific cookie value and attributes
    const sessionCookie = response.headers["set-cookie"][0];
    expect(sessionCookie).toContain(`${COOKIE_NAMES.SESSION_ID}=${MOCK_UUID}`);
    expect(sessionCookie).toContain("HttpOnly"); // Since checkCookieVariable is true
    expect(sessionCookie).toContain("Secure"); // Since checkCookieVariable is true
    expect(sessionCookie).toContain("SameSite=None"); // Since checkCookieVariable is true
  });

  it("should return error response for invalid login (unauthorized signature)", async () => {
    // Mock the Service implementation to simulate failure by returning an error object
    (AuthService.loginUser as jest.Mock).mockImplementation(async () => {
      // The actual service catches errors and returns an object like this:
      return { error: true, message: "Unauthorized", data: {} };
    });

    const response = await request(app)
      .post("/auth/login")
      .send({
        address: "userAddress",
        pubKey: "pubKeySample",
        signature: { signature: "invalidSignature" },
      });

    // The controller should receive the error object from the service and set the status accordingly
    expect(response.status).toBe(400); // Assuming your controller maps service errors to 400
    expect(response.body.error).toBe(true);
    expect(response.body.message).toBe("Unauthorized");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("should return error response when user is not an Admin (RES_MSG.NOT_ADMIN)", async () => {
    // Mock the Service implementation to simulate the NOT_ADMIN case
    (AuthService.loginUser as jest.Mock).mockImplementation(async () => {
      return { error: true, message: "User is not an admin", data: { isExist: false } };
    });

    const response = await request(app)
      .post("/auth/login")
      .send({
        address: "nonAdminUserAddress",
        pubKey: "pubKeySample",
        signature: { signature: "signatureSample" },
      });

    // Assuming the controller handles service returned errors with 400 status
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(true);
    expect(response.body.message).toBe("User is not an admin");
    expect(response.body.data).toHaveProperty("isExist", false);

    // We expect the session cookie NOT to be set on failure
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});
