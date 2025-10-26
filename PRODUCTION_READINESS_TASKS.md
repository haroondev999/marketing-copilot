# Production Readiness Implementation Tasks

This document provides detailed coding tasks to transform the AI Marketing Campaign Manager from B+ grade to production-ready A grade. Each task includes specific implementation instructions with code examples.

---

## CRITICAL PRIORITY (P0) - Must Complete Before ANY Deployment

### Task 1: Remove Client-Side Credential Storage

**Issue:** Integration credentials stored in localStorage expose them to XSS attacks.
**Files to modify:** `src/lib/integrations/integration-manager.ts`, `src/components/integrations/IntegrationSettings.tsx`

**Implementation:**

```typescript
// DELETE the entire client-side integration-manager.ts file
// It should not exist on the client side at all

// CREATE: src/lib/integrations/integration-client.ts (client-side only, no credentials)
export class IntegrationClient {
  async listIntegrations(type?: string): Promise<Integration[]> {
    const params = type ? `?type=${type}` : '';
    const response = await fetch(`/api/integrations${params}`);
    if (!response.ok) throw new Error('Failed to fetch integrations');
    return response.json();
  }

  async testConnection(id: string): Promise<boolean> {
    const response = await fetch(`/api/integrations/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    return data.success;
  }

  async addIntegration(integration: {
    name: string;
    type: string;
    credentials: Record<string, string>;
  }): Promise<Integration> {
    const response = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(integration),
    });
    if (!response.ok) throw new Error('Failed to add integration');
    return response.json();
  }

  async deleteIntegration(id: string): Promise<void> {
    await fetch(`/api/integrations?id=${id}`, { method: 'DELETE' });
  }
}

export const integrationClient = new IntegrationClient();
```

```typescript
// CREATE: src/lib/integrations/integration-server.ts (server-side only)
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

export class IntegrationServer {
  async testConnection(id: string, userId: string): Promise<boolean> {
    const integration = await prisma.integration.findUnique({
      where: { id, userId },
    });

    if (!integration) return false;

    const credentials = decrypt(integration.credentials as any);

    // Test connection based on type
    switch (integration.type) {
      case 'email':
        return this.testEmailConnection(integration.name, credentials);
      case 'social':
        return this.testSocialConnection(integration.name, credentials);
      // ... other cases
      default:
        return false;
    }
  }

  private async testEmailConnection(name: string, credentials: Record<string, string>): Promise<boolean> {
    if (name === 'Mailchimp' && credentials.apiKey) {
      try {
        const datacenter = credentials.apiKey.split('-').pop();
        const response = await fetch(
          `https://${datacenter}.api.mailchimp.com/3.0/ping`,
          { headers: { Authorization: `Bearer ${credentials.apiKey}` } }
        );
        return response.ok;
      } catch {
        return false;
      }
    }
    return false;
  }

  // ... implement other test methods server-side
}
```

```typescript
// CREATE: src/app/api/integrations/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegrationServer } from '@/lib/integrations/integration-server';
import { z } from 'zod';
import { handleApiError, ApiError } from '@/lib/api-error';

const testSchema = z.object({
  id: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { id } = testSchema.parse(body);

    const integrationServer = new IntegrationServer();
    const success = await integrationServer.testConnection(id, session.user.id);

    return NextResponse.json({ success });
  } catch (error) {
    return handleApiError(error);
  }
}
```

```typescript
// UPDATE: src/components/integrations/IntegrationSettings.tsx
// Replace integrationManager with integrationClient
import { integrationClient } from '@/lib/integrations/integration-client';

// Change all calls from integrationManager.* to integrationClient.*
const handleTestConnection = async (id: string) => {
  const success = await integrationClient.testConnection(id);
  // ... handle result
};
```

---

### Task 2: Implement Rate Limiting

**Issue:** No rate limiting allows unlimited API calls and potential cost explosion.
**Files to create:** `src/lib/rate-limit.ts`, `src/middleware.ts` (update)

**Implementation:**

```bash
# Install dependencies
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// CREATE: src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Create different rate limiters for different endpoints
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '15 m'), // 100 requests per 15 minutes
  analytics: true,
  prefix: 'ratelimit:api',
});

export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'), // 20 AI requests per hour
  analytics: true,
  prefix: 'ratelimit:ai',
});

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 auth attempts per 15 minutes
  analytics: true,
  prefix: 'ratelimit:auth',
});

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}
```

```typescript
// CREATE: src/lib/rate-limit-middleware.ts
import { NextResponse } from 'next/server';
import { ApiError } from './api-error';

export async function withRateLimit(
  identifier: string,
  limiter: any,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    const resetDate = new Date(reset);
    const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        details: {
          limit,
          remaining: 0,
          reset: resetDate.toISOString(),
          retryAfter,
        },
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  const response = await handler();

  // Add rate limit headers to successful responses
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  return response;
}
```

```typescript
// UPDATE: src/app/api/campaign/route.ts
import { aiRateLimit } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/rate-limit-middleware';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError('Unauthorized', 401);
  }

  // Apply rate limiting
  return withRateLimit(
    `campaign:${session.user.id}`,
    aiRateLimit,
    async () => {
      try {
        // ... existing campaign creation logic
      } catch (error) {
        return handleApiError(error);
      }
    }
  );
}
```

```typescript
// UPDATE: src/app/api/auth/register/route.ts
import { authRateLimit } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/rate-limit-middleware';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body;

  return withRateLimit(
    `auth:register:${email}`,
    authRateLimit,
    async () => {
      try {
        // ... existing registration logic
        return handleApiError(error);
      } catch (error) {
        return handleApiError(error);
      }
    }
  );
}
```

```bash
# ADD to .env.example
UPSTASH_REDIS_URL="your-upstash-redis-url"
UPSTASH_REDIS_TOKEN="your-upstash-redis-token"
```

---

### Task 3: Add Error Monitoring with Sentry

**Issue:** No error tracking or monitoring in production.
**Files to create:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`

**Implementation:**

```bash
# Install Sentry
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```typescript
// CREATE: sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event, hint) {
    // Don't send events for localhost
    if (event.request?.url?.includes('localhost')) {
      return null;
    }
    return event;
  },
  ignoreErrors: [
    'Non-Error exception captured',
    'ResizeObserver loop limit exceeded',
  ],
});
```

```typescript
// CREATE: sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
```

```typescript
// UPDATE: src/lib/api-error.ts
import * as Sentry from '@sentry/nextjs';

export function handleApiError(error: unknown): NextResponse {
  // Log to Sentry
  if (error instanceof ApiError && error.statusCode >= 500) {
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        statusCode: error.statusCode,
      },
      extra: {
        details: error.details,
      },
    });
  } else if (error instanceof Error) {
    Sentry.captureException(error, { level: 'error' });
  }

  // ... existing error handling logic
}
```

```bash
# ADD to .env.example
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```

---

### Task 4: Add Health Check Endpoint

**Issue:** No health check endpoint for monitoring and load balancers.
**Files to create:** `src/app/api/health/route.ts`

**Implementation:**

```typescript
// CREATE: src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: 'up' | 'down';
    openai: 'configured' | 'not configured';
    redis?: 'up' | 'down';
  };
  version?: string;
}

export async function GET() {
  const startTime = Date.now();
  const services: HealthStatus['services'] = {
    database: 'down',
    openai: 'not configured',
  };

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'up';
  } catch (error) {
    console.error('Database health check failed:', error);
    services.database = 'down';
    overallStatus = 'unhealthy';
  }

  // Check OpenAI configuration
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    services.openai = 'configured';
  } else {
    overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
  }

  // Check Redis (if configured)
  if (process.env.UPSTASH_REDIS_URL) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN!,
      });
      await redis.ping();
      services.redis = 'up';
    } catch (error) {
      console.error('Redis health check failed:', error);
      services.redis = 'down';
      overallStatus = 'degraded';
    }
  }

  const responseTime = Date.now() - startTime;
  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services,
    version: process.env.npm_package_version,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${responseTime}ms`,
    },
  });
}
```

```typescript
// CREATE: src/app/api/health/ready/route.ts (Kubernetes readiness probe)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if app can serve traffic
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ ready: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ready: false, error: 'Database not ready' },
      { status: 503 }
    );
  }
}
```

```typescript
// CREATE: src/app/api/health/live/route.ts (Kubernetes liveness probe)
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Simple check that the app is running
  return NextResponse.json({ alive: true }, { status: 200 });
}
```

---

### Task 5: Strengthen Password Requirements

**Issue:** Weak password validation (only length check).
**Files to modify:** `src/app/api/auth/register/route.ts`

**Implementation:**

```typescript
// UPDATE: src/app/api/auth/register/route.ts
import { z } from 'zod';
import { handleApiError } from '@/lib/api-error';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: passwordSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = registerSchema.parse(body);

    // Check for common passwords
    const commonPasswords = [
      'password123',
      '12345678',
      'qwerty123',
      'admin123',
      'welcome123',
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      return NextResponse.json(
        { error: 'Password is too common. Please choose a stronger password.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

### Task 6: Add Environment Variable Validation

**Issue:** No startup validation of required environment variables.
**Files to create:** `src/lib/env.ts`

**Implementation:**

```typescript
// CREATE: src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().startsWith('postgresql://'),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key format'),

  // Encryption
  ENCRYPTION_KEY: z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 characters'),

  // Rate Limiting (optional)
  UPSTASH_REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),

  // Monitoring (optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate environment variables at startup
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { env };
```

```typescript
// UPDATE: src/lib/encryption.ts
import CryptoJS from 'crypto-js';
import { env } from './env';

const SECRET_KEY = env.ENCRYPTION_KEY;

export function encrypt(data: Record<string, string>): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
}

export function decrypt(encrypted: string): Record<string, string> {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt credentials');
  }
}
```

```typescript
// UPDATE: src/app/layout.tsx
// Import env at the top to trigger validation
import { env } from '@/lib/env';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ... existing layout code
}
```

---

## HIGH PRIORITY (P1) - Complete Within 1 Week

### Task 7: Replace Hardcoded Fallback Data

**Issue:** Generic fallback data provides no value to users.
**Files to modify:** `src/lib/ai/analytics-analyzer.ts`, `src/lib/ai/content-generator.ts`

**Implementation:**

```typescript
// UPDATE: src/lib/ai/analytics-analyzer.ts
import * as Sentry from '@sentry/nextjs';

export class AnalyticsAnalyzer {
  // ... existing code

  async analyzePerformance(
    campaignData: {
      goal: string;
      channels: string[];
      metrics: Record<string, any>;
    }
  ): Promise<AnalyticsInsight> {
    const promptTemplate = PromptTemplate.fromTemplate(
      `You are a marketing analytics expert. Analyze campaign performance and provide actionable insights.

Campaign Goal: {goal}
Channels: {channels}
Performance Metrics: {metrics}

Provide:
1. Executive summary (2-3 sentences)
2. Key metrics analysis (identify 3-5 most important metrics with trends)
3. Specific recommendations (3-5 actionable items)
4. Optimization opportunities (2-3 concrete suggestions)

Format as JSON:
{{
  "summary": "...",
  "keyMetrics": [
    {{"label": "...", "value": "...", "trend": "up|down|stable"}}
  ],
  "recommendations": ["...", "..."],
  "optimizations": ["...", "..."]
}}

Output:`
    );

    const input = await promptTemplate.format({
      goal: campaignData.goal,
      channels: campaignData.channels.join(', '),
      metrics: JSON.stringify(campaignData.metrics, null, 2),
    });

    try {
      const response = await this.model.invoke(input);
      const content = response.content as string;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate the response has required fields
        if (!parsed.summary || !parsed.recommendations || !parsed.optimizations) {
          throw new Error('Invalid response structure from AI');
        }

        return parsed;
      }

      throw new Error('Failed to parse JSON from AI response');
    } catch (error) {
      // Log to Sentry with context
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          component: 'AnalyticsAnalyzer',
          method: 'analyzePerformance',
        },
        extra: {
          goal: campaignData.goal,
          channels: campaignData.channels,
          metrics: campaignData.metrics,
        },
      });

      // Re-throw the error to be handled by API route
      throw new Error('Failed to generate analytics insights. Please try again later.');
    }
  }

  async generateOptimizationSuggestions(
    campaignData: {
      goal: string;
      channels: string[];
      currentPerformance: Record<string, any>;
      targetMetrics?: Record<string, any>;
    }
  ): Promise<string[]> {
    // ... similar pattern: try with AI, catch and log to Sentry, throw error
    try {
      // ... existing AI logic
    } catch (error) {
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          component: 'AnalyticsAnalyzer',
          method: 'generateOptimizationSuggestions',
        },
        extra: campaignData,
      });

      throw new Error('Failed to generate optimization suggestions. Please try again later.');
    }
  }
}
```

```typescript
// UPDATE: src/lib/ai/content-generator.ts
import * as Sentry from '@sentry/nextjs';

export class ContentGenerator {
  // ... existing code

  async generateEmailContent(
    intent: CampaignIntent,
    brandVoice?: string
  ): Promise<GeneratedContent> {
    const promptTemplate = PromptTemplate.fromTemplate(
      `You are an expert email marketing copywriter. Generate compelling email content.

Campaign Goal: {goal}
Key Message: {keyMessage}
Call to Action: {cta}
Target Audience: {audience}
Brand Voice: {brandVoice}

Generate:
1. Subject line (compelling, under 60 characters)
2. Preview text (under 100 characters)
3. Email body (HTML-friendly, 200-400 words, persuasive, with clear structure)

Format as JSON:
{{
  "subject": "...",
  "preview": "...",
  "body": "..."
}}

Output:`
    );

    const input = await promptTemplate.format({
      goal: intent.goal,
      keyMessage: intent.contentSpec.keyMessage,
      cta: intent.contentSpec.callToAction || 'Learn More',
      audience: intent.audienceCriteria.demographics || 'general audience',
      brandVoice: brandVoice || 'professional and friendly',
    });

    try {
      const response = await this.model.invoke(input);
      const content = response.content as string;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.subject || !parsed.body) {
        throw new Error('Missing required fields in AI response');
      }

      return parsed;
    } catch (error) {
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          component: 'ContentGenerator',
          method: 'generateEmailContent',
        },
        extra: {
          intent: intent.goal,
          brandVoice,
        },
      });

      throw new Error('Failed to generate email content. Please try again.');
    }
  }

  // Apply same pattern to other generate methods:
  // - generateSocialContent
  // - generatePPCContent
  // - generateSMSContent
}
```

---

### Task 8: Add Request Timeouts

**Issue:** Long-running requests can hang indefinitely.
**Files to modify:** All AI-related API routes

**Implementation:**

```typescript
// UPDATE: src/app/api/campaign/route.ts
export const maxDuration = 30; // 30 seconds max for Vercel/production

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError('Unauthorized', 401);
  }

  return withRateLimit(
    `campaign:${session.user.id}`,
    aiRateLimit,
    async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

        try {
          const body = await request.json();
          const { prompt, conversationHistory, conversationId } = campaignRequestSchema.parse(body);

          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            throw new ApiError('OpenAI API key not configured', 500);
          }

          const parser = new PromptParser(apiKey);
          const generator = new ContentGenerator(apiKey);

          // Add timeout to AI calls
          const intent = await Promise.race([
            parser.parseCampaignIntent(prompt, conversationHistory || []),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('AI request timeout')), 20000)
            ),
          ]) as CampaignIntent;

          // ... rest of campaign creation logic

          clearTimeout(timeoutId);
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        return handleApiError(error);
      }
    }
  );
}
```

```typescript
// UPDATE: src/app/api/analytics/route.ts
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const { campaignId, goal, channels, metrics } = analyticsRequestSchema.parse(body);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ApiError('OpenAI API key not configured', 500);
    }

    const analyzer = new AnalyticsAnalyzer(apiKey);

    // Add timeout protection
    const insights = await Promise.race([
      analyzer.analyzePerformance({ goal, channels, metrics }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analytics request timeout')), 20000)
      ),
    ]) as AnalyticsInsight;

    return NextResponse.json({ insights, campaignId });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

### Task 9: Improve Message ID Generation

**Issue:** Weak ID generation can cause collisions.
**Files to modify:** `src/lib/store/chat-store.ts`

**Implementation:**

```typescript
// UPDATE: src/lib/store/chat-store.ts
import { create } from 'zustand';
import { randomUUID } from 'crypto';
import { CampaignIntent } from '@/lib/ai/prompt-parser';
import { GeneratedContent } from '@/lib/ai/content-generator';

// ... existing interfaces

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  currentCampaign: null,
  campaigns: [],
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: randomUUID(), // Use crypto.randomUUID() for strong uniqueness
          timestamp: new Date(),
        },
      ],
    })),

  // ... rest of the store
}));
```

---

### Task 10: Implement Caching with Redis

**Issue:** Repeated queries slow down the app and increase costs.
**Files to create:** `src/lib/cache.ts`, update API routes

**Implementation:**

```typescript
// CREATE: src/lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    })
  : null;

export class CacheService {
  private static instance: CacheService;
  private redis: Redis | null;

  private constructor() {
    this.redis = redis;
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }
}

export const cache = CacheService.getInstance();
```

```typescript
// UPDATE: src/app/api/brand/route.ts
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // Try cache first
    const cacheKey = `brand:${session.user.id}:${activeOnly}`;
    const cached = await cache.get<any[]>(cacheKey);

    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT' },
      });
    }

    const where: any = { userId: session.user.id };
    if (activeOnly) {
      where.isActive = true;
    }

    const brandKits = await prisma.brandKit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Cache for 1 hour
    await cache.set(cacheKey, brandKits, 3600);

    return NextResponse.json(brandKits, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError('Unauthorized', 401);
    }

    const body = await request.json();
    const data = brandKitSchema.parse(body);

    await prisma.brandKit.updateMany({
      where: { userId: session.user.id },
      data: { isActive: false },
    });

    const brandKit = await prisma.brandKit.create({
      data: {
        ...data,
        userId: session.user.id,
        isActive: true,
      },
    });

    // Invalidate cache
    await cache.invalidatePattern(`brand:${session.user.id}:*`);

    return NextResponse.json(brandKit, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// Similar cache invalidation for PATCH and DELETE
```

---

### Task 11: Add Database Indexes

**Issue:** Missing indexes slow down queries.
**Files to modify:** `prisma/schema.prisma`

**Implementation:**

```prisma
// UPDATE: prisma/schema.prisma

model Campaign {
  id        String   @id @default(cuid())
  userId    String
  goal      String
  channels  String[]
  content   Json     @default("{}")
  audience  Json     @default("{}")
  budget    Float?
  schedule  Json?
  status    String   @default("draft")
  metrics   Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  launchedAt DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@index([userId, status, createdAt]) // Composite index for filtered queries
  @@index([launchedAt]) // For date-range queries
  @@map("campaigns")
}

model Conversation {
  id        String   @id @default(cuid())
  userId    String
  messages  Json     @default("[]")
  metadata  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, updatedAt]) // For recent conversations query
  @@map("conversations")
}

model BrandKit {
  id             String   @id @default(cuid())
  userId         String
  name           String
  primaryColor   String
  secondaryColor String
  fontFamily     String
  tone           String
  values         String   @db.Text
  logoUrl        String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isActive])
  @@index([userId, isActive]) // For active brand query
  @@map("brand_kits")
}

model Integration {
  id          String   @id @default(cuid())
  userId      String
  name        String
  type        String
  status      String   @default("disconnected")
  credentials Json     @default("{}")
  lastSync    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name, type])
  @@index([userId])
  @@index([status])
  @@index([userId, type]) // For type-filtered queries
  @@map("integrations")
}
```

```bash
# Run migration
npx prisma migrate dev --name add_performance_indexes
npx prisma generate
```

---

### Task 12: Remove Unused Dependencies

**Issue:** Unused dependencies increase bundle size.
**Files to modify:** `package.json`

**Implementation:**

```bash
# Remove unused dependencies
npm uninstall stripe socket.io socket.io-client jsonwebtoken

# Run audit
npm audit fix
```

```json
// Verify package.json no longer contains:
// - "stripe"
// - "socket.io"
// - "socket.io-client"
// - "jsonwebtoken" (NextAuth handles this)
```

---

## MEDIUM PRIORITY (P2) - Complete Within 2-3 Weeks

### Task 13: Add Graceful Shutdown

**Issue:** SIGTERM not handled, connections lost during deployment.
**Files to create:** `server.js` (custom server)

**Implementation:**

```javascript
// CREATE: server.js (root directory)
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

let server;

app.prepare().then(() => {
  server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      process.exit(1);
    }
    console.log('Server closed');
  });

  // Close database connections
  try {
    await prisma.$disconnect();
    console.log('Database disconnected');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }

  // Give ongoing requests 10 seconds to finish
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
```

```json
// UPDATE: package.json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

```dockerfile
// UPDATE: Dockerfile
# Change the CMD at the end
CMD ["node", "server.js"]
```

---

### Task 14: Add Audit Logging

**Issue:** No audit trail for sensitive operations.
**Files to create:** `prisma/schema.prisma` (update), `src/lib/audit.ts`

**Implementation:**

```prisma
// ADD to prisma/schema.prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String   // "campaign.create", "integration.delete", "user.login"
  resource  String?  // Resource ID
  metadata  Json     @default("{}")
  ipAddress String?
  userAgent String?
  status    String   @default("success") // "success" | "failure"
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

```typescript
// CREATE: src/lib/audit.ts
import { prisma } from './prisma';
import { headers } from 'next/headers';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource?: string;
  metadata?: Record<string, any>;
  status?: 'success' | 'failure';
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip');
    const userAgent = headersList.get('user-agent');

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        metadata: entry.metadata || {},
        status: entry.status || 'success',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to create audit log:', error);
  }
}
```

```typescript
// UPDATE: src/app/api/campaign/launch/route.ts
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { campaignId, channels } = launchSchema.parse(body);

    // ... existing launch logic

    // Log successful launch
    await createAuditLog({
      userId: session.user.id,
      action: 'campaign.launch',
      resource: campaignId,
      metadata: {
        channels: channelsToLaunch,
        successCount,
        totalChannels: channelsToLaunch.length,
      },
      status: 'success',
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      launchResults,
      successCount,
      totalChannels: channelsToLaunch.length,
    });
  } catch (error) {
    // Log failed launch attempt
    if (session?.user?.id && body?.campaignId) {
      await createAuditLog({
        userId: session.user.id,
        action: 'campaign.launch',
        resource: body.campaignId,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        status: 'failure',
      });
    }

    return handleApiError(error);
  }
}
```

---

### Task 15: Add Input Sanitization for AI Prompts

**Issue:** Prompt injection vulnerability.
**Files to create:** `src/lib/input-sanitization.ts`

**Implementation:**

```typescript
// CREATE: src/lib/input-sanitization.ts
import { ApiError } from './api-error';

const DANGEROUS_PATTERNS = [
  /ignore\s+(previous|all)\s+instructions?/i,
  /disregard\s+(previous|all)\s+instructions?/i,
  /forget\s+(previous|all)\s+instructions?/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /<\s*script\s*>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i, // Event handlers
  /eval\s*\(/i,
];

const SUSPICIOUS_KEYWORDS = [
  'database',
  'password',
  'secret',
  'api key',
  'token',
  'admin',
  'root',
  'delete all',
  'drop table',
  'truncate',
];

export interface SanitizationOptions {
  maxLength?: number;
  allowHtml?: boolean;
  checkPromptInjection?: boolean;
}

export function sanitizeInput(
  input: string,
  options: SanitizationOptions = {}
): string {
  const {
    maxLength = 5000,
    allowHtml = false,
    checkPromptInjection = true,
  } = options;

  // Trim whitespace
  let sanitized = input.trim();

  // Check length
  if (sanitized.length > maxLength) {
    throw new ApiError(`Input exceeds maximum length of ${maxLength} characters`, 400);
  }

  // Check for empty input
  if (sanitized.length === 0) {
    throw new ApiError('Input cannot be empty', 400);
  }

  // Remove HTML if not allowed
  if (!allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Check for prompt injection patterns
  if (checkPromptInjection) {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new ApiError(
          'Input contains potentially malicious content',
          400,
          { pattern: pattern.source }
        );
      }
    }

    // Check for suspicious keyword combinations
    const lowerInput = sanitized.toLowerCase();
    const foundKeywords = SUSPICIOUS_KEYWORDS.filter(keyword =>
      lowerInput.includes(keyword)
    );

    if (foundKeywords.length >= 2) {
      // Log suspicious activity
      console.warn('Suspicious input detected:', {
        keywords: foundKeywords,
        inputPreview: sanitized.substring(0, 100),
      });
    }
  }

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

export function sanitizeConversationHistory(
  history: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  return history.map(msg => ({
    role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
    content: sanitizeInput(msg.content, { checkPromptInjection: false }),
  }));
}
```

```typescript
// UPDATE: src/app/api/campaign/route.ts
import { sanitizeInput, sanitizeConversationHistory } from '@/lib/input-sanitization';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError('Unauthorized', 401);
  }

  return withRateLimit(
    `campaign:${session.user.id}`,
    aiRateLimit,
    async () => {
      try {
        const body = await request.json();
        const { prompt, conversationHistory, conversationId } = campaignRequestSchema.parse(body);

        // Sanitize inputs
        const sanitizedPrompt = sanitizeInput(prompt, { maxLength: 2000 });
        const sanitizedHistory = conversationHistory
          ? sanitizeConversationHistory(conversationHistory)
          : [];

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new ApiError('OpenAI API key not configured', 500);
        }

        const parser = new PromptParser(apiKey);
        const generator = new ContentGenerator(apiKey);

        const intent = await parser.parseCampaignIntent(sanitizedPrompt, sanitizedHistory);

        // ... rest of campaign creation logic

      } catch (error) {
        return handleApiError(error);
      }
    }
  );
}
```

---

## FINAL STEPS - Testing and Documentation

### Task 16: Create Docker Compose for Production

**Issue:** Development docker-compose not suitable for production.
**Files to create:** `docker-compose.prod.yml`

**Implementation:**

```yaml
# CREATE: docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: marketing_ai_db_prod
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    command:
      - "postgres"
      - "-c"
      - "max_connections=100"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "effective_cache_size=1GB"

  postgres_backup:
    image: prodrigestivill/postgres-backup-local
    container_name: marketing_ai_backup
    restart: always
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      SCHEDULE: "@daily"
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 6
    volumes:
      - ./backups:/backups
    depends_on:
      postgres:
        condition: service_healthy

  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    container_name: marketing_ai_app_prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      UPSTASH_REDIS_URL: ${UPSTASH_REDIS_URL}
      UPSTASH_REDIS_TOKEN: ${UPSTASH_REDIS_TOKEN}
      NEXT_PUBLIC_SENTRY_DSN: ${NEXT_PUBLIC_SENTRY_DSN}
      SENTRY_AUTH_TOKEN: ${SENTRY_AUTH_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && node server.js"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:

networks:
  default:
    name: marketing_ai_network
```

```bash
# CREATE: .env.production (template)
# Copy this to .env.production and fill in real values

# Database
POSTGRES_USER=marketing_ai_user
POSTGRES_PASSWORD=CHANGE_THIS_TO_STRONG_PASSWORD
POSTGRES_DB=marketing_ai_prod

# Application
DATABASE_URL="postgresql://marketing_ai_user:CHANGE_THIS_TO_STRONG_PASSWORD@postgres:5432/marketing_ai_prod?schema=public"
NEXTAUTH_SECRET="CHANGE_THIS_TO_32_CHAR_SECRET"
NEXTAUTH_URL="https://your-production-domain.com"
OPENAI_API_KEY="sk-your-openai-api-key"
ENCRYPTION_KEY="CHANGE_THIS_TO_32_CHARACTERS!!"

# Redis (Upstash)
UPSTASH_REDIS_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_TOKEN="your-redis-token"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```

---

### Task 17: Update README with Production Deployment Guide

**Files to modify:** `README.md`

**Implementation:**

```markdown
# ADD to README.md

## Production Deployment

### Prerequisites
- Docker & Docker Compose
- Upstash Redis account
- Sentry account
- OpenAI API key

### Step 1: Environment Setup

1. Copy environment template:
```bash
cp .env.example .env.production
```

2. Generate secure secrets:
```bash
# NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32

# ENCRYPTION_KEY (exactly 32 characters)
openssl rand -hex 16
```

3. Set up external services:
   - Create Upstash Redis instance at https://upstash.com
   - Create Sentry project at https://sentry.io
   - Get OpenAI API key from https://platform.openai.com

4. Fill in all values in `.env.production`

### Step 2: Database Migration

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check health
curl http://localhost:3000/api/health
```

### Step 3: Monitoring Setup

1. Configure Sentry alerts for:
   - Error rate > 1% over 5 minutes
   - Response time p95 > 2 seconds
   - Rate limit exceeded events

2. Set up health check monitoring (recommended: UptimeRobot, Pingdom)
   - Endpoint: `https://your-domain.com/api/health`
   - Interval: 5 minutes
   - Alert on: status !== 200

### Step 4: Backup Verification

```bash
# Check backup was created
ls -lah ./backups

# Test restore (on staging first!)
docker exec -it marketing_ai_db_prod pg_restore -U marketing_ai_user -d marketing_ai_prod /backups/latest.sql
```

### Step 5: Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run load-test.js
```

### Security Checklist

- [ ] All environment variables use strong, unique values
- [ ] Database password is not default
- [ ] NEXTAUTH_SECRET is 32+ characters
- [ ] ENCRYPTION_KEY is exactly 32 characters
- [ ] HTTPS is enabled (use nginx or Caddy reverse proxy)
- [ ] Firewall rules limit database access to app only
- [ ] Backups are encrypted and stored securely
- [ ] Sentry is configured and receiving errors
- [ ] Rate limiting is active (check Redis)
- [ ] Health checks are passing

### Production URLs

- Application: `https://your-domain.com`
- Health Check: `https://your-domain.com/api/health`
- API Documentation: `https://your-domain.com/api/docs` (TODO)

### Troubleshooting

**App won't start:**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check database connection
docker exec -it marketing_ai_db_prod psql -U marketing_ai_user -d marketing_ai_prod -c "SELECT 1;"
```

**High latency:**
- Check Sentry performance monitoring
- Verify Redis is connected: `/api/health`
- Check OpenAI API status: https://status.openai.com

**Rate limits hit:**
- Increase limits in `src/lib/rate-limit.ts`
- Scale Redis (Upstash offers auto-scaling)
```

---

## Summary of All Changes

### Files to CREATE (27 new files)
1. `src/lib/integrations/integration-client.ts`
2. `src/lib/integrations/integration-server.ts`
3. `src/app/api/integrations/test/route.ts`
4. `src/lib/rate-limit.ts`
5. `src/lib/rate-limit-middleware.ts`
6. `sentry.client.config.ts`
7. `sentry.server.config.ts`
8. `sentry.edge.config.ts`
9. `src/app/api/health/route.ts`
10. `src/app/api/health/ready/route.ts`
11. `src/app/api/health/live/route.ts`
12. `src/lib/env.ts`
13. `src/lib/cache.ts`
14. `server.js`
15. `src/lib/audit.ts`
16. `src/lib/input-sanitization.ts`
17. `docker-compose.prod.yml`
18. `.env.production`

### Files to DELETE (1 file)
1. `src/lib/integrations/integration-manager.ts` (client-side version)

### Files to MODIFY (15 files)
1. `src/components/integrations/IntegrationSettings.tsx`
2. `src/app/api/campaign/route.ts`
3. `src/app/api/auth/register/route.ts`
4. `src/app/api/analytics/route.ts`
5. `src/lib/api-error.ts`
6. `src/lib/encryption.ts`
7. `src/app/layout.tsx`
8. `src/lib/ai/analytics-analyzer.ts`
9. `src/lib/ai/content-generator.ts`
10. `src/lib/store/chat-store.ts`
11. `src/app/api/brand/route.ts`
12. `prisma/schema.prisma`
13. `package.json`
14. `Dockerfile`
15. `README.md`

### Dependencies to INSTALL
```bash
npm install @upstash/ratelimit @upstash/redis @sentry/nextjs
```

### Dependencies to REMOVE
```bash
npm uninstall stripe socket.io socket.io-client jsonwebtoken
```

### Database Migrations to RUN
```bash
npx prisma migrate dev --name add_performance_indexes
npx prisma migrate dev --name add_audit_logging
npx prisma generate
```

---

## Deployment Timeline

### Week 1: Critical Security (P0)
- Day 1-2: Tasks 1-3 (Credentials, Rate Limiting, Sentry)
- Day 3-4: Tasks 4-6 (Health Checks, Passwords, Env Validation)
- Day 5: Testing & QA

### Week 2: High Priority (P1)
- Day 1-2: Tasks 7-9 (Remove Hardcoded Data, Timeouts, UUIDs)
- Day 3-4: Tasks 10-12 (Caching, Indexes, Dependencies)
- Day 5: Testing & QA

### Week 3: Medium Priority (P2) + Deployment
- Day 1-2: Tasks 13-15 (Graceful Shutdown, Audit Logging, Sanitization)
- Day 3-4: Tasks 16-17 (Docker Prod, Documentation)
- Day 5: Production Deployment & Monitoring

---

**End of Production Readiness Tasks**

*Estimated total effort: 2-3 weeks with 1 senior developer*
*Grade improvement: B+ → A (Production-Ready)*
