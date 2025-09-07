
import * as express from "express";
import { Request, Response } from "express";
import * as Helpers from "../../service/index";
import { Controller } from "../../interfaces/index";
import nodeService from "./node.service";

const setResponse = Helpers.ResponseHelper;

class NodeController implements Controller {
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("", this.nodeFormRequest);
    }

    private nodeFormRequest = async (req: Request,res: Response) => {
        console.log("🚀 ~ NodeController ~ req:", req.body)
        console.log("comessssssnode");
        const orgName = String(req.body?.orgName);
        const email = String(req.body?.emailAddress);
        const nodeAddress = String(req.body?.nodeAddress);
        const choosePlan = req.body?.choosePlan;
        const wallet_address = String(req.body?.address);
        const pubKey = String(req.body?.pubKey);
        const signature = req.body?.signature;

        console.log("🚀 ~ NodeController ~ orgName,email,nodeAddress,choosePlan,wallet_address,pubKey,signature:", orgName,email,nodeAddress,choosePlan,wallet_address,pubKey,signature)
        const result=await nodeService.nodeFormRequest(orgName,email,nodeAddress,choosePlan,wallet_address,pubKey,signature);

        if(result.error){
            return setResponse.error(res,result);
        }
        return setResponse.success(res,result);

    }
}

export default NodeController;