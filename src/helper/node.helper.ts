import { convertNodeToWallet } from "../Utility/common";
import { WALLET_PREFIX } from "../constant";
import prisma from "../lib/db";
import logger from "../lib/logger";

export const saveNodes = async (nodeData: any[]) => {
  try {
    const tasks: any = nodeData.map((node: any) =>
      prisma.nodeRequest.updateMany({
        where: { nodeAddress: node.address },
        data: {
          nodeStatus: node.status,
        },
      })
    );

    return await Promise.allSettled(tasks);
  } catch (err: any) {
    logger.error(err, `error in the saving the node data`);
    return err;
  }
};

export const saveProvider = async (providers: any[]) => {
  if (!providers?.length) return;
  try {
    const tasks: any = providers.map((provider: any) =>
      prisma.user.upsert({
        where: { address: convertNodeToWallet(provider.address, WALLET_PREFIX) },
        update: {},
        create: {
          address: convertNodeToWallet(provider.address, WALLET_PREFIX),
          name: provider.name,
          email: provider.identity,
          url: provider.website,
          description: provider.description,
          role: 1,
        },
      })
    );

    return await Promise.allSettled(tasks);
  } catch (err: any) {
    logger.error(err, `error in the saving the node data`);
    return err;
  }
};

export const batchUpdateNodeRequests = async (
  nodeIds: string[],
  updateData: any,
  logMessage: string,
  batchSize: number = 100
): Promise<void> => {
  if (nodeIds.length === 0) {
    return;
  }

  const batches: string[][] = [];
  for (let i = 0; i < nodeIds.length; i += batchSize) {
    batches.push(nodeIds.slice(i, i + batchSize));
  }

  await Promise.allSettled(
    batches.map(async (batch, index) => {
      try {
        await prisma.nodeRequest.updateMany({
          where: {
            id: { in: batch },
          },
          data: updateData,
        });
        logger.info(`${logMessage}: Batch ${index + 1}/${batches.length} - ${batch.length} records updated`);
      } catch (err) {
        logger.error(`Error processing batch ${index + 1}:`, err);
      }
    })
  );
};
