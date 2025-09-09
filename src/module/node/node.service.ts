import { LINK, PENDING, RES_MSG, UNDEFINED } from '../../constant';
import { extractIP, fetchRequest, getWalletAddressFromNodeAddress } from '../../Utility/common';
import { FETCH_METHODS } from '../../constant';
import { RedisService } from '../../service';
import AuthService from '../auth/auth.service';
import prisma from '../../lib/db';
import { verifyKeplrSignature } from "../../Utility/common";
import geoip from 'geoip-lite';
import countries from 'i18n-iso-countries';

class NodeService {
    constructor() { }

    public nodeFormRequest = async (orgName: string, email: string, nodeAddress: string, choosePlan: any, address: string, pubKey: string, signature: any,request:string) => {
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

            if (nodeResponse?.error === true || nodeResponse?.data?.code === 3 || nodeResponse?.data?.node?.status === "inactive") {
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
            const responseFromUser = await AuthService.addUser({ address });

            if (responseFromUser.error === true) {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }

            // I want to save the data in the node table 

            const ip = extractIP(node?.remote_url);
            const geo = geoip.lookup(ip);
            console.log("🚀 ~ NodeService ~ geo:", geo)
            if (!geo) {
                console.log("iske andar",geo);
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }
            const countryName = countries.getName(geo.country, 'en');
            // console.log("🚀 ~ NodeService ~ `${choosePlan?.prices[0]?.quote_value} TICS/month`,:", `${choosePlan?.prices[0]?.quote_value} TICS/month`, "backchodi", choosePlan?.id,)

            const nodeRequest = await prisma.nodeRequest.create({
                data: {
                    orgName,
                    email,
                    nodeAddress,
                    plan: choosePlan.plan,
                    planId: choosePlan?.planId,
                    provAddress: choosePlan?.provAddress,
                    status: PENDING,
                    nodeStatus: node?.status || "inactive",
                    bandwidth: choosePlan?.bandwidth, // TODO: replace with real bandwidth
                    address, // FK to user
                    remoteUrl: node?.remote_url,
                    requestFor: request, // custom tag
                    location: countryName || geo.country,
                    action: false
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

    public getAllNodeRequestList = async (page: number, limit: number) => {
        try {
            const skip = (page - 1) * limit;

            const response = await prisma.nodeRequest.findMany({
                skip,
                take: limit,
                select: {
                    orgName: true,
                    email: true,
                    nodeAddress: true,
                    requestFor: true,
                    bandwidth: true,
                    plan: true,
                    location: true,
                }
            });

            return {
                error:false,
                data: response,
                message: RES_MSG.NODE_REQUESTLIST
            }
        } catch (error) {
            console.error('PlanService.getAllPlans error:', error);
            return { error: true, message: RES_MSG.ERROR };
        }
    }

    public getAllNodeForAddress = async (
        providerAddress: string,
        page: number,
        limit: number,
        status?: string
      ) => {
        try {
          if (!providerAddress || providerAddress === UNDEFINED) {
            return {
              error: true,
              message: RES_MSG.ERROR,
            };
          }
    
          const skip = (page - 1) * limit;
    
          // Build query conditions
          const where: any = { provAddress: providerAddress };
          if (status) {
            where.status = status;
          }
    
          // Fetch data + count in parallel
          const [data, total] = await Promise.all([
            prisma.nodeRequest.findMany({
              where,
              skip,
              take: limit,
              orderBy: { createdAt: "desc" },
              select: {
                orgName: true,
                nodeAddress: true,
                status: true,
                requestFor: true,
              },
            }),
            prisma.nodeRequest.count({ where }),
          ]);
    
          return {
            error: false,
            message: RES_MSG.SUCCESS,
            data: {
                response:data,
                total:total
            }
          };
        } catch (error) {
          console.error("NodeService.getAllNodeForAddress error:", error);
          return {
            error: true,
            message: RES_MSG.ERROR,
          };
        }
      };

}

export default new NodeService();