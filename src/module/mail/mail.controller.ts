import * as express from "express";
import { Controller } from "../../interfaces";
import { Request, Response } from "express";
import * as Helpers from "../../service/index";
import MailService from "./mail.service";

const setResponse = Helpers.ResponseHelper;
class MailController implements Controller {
    public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post("/send-approval-mail", this.sendApprovalMail);
  }

  private sendApprovalMail = async (request: Request, response: Response) => {
    const { email, nodeName, isApproved } = request.body;
    
    // if (!email || !nodeName || isApproved === undefined) {
    //     return response.status(400).json({ message: 'Missing required fields' });
    //   }

    const result = await MailService.sendApprovalMail(email, nodeName, isApproved);

    if (result.error) {
        return setResponse.error(response, result);
      }
      return setResponse.success(response, result);
  };
}

export default MailController;
