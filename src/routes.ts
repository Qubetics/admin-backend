import { Router } from "express";
import AuthController from "./module/auth/auth.contoller";

/**
 * Here, you can register routes by instantiating the controller.
 *
 */
export default function registerRoutes(): Router {
  const router = Router();

  const authController = new AuthController();

  router.use("/status", (req, res) => {
    res.json({ message: "Up and Running" });
  });
  router.use("/auth", authController.router);

  return router;
}
