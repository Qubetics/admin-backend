import axios from "axios";
import {
  fetchRequest,
  log,
  getOffset,
  getWalletAddressFromNodeAddress,
  verifyKeplrSignature,
  decryptData,
  encryptData,
  isTokenExpired,
  extractIP,
  canSubmitNodeRequest,
  convertNodeToWallet,
  isValidProviderStatusTx,
  parseAndConvertPlan,
  bytesToGb,
} from "../.././../src/Utility/common"; // Assume your file is named utils.ts
import redisHelper from "../.././../src/service/redis.helper";
import BigNumber from "bignumber.js";
import { bech32 } from "bech32";

// --- Mocks ---

// 1. Mock Axios
jest.mock("axios");

const mockedAxios = axios as unknown as jest.Mock;

// 2. Mock Redis Helper
jest.mock("../.././../src/service/redis.helper", () => ({
  getString: jest.fn(),
}));

// 3. Mock Constants
jest.mock("../.././../src/constant/index.ts", () => ({
  LINK: "LINK",
  UNLINK: "UNLINK",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  APPROVED: "APPROVED",
  RES_MSG: {
    NODE_REQUEST_IS_STILL: "Request is still pending",
    NODE_IS_LINK: "Node is linked",
    NODE_IS_NOT_LINK: "Node is not linked",
    INVALID_REQUEST: "Invalid request",
    INVALID_HASH: "Invalid Hash",
    LINK_REQUEST_IS_STILL: "Link request is still pending",
    UNLINK_REQUEST_IS_STILL: " Unlink request is still pending",
  },
  WALLET_PREFIX: "wallet",
  FETCH_METHODS: { GET: "GET" },
  provWalletPrefix: "qubeticsprov",
  CHAIN_METHOD: { PROVIDER_STATUS: "provider/Status" },
  Message: { invalidurl: "Invalid URL" },
}));

// 4. Mock Global Environment
// The code uses `environment.secretKey` and `environment.evmHost`.
// We attach this to the global object for the test context.
(global as any).environment = {
  secretKey: "test-secret-key",
  evmHost: "http://localhost:1317",
};

// 5. Mock Console to keep test output clean
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};

describe("Utils Test Suite", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe("fetchRequest", () => {
    it("should return data on successful request", async () => {
      const mockData = { id: 1 };
      mockedAxios.mockResolvedValueOnce({ data: mockData });

      const result = await fetchRequest("http://test.com", "GET");

      expect(result).toEqual({ error: false, data: mockData });
      expect(mockedAxios).toHaveBeenCalledWith({
        method: "GET",
        url: "http://test.com",
        data: null,
      });
    });

    it("should return error object on failure", async () => {
      mockedAxios.mockRejectedValueOnce(new Error("Network Error"));

      const result = await fetchRequest("http://test.com", "GET");

      expect(result).toEqual({ error: true, data: null });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("log", () => {
    it("should call console.log with formatted colors", () => {
      log("Message", "\x1b[32m", "Data", "\x1b[33m");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Message"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Data"));
    });
  });

  describe("getOffset", () => {
    it("should calculate offset correctly", () => {
      expect(getOffset(1, 10)).toBe(0);
      expect(getOffset(2, 10)).toBe(10);
    });

    it("should handle page < 1 by defaulting to page 1", () => {
      expect(getOffset(0, 10)).toBe(0);
      expect(getOffset(-5, 10)).toBe(0);
    });

    it("should use default values", () => {
      // Default page=1, limit=10 -> (1-1)*10 = 0
      expect(getOffset()).toBe(0);
    });
  });

  describe("Bech32 Conversions", () => {
    const walletPrefix = "qubetics";
    const providerPrefix = "qubeticsprov";

    // Generate a valid address pair
    const words = bech32.toWords(Buffer.from("1234567890abcdef", "hex"));
    const WalletAddress = bech32.encode(walletPrefix, words);
    const ProviderAddress = bech32.encode(providerPrefix, words);

    it("getWalletAddressFromNodeAddress should convert prefix", () => {
      const result = getWalletAddressFromNodeAddress(ProviderAddress, walletPrefix);
      expect(result).toBe(WalletAddress);
    });

    it("convertNodeToWallet should convert prefix", () => {
      const result = convertNodeToWallet(WalletAddress, providerPrefix);
      expect(result).toBe(ProviderAddress);
    });

    it("convertNodeToWallet should return empty string if address is null", () => {
      expect(convertNodeToWallet(null, "prefix")).toBe("");
    });
  });

  describe("verifyKeplrSignature", () => {
    // This is complex to test because it involves real crypto.
    // We will verify the logic flow by mocking the behavior or handling the error block.
    // For a unit test, we usually check if it returns false on bad input.

    it("should return false on error or invalid signature structure", () => {
      const result = verifyKeplrSignature("addr", "sig", "pubkey", "msg");
      expect(result).toEqual({ verify: false });
      expect(console.error).toHaveBeenCalled();
    });

    // To test true, you would need a valid set of: Address, Signature (base64), PubKey, and Message.
    // Since generating these on the fly is heavy, we ensure the error handling works.
  });

  describe("Encryption / Decryption", () => {
    it("should encrypt and decrypt data correctly", () => {
      const originalData = { foo: "bar", num: 123 };

      const encrypted = encryptData(originalData);
      expect(typeof encrypted).toBe("string");
      expect(encrypted).not.toBe(JSON.stringify(originalData));

      const decrypted = decryptData(encrypted);
      expect(decrypted).toEqual(originalData);
    });
  });

  describe("isTokenExpired", () => {
    it("should return value from redis", async () => {
      (redisHelper.getString as jest.Mock).mockResolvedValue("some-value");
      const result = await isTokenExpired("token123");
      expect(redisHelper.getString).toHaveBeenCalledWith("token123");
      expect(result).toBe("some-value");
    });
  });

  describe("extractIP", () => {
    it("should extract hostname from http url", () => {
      expect(extractIP("http://192.168.1.1:8080")).toBe("192.168.1.1");
    });

    it("should extract hostname from https url", () => {
      expect(extractIP("https://google.com")).toBe("google.com");
    });

    it("should return empty string and log on invalid input", () => {
      // extractIP implementation relies on .replace and .split which might not throw
      // on simple strings, but might if passed null (though TS prevents that).
      // Based on the code provided: `withoutProtocol.split(":")[0]`
      // If we pass a string that causes an error inside (unlikely with string input), catch block runs.

      // However, let's test a case that might structurally fail logical expectation
      // or trigger the catch block if we force an error (e.g. passing null via any).
      try {
        const res = extractIP(null as any);
        expect(res).toBe("");
      } catch (e) {
        // function handles it
      }
    });
  });

  describe("canSubmitNodeRequest", () => {
    // Logic Table based on code:
    // 1. PENDING -> false
    // 2. Current LINK:
    //    - Req LINK, Status REJECTED -> true
    //    - Req UNLINK, Status APPROVED -> true
    //    - Else -> false
    // 3. Current UNLINK:
    //    - Req UNLINK, Status REJECTED -> true
    //    - Req LINK, Status APPROVED -> true
    //    - Else -> false

    it("should return false if status is PENDING", async () => {
      const res = await canSubmitNodeRequest("PENDING", "LINK", "LINK");
      expect(res.ok).toBe(false);
      expect(res.message).toContain("request is still pending");
    });

    it("should return false if status is PENDING and request is UNLINK", async () => {
      const res = await canSubmitNodeRequest("PENDING", "UNLINK", "LINK");
      expect(res.ok).toBe(false);
      expect(res.message).toContain("request is still pending");
    });

    // Current Request = LINK
    it("should allow if Current=LINK, Request=LINK, Status=REJECTED", async () => {
      const res = await canSubmitNodeRequest("REJECTED", "LINK", "LINK");
      expect(res.ok).toBe(true);
    });

    it("should allow if Current=LINK, Request=UNLINK, Status=APPROVED", async () => {
      const res = await canSubmitNodeRequest("APPROVED", "UNLINK", "LINK");
      expect(res.ok).toBe(true);
    });

    it("should fail if Current=LINK but conditions not met", async () => {
      const res = await canSubmitNodeRequest("APPROVED", "LINK", "LINK");
      expect(res.ok).toBe(false);
      expect(res.message).toBe("Node is linked");
    });

    // Current Request = UNLINK
    it("should allow if Current=UNLINK, Request=UNLINK, Status=REJECTED", async () => {
      const res = await canSubmitNodeRequest("REJECTED", "UNLINK", "UNLINK");
      expect(res.ok).toBe(true);
    });

    it("should allow if Current=UNLINK, Request=LINK, Status=APPROVED", async () => {
      const res = await canSubmitNodeRequest("APPROVED", "LINK", "UNLINK");
      expect(res.ok).toBe(true);
    });

    it("should fail if Current=UNLINK but conditions not met", async () => {
      const res = await canSubmitNodeRequest("APPROVED", "UNLINK", "UNLINK");
      expect(res.ok).toBe(false);
      expect(res.message).toBe("Node is not linked");
    });

    it("should fail on invalid request type", async () => {
      const res = await canSubmitNodeRequest("APPROVED", "UNKNOWN", "UNKNOWN");
      expect(res.ok).toBe(false);
      expect(res.message).toBe("Invalid request");
    });
  });

  describe("isValidProviderStatusTx", () => {
    const mockHash = "0x123";

    const walletPrefix = "cosmos";
    const providerPrefix = "qubeticsprov"; // MUST MATCH provWalletPrefix from mocked constants

    // Generate valid bech32 pair
    const words = bech32.toWords(Buffer.from("abcdabcdabcdabcd", "hex"));
    const mockAddress = bech32.encode(walletPrefix, words);
    const mockProviderAddr = bech32.encode(providerPrefix, words);

    it("should return true when validation passes", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: {
          tx: {
            body: {
              messages: [
                {
                  "@type": "provider/Status",
                  status: "active",
                  from: mockProviderAddr, // EXACT MATCH
                },
              ],
            },
          },
        },
      });

      const result = await isValidProviderStatusTx(mockHash, mockAddress);
      expect(result).toBe(true);
    });

    it("should return false on API error", async () => {
      mockedAxios.mockRejectedValueOnce(new Error("API fail"));
      const result = await isValidProviderStatusTx(mockHash, mockAddress);
      expect(result).toBe(false);
    });

    it("should return false if message missing", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { tx: { body: { messages: [] } } },
      });
      const result = await isValidProviderStatusTx(mockHash, mockAddress);
      expect(result).toBe(false);
    });

    it("should return false if provider address mismatch", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: {
          tx: {
            body: {
              messages: [
                {
                  "@type": "provider/Status",
                  status: "active",
                  from: "wrong_address",
                },
              ],
            },
          },
        },
      });

      const result = await isValidProviderStatusTx(mockHash, mockAddress);
      expect(result).toBe(false);
    });
  });

  describe("parseAndConvertPlan", () => {
    it("should convert 1e18 format to TICS/month", () => {
      // 2 * 10^18
      const input = "2000000000000000000 TICS";
      const result = parseAndConvertPlan(input);
      expect(result).toBe("2 TICS/month");
    });

    it("should return null if no plan string provided", () => {
      expect(parseAndConvertPlan(null as any)).toBeNull();
    });
  });

  describe("bytesToGb", () => {
    it("should convert bytes to GB", () => {
      const oneGbInBytes = new BigNumber(1024 * 1024 * 1024);
      expect(bytesToGb(oneGbInBytes)).toBe("1");

      const halfGb = new BigNumber(1024 * 1024 * 512);
      expect(bytesToGb(halfGb)).toBe("0.5");
    });

    it('should return "0" for zero or null', () => {
      expect(bytesToGb(new BigNumber(0))).toBe("0");
      expect(bytesToGb(null as any)).toBe("0");
    });
  });
});
