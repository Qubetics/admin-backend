import { ACTIVE, INACTIVE, LINK, PENDING, RES_MSG, UNDEFINED, UNLINK } from "../../constant";
import { extractIP, fetchRequest, getWalletAddressFromNodeAddress, canSubmitNodeRequest } from "../../Utility/common";
import { FETCH_METHODS } from "../../constant";
import { RedisService } from "../../service";
import AuthService from "../auth/auth.service";
import prisma from "../../lib/db";
import { verifyKeplrSignature } from "../../Utility/common";
import geoip from "geoip-lite";
import countries from "i18n-iso-countries";
import { Status } from "../../interfaces";
import mailService from "../mail/mail.service";

class NodeService {
  constructor() {}

  public nodeFormRequest = async (
    orgName: string,
    email: string,
    nodeAddress: string,
    choosePlan: any,
    address: string,
    pubKey: string,
    signature: any,
    request: string
  ) => {
    try {
      // function is verify the address
      const isSignatureValid = verifyKeplrSignature(address, signature?.signature, pubKey, address);

      if (!isSignatureValid.verify) {
        return {
          error: true,
          message: RES_MSG.NOT_VERIFY,
        };
      }

      // I have to check the nodeAddress is valid node address or not
      const nodeUrl = `${environment?.evmHost}qubetics/node/v3/nodes/${nodeAddress}`;
      const nodeResponse = await fetchRequest(nodeUrl, FETCH_METHODS.GET);

      if (
        nodeResponse?.error === true ||
        nodeResponse?.data?.code === 3 ||
        nodeResponse?.data?.node?.status === "inactive"
      ) {
        return {
          error: true,
          message: RES_MSG.NOT_PRESENT_ON_CHAIN,
        };
      }

      const node = nodeResponse?.data?.node;

      const existing = await prisma.nodeRequest.findFirst({
        where: { nodeAddress },
        orderBy: { createdAt: "desc" },
        select: { status: true, requestFor: true },
      });

      // If there’s no previous record, allow proceeding
      if (existing) {
        const result = await canSubmitNodeRequest(existing?.status, existing?.requestFor, request);

        if (!result.ok) {
          return { error: true, message: result.message };
        }
      }

      // I have to check the wallet Address is related to the nodeAddress or not
      const calculatedWalletAddress = getWalletAddressFromNodeAddress(nodeAddress);
      if (calculatedWalletAddress != address) {
        return {
          error: true,
          message: RES_MSG.NOT_LINKED,
        };
      }

      if (orgName === UNDEFINED) {
        orgName = "";
      }
      if (email === UNDEFINED) {
        email = "";
      }

      // here parallel I am saving the userData to the user table.
      const responseFromUser = await AuthService.addUser({ address });

      if (responseFromUser.error === true) {
        return {
          error: true,
          message: RES_MSG.UNABLE_TO_SAVE_THE_USER,
        };
      }

      if ((!choosePlan || Object.keys(choosePlan).length === 0) && request === UNLINK) {
        const existingNode = await prisma.nodeRequest.findUnique({
          where: { nodeAddress },
          select: { plan: true, planId: true, provAddress: true, bandwidth: true, hours: true },
        });

        if (!existingNode) {
          return { error: true, message: RES_MSG.NODE_IS_NOT_LINK };
        }

        choosePlan = {
          plan: existingNode.plan,
          planId: existingNode.planId,
          provAddress: existingNode.provAddress,
          bandwidth: existingNode.bandwidth,
          hours: existingNode.hours,
        };
      }

      // I want to save the data in the node table

      const ip = extractIP(node?.remote_url);
      const geo = geoip.lookup(ip);
      if (!geo) {
        return {
          error: true,
          message: RES_MSG.UNABLE_TO_FIND_LOC,
        };
      }
      const countryName = countries.getName(geo.country, "en");

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
          hours: choosePlan?.hours,
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
          hours: choosePlan?.hours,
          location: countryName || geo.country,
          action: false,
        },
      });

      return {
        error: false,
        message: RES_MSG.SUCCESS_REQUEST,
      };
    } catch (err) {
      console.error("PlanService.getAllPlans error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  };

  public getAllNodeRequestList = async (page: number, limit: number, reqStatus: string, providerAddress: string) => {
    try {
      const where: any = { status: PENDING };
      if (reqStatus === LINK || reqStatus === UNLINK) {
        where.requestFor = reqStatus;
      }

      if (providerAddress != UNDEFINED) {
        where.provAddress = providerAddress;
      }

      console.log("[DEBUG] Testing Log providerAddress===========================>", providerAddress);
      const skip = (page - 1) * limit;

      const response = await prisma.nodeRequest.findMany({
        skip,
        take: limit,
        where,
        select: {
          orgName: true,
          email: true,
          nodeAddress: true,
          requestFor: true,
          bandwidth: true,
          plan: true,
          location: true,
          planId: true,
          provAddress: true,
          hours: true,
        },
      });

      const total = await prisma.nodeRequest.count();

      return {
        error: false,
        data: {
          nodeList: response,
          count: total,
        },
        message: RES_MSG.NODE_REQUESTLIST,
      };
    } catch (error) {
      return { error: true, message: RES_MSG.ERROR };
    }
  };

  public getAllNodeForAddress = async (
    providerAddress: string,
    page: number,
    limit: number,
    status?: string,
    reqStatus?: string
  ) => {
    try {
      if (!providerAddress || providerAddress === UNDEFINED) {
        return {
          error: true,
          message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT,
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

      if (reqStatus != UNDEFINED) {
        where.status = reqStatus;
      }

      const selectFields: any = {
        orgName: true,
        nodeAddress: true,
        requestFor: true,
        status: true,
      };

      // Only include nodeStatus if no status filter is applied
      if (status === UNDEFINED) {
        selectFields.nodeStatus = true;
      }

      if (reqStatus === UNDEFINED) {
        selectFields.status = true;
      }

      // Fetch data + count in parallel
      const [data, total] = await Promise.all([
        prisma.nodeRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: selectFields,
        }),
        prisma.nodeRequest.count({ where }),
      ]);

      return {
        error: false,
        message: RES_MSG.SUCCESS,
        data: {
          response: data,
          total: total,
        },
      };
    } catch (error) {
      console.error("NodeService.getAllNodeForAddress error:", error);
      return {
        error: true,
        message: RES_MSG.ERROR,
      };
    }
  };

  public updateNodeStatus = async (nodeAddress: string, status: Status) => {
    try {
      if (nodeAddress == UNDEFINED || status == "undefined") {
        return {
          error: true,
          message: RES_MSG.NODE_ADRES_IS_NOT_PRESENT,
        };
      }

      const updatedNode = await prisma.nodeRequest.update({
        where: { nodeAddress },
        data: { status },
        select: {
          email: true,
          nodeAddress: true,
        },
      });

      console.log(updatedNode, "updatedNode");

      const isApproved: boolean = status === "APPROVED";

      if (!updatedNode.email) {
        return {
          error: false,
          message: RES_MSG.NODE_REQUEST_ACTION_DONE_NO_EMAIL,
        };
      }

      const response = await mailService.sendApprovalMail(updatedNode.email, updatedNode.nodeAddress, isApproved);

      if (response.error) {
        return {
          error: false,
          message: RES_MSG.UNABLE_TO_SEND_EMAIL,
        };
      }
      return {
        error: false,
        message: RES_MSG.SUCCESS,
      };
    } catch (error: any) {
      return {
        error: true,
        message: RES_MSG.ERROR,
      };
    }
  };

  public getAllCountForAddress = async (providerAddress: string) => {
    try {
      if (!providerAddress || providerAddress === UNDEFINED) {
        return {
          error: true,
          message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT,
        };
      }

      // Fetch data + count in parallel
      const [total, active, inactive] = await Promise.all([
        prisma.nodeRequest.count({ where: { provAddress: providerAddress } }),
        prisma.nodeRequest.count({
          where: { provAddress: providerAddress, nodeStatus: ACTIVE },
        }),
        prisma.nodeRequest.count({
          where: { provAddress: providerAddress, nodeStatus: INACTIVE },
        }),
      ]);

      return {
        error: false,
        message: RES_MSG.SUCCESS,
        data: {
          totalCount: total,
          activeCount: active,
          inactiveCount: inactive,
        },
      };
    } catch (error) {
      console.error("NodeService.getAllNodeForAddress error:", error);
      return {
        error: true,
        message: RES_MSG.ERROR,
      };
    }
  };

  public getNodeRequestStatus = async (walletAddress: string) => {
    try {
      if (!walletAddress || walletAddress === UNDEFINED) {
        return {
          error: true,
          message: RES_MSG.WALLET_ADDRESS_IS_NOT_PRESENT,
        };
      }

      // Fetch data + count in parallel
      const node = await prisma.nodeRequest.findUnique({
        where: { address: walletAddress },
        select: { status: true, requestFor: true },
      });

      if (!node) {
        return {
          error: true,
          message: RES_MSG.WALLET_ADDRESS,
        };
      }

      return {
        error: false,
        message: RES_MSG.SUCCESS,
        data: { requestFor: node.requestFor, status: node.status },
      };
    } catch (error) {
      console.error("NodeService.getNodeRequestStatus error:", error);
      return {
        error: true,
        message: RES_MSG.ERROR,
      };
    }
  };

  public getNodeRequestCount = async (providerAddress: string) => {
    try {
      if (!providerAddress || providerAddress === UNDEFINED) {
        return {
          error: true,
          message: RES_MSG.PROVIDER_ADDRESS_IS_PRESENT,
        };
      }

      // Fetch data + count in parallel
      const [totalCount, linkCount, UnlinkCount] = await Promise.all([
        prisma.nodeRequest.count({ where: { provAddress: providerAddress, status: PENDING } }),
        prisma.nodeRequest.count({
          where: { provAddress: providerAddress, status: PENDING, requestFor: LINK },
        }),
        prisma.nodeRequest.count({
          where: { provAddress: providerAddress, status: PENDING, requestFor: UNLINK },
        }),
      ]);

      return {
        error: false,
        message: RES_MSG.SUCCESS,
        data: {
          totalCount: totalCount,
          linkCount: linkCount,
          UnlinkCount: UnlinkCount,
        },
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
