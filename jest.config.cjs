module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/worker/**/*.test.js'],
  transform: {
    '^.+\\.ts$': '<rootDir>/worker/jest-ts-transformer.cjs',
  },
};
