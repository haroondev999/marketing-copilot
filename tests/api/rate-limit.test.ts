import { checkRateLimit, apiRateLimit } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const identifier = `test-${Date.now()}`;
    const result = await checkRateLimit(identifier, apiRateLimit);

    expect(result.success).toBe(true);
    expect(result.limit).toBeGreaterThan(0);
  });

  it('should return rate limit information', async () => {
    const identifier = `test-info-${Date.now()}`;
    const result = await checkRateLimit(identifier, apiRateLimit);

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('limit');
    expect(result).toHaveProperty('remaining');
    expect(result).toHaveProperty('reset');
  });
});
