import { NextRequest, NextResponse } from "next/server";

export async function POST() {
  // Since we're not using Stripe or Sanity anymore, just return success
  // This webhook endpoint is kept for compatibility but doesn't do anything
  return NextResponse.json({ received: true, message: "Webhook disabled - using local orders" });
}

// Removed Sanity and Stripe dependencies - using local orders now
