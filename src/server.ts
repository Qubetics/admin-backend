import * as http from "http";
import Environment from "./environments/environment";
import { setGlobalEnvironment } from "./global";
import logger from "./lib/logger";

const env: Environment = new Environment();
setGlobalEnvironment(env);

import App from "./App";
import { COLORS } from "./constant";
import { log } from "./Utility/common";

const app: App = new App();
let server: http.Server;

function serverError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== "listen") {
    throw error;
  }
  throw error;
}

function serverListening(): void {
  log("Listening on : ", COLORS.yellow, env.port, COLORS.green);
}

app
  .init()
  .then(() => {
    app.express.set("port", env.port);
    server = app.httpServer;
    server.on("error", serverError);
    server.on("listening", serverListening);
    server.listen(env.port);
  })
  .catch((err: Error) => {
    logger.info("app.init error");
    logger.error(err.name);
    logger.error(err.message);
    logger.error(err.stack);
  });

process.on("unhandledRejection", (reason: Error) => {
  logger.error("Unhandled Promise Rejection: reason:", reason.message);
  logger.error(reason.stack);
});
