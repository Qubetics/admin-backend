import cron from "node-cron";
import { CRON_WORKER, LINK, Message, REQUEST_STATUS, WALLET_PREFIX } from "../constant";
import axios from "axios";
import { saveNodes, saveProvider } from "../helper/node.helper";
import prisma from "../lib/db";
import { convertNodeToWallet, extractIP } from "../Utility/common";
import geoip from "geoip-lite";
import countries from "i18n-iso-countries";
import authService from "../module/auth/auth.service";
import logger from "../lib/logger";

class Worker {
  public async startNodeWorker(): Promise<void> {
    cron.schedule("*/5 * * * *", async () => {
      try {
        logger.info(CRON_WORKER.NODE);

        const results = await this.fetchAndSave(`${environment.evmHost}/qubetics/node/v3/nodes`, saveNodes);

        if (!Array.isArray(results) || results.length === 0) {
          logger.error("Node worker: invalid or empty results from saveNodes");
          return;
        }

        results.forEach((result: any) => {
          if (result.status === "rejected") {
            logger.error("Node update failed:", result.reason?.message || result.reason);
          } else {
            logger.info("Node updated row(s)");
          }
        });
      } catch (error) {
        logger.error("Error in node worker cron job:", error);
      }
    });
  }

  public async nodeRequestWorker(): Promise<void> {
    cron.schedule("*/5 * * * *", async () => {
      try {
        logger.info(CRON_WORKER.NODE_REQUEST);

        const response = await axios.get(`${environment.evmHost}/qubetics/plan/v3/plans`);

        const allNodes: any[] = [];

        await Promise.all(
          response?.data?.plans?.map(async (val: any) => {
            try {
              const result = await axios.get(`${environment.evmHost}/qubetics/node/v3/plans/${val?.id}/nodes`);

              const nodes = result?.data?.nodes || [];

              nodes.forEach((node: any) => {
                allNodes.push({ ...node, plan: val });
              });
            } catch (err) {
              logger.error(`Error fetching nodes for plan ${val?.id}:`, err);
            }
          })
        );

        await Promise.all(
          allNodes.map(async (val: any) => {
            try {
              const ip = extractIP(val?.remote_url);
              const geo: any = geoip.lookup(ip);

              if (!geo) {
                logger.error(`No geo data for IP: ${ip}`);
                return;
              }

              const countryName = countries.getName(geo.country, "en");
              const address = convertNodeToWallet(val?.address, WALLET_PREFIX);

              await authService.addUser({ address });

              await prisma.nodeRequest.upsert({
                where: {
                  nodeAddress: val?.address,
                },
                update: { provAddress: val?.plan?.prov_address },
                create: {
                  nodeAddress: val?.address,
                  nodeStatus: val?.status,
                  planId: val?.plan?.id,
                  remoteUrl: val?.remote_url,
                  hours: val?.plan?.hours,
                  provAddress: val?.plan?.prov_address,
                  bandwidth: val?.plan?.gigabytes,
                  location: countryName || geo.country || "",
                  plan: val?.plan?.prices[0]?.quote_value,
                  status: REQUEST_STATUS.APPROVED,
                  action: false,
                  requestFor: LINK,
                  address,
                },
              });
            } catch (err) {
              logger.error(`Error processing node ${val?.address}:`, err);
            }
          })
        );
      } catch (error) {
        logger.error("Error in node request worker cron job:", error);
      }
    });
  }

  public async startProviderWorker(): Promise<void> {
    cron.schedule("*/5 * * * *", async () => {
      try {
        logger.info(CRON_WORKER.PROVIDER);

        const response = await axios.get(`${environment.evmHost}/qubetics/provider/v2/providers`);

        await saveProvider(response?.data?.providers || []);
      } catch (error) {
        logger.error("Error in provider worker cron job:", error);
      }
    });
  }

<<<<<<< Updated upstream
=======
  public async nodeUnlinkWorker(): Promise<void> {
    cron.schedule("*/5 * * * *", async () => {
      try {
        logger.info(CRON_WORKER.NODE_UNLINK);

        const nodeRequests = await prisma.nodeRequest.findMany({
          where: {
            OR: [
              {
                requestFor: LINK,
                status: REQUEST_STATUS.APPROVED,
              },
              {
                requestFor: UNLINK,
                status: {
                  in: [REQUEST_STATUS.REJECTED, REQUEST_STATUS.PENDING],
                },
              },
            ],
          },
        });

        if (!nodeRequests || nodeRequests.length === 0) {
          logger.info("No linked node requests found");
          return;
        }

        const planNodeAddresses: Map<string, Set<string>> = new Map();
        const uniquePlanIds = [...new Set(nodeRequests.map((req: any) => req.planId))];

        await Promise.all(
          uniquePlanIds.map(async (planId: string) => {
            try {
              const result = await axios.get(`${environment.evmHost}/qubetics/node/v3/plans/${planId}/nodes`);
              const nodes = result?.data?.nodes || [];
              const nodeAddressSet: Set<string> = new Set(nodes.map((node: any) => node.address));
              planNodeAddresses.set(planId, nodeAddressSet);
            } catch (err) {
              logger.error(`Error fetching nodes for plan ${planId}:`, err);
            }
          })
        );

        const nodesToUpdate: any[] = [];
        for (const request of nodeRequests) {
          const planNodes = planNodeAddresses.get(request.planId);
          if (!planNodes || !planNodes.has(request.nodeAddress)) {
            nodesToUpdate.push(request.id);
          }
        }

        await batchUpdateNodeRequests(
          nodesToUpdate,
          {
            status: REQUEST_STATUS.APPROVED,
            requestFor: UNLINK,
          },
          "Nodes unlinked"
        );
      } catch (error) {
        logger.error("Node unlink worker error", { error });
      }
    });
  }

  public async nodeTerminationWorker(): Promise<void> {
    cron.schedule("*/5 * * * *", async () => {
      try {
        logger.info(CRON_WORKER.NODE_TERMINATION);

        const nodeRequests = await prisma.nodeRequest.findMany();

        if (!nodeRequests || nodeRequests.length === 0) {
          logger.info("No node requests found in database");
          return;
        }

        const response = await axios.get(`${environment.evmHost}/qubetics/node/v3/nodes`);
        const activeNodes = response?.data?.nodes || [];

        const activeNodeAddresses = new Set(activeNodes.map((node: any) => node.address));
        const nodesToUpdate: any[] = [];
        for (const request of nodeRequests) {
          if (!activeNodeAddresses.has(request.nodeAddress)) {
            nodesToUpdate.push(request.id);
          }
        }

        await batchUpdateNodeRequests(
          nodesToUpdate,
          {
            status: REQUEST_STATUS.APPROVED,
            requestFor: UNLINK,
          },
          "Nodes terminated"
        );
      } catch (error) {
        logger.error("Error in node termination worker cron job:", error);
      }
    });
  }

>>>>>>> Stashed changes
  private async fetchAndSave<T>(url: string, saveFunction: (data: T[]) => any): Promise<any> {
    try {
      const response = await axios.get(url);
      const data = response?.data?.nodes;

      if (!data) {
        throw new Error(`${Message.nodeFail} Response data missing`);
      }

      return await saveFunction(data);
    } catch (error) {
      logger.error(`Error fetching or saving data from ${url}:`, error);
      return null;
    }
  }
}

export default new Worker();
