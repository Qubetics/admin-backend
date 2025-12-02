import * as fs from "fs";
import * as path from "path";
import { config as configDotenv } from "dotenv";

import { EnvironmentFile, Environments } from "./environment.constant";
import IEnvironment from "./environment.interface";

class Environment implements IEnvironment {
  public port: number;

  public env: string;

  public databaseUrl: string;

  // public databaseReplicaUrl: string;

  public redisHost: string;

  public redisPort: string;

  public redisExpiry: number;

  public evmHost: string;

  public secretKey: string;

  public sendgrid_key: string;

  public service_email: string;

  public gitbook_url: string;

  public cors_origins: string;

  // public allowed_origins: string;

  /**
   *
   * @param NODE_ENV
   */
  constructor(NODE_ENV?: string) {
    this.env = NODE_ENV || process.env.NODE_ENV || Environments.DEV;
    this.setEnvironment(this.env);
    const port: string | undefined | number = process.env.PORT || 3146;
    this.port = Number(port);
    this.databaseUrl = <string>process.env.DATABASE_URL;
    // this.databaseReplicaUrl = <string>process.env.DATABASE_REPLICA_URL;
    this.redisHost = <string>process.env.REDIS_HOST;
    this.redisPort = <string>process.env.REDIS_PORT;
    this.evmHost = <string>process.env.SWAGGER_HTTP_HOST;
    this.secretKey = <string>process.env.SECRET_KEY;
    this.redisExpiry = <number>Number(process.env.REDIS_EXPIRY);
    this.sendgrid_key = <string>process.env.SENDGRID_API_KEY;
    this.service_email = <string>process.env.MAILING_SERVICE_EMAIL;
    this.gitbook_url = <string>process.env.GITBOOK_URL;
    this.cors_origins = <string>process.env.CORS_ORIGINS;
    // this.allowed_origins = <string>process.env.ALLOWED_ORIGINS;
  }

  /**
   *
   * @returns
   */
  public getCurrentEnvironment(): string {
    return this.env;
  }

  /**
   *
   * @param env
   */
  public setEnvironment(env: string): void {
    let envPath: string;
    this.env = env || Environments.LOCAL;
    const rootdir: string = path.resolve(__dirname, "../../");
    switch (env) {
      case Environments.PRODUCTION:
        envPath = path.resolve(rootdir, EnvironmentFile.PRODUCTION);
        break;
      case Environments.TEST:
        envPath = path.resolve(rootdir, EnvironmentFile.TEST);
        break;
      case Environments.STAGING:
        envPath = path.resolve(rootdir, EnvironmentFile.QA);
        break;
      case Environments.LOCAL:
        envPath = path.resolve(rootdir, EnvironmentFile.LOCAL);
        break;
      default:
        envPath = path.resolve(rootdir, EnvironmentFile.LOCAL);
    }
    if (this.env !== Environments.PRODUCTION && !fs.existsSync(envPath)) {
      throw new Error(".env file is missing in root directory");
    }
    configDotenv({ path: envPath });
  }

  /**
   *
   * @returns
   */
  public isProductionEnvironment(): boolean {
    return this.getCurrentEnvironment() === Environments.PRODUCTION;
  }

  /**
   *
   * @returns
   */
  public isDevEnvironment(): boolean {
    return this.getCurrentEnvironment() === Environments.DEV || this.getCurrentEnvironment() === Environments.LOCAL;
  }

  /**
   *
   * @returns
   */
  public isTestEnvironment(): boolean {
    return this.getCurrentEnvironment() === Environments.TEST;
  }

  /**
   *
   * @returns
   */
  public isStagingEnvironment(): boolean {
    return this.getCurrentEnvironment() === Environments.STAGING;
  }
}

export default Environment;
