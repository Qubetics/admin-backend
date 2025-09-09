import prisma from "../lib/db";

const saveNodes = async (nodeData: any[]) => {
    try {
        const tasks:any = nodeData.map((node:any) =>
            prisma.nodeRequest.updateMany({
                where: { nodeAddress: node.address },
                data: {
                    nodeStatus: node.status 
            }
            })
        );

        console.log("Nodes saved/updated successfully");
        return await Promise.allSettled(tasks);
    } catch (err) {
        console.log(err,`error in the saving the node data`);
        return err;
    }
}

export default saveNodes;