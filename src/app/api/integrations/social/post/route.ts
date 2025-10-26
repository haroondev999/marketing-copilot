import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { handleApiError, ApiError } from "@/lib/api-error";

const socialPostSchema = z.object({
  integrationId: z.string().optional(),
  accessToken: z.string().min(1),
  platform: z.enum(["facebook", "instagram", "twitter", "linkedin"]),
  content: z.string().min(1),
  mediaUrls: z.array(z.string().url()).optional(),
  authorUrn: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { accessToken, platform, content, mediaUrls, authorUrn } = socialPostSchema.parse(body);

    let apiUrl = "";
    let postData: any = {};
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    switch (platform.toLowerCase()) {
      case "facebook":
        apiUrl = `https://graph.facebook.com/v18.0/me/feed`;
        postData = {
          message: content,
          access_token: accessToken,
        };
        break;

      case "instagram":
        apiUrl = `https://graph.facebook.com/v18.0/me/media`;
        postData = {
          caption: content,
          access_token: accessToken,
        };
        if (mediaUrls && mediaUrls.length > 0) {
          postData.image_url = mediaUrls[0];
        }
        break;

      case "twitter":
        apiUrl = `https://api.twitter.com/2/tweets`;
        postData = {
          text: content,
        };
        break;

      case "linkedin":
        if (!authorUrn || authorUrn === "urn:li:person:placeholder") {
          throw new ApiError(
            "LinkedIn author URN not configured. Please update your LinkedIn integration with your person URN.",
            400
          );
        }

        apiUrl = `https://api.linkedin.com/v2/ugcPosts`;
        postData = {
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: content,
              },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        };
        break;

      default:
        throw new ApiError("Unsupported platform", 400);
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || `${platform} API request failed`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, postId: data.id });
  } catch (error) {
    return handleApiError(error);
  }
}