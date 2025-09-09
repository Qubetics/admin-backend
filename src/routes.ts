import { Router } from "express";
import PlanController from "./module/plan/plan.controller";
import NodeController from "./module/node/node.controller";
import AuthController from "./module/auth/auth.controller";
import MailController from "./module/mail/mail.controller";

/**
 * Here, you can register routes by instantiating the controller.
 *
 */
export default function registerRoutes(): Router {
  const router = Router();

  const authController = new AuthController();
  const planController = new PlanController();
  const nodeController= new NodeController();
  const mailController = new MailController();


  router.use("/status", (req, res) => {
    res.json({ message: "Up and Running" });
  });
  router.use("/auth", authController.router);
  router.use("/plans",planController.router)
  router.use("/node",nodeController.router)
  router.use("", mailController.router);


  return router;
}
