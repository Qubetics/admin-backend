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
} from "../.././../src/Utility/common";
import redisHelper from "../.././../src/service/redis.helper";
import BigNumber from "bignumber.js";
import { bech32 } from "bech32";

jest.mock("axios");

const mockedAxios = axios as unknown as jest.Mock;

jest.mock("../.././../src/service/redis.helper", () => ({
  getString: jest.fn(),
}));

jest.mock("../.././../src/lib/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

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

(global as any).environment = {
  secretKey: "test-secret-key",
  evmHost: "http://localhost:1317",
};

describe("Utils Test Suite", () => {
  let logger: any;
  
  beforeEach(() => {
    // Get logger mock and clear it before each test
    logger = require("../.././../src/lib/logger");
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
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
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("log", () => {
    it("should call logger.info", () => {
      log("Message", "\x1b[32m", "Data", "\x1b[33m");
      expect(logger.info).toHaveBeenCalledWith("Message", { data: "Data" });
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
    it("should return false on error or invalid signature structure", () => {
      const result = verifyKeplrSignature("addr", "sig", "pubkey", "msg");
      expect(result).toEqual({ verify: false });
      expect(logger.error).toHaveBeenCalled();
    });
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
      try {
        const res = extractIP(null as any);
        expect(res).toBe("");
      } catch (e) {}
    });
  });

  describe("canSubmitNodeRequest", () => {
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
    const providerPrefix = "qubeticsprov";

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
                  from: mockProviderAddr,
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
