module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },

  setupFiles: ["<rootDir>/test/setup.ts"],

  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: ["/node_modules/", "/test/", "src/environments/", "src/constant/"],

  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
