import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";

export async function withRateLimit(
  identifier: string,
  limiter: Ratelimit | null,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!limiter) {
    return handler();
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    const resetDate = new Date(reset);
    const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: "Rate limit exceeded",
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
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": retryAfter.toString(),
        },
      },
    );
  }

  const response = await handler();

  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", reset.toString());

  return response;
}
