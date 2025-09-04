interface IEnvironment {
  port: number;
  databaseUrl: string;
  redisHost: string;
  redisPort: string;
  redisExpiry: number;
  getCurrentEnvironment(): string;
  setEnvironment(env: string): void;
  isProductionEnvironment(): boolean;
  isDevEnvironment(): boolean;
  isTestEnvironment(): boolean;
  isStagingEnvironment(): boolean;
}

export default IEnvironment;
