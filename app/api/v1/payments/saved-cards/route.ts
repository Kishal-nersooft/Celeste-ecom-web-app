import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

function getBackendUrl() {
  const base = (API_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return "";
  if (base.endsWith("/api/v1")) return `${base}/payments/saved-cards`;
  return `${base}/api/v1/payments/saved-cards`;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
    }

    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      return NextResponse.json({ error: "API_BASE_URL is not configured" }, { status: 500 });
    }

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        return NextResponse.json([], { status: 200 });
      }
      return NextResponse.json(
        { error: "Failed to fetch saved cards", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Saved cards proxy (v1) error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

