
import * as express from "express";
import { Request, Response } from "express";
import * as Helpers from "../../service/index";
import { Controller, Status } from "../../interfaces/index";
import nodeService from "./node.service";
import { convertNodeToWallet } from "../../Utility/common"
import { provWalletPrefix, UNDEFINED } from "../../constant";
import { adminCheck } from "../../middleware/adminCheck";

const setResponse = Helpers.ResponseHelper;

class NodeController implements Controller {
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("", this.nodeFormRequest);
        this.router.get("", adminCheck, this.getAllNodeRequestList);
        this.router.get("/prov", adminCheck, this.getAllNodeForAddress);
        this.router.get("/action", adminCheck, this.updateNodeStatus);
        this.router.get("/count", adminCheck, this.getAllCountForAddress);
        this.router.get("/request-count", adminCheck, this.getNodeRequestCount);
        this.router.get("/status", this.getNodeRequestStatus);
    }

    private nodeFormRequest = async (req: Request, res: Response) => {
        const orgName = String(req.body?.orgName) || "";
        const email = String(req.body?.emailAddress) || "";
        const nodeAddress = String(req.body?.nodeAddress);
        const choosePlan = req.body?.choosePlan;
        const wallet_address = String(req.body?.address);
        const pubKey = String(req.body?.pubKey);
        const request = String(req.body?.request);
        const signature = req.body?.signature;

        const result = await nodeService.nodeFormRequest(orgName, email, nodeAddress, choosePlan, wallet_address, pubKey, signature, request);

        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);

    };

    private getAllNodeRequestList = async (req: any, res: Response) => {
        const page = Number(req.query?.page) || 1;
        const limit = Number(req.query?.limit) || 10;
        const reqStatus = String(req.query?.status) || UNDEFINED;
        const walletAddress = String(req.user?.address);
        const providerAddress = String(convertNodeToWallet(walletAddress, provWalletPrefix));
        const result = await nodeService.getAllNodeRequestList(page, limit, reqStatus, providerAddress);

        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);
    };

    private getAllNodeForAddress = async (req: any, res: Response) => {
        const walletAddress = String(req.user?.address);
        const providerAddress = String(convertNodeToWallet(walletAddress, provWalletPrefix));
        const page = Number(req.query?.page) || 1;
        const limit = Number(req.query?.limit) || 10;
        const status = String(req.query?.status) || UNDEFINED;
        const reqStatus = String(req.query?.nodeStatus) || UNDEFINED;
        const result = await nodeService.getAllNodeForAddress(providerAddress, page, limit, status, reqStatus);

        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);
    };

    private updateNodeStatus = async (req: any, res: Response) => {
        const nodeAddress = String(req.query?.address);
        const rawStatus = req.query?.status;
        const allowedStatuses: Status[] = ["PENDING", "APPROVED", "REJECTED"];

        const status =
            typeof rawStatus === "string" && allowedStatuses.includes(rawStatus as Status)
                ? (rawStatus as Status)
                : undefined;

        if (!status) {
            return setResponse.error(res, {
                error: true,
                message: "Invalid status value. Allowed: PENDING, APPROVED, REJECTED",
            });
        }
        const result = await nodeService.updateNodeStatus(nodeAddress, status);
        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);
    };

    private getAllCountForAddress = async (req: any, res: Response) => {
        const walletAddress = String(req.user?.address);
        const providerAddress = String(convertNodeToWallet(walletAddress, provWalletPrefix));
        const result = await nodeService.getAllCountForAddress(providerAddress);
        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);
    };

    private getNodeRequestStatus = async (req: any, res: Response) => {
        const walletAddress = String(req.query?.wallet_address);
        const result = await nodeService.getNodeRequestStatus(walletAddress);
        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);
    };

    private getNodeRequestCount = async (req: any, res: Response) => {
        const walletAddress = String(req.user?.address);
        const providerAddress = String(convertNodeToWallet(walletAddress, provWalletPrefix));
        const result = await nodeService.getNodeRequestCount(providerAddress);
        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);
    };
}

export default NodeController;