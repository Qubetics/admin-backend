import { convertNodeToWallet } from "../Utility/common";
import { WALLET_PREFIX } from "../constant";
import prisma from "../lib/db";

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
  } catch (err) {
    console.log(err, `error in the saving the node data`);
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
  } catch (err) {
    console.log(err, `error in the saving the node data`);
    return err;
  }
};
