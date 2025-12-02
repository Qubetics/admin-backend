import { RES_MSG, WALLET_PREFIX } from "../../constant";
import BigNumber from "bignumber.js";
import prisma from "../../lib/db";
import { bytesToGb, convertNodeToWallet, parseAndConvertPlan } from "../../Utility/common";

class ActivityService {
  constructor() {}

  public getActivityList = async (page: number, limit: number, address: any) => {
    try {
      const user = await prisma.user.findUnique({
        where: { address },
        select: { id: true },
      });

      if (!user) {
        return { error: true, message: RES_MSG.USER_NOT_FOUND };
      }

      const options: any = { where: { userId: user.id }, orderBy: { createdAt: "desc" } };
      if (page && limit) {
        options.skip = (page - 1) * limit;
        options.take = limit;
      }

      const activities = await prisma.activity.findMany(options);

      const result = await Promise.all(
        activities.map(async (act: any) => {
          const meta = act.metaData || {};

          if (meta?.plan) {
            meta.plan = parseAndConvertPlan(meta.plan);
          }

          if (meta?.bandwidth) {
            const bandwidthBN = new BigNumber(meta.bandwidth);
            meta.bandwidth = bytesToGb(bandwidthBN);
          }

          const provAddress = meta?.provAddress;

          if (!provAddress) {
            return {
              ...act,
              metaData: meta,
              providerName: null,
            };
          }

          const walletAddress = convertNodeToWallet(provAddress, WALLET_PREFIX);

          const providerUser = await prisma.user.findUnique({
            where: { address: walletAddress },
            select: { name: true },
          });

          return {
            ...act,
            metaData: meta,
            providerName: providerUser?.name || null,
          };
        })
      );

      const total = await prisma.activity.count({
        where: { userId: user.id },
      });

      return {
        error: false,
        data: {
          activityList: result,
          count: total,
        },
        message: RES_MSG.NODE_REQUESTLIST,
      };
    } catch (error) {
      return { error: true, message: RES_MSG.ERROR };
    }
  };
}

export default new ActivityService();
