import axios from "axios";
import { Message, WALLET_PREFIX } from "../constant";
import sha3 from "js-sha3";
import { arrayify } from "@ethersproject/bytes";
import { serializeSignDoc } from "@cosmjs/amino";
import { signatureToPubkey } from "@hanchon/signature-to-pubkey";
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

export const verifyKeplrSignature = (
  address: any,
  signature: any,
  pubKey: any,
  signMessage: any
): { verify: boolean } => {
  try {
    // Encode the message into amino format
    const aminoEncoded = messageToAminoTransaction(
      address,
      Buffer.from(signMessage).toString("base64")
    );
    const serialized = serializeSignDoc(aminoEncoded);

    // Hash the amino message that was signed
    const hashed = sha3.keccak_256(arrayify(serialized));

    // Compare signature
    const signatureToCompare = `0x${Buffer.from(signature, "base64").toString(
      "hex"
    )}`;

    const pubkeyComputed = signatureToPubkey(
      signatureToCompare,
      Buffer.from(hashed, "hex")
    );
    console.log("🚀 ~ computePubKey ~ pubkeyComputed:", pubkeyComputed);
    return { verify: pubKey === pubkeyComputed };
  } catch (err) {
    console.error("err", err);
    return {verify:false};
  }
};

export const extractIP = (url: string): string => {
  console.log("🚀 ~ extractIP ~ url:", url)
  try {
    const withoutProtocol = url.replace(/^https?:\/\//, '');
    const hostname = withoutProtocol.split(':')[0];
    return hostname;
  } catch (err) {
    console.log(`${Message.invalidurl}: ${url}`);;
    return '';
  }
};