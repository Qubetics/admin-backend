import cron from "node-cron";
import {
  CRON_WORKER,
  LINK,
  Message,
  REQUEST_STATUS,
  WALLET_PREFIX,
} from "../constant";
import axios from "axios";
import { saveNodes, saveProvider } from "../helper/node.helper";
import prisma from "../lib/db";
import { convertNodeToWallet, extractIP } from "../Utility/common";
import geoip from "geoip-lite";
import countries from "i18n-iso-countries";
import authService from "../module/auth/auth.service";

class Worker {
  public async startNodeWorker(): Promise<void> {
    try {
      cron.schedule("*/5 * * * *", async () => {
        console.log(CRON_WORKER.NODE);
        const results = await this.fetchAndSave(
          `${environment.evmHost}/qubetics/node/v3/nodes`,
          saveNodes
        );

        //@ts-ignore
        results.forEach((result: any, index: number) => {
          if (result.status === "rejected") {
            console.error(
              `Node  failed:`,
              result.reason?.message || result.reason
            );
          } else {
            console.log(` Node updated row(s))`);
          }
        });
      });
    } catch (error) {
      console.log(error, "error");
    }
  }

  public async nodeRequestWorker(): Promise<void> {
    try {
      cron.schedule("*/1 * * * *", async () => {
        console.log(CRON_WORKER.NODE_REQUEST);

        const response = await axios.get(
          `${environment.evmHost}/qubetics/plan/v3/plans`
        );

        const allNodes: any = [];

        await Promise.all(
          response?.data?.plans?.map(async (val: any) => {
            try {
              const result = await axios.get(
                `${environment.evmHost}/qubetics/node/v3/plans/${val?.id}/nodes`
              );

              const nodes = result?.data?.nodes || [];

              if (nodes.length > 0) {
                nodes.forEach((node: any) => {
                  allNodes.push({
                    ...node,
                    plan: val, // attach the corresponding plan info
                  });
                });
              }
            } catch (err) {
              console.error(`Error fetching nodes for plan ${val?.id}:`, err);
            }
          })
        );

        await allNodes?.map(async (val: any) => {
          const ip = extractIP(val?.remote_url);
          const geo: any = geoip.lookup(ip);
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
              requestFor:LINK,
              address,
            },
          });
        });
      });
    } catch (error) {
      console.log(error, "error");
    }
  }

  public async startProviderWorker(): Promise<void> {
    try {
      cron.schedule("*/5 * * * *", async () => {
        console.log(CRON_WORKER.PROVIDER);

        const response = await axios.get(
          `${environment.evmHost}/qubetics/provider/v2/providers`
        );
        await saveProvider(response?.data?.providers || []);
      });
    } catch (error) {}
  }

  private async fetchAndSave<T>(
    url: string,
    saveFunction: (data: T[]) => void
  ): Promise<void> {
    //try catch
    const response = await axios.get(url);

    const data = response.data?.nodes;
    if (!data) {
      throw new Error(`${Message.nodeFail} Response data missing`);
    }

    return await saveFunction(data);
  }
}

export default new Worker();
