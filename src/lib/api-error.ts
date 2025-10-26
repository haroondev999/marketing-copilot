import { NextResponse } from "next/server";
import { ZodError } from "zod";
import * as Sentry from "@sentry/nextjs";

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError && error.statusCode >= 500) {
    Sentry.captureException(error, {
      level: "error",
      tags: {
        statusCode: error.statusCode,
      },
      extra: {
        details: error.details,
      },
    });
  } else if (error instanceof Error && !(error instanceof ZodError)) {
    Sentry.captureException(error, { level: "error" });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.details && { details: error.details }),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof Error) {
    console.error("API Error:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 },
    );
  }

  console.error("Unknown error:", error);
  return NextResponse.json(
    { error: "An unexpected error occurred" },
    { status: 500 },
  );
}
