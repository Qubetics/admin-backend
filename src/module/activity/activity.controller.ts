import * as express from "express";
import { Request, Response } from "express";
import * as Helpers from "../../service/index";
import { Controller } from "../../interfaces/index";
import activityService from "./activity.service";

const setResponse = Helpers.ResponseHelper;

class ActivityController implements Controller {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("", this.getActivityList);
  }

  private getActivityList = async (request: Request, response: Response) => {
    const page = !request.query?.page ? 1 : Number(request.query?.page);
    const limit = !request.query?.limit ? 10 : Number(request.query?.limit);
    const address = request.query?.address || "";

    const res = await activityService.getActivityList(page, limit, address);

    if (res.error) {
      return setResponse.error(response, res);
    }
    return setResponse.success(response, res);
  };
}

export default ActivityController;
