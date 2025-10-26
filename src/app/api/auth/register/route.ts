import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authRateLimit } from "@/lib/rate-limit";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { handleApiError } from "@/lib/api-error";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: passwordSchema,
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body;

  return withRateLimit(`auth:register:${email}`, authRateLimit, async () => {
    try {
      const { name, email, password } = registerSchema.parse(body);

      const commonPasswords = [
        "password123",
        "12345678",
        "qwerty123",
        "admin123",
        "welcome123",
      ];

      if (commonPasswords.includes(password.toLowerCase())) {
        return NextResponse.json(
          {
            error: "Password is too common. Please choose a stronger password.",
          },
          { status: 400 },
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "User already exists" },
          { status: 400 },
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
  });
}
