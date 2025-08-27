/**
 * Basic functionality test to verify setup
 */

describe('Basic Setup Test', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have jest configured correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});