import * as express from "express";
import { Request, Response } from "express";  
import * as Helpers from "../../service/index";
import { Controller } from "../../interfaces/index";
import planService from "./plan.service";

const setResponse = Helpers.ResponseHelper;

class PlanController implements Controller {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("", this.getAllPlans);
  }

  private getAllPlans = async (request: Request, response: Response) => {
    const data = {
      page: !request.query?.page ? 1 : Number(request.query?.page),
      limit: !request.query?.limit ? 10 : Number(request.query?.limit),
    };

    const res = await planService.getAllPlans(data);

    if (res.error) {
      return setResponse.error(response, res);
    }
    return setResponse.success(response, res);
  };
}

export default PlanController;
