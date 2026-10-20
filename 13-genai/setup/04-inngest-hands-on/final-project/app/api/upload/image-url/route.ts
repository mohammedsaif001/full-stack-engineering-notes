import { S3_BUCKET_NAME, s3Client } from "@/lib/services/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";

// POST /api/upload/image-url - Get presigned URL for viewing S3 image
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Missing key" },
        { status: 400 }
      );
    }

    // Create presigned GET URL
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600 * 24, // 24 hours
    });

    return NextResponse.json({
      url: presignedUrl,
    });
  } catch (error) {
    console.error("Error generating presigned GET URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate presigned GET URL" },
      { status: 500 }
    );
  }
}
