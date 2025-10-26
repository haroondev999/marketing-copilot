import { prisma } from "./prisma";
import { headers } from "next/headers";

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource?: string;
  metadata?: Record<string, any>;
  status?: "success" | "failure";
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const headersList = headers();
    const ipAddress =
      headersList.get("x-forwarded-for") || headersList.get("x-real-ip");
    const userAgent = headersList.get("user-agent");

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        metadata: entry.metadata || {},
        status: entry.status || "success",
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
