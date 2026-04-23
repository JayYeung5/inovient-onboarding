import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-]/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(idToken);

    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const onboardingId = String(formData.get("onboardingId") || "");
    const fieldKey = String(formData.get("fieldKey") || "");
    const companyId = String(formData.get("companyId") || "");

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!onboardingId || !fieldKey || !companyId) {
      return NextResponse.json(
        { error: "Missing onboardingId, fieldKey, or companyId" },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File must be under 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucket = process.env.SUPABASE_STORAGE_BUCKET!;
    const safeName = sanitizeFileName(file.name);
    const filePath = `${companyId}/${onboardingId}/${fieldKey}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
    );
    }

    return NextResponse.json({
      success: true,
      file: {
        type: "file",
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        bucket,
        path: filePath,
        storageProvider: "supabase",
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
  console.error("Upload failed:", error);
  return NextResponse.json(
    { error: error?.message || String(error) || "Upload failed" },
    { status: 500 }
  );
}
}