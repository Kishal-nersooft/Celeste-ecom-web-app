/** Cloud Functions base URL for OTP (server-side proxy only). */
export function getOtpFunctionsBaseUrl(): string {
  return (
    process.env.OTP_FUNCTIONS_BASE_URL ??
    process.env.NEXT_PUBLIC_OTP_FUNCTIONS_BASE_URL ??
    "https://us-central1-hallowed-byte-498805-g8.cloudfunctions.net"
  );
}
