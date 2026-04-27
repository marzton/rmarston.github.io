module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/worker/**/*.test.js', '**/goldshore-core/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': '<rootDir>/worker/jest-ts-transformer.cjs',
  },
};
