import { randomUUID } from "crypto";
import { convertNodeToWallet, encryptData, isValidProviderStatusTx, verifyKeplrSignature } from "../../Utility/common";
import { COOKIE_NAMES, RES_MSG, WALLET_PREFIX } from "../../constant";
import { IESResponse } from "../../interfaces";
import prisma from "../../lib/db";
import redisHelper from "../../service/redis.helper";
import { Response } from "express";
import MailChecker from "mailchecker";
const checkCookieVariable = process.env.NODE_ENV == "production" ? false : true;

class AuthService {
  async addAdmin(value: any, response: Response): Promise<IESResponse> {
    const { address, name, email, description, url, pubKey, signature, txHash } = value;
    try {
      const isValid = await isValidProviderStatusTx(txHash, address);
      if (!isValid) throw new Error(RES_MSG.UNAUTHORIZED);

      //Validate address
      const isSignatureValid = verifyKeplrSignature(address, signature?.signature, pubKey, address);
      if (!isSignatureValid?.verify) throw new Error(RES_MSG.UNAUTHORIZED);

      if (email) {
        if (!MailChecker.isValid(email)) {
          return {
            error: true,
            message: RES_MSG.DISPOSBLE_EMAIL,
          };
        }
      }

      const result = await prisma.user.upsert({
        where: { address },
        update: {}, // do nothing if exists
        create: {
          address,
          name,
          email,
          url,
          description,
          role: 1,
        },
      });
      if (!result) throw new Error(RES_MSG.ERROR);
      const userDetail = {
        address,
        role: 1,
      };

      const encryptedData = encryptData(userDetail);
      const uuid = randomUUID();
      response.cookie(COOKIE_NAMES.SESSION_ID, uuid, {
        httpOnly: checkCookieVariable,
        secure: checkCookieVariable,
        sameSite: checkCookieVariable ? "none" : "lax",
        // maxAge: environment.redisExpiry,
      });

      await redisHelper.setString(uuid, encryptedData);

      return {
        error: false,
        message: RES_MSG.USER_REGISTER_SUCCESS,
        data: {},
      };
    } catch (err) {
      console.log("error in addUser : ", err);
      if (err instanceof Error) {
        return { error: true, message: err.message };
      }
      return { error: true, message: RES_MSG.ERROR };
    }
  }

  async addUser(value: any): Promise<IESResponse> {
    const { address, provider } = value;

    try {
      const user = await prisma.user.upsert({
        where: { address },
        update: {}, // do nothing if exists
        create: {
          address,
          role: 0,
        },
      });

      let providerUser = null;

      if (provider) {
        const provAddress = convertNodeToWallet(provider, WALLET_PREFIX);
        providerUser = await prisma.user.findUnique({
          where: { address: provAddress },
        });
      }

      return {
        error: false,
        message: RES_MSG.USER_REGISTER_SUCCESS,
        data: { user, provider: providerUser },
      };
    } catch (err) {
      console.log("error in addUser : ", err);
      if (err instanceof Error) {
        return { error: true, message: err.message };
      }
      return { error: true, message: RES_MSG.ERROR };
    }
  }

  async loginUser(value: any, response: Response): Promise<IESResponse> {
    const { address, pubKey, signature } = value;
    try {
      const isSignatureValid = verifyKeplrSignature(address, signature?.signature, pubKey, address);
      if (!isSignatureValid?.verify) throw new Error(RES_MSG.ERROR);

      const user: any = await prisma.user.findUnique({
        where: { address },
      });
      if (!user?.role) {
        return {
          error: true,
          message: RES_MSG.NOT_ADMIN,
          data: { isExist: false },
        };
      }
      const userDetail = {
        address,
        role: user?.role,
      };

      const encryptedData = encryptData(userDetail);
      const uuid = randomUUID();
      response.cookie(COOKIE_NAMES.SESSION_ID, uuid, {
        httpOnly: checkCookieVariable,
        secure: checkCookieVariable,
        sameSite: checkCookieVariable ? "none" : "lax",
        // maxAge: environment.redisExpiry,
      });

      await redisHelper.setString(uuid, encryptedData);

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: { isExist: true, name: user?.name },
      };
    } catch (err) {
      console.log("error in addUser : ", err);
      if (err instanceof Error) {
        return { error: true, message: err.message };
      }
      return { error: true, message: RES_MSG.ERROR };
    }
  }
  async logout(req: any, res: Response): Promise<IESResponse> {
    try {
      const sessionId = String(req?.cookies?.session_id);

      // Delete session from Redis
      await redisHelper.deleteRedisKey(sessionId);

      // Clear cookie
      res.clearCookie(COOKIE_NAMES.SESSION_ID, {
        httpOnly: checkCookieVariable,
        secure: checkCookieVariable,
        sameSite: checkCookieVariable ? "none" : "lax",
      });

      return {
        error: false,
        message: RES_MSG.LOGOUT_SUCCESS,
      };
    } catch (err) {
      if (err instanceof Error) {
        return { error: true, message: err.message };
      }
      return { error: true, message: RES_MSG.ERROR };
    }
  }
}

export default new AuthService();
