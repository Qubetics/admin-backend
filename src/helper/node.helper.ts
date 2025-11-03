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
        where: { address: provider.address },
        update: {}, // do nothing if exists
        create: {
          address: provider.address,
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

export const saveNodeRequest = async (node: any[]) => {
  if (!node?.length) return;
  try {
    // const tasks: any = node.map((provider: any) =>
    //   prisma.user.upsert({
    //     where: { address: provider.address },
    //     update: {}, // do nothing if exists
    //     create: {
    //       address: provider.address,
    //       name: provider.name,
    //       email: provider.identity,
    //       url: provider.website,
    //       description: provider.description,
    //       role: 1,
    //     },
    //   })
    // );
    // return await Promise.allSettled(tasks);
  } catch (err) {
    console.log(err, `error in the saving the node data`);
    return err;
  }
};
