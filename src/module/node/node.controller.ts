
import * as express from "express";
import { Request, Response } from "express";
import * as Helpers from "../../service/index";
import { Controller } from "../../interfaces/index";
import nodeService from "./node.service";
import { UNDEFINED } from "../../constant";

const setResponse = Helpers.ResponseHelper;

class NodeController implements Controller {
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("", this.nodeFormRequest);
        this.router.get("",this.getAllNodeRequestList);
        this.router.get("/prov/:address",this.getAllNodeForAddress);
    }

    private nodeFormRequest = async (req: Request, res: Response) => {
        console.log("🚀 ~ NodeController ~ req:", req.body);
        const orgName = String(req.body?.orgName);
        const email = String(req.body?.emailAddress);
        const nodeAddress = String(req.body?.nodeAddress);
        const choosePlan = req.body?.choosePlan;
        const wallet_address = String(req.body?.address);
        const pubKey = String(req.body?.pubKey);
        const request = String(req.body?.request);
        const signature = req.body?.signature;

        console.log("🚀 ~ NodeController ~ orgName,email,nodeAddress,choosePlan,wallet_address,pubKey,signature:", orgName, email, nodeAddress, choosePlan, wallet_address, pubKey, signature)
        const result = await nodeService.nodeFormRequest(orgName, email, nodeAddress, choosePlan, wallet_address, pubKey, signature,request);

        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);

    };

    private getAllNodeRequestList = async (req: Request, res: Response) => {
        const page = Number(req.query?.page) || 1;
        const limit = Number(req.query?.limit) || 10;
        const result=await nodeService.getAllNodeRequestList(page,limit);

        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);
    };

    private getAllNodeForAddress = async(req: Request, res: Response) => {
        const providerAddress=String(req.params?.address);
        const page=Number(req.query?.page) || 1;
        const limit = Number(req.query?.limit) || 10;
        const status = String(req.query?.status) || UNDEFINED;
        const result=await nodeService.getAllNodeForAddress(providerAddress,page,limit,status);

        if (result.error) {
            return setResponse.error(res, result);
        }
        return setResponse.success(res, result);
    };
}

export default NodeController;