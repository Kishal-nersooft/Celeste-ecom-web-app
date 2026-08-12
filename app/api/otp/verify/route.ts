import { NextRequest, NextResponse } from "next/server";
import { getOtpFunctionsBaseUrl } from "@/lib/otpFunctionsUrl";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${getOtpFunctionsBaseUrl()}/verifyOtp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
