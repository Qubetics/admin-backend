import prisma from "../../lib/db";
import {
  convertNodeToWallet,
  extractBothIP,
  fetchRequest,
  getOffset,
  getWalletAddressFromNodeAddress,
} from "../../Utility/common";
import { ACTIVE, FETCH_METHODS, RES_MSG, UNDEFINED, WALLET_PREFIX } from "../../constant";
import logger from "../../lib/logger";
import maxmindHelper from "../../helper/maxmind.helper";

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

      let updatedProviders = allProviders;

      if (page && limit) {
        const nodeCounts = await prisma.$queryRaw<
        { provAddress: string; count: bigint }[]
      >`
        SELECT "provAddress", COUNT(*)::bigint AS count
        FROM "NodeRequest"
        WHERE "nodeStatus" = 'active'
          AND (
            ("status" = 'APPROVED' AND "requestFor" = 'Link') OR
            ("status" = 'PENDING'  AND "requestFor" = 'Unlink') OR
            ("status" = 'REJECTED' AND "requestFor" = 'Unlink')
          )
        GROUP BY "provAddress";
      `;

        const countMap: Record<string, number> = {};
        nodeCounts.forEach((row) => {
          countMap[row.provAddress] = Number(row.count);
        });

        updatedProviders = allProviders.map((provider: any) => ({
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
      logger.error("get all provider error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }

  async getProviderDetails(address: string, page = "1", limit = "10"): Promise<any> {
    try {
      if (!address || address === UNDEFINED) {
        return { error: true, message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT };
      }

      const offset = getOffset(Number(page), Number(limit));

      const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "NodeRequest"
      WHERE "provAddress" = ${address}
        AND (
          ("status" = 'APPROVED' AND "requestFor" = 'Link') OR
          ("status" = 'PENDING' AND "requestFor" = 'Unlink') OR
          ("status" = 'REJECTED' AND "requestFor" = 'Unlink')
        );
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
        "nodeAddress", 
        "location", 
        "nodeStatus",
        "remoteUrl"
      FROM "NodeRequest"
      WHERE "provAddress" = ${address}
        AND (
          ("status" = 'APPROVED' AND "requestFor" = 'Link') OR
          ("status" = 'PENDING' AND "requestFor" = 'Unlink') OR
          ("status" = 'REJECTED' AND "requestFor" = 'Unlink')
        )
      ORDER BY "createdAt" DESC
      OFFSET ${offset}
      LIMIT ${Number(limit)};
    `;

      const enrichedNodesResults = await Promise.allSettled(nodeList.map(async (node) => {
        const ip = extractBothIP(node?.remoteUrl);
        if (!ip) {
          return { ...node, city: null };
        }
  

      const geo = await maxmindHelper.getLocationData(String(ip));
        return {
          ...node,
          city: geo?.city || null,
        };
      }));

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: {
          total: totalCount,
          nodes: enrichedNodesResults,
        },
      };
    } catch (err) {
      logger.error("getProviderDetails error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }

  async isProviderAddressExists(address: string): Promise<any> {
    try {
      if (!address || address === UNDEFINED) {
        return { error: true, message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT };
      }

      const wallet_address = convertNodeToWallet(address, WALLET_PREFIX);

      const provider = await prisma.user.findFirst({ where: { address: wallet_address, role: 1 } });

      if (!provider) {
        return {
          error: true,
          message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT
        }
      }

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: {
          provider: address,
        },
      };
    } catch (err) {
      logger.error("getProviderDetails error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }

  async getActivePlanProviders(): Promise<any> {
    try {
      let url = `${environment.evmHost}/qubetics/plan/v3/plans`;
      const response = await fetchRequest(url, FETCH_METHODS.GET);

      if (response.error) {
        return { error: true, message: RES_MSG.ERROR };
      }
      const activeProviders = [
        ...new Set(response?.data?.plans.filter((p: any) => p.status === ACTIVE).map((p: any) => p.prov_address)),
      ];

      const providerWallets = activeProviders.map((addr) => convertNodeToWallet(addr, WALLET_PREFIX));

      const users = await prisma.user.findMany({
        where: {
          address: { in: providerWallets },
        },
        select: {
          name: true,
          address: true,
        },
      });

      let finalProviders = activeProviders.map((nodeAddress) => {
        const walletAddress = convertNodeToWallet(nodeAddress, WALLET_PREFIX);

        const user = users.find((u) => u.address === walletAddress);

        return {
          providerAddress: nodeAddress,
          name: user?.name || null,
        };
      });

      finalProviders.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || "";
        const nameB = b.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: { providers: finalProviders },
      };
    } catch (err) {
      logger.error("get all provider error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }

  async getProviderLeaseId(address: string, nodeAddress: string): Promise<any> {
    try {
      if (!address || address === UNDEFINED) {
        return { error: true, message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT };
      }

      const url = `${environment.evmHost}qubetics/lease/v1/providers/${address}/leases`;
      const response = await fetchRequest(url, FETCH_METHODS.GET);

      if (!response || response.error) {
        return { error: true, message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT };
      }

      let leases = response?.data?.leases || [];

      if (leases.length === 0) {
        return {
          error: true,
          message: RES_MSG.NO_LEASE_FOUND,
        
        };
      }

      // Filter by node_address if provided
      if (nodeAddress && nodeAddress !== UNDEFINED) {
        leases = leases.filter((lease: any) => lease.node_address === nodeAddress);

        if (leases.length === 0) {
          return {
            error: true,
            message: RES_MSG.NO_LEASE_FOUND,
          };
        }
      }else{
         return { error: true, message: RES_MSG.NODE_ADRES_IS_NOT_PRESENT };
      }

      leases.sort((a: any, b: any) => {
        const dateA = new Date(a.start_at).getTime();
        const dateB = new Date(b.start_at).getTime();
        return dateB - dateA;
      });

      const latestLeaseId = leases[0].id;

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: { leaseId: latestLeaseId },
      };
    } catch (err) {
      logger.error("getProviderLeaseId error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }
}

export default new ProviderService();
