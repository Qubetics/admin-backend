import { existsSync, mkdirSync } from "fs";
import winston, { Logger } from "winston";

const logDir = "./logs";

if (!existsSync(logDir)) {
  mkdirSync(logDir);
}

const logger: Logger = winston.createLogger({
  level: "info",
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: `${logDir}/combined.log`,
      format: winston.format.json(),
    }),
  ],
});

export default logger;
