import { ACTIVE, INACTIVE, LINK, PENDING, RES_MSG, UNDEFINED } from '../../constant';
import { extractIP, fetchRequest, getWalletAddressFromNodeAddress } from '../../Utility/common';
import { FETCH_METHODS } from '../../constant';
import { RedisService } from '../../service';
import AuthService from '../auth/auth.service';
import prisma from '../../lib/db';
import { verifyKeplrSignature } from "../../Utility/common";
import geoip from 'geoip-lite';
import countries from 'i18n-iso-countries';
import { Status } from '../../interfaces';
import mailService from '../mail/mail.service';

class NodeService {
    constructor() { }

    public nodeFormRequest = async (orgName: string, email: string, nodeAddress: string, choosePlan: any, address: string, pubKey: string, signature: any, request: string) => {
        try {
            // function is verify the address
            const isSignatureValid = verifyKeplrSignature(
                address,
                signature?.signature,
                pubKey,
                address
            );

            if (!isSignatureValid.verify) {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }

            // I have to check the nodeAddress is valid node address or not
            const nodeUrl = `${environment?.evmHost}qubetics/node/v3/nodes/${nodeAddress}`;
            const nodeResponse = await fetchRequest(nodeUrl, FETCH_METHODS.GET);

            if (nodeResponse?.error === true || nodeResponse?.data?.code === 3 || nodeResponse?.data?.node?.status === "inactive") {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }

            const node = nodeResponse?.data?.node;

            const existing = await prisma.nodeRequest.findFirst({
                where: {
                  nodeAddress,
                  status: { in: ["PENDING", "APPROVED"] }, // adjust if your statuses are uppercase
                },
              });
              
              // 2. If such a record exists, handle it (e.g., throw an error or return early)
              if (existing) {
                return {
                    error: true,
                    message: RES_MSG.NODE_REQUEST_IS_STILL
                }
              }

            // I have to check the wallet Address is related to the nodeAddress or not
            const calculatedWalletAddress = getWalletAddressFromNodeAddress(nodeAddress);
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
            if (!geo) {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }
            const countryName = countries.getName(geo.country, 'en');

            const nodeRequest = await prisma.nodeRequest.upsert({
                where: {
                    nodeAddress: nodeAddress, // make sure nodeAddress is UNIQUE in your schema
                },
                update: {
                    orgName,
                    email,
                    plan: choosePlan.plan,
                    planId: choosePlan?.planId,
                    provAddress: choosePlan?.provAddress,
                    status: PENDING,
                    nodeStatus: node?.status || "inactive",
                    bandwidth: choosePlan?.bandwidth,
                    address,
                    remoteUrl: node?.remote_url,
                    requestFor: request,
                    location: countryName || geo.country,
                    action: false,
                },
                create: {
                    orgName,
                    email,
                    nodeAddress,
                    plan: choosePlan.plan,
                    planId: choosePlan?.planId,
                    provAddress: choosePlan?.provAddress,
                    status: PENDING,
                    nodeStatus: node?.status || "inactive",
                    bandwidth: choosePlan?.bandwidth,
                    address,
                    remoteUrl: node?.remote_url,
                    requestFor: request,
                    location: countryName || geo.country,
                    action: false,
                },
            });



            return {
                error: false,
                message: RES_MSG.SUCCESS_REQUEST,
            }

        } catch (err) {
            console.error('PlanService.getAllPlans error:', err);
            return { error: true, message: RES_MSG.ERROR };
        }
    };

    public getAllNodeRequestList = async (page: number, limit: number) => {
        try {
            const skip = (page - 1) * limit;

            const response = await prisma.nodeRequest.findMany({
                skip,
                take: limit,
                where: {
                    status: PENDING,
                },
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

            const total = await prisma.nodeRequest.count();

            return {
                error: false,
                data: {
                    nodeList: response,
                    count: total
                },
                message: RES_MSG.NODE_REQUESTLIST
            }
        } catch (error) {
            return { error: true, message: RES_MSG.ERROR };
        }
    };

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

            if (status !== ACTIVE && status !== INACTIVE) {
                status = UNDEFINED;
            }

            // Build query conditions
            const where: any = { provAddress: providerAddress };
            if (status != UNDEFINED) {
                where.nodeStatus = status;
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
                        nodeStatus: true,
                        requestFor: true,
                    },
                }),
                prisma.nodeRequest.count({ where }),
            ]);

            return {
                error: false,
                message: RES_MSG.SUCCESS,
                data: {
                    response: data,
                    total: total
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

    public updateNodeStatus = async (
        nodeAddress: string,
        status: Status
    ) => {
        try {
            if (nodeAddress == UNDEFINED || status == "undefined") {
                return {
                    error: true,
                    message: RES_MSG.ERROR,
                };
            }

            const updatedNode = await prisma.nodeRequest.update({
                where: { nodeAddress },
                data: { status },
                select: {
                    email: true,
                    nodeAddress: true
                }
            });

            console.log(updatedNode, "updatedNode");

            let isApproved: boolean = false;
            if (status === "APPROVED") {
                isApproved = true;
            }

            if (!updatedNode.email) {
                return {
                    error: false,
                    message: RES_MSG.NODE_REQUEST_ACTION_DONE_NO_EMAIL,
                };
            }

            const response =  await mailService.sendApprovalMail(updatedNode.email, updatedNode.nodeAddress, isApproved);

            return {
                error:false,
                message: RES_MSG.UNABLE_TO_SEND_EMAIL,
            }

            return {
                error: false,
                message: RES_MSG.SUCCESS,
            };

        } catch (error) {
            return {
                error: true,
                message: RES_MSG.ERROR,
            };
        }
    };

}

export default new NodeService();