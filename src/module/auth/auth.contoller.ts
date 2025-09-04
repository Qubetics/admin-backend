import * as express from "express";
import * as Helpers from "../../service/index";
import { Controller } from "../../interfaces/index";

const setResponse = Helpers.ResponseHelper;

class AuthController implements Controller {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // this.router
    //   .get()
  }

}

export default AuthController;
