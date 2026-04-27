module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/worker/**/*.test.js', '**/goldshore-core/**/*.test.ts'],
  testMatch: ['**/worker/**/*.test.js', '**/worker/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': '<rootDir>/worker/jest-ts-transformer.cjs',
  },
};
