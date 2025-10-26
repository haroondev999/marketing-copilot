import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError, ApiError } from "@/lib/api-error";
import { encrypt } from "@/lib/encryption";

const integrationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["email", "social", "ppc", "sms", "crm"]),
  credentials: z.record(z.string()).refine(
    (creds) => {
      const values = Object.values(creds);
      return values.every(v => v !== "placeholder" && v !== "noreply@example.com");
    },
    { message: "Credentials cannot contain placeholder values" }
  ),
});

const updateIntegrationSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  credentials: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const body = await request.json();
    const data = integrationSchema.parse(body);

    const existingIntegration = await prisma.integration.findFirst({
      where: {
        userId: session.user.id,
        name: data.name,
        type: data.type,
      },
    });

    if (existingIntegration) {
      throw new ApiError(
        `Integration with name "${data.name}" and type "${data.type}" already exists`,
        400
      );
    }

    const encryptedCredentials = encrypt(data.credentials);

    const integration = await prisma.integration.create({
      data: {
        userId: session.user.id,
        name: data.name,
        type: data.type,
        credentials: encryptedCredentials,
        status: "connected",
        lastSync: new Date(),
      },
    });

    return NextResponse.json(
      {
        ...integration,
        credentials: undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where: any = { userId: session.user.id };
    if (type) {
      where.type = type;
    }

    const integrations = await prisma.integration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        lastSync: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(integrations);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { id, status, credentials } = updateIntegrationSchema.parse(body);

    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }
    if (credentials) {
      updateData.credentials = encrypt(credentials);
    }
    updateData.updatedAt = new Date();

    const integration = await prisma.integration.update({
      where: { id, userId: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        lastSync: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(integration);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new ApiError("Integration ID required", 400);
    }

    await prisma.integration.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}