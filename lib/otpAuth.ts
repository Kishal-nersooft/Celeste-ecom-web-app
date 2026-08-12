import { signInWithCustomToken, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Browser must call same-origin routes — direct Cloud Function calls fail CORS.
const SEND_OTP_URL = "/api/otp/send";
const VERIFY_OTP_URL = "/api/otp/verify";

export type OtpSignInResult = {
  user: User;
  /** Server-confirmed: first-time sign-in via custom auth. */
  isNewUser: boolean;
};

type OtpApiResponse = {
  success?: boolean;
  token?: string;
  isNewUser?: boolean;
  error?: string;
};

/**
 * Sends OTP via same-origin proxy → Cloud Function /sendOtp (same as mobile).
 */
export async function sendOtp(phoneNumber: string): Promise<void> {
  const response = await fetch(SEND_OTP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number: phoneNumber }),
  });

  let data: OtpApiResponse;
  try {
    data = (await response.json()) as OtpApiResponse;
  } catch {
    throw new Error("Failed to send OTP");
  }

  if (response.ok && data.success === true) {
    return;
  }

  throw new Error(data.error ?? "Failed to send OTP");
}

/**
 * Verifies OTP via same-origin proxy → /verifyOtp, signs in with custom token.
 */
export async function verifyOtpAndSignIn(
  phoneNumber: string,
  otp: string
): Promise<OtpSignInResult> {
  const response = await fetch(VERIFY_OTP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number: phoneNumber, otp }),
  });

  let data: OtpApiResponse;
  try {
    data = (await response.json()) as OtpApiResponse;
  } catch {
    throw new Error("Failed to verify OTP");
  }

  if (!(response.ok && data.success === true)) {
    throw new Error(data.error ?? "Failed to verify OTP");
  }

  const token = data.token;
  if (!token) {
    throw new Error("Token not received from server");
  }

  const userCredential = await signInWithCustomToken(auth, token);
  const user = userCredential.user;
  if (!user) {
    throw new Error("Sign in failed, user is null");
  }

  return {
    user,
    isNewUser: data.isNewUser === true,
  };
}
