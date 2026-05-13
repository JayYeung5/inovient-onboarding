import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to create company";
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { companyName } = await req.json();
    const name = typeof companyName === "string" ? companyName.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const companyRef = adminDb.collection("companies").doc();
    const onboardingRef = adminDb.collection("onboardings").doc();
    const userRef = adminDb.collection("users").doc(decodedToken.uid);

    await adminDb.runTransaction(async (transaction) => {
      transaction.set(companyRef, {
        name,
        products: [],
        createdBy: decodedToken.uid,
        members: [decodedToken.uid],
        createdAt: now,
        updatedAt: now,
      });

      transaction.set(
        userRef,
        {
          email: decodedToken.email || null,
          companyIds: admin.firestore.FieldValue.arrayUnion(companyRef.id),
          updatedAt: now,
        },
        { merge: true }
      );

      transaction.set(onboardingRef, {
        companyId: companyRef.id,
        createdBy: decodedToken.uid,
        status: "started",
        createdAt: now,
        updatedAt: now,
      });
    });

    return NextResponse.json({
      companyId: companyRef.id,
      onboardingId: onboardingRef.id,
    });
  } catch (error: unknown) {
    console.error("Create company failed:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
