import { RES_MSG } from '../../constant';
import { fetchRequest, getWalletAddressFromNodeAddress } from '../../Utility/common';
import { FETCH_METHODS } from '../../constant';
import { RedisService } from '../../service';
import authService from '../auth/auth.service';
import prisma from '../../lib/db';
// import { verifyKeplrSignature } from "../../Utility/common";

class NodeService {
    constructor() { }

    public nodeFormRequest = async (orgName: string, email: string, nodeAddress: string, choosePlan: string, address: string, pubKey: string, signature: any) => {
        try {
            // function is verify the address
            //    const isSignatureValid = verifyKeplrSignature(
            //     address,
            //     signature?.signature,
            //     pubKey,
            //     address
            //   );

            //   if(!isSignatureValid.verify){
            //     return {
            //         error: true,
            //         message: RES_MSG.ERROR,
            //       };
            //   }

            // I have to check the nodeAddress is valid node address or not
            const nodeUrl = `${environment?.evmHost}qubetics/node/v3/nodes/${nodeAddress}`;
            const nodeResponse = await fetchRequest(nodeUrl, FETCH_METHODS.GET);

            if (nodeResponse?.error === true || nodeResponse?.data?.code === 3) {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }

            // I have to check the wallet Address is related to the nodeAddress or not
            const calculatedWalletAddress=getWalletAddressFromNodeAddress(nodeAddress);
            if(calculatedWalletAddress!=address){
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                }; 
            }

            // here parallel I am saving the userData to the user table and fetch the detail of the node from the chain
            // const responseFromUser=await authService.addUser(address);

            // if(responseFromUser.error===true){
            //     return {
            //         error: true,
            //         message: RES_MSG.ERROR,
            //     }; 
            // }

            // I want to save the data in the node table 

            // const nodeRequest = await prisma.nodeRequest.create({
            //     data: {
            //       orgName,
            //       email,
            //       nodeAddress,
            //       plan: choosePlan,
            //       status: "PENDING",
            //       bandwidth: "100mbps", // TODO: replace with real bandwidth
            //       address, // FK to user
            //       remoteUrl: nodeUrl,
            //       requestFor: "NEW_NODE", // custom tag
            //     },
            //   });



        } catch (err) {
            console.error('PlanService.getAllPlans error:', err);
            return { error: true, message: RES_MSG.ERROR };
        }
    }

}

export default new NodeService();