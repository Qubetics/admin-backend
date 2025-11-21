import http from "http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import registerRoutes from "./routes";
import { RATE_LIMITER_MESSAGE } from "./constant";
import { RedisService } from "./service";
import cookieParser from "cookie-parser";
import worker from "./worker";

export default class App {
  public express: express.Application;

  public httpServer: http.Server;

  public limiter;

  constructor() {
    // Create a rate limiter with a limit of 20 requests per 2 minutes (120000 milliseconds)
    this.limiter = rateLimit({
      windowMs: RATE_LIMITER_MESSAGE.WINDOW_MS,
      max: RATE_LIMITER_MESSAGE.MAX,
      standardHeaders: "draft-7",
      message: {
        error: true,
        message: RATE_LIMITER_MESSAGE.TOO_MANY_REQUEST,
      },
      legacyHeaders: false,
    });
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
    this.express.use(
      "/api/v1",
      // this.limiter,
      registerRoutes()
    );
  }
  /**
   * here you can apply your middlewares
   */
  private middleware(): void {
    this.express.use(
      cors({
        //origin: ["https://dvpn-node-operator.qubetics.work", "https://dvpn-provider.qubetics.work","https://dvpn.qubetics.work","http://localhost:5173"],
        origin: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true, // add this if you need cookies / auth headers
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
  }
}
