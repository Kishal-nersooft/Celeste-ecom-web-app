import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { order_id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${API_BASE_URL}/orders/${params.order_id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("authorization") && {
          Authorization: request.headers.get("authorization")!,
        }),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const responseText = await response.text();
    let payload: any = null;
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = responseText;
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        payload ?? { error: "Failed to cancel order" },
        { status: response.status }
      );
    }

    // Spec example says the response can be a JSON string; normalize to JSON.
    return NextResponse.json(payload ?? "OK");
  } catch (error) {
    console.error("Error canceling order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

