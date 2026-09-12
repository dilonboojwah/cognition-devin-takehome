import type { NextRequest } from "next/server";
import { isSsoEnabled } from "@/lib/auth";

/** Only mounted in SSO mode; dev mode never loads next-auth. */
async function route(request: NextRequest) {
  if (!isSsoEnabled()) {
    return new Response("SSO mode is off", { status: 404 });
  }
  const { handlers } = await import("@/lib/auth-sso");
  return request.method === "POST" ? handlers.POST(request) : handlers.GET(request);
}

export const GET = route;
export const POST = route;
