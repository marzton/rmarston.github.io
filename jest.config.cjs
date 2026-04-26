module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/worker/**/*.test.js', '**/goldshore-core/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'babel-jest',
  },
};
