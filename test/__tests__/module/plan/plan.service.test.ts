// -------------------------------------------------------------
// Mock global environment BEFORE loading the service
// -------------------------------------------------------------
(global as any).environment = {
  evmHost: "http://mock-host",
};

// -------------------------------------------------------------
// Mock dependencies used inside PlanService
// -------------------------------------------------------------
jest.mock("../../../../src/Utility/common", () => ({
  convertNodeToWallet: jest.fn(),
  fetchRequest: jest.fn(),
  getOffset: jest.fn(),
}));

jest.mock("../../../../src/constant", () => ({
  RES_MSG: {
    FETCH_SUCCESS: "Fetch success",
    ERROR: "Error",
  },
  provWalletPrefix: "prov-",
  FETCH_METHODS: { GET: "GET" },
}));

// -------------------------------------------------------------
// Import mocks and the service under test
// -------------------------------------------------------------
import { convertNodeToWallet, fetchRequest, getOffset } from "../../../../src/Utility/common";
import { RES_MSG, provWalletPrefix, FETCH_METHODS } from "../../../../src/constant";

const planService = require("../../../../src/module/plan/plan.service").default;

describe("PlanService.getAllPlans (global env)", () => {
  let errorSpy: jest.SpyInstance;

  beforeAll(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------
  // Test 1: No pagination (page empty or limit empty)
  // -------------------------------------------------------------
  it("builds URL WITHOUT pagination when page or limit is missing", async () => {
    (convertNodeToWallet as jest.Mock).mockReturnValue("mock-wallet");
    (fetchRequest as jest.Mock).mockResolvedValue({
      data: { plans: [{ id: 1 }], pagination: { total: 1 } },
    });

    const data = { page: "", limit: "", reverse: false, address: "abc" };

    await planService.getAllPlans(data);

    const expectedUrl = `http://mock-host/qubetics/plan/v3/providers/mock-wallet/plans` + `?pagination.reverse=false`;

    expect(convertNodeToWallet).toHaveBeenCalledWith("abc", provWalletPrefix);
    expect(fetchRequest).toHaveBeenCalledWith(expectedUrl, FETCH_METHODS.GET);
  });

  // -------------------------------------------------------------
  // Test 2: With pagination & getOffset call
  // -------------------------------------------------------------
  it("builds URL WITH pagination when page and limit exist", async () => {
    (convertNodeToWallet as jest.Mock).mockReturnValue("mock-wallet");
    (getOffset as jest.Mock).mockReturnValue(20);

    (fetchRequest as jest.Mock).mockResolvedValue({
      data: { plans: [{ id: 1 }], pagination: { total: 1 } },
    });

    const data = { page: 3, limit: 10, reverse: true, address: "abc" };
    await planService.getAllPlans(data);

    expect(getOffset).toHaveBeenCalledWith(3, 10);

    const expectedUrl =
      `http://mock-host/qubetics/plan/v3/providers/mock-wallet/plans` +
      `?pagination.offset=20&pagination.limit=10&pagination.reverse=true&pagination.count_total=true`;

    expect(fetchRequest).toHaveBeenCalledWith(expectedUrl, FETCH_METHODS.GET);
  });

  // -------------------------------------------------------------
  // Test 3: Missing data.plans → return error
  // -------------------------------------------------------------
  it("returns error when response does not contain data.plans", async () => {
    (convertNodeToWallet as jest.Mock).mockReturnValue("mock-wallet");

    (fetchRequest as jest.Mock).mockResolvedValue({
      data: null,
    });

    const result = await planService.getAllPlans({
      page: 1,
      limit: 10,
      reverse: false,
      address: "abc",
    });

    expect(result).toEqual({
      error: true,
      message: RES_MSG.ERROR,
    });
  });

  // -------------------------------------------------------------
  // Test 4: Successful API response
  // -------------------------------------------------------------
  it("returns plans and pagination on success", async () => {
    (convertNodeToWallet as jest.Mock).mockReturnValue("wallet123");
    (getOffset as jest.Mock).mockReturnValue(0);

    const apiResponse = {
      data: {
        plans: [{ name: "Plan A" }],
        pagination: { total: 10 },
      },
    };

    (fetchRequest as jest.Mock).mockResolvedValue(apiResponse);

    const result = await planService.getAllPlans({
      page: 1,
      limit: 10,
      reverse: false,
      address: "abc",
    });

    expect(result).toEqual({
      error: false,
      message: RES_MSG.FETCH_SUCCESS,
      data: apiResponse.data.plans,
      total: apiResponse.data.pagination,
    });
  });

  // -------------------------------------------------------------
  // Test 5: convertNodeToWallet throws → catch block returns error
  // -------------------------------------------------------------
  it("handles convertNodeToWallet() throwing errors", async () => {
    (convertNodeToWallet as jest.Mock).mockImplementation(() => {
      throw new Error("wallet conversion failed");
    });

    const result = await planService.getAllPlans({
      page: 1,
      limit: 10,
      reverse: false,
      address: "abc",
    });

    expect(result).toEqual({
      error: true,
      message: RES_MSG.ERROR,
    });
  });

  // -------------------------------------------------------------
  // Test 6: fetchRequest rejects (network error)
  // -------------------------------------------------------------
  it("handles fetchRequest() rejection gracefully", async () => {
    (convertNodeToWallet as jest.Mock).mockReturnValue("mock-wallet");

    (fetchRequest as jest.Mock).mockRejectedValue(new Error("network failure"));

    const result = await planService.getAllPlans({
      page: 1,
      limit: 10,
      reverse: false,
      address: "abc",
    });

    expect(fetchRequest).toHaveBeenCalled();
    expect(result).toEqual({
      error: true,
      message: RES_MSG.ERROR,
    });
  });

  // -------------------------------------------------------------
  // Test 7: plans is an empty array
  // -------------------------------------------------------------
  it("returns empty array when plans is empty", async () => {
    (convertNodeToWallet as jest.Mock).mockReturnValue("mock-wallet");
    (getOffset as jest.Mock).mockReturnValue(0);

    const apiResponse = {
      data: {
        plans: [],
        pagination: { total: 0 },
      },
    };

    (fetchRequest as jest.Mock).mockResolvedValue(apiResponse);

    const result = await planService.getAllPlans({
      page: 1,
      limit: 10,
      reverse: false,
      address: "abc",
    });

    expect(result).toEqual({
      error: false,
      message: RES_MSG.FETCH_SUCCESS,
      data: [],
      total: apiResponse.data.pagination,
    });
  });
});
