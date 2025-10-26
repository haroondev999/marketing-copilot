import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { IntegrationServer } from "@/lib/integrations/integration-server";
import { z } from "zod";
import { handleApiError, ApiError } from "@/lib/api-error";

const testSchema = z.object({
  id: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
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
