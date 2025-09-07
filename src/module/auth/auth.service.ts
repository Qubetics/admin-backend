import { encryptData, verifyKeplrSignature } from "../../Utility/common";
import { COOKIE_NAMES,  RES_MSG } from "../../constant";
import { IESResponse } from "../../interfaces";
import prisma from "../../lib/db";
import redisHelper from "../../service/redis.helper";
import { Request, Response } from "express";

class AuthService {
  constructor() {}

  async addUser(value: any): Promise<IESResponse> {
    const { address } = value;
    try {
      //Validate address

      const result = await prisma.user.upsert({
        where: { address },
        update: {}, // do nothing if exists
        create: {
          address,
          role: 0,
        },
      });
      if (!result) throw new Error(RES_MSG.ERROR);

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

  async loginUser(value: any, response: Response): Promise<IESResponse> {
    const { address, pubKey, signature } = value;
    try {
      const isSignatureValid = verifyKeplrSignature(
        address,
        signature?.signature,
        pubKey,
        address
      );
      if (!isSignatureValid?.verify) throw new Error(RES_MSG.ERROR);

      const user: any = await prisma.user.findUnique({
        where: { address },
      });
      // if (!user.role) throw new Error(RES_MSG.LOGIN_FAILED);
      const userDetail = {
        address,
        role: user.role,
      };

      const encryptedData = encryptData(userDetail);
      response.cookie(COOKIE_NAMES.SESSION_ID, encryptedData, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        // maxAge: environment.redisExpiry,
      });

      await redisHelper.setString(encryptedData, userDetail);

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
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
  async logout(req: Request, res: Response): Promise<IESResponse> {
    try {

      const sessionId = String(req?.cookies?.session_id); 
  
       // Delete session from Redis
      await redisHelper.deleteRedisKey(sessionId);
  
      // Clear cookie
      res.clearCookie(COOKIE_NAMES.SESSION_ID, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
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
