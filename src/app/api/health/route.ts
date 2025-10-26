import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  services: {
    database: "up" | "down";
    openai: "configured" | "not configured";
    redis?: "up" | "down";
  };
  version?: string;
}

export async function GET() {
  const startTime = Date.now();
  const services: HealthStatus["services"] = {
    database: "down",
    openai: "not configured",
  };

  let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";

  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = "up";
  } catch (error) {
    console.error("Database health check failed:", error);
    services.database = "down";
    overallStatus = "unhealthy";
  }

  if (
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY.startsWith("sk-")
  ) {
    services.openai = "configured";
  } else {
    overallStatus = overallStatus === "healthy" ? "degraded" : "unhealthy";
  }

  if (process.env.UPSTASH_REDIS_URL) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN!,
      });
      await redis.ping();
      services.redis = "up";
    } catch (error) {
      console.error("Redis health check failed:", error);
      services.redis = "down";
      overallStatus = "degraded";
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

  const statusCode =
    overallStatus === "healthy"
      ? 200
      : overallStatus === "degraded"
        ? 200
        : 503;

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Response-Time": `${responseTime}ms`,
    },
  });
}
