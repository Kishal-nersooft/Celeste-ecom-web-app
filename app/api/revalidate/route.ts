import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * On-demand revalidation endpoint.
 *
 * POST body:
 * {
 *   "token": "...",
 *   "path"?: "/some-path",
 *   "tag"?: "some-tag"
 * }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_SECRET is not configured" },
      { status: 501 }
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const token = body?.token;
  const path = body?.path;
  const tag = body?.tag;

  if (token !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (typeof tag === "string" && tag.length > 0) {
    revalidateTag(tag);
    return NextResponse.json({ ok: true, revalidated: { tag } });
  }

  if (typeof path === "string" && path.startsWith("/")) {
    revalidatePath(path);
    return NextResponse.json({ ok: true, revalidated: { path } });
  }

  return NextResponse.json(
    { ok: false, error: "Provide either { path } or { tag }" },
    { status: 400 }
  );
}

