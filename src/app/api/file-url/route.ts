import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(idToken);

    const { bucket, path } = await req.json();

    if (!bucket || !path) {
      return NextResponse.json(
        { error: "Missing bucket or path" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.error("Signed URL error:", error);
    return NextResponse.json({ error: "Could not create signed URL" }, { status: 500 });
  }
}