module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/test/*.test.ts'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/test/integration/**/*.test.ts'],
      globalSetup: '<rootDir>/src/test/integration/setup/globalSetup.ts',
      globalTeardown: '<rootDir>/src/test/integration/setup/globalTeardown.ts',
      setupFiles: ['<rootDir>/src/test/integration/setup/env.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/test/integration/setup/database.ts'],
    },
  ],
};
