import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type UserProfile = {
  role?: string;
  companyIds?: string[];
};

type CompanyProfile = {
  id: string;
  name?: string;
  createdBy?: string;
  members?: string[];
  products?: string[];
};

type CampaignProductResult = {
  campaignName: string;
  products: string[];
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to complete onboarding";
}

function normalizeCampaignName(name: string) {
  return name.trim().toLowerCase();
}

function normalizeForProductMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactForProductMatch(value: string) {
  return normalizeForProductMatch(value).replace(/\s+/g, "");
}

function getMatchingProductsFromList(
  campaignName: string,
  productList: string[]
) {
  const normalizedCampaign = ` ${normalizeForProductMatch(campaignName)} `;
  const compactCampaign = compactForProductMatch(campaignName);

  return Array.from(
    new Set(
      productList.filter((product) => {
        const normalizedProduct = normalizeForProductMatch(product);

        if (!normalizedProduct) return false;

        const compactProduct = compactForProductMatch(product);

        return (
          normalizedCampaign.includes(` ${normalizedProduct} `) ||
          compactCampaign.includes(compactProduct)
        );
      })
    )
  );
}

function parseCampaignNames(text: string) {
  const seen = new Set<string>();
  const campaigns: string[] = [];

  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((campaignName) => {
      const normalized = normalizeCampaignName(campaignName);

      if (!seen.has(normalized)) {
        seen.add(normalized);
        campaigns.push(campaignName);
      }
    });

  return campaigns;
}

function getCampaignDocId(campaignNameNormalized: string) {
  return encodeURIComponent(campaignNameNormalized);
}

function canAccessCompany(
  userId: string,
  userProfile: UserProfile | undefined,
  company: CompanyProfile
) {
  const role = String(userProfile?.role || "").toLowerCase();

  return (
    role === "admin" ||
    company.createdBy === userId ||
    company.members?.includes(userId) ||
    userProfile?.companyIds?.includes(company.id) ||
    false
  );
}

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

function normalizeProducts(products: unknown) {
  return Array.isArray(products)
    ? products
        .filter((product: unknown) => typeof product === "string")
        .map((product: string) => product.trim())
        .filter(Boolean)
    : [];
}

async function inferProductsFromCampaignNames(
  campaignNames: string[],
  existingProducts: string[],
  companyName?: string
) {
  if (campaignNames.length === 0) return [];

  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
  });

  const prompt = `
You are extracting product metadata from marketing campaign names. Given campaign names, return only the likely product or products being promoted for each campaign. Do not include regions, countries, dates, audience names, or campaign format terms unless they are clearly products. Return JSON only in this shape: { "campaigns": [{ "campaignName": "original campaign name", "products": ["product 1", "product 2"] }] }.

Company context:
${companyName ? `Company name: ${companyName}` : "None provided"}

Existing company product list:
${existingProducts.length > 0 ? JSON.stringify(existingProducts, null, 2) : "[]"}

Prefer products from the existing company product list when they are a likely match. If no existing product matches, infer the likely product name from the campaign name.

Example:
Campaign names:
["Summer Glow SPF Push", "Hydration Bundle Launch"]

Return:
{
  "campaigns": [
    { "campaignName": "Summer Glow SPF Push", "products": ["sunscreen"] },
    { "campaignName": "Hydration Bundle Launch", "products": ["moisturizer", "hydrating skincare"] }
  ]
}

Campaign names:
${JSON.stringify(campaignNames, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(extractJson(result.response.text()));
  const campaigns = Array.isArray(parsed.campaigns) ? parsed.campaigns : [];
  const resultsByNormalizedName = new Map<string, CampaignProductResult>();

  campaigns.forEach((item: unknown) => {
    if (!item || typeof item !== "object") return;

    const resultItem = item as {
      campaignName?: unknown;
      products?: unknown;
    };
    const campaignName =
      typeof resultItem.campaignName === "string"
        ? resultItem.campaignName
        : "";
    const products = normalizeProducts(resultItem.products);

    if (!campaignName) return;

    resultsByNormalizedName.set(normalizeCampaignName(campaignName), {
      campaignName,
      products,
    });
  });

  return campaignNames.map((campaignName) => {
    const result = resultsByNormalizedName.get(normalizeCampaignName(campaignName));

    return {
      campaignName,
      products: result?.products || [],
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { onboardingId, answers } = await req.json();

    if (!onboardingId || typeof onboardingId !== "string") {
      return NextResponse.json(
        { error: "onboardingId is required" },
        { status: 400 }
      );
    }

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers are required" },
        { status: 400 }
      );
    }

    const onboardingRef = adminDb.collection("onboardings").doc(onboardingId);
    const onboardingSnap = await onboardingRef.get();

    if (!onboardingSnap.exists) {
      return NextResponse.json(
        { error: "Onboarding not found" },
        { status: 404 }
      );
    }

    const companyId = String(onboardingSnap.data()?.companyId || "");
    const companyRef = adminDb.collection("companies").doc(companyId);
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const [companySnap, userSnap] = await Promise.all([
      companyRef.get(),
      userRef.get(),
    ]);

    if (!companySnap.exists) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const company = {
      id: companySnap.id,
      ...companySnap.data(),
    } as CompanyProfile;
    const userProfile = userSnap.data() as UserProfile | undefined;

    if (!canAccessCompany(decodedToken.uid, userProfile, company)) {
      return NextResponse.json(
        { error: "You do not have access to this company" },
        { status: 403 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = adminDb.batch();

    Object.entries(answers as Record<string, unknown>).forEach(
      ([questionId, answer]) => {
        const responseRef = adminDb.collection("responses").doc();
        batch.set(responseRef, {
          companyId,
          onboardingId,
          questionId,
          answer,
          createdAt: now,
        });
      }
    );

    await batch.commit();

    const campaignNames = parseCampaignNames(String((answers as Record<string, unknown>).q33 || ""));
    const inferredProducts: string[] = [];
    const companyName = String((answers as Record<string, unknown>).q1 || company.name || "");
    const existingCompanyProducts = normalizeProducts(company.products);

    const campaignsRef = companyRef.collection("campaigns");
    const missingCampaignNames: string[] = [];

    for (const campaignName of campaignNames) {
      const campaignNameNormalized = normalizeCampaignName(campaignName);
      const existingSnap = await campaignsRef
        .where("campaignNameNormalized", "==", campaignNameNormalized)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const products = existingSnap.docs[0].data().products || [];
        inferredProducts.push(...products);
        continue;
      }

      const matchingProducts = getMatchingProductsFromList(
        campaignName,
        existingCompanyProducts
      );

      if (matchingProducts.length > 0) {
        const campaignRef = campaignsRef.doc(
          getCampaignDocId(campaignNameNormalized)
        );

        await campaignRef.set(
          {
            companyId,
            campaignName,
            campaignNameNormalized,
            products: matchingProducts,
            source: "manual",
            reviewed: false,
            createdAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

        inferredProducts.push(...matchingProducts);
        continue;
      }

      missingCampaignNames.push(campaignName);
    }

    const inferredCampaigns = await inferProductsFromCampaignNames(
      missingCampaignNames,
      existingCompanyProducts,
      companyName
    );

    for (const campaignResult of inferredCampaigns) {
      const campaignName = campaignResult.campaignName;
      const products = campaignResult.products;
      const campaignNameNormalized = normalizeCampaignName(campaignName);
      const campaignRef = campaignsRef.doc(
        getCampaignDocId(campaignNameNormalized)
      );

      await campaignRef.set(
        {
          companyId,
          campaignName,
          campaignNameNormalized,
          products,
          source: "ai_generated",
          reviewed: false,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      inferredProducts.push(...products);
    }

    const mergedProducts = Array.from(
      new Set(
        [...(company.products || []), ...inferredProducts]
          .filter((product) => typeof product === "string")
          .map((product) => product.trim())
          .filter(Boolean)
      )
    );

    await Promise.all([
      companyRef.set(
        {
          name: companyName || company.name || "",
          products: mergedProducts,
          updatedAt: now,
        },
        { merge: true }
      ),
      onboardingRef.set(
        {
          status: "completed",
          updatedAt: now,
        },
        { merge: true }
      ),
    ]);

    return NextResponse.json({
      success: true,
      companyId,
      products: mergedProducts,
    });
  } catch (error: unknown) {
    console.error("Complete onboarding failed:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
