import http from "http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import registerRoutes from "./routes";
import { RedisService } from "./service";
import cookieParser from "cookie-parser";
import worker from "./worker";
import limiter from "./helper/limiter.helper";

export default class App {
  public express: express.Application;

  public httpServer: http.Server;

  constructor() {
    this.StartWorker();
  }

  public async init(): Promise<void> {
    this.express = express();

    this.httpServer = http.createServer(this.express);

    // add all global middleware like cors
    this.middleware();

    // register the all routes
    this.routes();

    //make connection with redis
    RedisService.startRedis();
  }

  /**
   * here register your all routes
   */
  private routes(): void {
    this.express.use("/api/v1", limiter, registerRoutes());
  }
  /**
   * here you can apply your middlewares
   */
  private middleware(): void {
    this.express.use(
      cors({
        origin: [
          "https://dvpn-node-operator.qubetics.work",
          "https://dvpn-provider.qubetics.work",
          "https://dvpn.qubetics.work",
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      })
    );
    this.express.use(cookieParser());
    // support application/json type post data
    // support application/x-www-form-urlencoded post data
    // Helmet can help protect your app from some well-known web vulnerabilities by setting HTTP headers appropriately.
    this.express.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    );

    this.express.use(express.json({ limit: "100mb" }));
    this.express.use(express.urlencoded({ limit: "100mb", extended: true }));
  }

  private StartWorker() {
    worker.startNodeWorker();
    worker.startProviderWorker();
    worker.nodeRequestWorker();
    worker.nodeUnlinkWorker();
    worker.nodeTerminationWorker();
  }
}
