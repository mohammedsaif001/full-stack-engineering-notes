import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ratelimit } from "./lib/services/rate-limit";

export async function proxy(request: NextRequest) {
  // Skip rate limiting for static files and internal Next.js routes
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/static") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Skip rate limiting if Upstash is not configured
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return NextResponse.next();
  }

  // Get IP address for rate limiting
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";

  try {
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    const response = success
      ? NextResponse.next()
      : NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );

    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());

    return response;
  } catch (error) {
    console.error("Rate limiting error:", error);
    // If rate limiting fails, allow the request to proceed
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/inngest (Inngest webhook)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/inngest|_next/static|_next/image|favicon.ico).*)",
  ],
};
