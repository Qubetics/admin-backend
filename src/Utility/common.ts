import axios from "axios";
import { WALLET_PREFIX } from "../constant";
const { bech32 } = require('bech32');

/**
 * For making http requests
 * @param url
 * @param method
 * @param data
 * @returns
 */
export async function fetchRequest(
  url: string,
  method: string,
  data: any = null,
) {
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
    console.error("error while get ", url, error);
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
export function log(
  msg: string,
  msgColor: string,
  data: any,
  dataColor: string,
) {
  console.log(`${msgColor}${msg}${dataColor}${data}\x1b[0m`);
}

export const getOffset = (page = 1, limit = 10) => {
  if (page < 1) page = 1;
  return (page - 1) * limit;
};

export const getWalletAddressFromNodeAddress=(nodeAddress:String,walletPrefix:String=WALLET_PREFIX):String=>{
  const decoded = bech32.decode(nodeAddress);
  const words = decoded.words;

  // Re-encode with wallet prefix
  return bech32.encode(walletPrefix, words);
};