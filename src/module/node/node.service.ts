import { RES_MSG } from '../../constant';
import { extractIP, fetchRequest, getWalletAddressFromNodeAddress } from '../../Utility/common';
import { FETCH_METHODS } from '../../constant';
import { RedisService } from '../../service';
import authService from '../auth/auth.service';
import prisma from '../../lib/db';
import { verifyKeplrSignature } from "../../Utility/common";
import geoip from 'geoip-lite';
import countries from 'i18n-iso-countries';

class NodeService {
    constructor() { }

    public nodeFormRequest = async (orgName: string, email: string, nodeAddress: string, choosePlan: any, address: string, pubKey: string, signature: any) => {
        console.log("🚀 ~ NodeService ~ choosePlan:", choosePlan)
        try {
            // function is verify the address
            const isSignatureValid = verifyKeplrSignature(
                address,
                signature?.signature,
                pubKey,
                address
            );
            console.log("🚀 ~ NodeService ~ isSignatureValid:", isSignatureValid)

            if (!isSignatureValid.verify) {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }

            // I have to check the nodeAddress is valid node address or not
            const nodeUrl = `${environment?.evmHost}qubetics/node/v3/nodes/${nodeAddress}`;
            const nodeResponse = await fetchRequest(nodeUrl, FETCH_METHODS.GET);
            console.log("🚀 ~ NodeService ~ nodeResponse:", nodeResponse)

            if (nodeResponse?.error === true || nodeResponse?.data?.code === 3) {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }

            const node = nodeResponse?.data?.node;
            console.log("🚀 ~ NodeService ~ node:", node)

            // I have to check the wallet Address is related to the nodeAddress or not
            const calculatedWalletAddress = getWalletAddressFromNodeAddress(nodeAddress);
            console.log("🚀 ~ NodeService ~ calculatedWalletAddress:", calculatedWalletAddress)
            if (calculatedWalletAddress != address) {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }

            // here parallel I am saving the userData to the user table.
            // const responseFromUser=await authService.addUser(address);

            // if(responseFromUser.error===true){
            //     return {
            //         error: true,
            //         message: RES_MSG.ERROR,
            //     }; 
            // }

            // I want to save the data in the node table 

            const ip = extractIP(node?.remote_url);
            const geo = geoip.lookup(ip);
            if (!geo) {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }
            const countryName = countries.getName(geo.country, 'en');
            console.log("🚀 ~ NodeService ~ `${choosePlan?.prices[0]?.quote_value} TICS/month`,:", `${choosePlan?.prices[0]?.quote_value} TICS/month`,"backchodi",choosePlan?.id,)

            const nodeRequest = await prisma.nodeRequest.create({
                data: {
                    orgName,
                    email,
                    nodeAddress,
                    plan: `${choosePlan?.prices[0]?.quote_value} TICS/month`,
                    planId: choosePlan?.id,
                    status: "PENDING",
                    bandwidth: choosePlan?.gigabytes, // TODO: replace with real bandwidth
                    address, // FK to user
                    remoteUrl: nodeUrl,
                    requestFor: "Link", // custom tag
                    location: countryName || geo.country
                },
            });
            console.log("🚀 ~ NodeService ~ nodeRequest:", nodeRequest)


            return {
                error: false,
                message: RES_MSG.SUCCESS_REQUEST,
            }



        } catch (err) {
            console.error('PlanService.getAllPlans error:', err);
            return { error: true, message: RES_MSG.ERROR };
        }
    }

}

export default new NodeService();