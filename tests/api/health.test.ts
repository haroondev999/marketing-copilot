import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';

describe('Health Check API', () => {
  it('should return health status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('services');
  });

  it('should check database connection', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.services).toHaveProperty('database');
    expect(['up', 'down']).toContain(data.services.database);
  });

  it('should check OpenAI configuration', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.services).toHaveProperty('openai');
    expect(['configured', 'not configured']).toContain(data.services.openai);
  });
});
