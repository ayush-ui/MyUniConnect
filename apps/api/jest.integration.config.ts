import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/../test/integration/global-setup.ts',
  globalTeardown: '<rootDir>/../test/integration/global-teardown.ts',
  testTimeout: 30000,
};

export default config;
