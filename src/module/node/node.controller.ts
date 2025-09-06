
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

    private nodeFormRequest = async (res: Response, req: Request) => {
        const orgName = String(req.body.orgName);
        const email = String(req.body.email);
        const nodeAddress = String(req.body.nodeAddress);
        const choosePlan = String(req.body.choosePlan);
        const wallet_address = String(req.body.wallet_address);
        const pubKey = String(req.body.pubKey);
        const signature = req.body.signature;

        const result=await nodeService.nodeFormRequest(orgName,email,nodeAddress,choosePlan,wallet_address,pubKey,signature);

        if(result.error){
            return setResponse.error(res,result);
        }
        return setResponse.success(res,result);
    }
}

export default NodeController;