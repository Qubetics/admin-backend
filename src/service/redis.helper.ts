import { RedisClientType, createClient } from "redis";
import { log } from "../Utility/common";
import { COLORS } from "../constant";
import logger from "../lib/logger";

class RedisService {
  client: RedisClientType;

  static instance: RedisService;

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public async startRedis() {
    try {
      this.client = createClient({
        url: `redis://${environment.redisHost}:${environment.redisPort}/0`,
      });

      await this.client.connect();
      await this.client.select(1);
      log("Redis connected ", COLORS.yellow, true, COLORS.green);

      this.client.on("connect", () => {
        logger.info("Connect to redis successfully. ");
      });
      this.client.on("ready", () => {
        logger.info("Ready");
      });
      this.client.on("reconnecting", () => {
        logger.info("Reconnecting");
      });

      this.client.on("end", () => {
        logger.info("End");
      });
      this.client.on("error", (err: Error) =>
        logger.error(
          "\x1b[31m%s\x1b[0m",
          "error while connecting redis server: ",
          err.message,
        ),
      );
    } catch (error) {
      console.log("error while connecting to redis .. ", error);
    }
  }

  // set the string data to redis
  public async setString<T>(key: string, data: T, expiryInSeconds?: number) {
    try {
       await this.client.set(key, JSON.stringify(data),{
        EX: environment.redisExpiry
      });
    } catch (err) {
      logger.error("error while setting the data into redis: ", err);
    }
  }

  // get the string data from redis
  public async getString(key: string) {
    try {
      const res = (await this.client.get(key)) as string;
      return JSON.parse(res);
    } catch (err) {
      logger.error("error while getting the data from redis: ", err);
      return [];
    }
  }

  public updateRedisTime = async (
    token: string,
  ): Promise<boolean | null> => {
    try {
      const result = await this.client.expire(token, environment.redisExpiry);
      return result;
    } catch (error) {
      console.log("error ", error);
  
      return null;
    }
  };

  public deleteRedisKey = async (
    key: string
  ): Promise<boolean | null> => {
    try {
      const result = await this.client.del(key); // Delete the key
      return result > 0; // Returns true if a key was deleted
    } catch (error) {
      console.error("Error deleting Redis key:", error);
      return null;
    }
  };
}
export default RedisService.getInstance();
