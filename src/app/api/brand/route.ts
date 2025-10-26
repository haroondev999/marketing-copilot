import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError, ApiError } from "@/lib/api-error";
import { cache } from "@/lib/cache";

const brandKitSchema = z.object({
  name: z.string().min(1),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  fontFamily: z.string().min(1),
  tone: z.string().min(1),
  values: z.string().min(1),
  logoUrl: z.string().url().optional(),
});

const updateBrandKitSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid hex color")
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid hex color")
    .optional(),
  fontFamily: z.string().min(1).optional(),
  tone: z.string().min(1).optional(),
  values: z.string().min(1).optional(),
  logoUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
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

    await cache.invalidatePattern(`brand:${session.user.id}:*`);

    return NextResponse.json(brandKit, { status: 201 });
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
    const activeOnly = searchParams.get("active") === "true";

    const cacheKey = `brand:${session.user.id}:${activeOnly}`;
    const cached = await cache.get<any[]>(cacheKey);

    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    const where: any = { userId: session.user.id };
    if (activeOnly) {
      where.isActive = true;
    }

    const brandKits = await prisma.brandKit.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    await cache.set(cacheKey, brandKits, 3600);

    return NextResponse.json(brandKits, {
      headers: { "X-Cache": "MISS" },
    });
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
    const { id, ...updates } = updateBrandKitSchema.parse(body);

    if (updates.isActive === true) {
      await prisma.brandKit.updateMany({
        where: { userId: session.user.id },
        data: { isActive: false },
      });
    }

    const brandKit = await prisma.brandKit.update({
      where: { id, userId: session.user.id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    await cache.invalidatePattern(`brand:${session.user.id}:*`);

    return NextResponse.json(brandKit);
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
      throw new ApiError("Brand kit ID required", 400);
    }

    await prisma.brandKit.delete({
      where: { id, userId: session.user.id },
    });

    await cache.invalidatePattern(`brand:${session.user.id}:*`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
