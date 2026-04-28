module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/worker/**/*.test.js',
    '**/worker/**/*.test.ts',
    '**/goldshore-core/**/*.test.ts',
  ],
  transform: {
    '^.+\\.ts$': '<rootDir>/worker/jest-ts-transformer.cjs',
  },
};
