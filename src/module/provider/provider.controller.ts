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
    this.router.get("", this.getAllProvider);
    this.router.get("/active-plans", this.getActivePlanProviders);
    this.router.get("/detail/:address", this.getProviderDetails);
  }

  private getAllProvider = async (request: Request, response: Response) => {
    const user = await providerService.getAllProvider(request.query as any);
    if (user.error) {
      return setResponse.error(response, user);
    }
    return setResponse.success(response, user);
  };

  private getProviderDetails = async (request: Request, response: Response) => {
    const { address } = request.params;
    const { page, limit } = request.query;

    const user = await providerService.getProviderDetails(
      address as string,
      page as string,
      limit as string
    );
    if (user.error) {
      return setResponse.error(response, user);
    }
    return setResponse.success(response, user);
  };

  private getActivePlanProviders = async (
    request: Request,
    response: Response
  ) => {
    const user = await providerService.getActivePlanProviders();
    if (user.error) {
      return setResponse.error(response, user);
    }
    return setResponse.success(response, user);
  };
}

export default ProviderController;
