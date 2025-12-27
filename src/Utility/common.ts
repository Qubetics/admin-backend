import axios from "axios";
import {
  LINK,
  Message,
  PENDING,
  REJECTED,
  RES_MSG,
  WALLET_PREFIX,
  UNLINK,
  APPROVED,
  FETCH_METHODS,
  provWalletPrefix,
  CHAIN_METHOD,
} from "../constant";
import sha3 from "js-sha3";
import { arrayify } from "@ethersproject/bytes";
import { serializeSignDoc } from "@cosmjs/amino";
import { signatureToPubkey } from "@hanchon/signature-to-pubkey";
const { bech32 } = require("bech32");
import CryptoJS from "crypto-js";
import redisHelper from "../service/redis.helper";
import BigNumber from "bignumber.js";
import logger from "../lib/logger";

/**
 * For making http requests
 * @param url
 * @param method
 * @param data
 * @returns
 */
export async function fetchRequest(url: string, method: string, data: any = null) {
  try {
    const result = await axios({
      method,
      url,
      data,
    });
    return {
      error: false,
      data: result.data,
    };
  } catch (error) {
    logger.error("error while get ", url, error);
    return {
      error: true,
      data: null,
    };
  }
}

/**
 * Log messages with colors
 * @param msg
 * @param msgColor
 * @param data
 * @param dataColor
 */
export function log(msg: string, msgColor: string, data: any, dataColor: string) {
  console.log(`${msgColor}${msg}${dataColor}${data}\x1b[0m`);
}

export const getOffset = (page = 1, limit = 10) => {
  if (page < 1) page = 1;
  return (page - 1) * limit;
};

export const getWalletAddressFromNodeAddress = (nodeAddress: String, walletPrefix: String = WALLET_PREFIX): String => {
  const decoded = bech32.decode(nodeAddress);
  const words = decoded.words;

  // Re-encode with wallet prefix
  return bech32.encode(walletPrefix, words);
};
function messageToAminoTransaction(signer: any, data: any) {
  return {
    chain_id: "",
    account_number: "0",
    sequence: "0",
    fee: {
      gas: "0",
      amount: [],
    },
    msgs: [
      {
        type: "sign/MsgSignData",
        value: {
          signer,
          data,
        },
      },
    ],
    memo: "",
  };
}

// signMessage=address hi hai

export const verifyKeplrSignature = (
  address: any,
  signature: any,
  pubKey: any,
  signMessage: any
): { verify: boolean } => {
  try {
    // Encode the message into amino format
    const aminoEncoded = messageToAminoTransaction(address, Buffer.from(signMessage).toString("base64"));
    const serialized = serializeSignDoc(aminoEncoded);

    // Hash the amino message that was signed
    const hashed = sha3.keccak_256(arrayify(serialized));

    // Compare signature
    const signatureToCompare = `0x${Buffer.from(signature, "base64").toString("hex")}`;

    const pubkeyComputed = signatureToPubkey(signatureToCompare, Buffer.from(hashed, "hex"));
    return { verify: pubKey === pubkeyComputed };
  } catch (err) {
    logger.error("err", err);
    return { verify: false };
  }
};

export const decryptData = (ciphertext: string) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, environment.secretKey);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decryptedData);
};

export const encryptData = (data: any) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), environment.secretKey).toString();
};

/**
 * Check if token is expired
 * @param {string} token - The token to check.
 * @returns {boolean}
 */
export const isTokenExpired = async (token: string) => {
  const value = await redisHelper.getString(token);

  return value;
};

export const extractIP = (url: string): string => {
  try {
    const withoutProtocol = url.replace(/^https?:\/\//, "");
    const hostname = withoutProtocol.split(":")[0];
    return hostname;
  } catch (err) {
    logger.error(`${Message.invalidurl}: ${url}`);
    return "";
  }
};

export const canSubmitNodeRequest = async (
  status: string,
  requestFor: string,
  currentRequest: string
): Promise<{ ok: boolean; message?: string }> => {
  if (status === PENDING) {
    if (requestFor === LINK) {
      return { ok: false, message: RES_MSG.LINK_REQUEST_IS_STILL };
    }
    return { ok: false, message: RES_MSG.UNLINK_REQUEST_IS_STILL };
  }

  if (currentRequest === LINK) {
    if (requestFor === LINK && status === REJECTED) {
      return { ok: true };
    }
    if (requestFor === UNLINK && status === APPROVED) {
      return { ok: true };
    }
    return { ok: false, message: RES_MSG.NODE_IS_LINK };
  }

  if (currentRequest === UNLINK) {
    if (requestFor === UNLINK && status === REJECTED) {
      return { ok: true };
    }
    if (requestFor === LINK && status === APPROVED) {
      return { ok: true };
    }
    return { ok: false, message: RES_MSG.NODE_IS_NOT_LINK };
  }

  return { ok: false, message: RES_MSG.INVALID_REQUEST };
};

export const convertNodeToWallet = (address: any, walletPrefix: any) => {
  if (!address) {
    return "";
  }
  // Decode node address
  const decoded = bech32.decode(address);
  const words = decoded.words;

  // Re-encode with wallet prefix
  return bech32.encode(walletPrefix, words);
};

export const isValidProviderStatusTx = async (txHash: string, address: string): Promise<boolean> => {
  try {
    const link = `${environment.evmHost}/cosmos/tx/v1beta1/txs/${txHash}`;
    const response = await fetchRequest(link, FETCH_METHODS.GET);

    // If invalid or error in response
    if (response?.error) throw new Error(RES_MSG.INVALID_HASH);

    const msg = response?.data?.tx?.body?.messages?.[0];
    if (!msg) throw new Error(RES_MSG.INVALID_HASH);

    const providerAddress = String(convertNodeToWallet(address, provWalletPrefix));

    const isValid =
      msg["@type"] === CHAIN_METHOD.PROVIDER_STATUS && msg.status === "active" && msg.from === providerAddress;

    return isValid;
  } catch (err) {
    logger.error("Validation error:", err);
    return false;
  }
};

export const parseAndConvertPlan = (planStr: string) => {
  if (!planStr) return null;

  const num = planStr.split(" ")[0];

  const big = new BigNumber(num);
  const converted = big.dividedBy("1e18");

  return `${converted.toFixed()} TICS/month`;
};

export const bytesToGb = (bytes: BigNumber): string => {
  if (!bytes || bytes.isZero()) return "0";

  let result = bytes.dividedBy(1024 * 1024 * 1024).toFixed(2);
  result = result.replace(/\.?0+$/, "");
  return result;
};
