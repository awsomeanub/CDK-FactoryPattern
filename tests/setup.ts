// Jest setup file
// Suppress CDK metadata output during tests
process.env.CDK_DISABLE_VERSION_REPORTING = 'true';

// Increase timeout for integration tests
jest.setTimeout(30000);
