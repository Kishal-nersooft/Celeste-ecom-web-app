import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROXY_PREFIX = "/api/backend";

function getUpstreamBaseUrl(): string {
  const base = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return base.replace(/\/$/, "");
}

function buildUpstreamUrl(request: NextRequest): string | null {
  const base = getUpstreamBaseUrl();
  if (!base) return null;

  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith(PROXY_PREFIX)) return null;

  let backendPath = pathname.slice(PROXY_PREFIX.length) || "/";
  // Next.js strips trailing slashes (`/orders/` → `/orders`). FastAPI list routes
  // are defined as `/`, so that becomes a 307 to `http://…/orders/` and Node's
  // fetch follow-up drops Authorization / X-Client-Secret → 403.
  const segments = backendPath.split("/").filter(Boolean);
  if (segments.length === 1 && !backendPath.endsWith("/")) {
    backendPath = `${backendPath}/`;
  }

  return `${base}${backendPath}${search}`;
}

function resolveSameHostHttpsRedirect(
  location: string,
  currentUrl: string
): string | null {
  try {
    const current = new URL(currentUrl);
    const next = new URL(location, currentUrl);
    if (next.hostname !== current.hostname) return null;
    next.protocol = "https:";
    return next.toString();
  } catch {
    return null;
  }
}

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const secret = process.env.BACKEND_CLIENT_SECRET;
  if (secret) headers.set("X-Client-Secret", secret);

  // Prefer the public web origin for backend ALLOWED_ORIGINS checks.
  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    request.nextUrl.origin;
  if (origin) headers.set("Origin", origin);

  return headers;
}

async function proxy(request: NextRequest): Promise<NextResponse> {
  const upstreamUrl = buildUpstreamUrl(request);
  if (!upstreamUrl) {
    return NextResponse.json(
      { error: "API_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  if (!process.env.BACKEND_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "BACKEND_CLIENT_SECRET is not configured" },
      { status: 500 }
    );
  }

  const init: RequestInit = {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    cache: "no-store",
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    let upstream = await fetch(upstreamUrl, init);

    if ([301, 302, 307, 308].includes(upstream.status)) {
      const location = upstream.headers.get("location");
      const redirectedUrl = location
        ? resolveSameHostHttpsRedirect(location, upstreamUrl)
        : null;
      if (redirectedUrl) {
        upstream = await fetch(redirectedUrl, init);
      }
    }

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Backend proxy error:", error);
    return NextResponse.json(
      { error: "Failed to reach backend API" },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}
