import { RES_MSG, WALLET_PREFIX } from "../../constant";
import BigNumber from "bignumber.js";
import prisma from "../../lib/db";
import { bytesToGb, convertNodeToWallet, parseAndConvertPlan } from "../../Utility/common";
import { ActivityMeta } from "../../interfaces";

class ActivityService {
  constructor() {}

  public getActivityList = async (page: number, limit: number, address: any) => {
    try {
      const user = await prisma.user.findUnique({
        where: { address },
        select: { id: true },
      });

      if (!user) {
        return { error: true, message: "User not found" };
      }

      const options: any = {
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          type: true,
          action: true,
          createdAt: true,
          metaData: true,
        },
      };

      if (page && limit) {
        options.skip = (page - 1) * limit;
        options.take = limit;
      }

      const activities = await prisma.activity.findMany(options);

      const providerAddressesSet = new Set<string>();
      for (const act of activities) {
        const provAddress = (act.metaData as ActivityMeta)?.provAddress;
        if (provAddress) {
          const walletAddress = convertNodeToWallet(provAddress, WALLET_PREFIX);
          providerAddressesSet.add(walletAddress);
        }
      }

      const providerAddresses = Array.from(providerAddressesSet);
      let providerMap = new Map<string, string | null>();

      if (providerAddresses.length > 0) {
        const providerUsers = await prisma.user.findMany({
          where: { address: { in: providerAddresses } },
          select: { address: true, name: true },
        });

        providerUsers.forEach((p) => providerMap.set(p.address, p.name));
      }

      const result = await Promise.all(
        activities.map(async (act: any) => {
          const meta = (act.metaData as ActivityMeta) || {};

          if (meta?.plan) {
            meta.plan = parseAndConvertPlan(meta.plan);
          }

          if (meta?.bandwidth) {
            const bandwidthBN = new BigNumber(meta.bandwidth);
            meta.bandwidth = bytesToGb(bandwidthBN);
          }

          const provAddress = meta?.provAddress;

          const providerName = provAddress
            ? providerMap.get(convertNodeToWallet(provAddress, WALLET_PREFIX)) || null
            : null;

          return {
            ...act,
            metaData: meta,
            providerName,
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
