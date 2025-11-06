import prisma from "../../lib/db";
import { extractIP, fetchRequest, getOffset, getWalletAddressFromNodeAddress } from "../../Utility/common";
import { FETCH_METHODS, RES_MSG } from "../../constant";
import geoip from "geoip-lite";

class ProviderService {
  async getAllProvider(data: any): Promise<any> {
    try {
      const page = data.page;
      const limit = data.limit;

      let url = `${environment.evmHost}qubetics/provider/v2/providers`;

      if (page && limit) {
        const offset = getOffset(page, limit);
        url += `?pagination.offset=${offset}&pagination.limit=${limit}&pagination.reverse=false&pagination.count_total=true`;
      }
      const response = await fetchRequest(url, FETCH_METHODS.GET);

      if (!response) {
        return { error: true, message: RES_MSG.ERROR };
      }

      const allProviders = response?.data?.providers || [];
      const activeProviders = allProviders.filter((provider: any) => provider.status?.toLowerCase() === "active");

      let updatedProviders = activeProviders;

      if (page && limit) {
        const nodeCounts = await prisma.$queryRaw<{ provAddress: string; count: bigint }[]>`
          SELECT "provAddress", COUNT(*)::bigint as count
          FROM "NodeRequest"
          WHERE "nodeStatus" = 'active'
          GROUP BY "provAddress";
        `;

        const countMap: Record<string, number> = {};
        nodeCounts.forEach((row) => {
          countMap[row.provAddress] = Number(row.count);
        });

        updatedProviders = activeProviders.map((provider: any) => ({
          ...provider,
          walletAddress: getWalletAddressFromNodeAddress(provider.address),
          nodeCount: countMap[provider.address] || 0,
        }));
      }

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: { providers: updatedProviders },
        total: response?.data?.pagination,
      };
    } catch (err) {
      console.error("get all provider error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }

  async getProviderDetails(address: string, page = "1", limit = "10"): Promise<any> {
    try {
      if (!address) {
        return { error: true, message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT };
      }

      const offset = getOffset(Number(page), Number(limit));

      const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "NodeRequest"
        WHERE "provAddress" = ${address};
      `;

      const totalCount = Number(countResult?.[0]?.count || 0);

      const nodeList = await prisma.$queryRaw<
        {
          orgName: string | null;
          location: string;
          nodeStatus: string;
          remoteUrl: string;
        }[]
      >`
        SELECT 
          "orgName", 
          "location", 
          "nodeStatus",
          "remoteUrl"
        FROM "NodeRequest"
        WHERE "provAddress" = ${address}
        ORDER BY "createdAt" DESC
        OFFSET ${offset}
        LIMIT ${Number(limit)};
      `;

      const enrichedNodes = nodeList.map((node) => {
        const ip = extractIP(node.remoteUrl);
        if (!ip) {
          return { ...node, city: null };
        }

        const geo = geoip.lookup(ip);
        return {
          ...node,
          city: geo?.city || null,
        };
      });

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: {
          total: totalCount,
          nodes: enrichedNodes,
        },
      };
    } catch (err) {
      console.error("getProviderDetails error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }
}

export default new ProviderService();
