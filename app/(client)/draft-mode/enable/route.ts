import { redirect } from "next/navigation";
import { draftMode } from "next/headers";

export async function GET(request: Request) {
  // Since we're not using Sanity, just enable draft mode and redirect
  (await draftMode()).enable();
  redirect("/");
}
