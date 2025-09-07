import * as express from "express";
import { Request, Response } from "express";
import * as Helpers from "../../service/index";
import { Controller } from "../../interfaces/index";
import AuthService from "./auth.service";
import { adminCheck } from "../../middleware/adminCheck";

const setResponse = Helpers.ResponseHelper;

class AuthController implements Controller {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router
      .post("/login",this.loginUser)
      .post("/register",this.addUser)
      .get("/logout",adminCheck,this.logout)
  }

  private addUser = async (request: Request, response: Response) => {
    const user = await AuthService.addUser(
      request.body as any,
    );
    if (user.error) {
      return setResponse.error(response, user);
    }
    return setResponse.success(response, user);
  };

  private loginUser = async (request: Request, response: Response) => {
    const user = await AuthService.loginUser(
      request.body as any,
      response
    );
    if (user.error) {
      return setResponse.error(response, user);
    }
    return setResponse.success(response, user);
  };

  private logout = async (request: Request, response: Response) => {
    const user = await AuthService.logout(request,response);
    if (user.error) {
      return setResponse.error(response, user);
    }
    return setResponse.success(response, user);
  };

}

export default AuthController;
