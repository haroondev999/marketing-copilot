import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ready: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ready: false, error: "Database not ready" },
      { status: 503 },
    );
  }
}
