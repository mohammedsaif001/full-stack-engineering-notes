import { auth } from "@/lib/auth/config";
import { NextRequest, NextResponse } from "next/server";

/**
 * Validate user session from request headers
 */
export async function requireAuth(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to continue." },
        { status: 401 }
      ),
      userId: null,
      session: null,
    };
  }

  return {
    error: null,
    userId: session.user.id,
    user: session.user,
    session: session.session,
  };
}
