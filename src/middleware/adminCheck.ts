import { Response, Request, NextFunction } from "express";
import * as Helpers from "../service/index";
// import { RESPONSE_MESSAGES, STATUS_CODES, ADMIN } from '../constants';
import redisHelper from "../service/redis.helper";
import { RESPONSES, RES_MSG } from "../constant";
import { decryptData, isTokenExpired } from "../Utility/common";
import prisma from "../lib/db";

const setResponse = Helpers.ResponseHelper;
export const adminCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // fetch the admin address from contract
    const token = String(req.cookies?.session_id);
    const redis_val = await redisHelper.getString(token);
    const value = decryptData(redis_val);

    // check for token
    if (!token || token == undefined || !value.address) {
      return setResponse.error(res, {
        message: RES_MSG.UNAUTHORIZED,
        status: RESPONSES.UN_AUTHORIZED,
      });
    }
    
    const user:any = await prisma.user.findUnique({
      where: { address: value.address },
    });

    if (user.address && user.role == 1) {

      // updating the token time for session login
      await redisHelper.updateRedisTime(token);
      (req as any).user.providerAddress=user.address;
      (req as any).user.role=user.role;
      next();
    } else {
      return setResponse.error(res, {
        message: RES_MSG.UNAUTHORIZED,
        status: RESPONSES.UN_AUTHORIZED,
      });
    }
  } catch (error) {
    return setResponse.error(res, {
      message: RES_MSG.SERVER_ERROR,
      status: RESPONSES.INTERNAL_SERVER,
    });
  }
};
