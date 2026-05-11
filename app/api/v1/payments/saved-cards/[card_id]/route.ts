import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

function getBackendUrl(cardId: string) {
  const base = (API_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return "";
  const suffix = `/payments/saved-cards/${encodeURIComponent(cardId)}`;
  if (base.endsWith("/api/v1")) return `${base}${suffix}`;
  return `${base}/api/v1${suffix}`;
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ card_id: string }> }) {
  try {
    const { card_id } = await ctx.params;
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
    }

    const backendUrl = getBackendUrl(card_id);
    if (!backendUrl) {
      return NextResponse.json({ error: "API_BASE_URL is not configured" }, { status: 500 });
    }

    const response = await fetch(backendUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to delete saved card", details: text },
        { status: response.status }
      );
    }

    // Backend returns a string per schema; try to pass through.
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json(text || "Deleted");
    }
  } catch (error) {
    console.error("❌ Delete saved card proxy (v1) error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

