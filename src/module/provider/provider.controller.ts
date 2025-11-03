import * as express from "express";
import { Request, Response } from "express";
import * as Helpers from "../../service/index";
import { Controller } from "../../interfaces/index";
import providerService from "./provider.service";

const setResponse = Helpers.ResponseHelper;

class ProviderController implements Controller {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router
      .get("", this.getAllProvider)
  }

  private getAllProvider = async (request: Request, response: Response) => {
    const user = await providerService.getAllProvider(request.query as any);
    if (user.error) {
      return setResponse.error(response, user);
    }
    return setResponse.success(response, user);
  };

}

export default ProviderController;
