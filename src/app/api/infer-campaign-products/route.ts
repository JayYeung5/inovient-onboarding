import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to infer campaign products";
}

function normalizeProducts(products: unknown) {
  return Array.isArray(products)
    ? products
        .filter((product: unknown) => typeof product === "string")
        .map((product: string) => product.trim())
        .filter(Boolean)
    : [];
}

function normalizeCampaignName(name: string) {
  return name.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(idToken);

    const { campaignNames, companyContext } = await req.json();
    const names = Array.isArray(campaignNames)
      ? campaignNames
          .filter((campaignName: unknown) => typeof campaignName === "string")
          .map((campaignName: string) => campaignName.trim())
          .filter(Boolean)
      : [];

    if (names.length === 0) {
      return NextResponse.json(
        { error: "campaignNames are required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
    });

    const prompt = `
You are extracting product metadata from marketing campaign names. Given campaign names, return only the likely product or products being promoted for each campaign. Do not include regions, countries, dates, audience names, or campaign format terms unless they are clearly products. Return JSON only in this shape: { "campaigns": [{ "campaignName": "original campaign name", "products": ["product 1", "product 2"] }] }.

Company context:
${companyContext?.companyName ? `Company name: ${companyContext.companyName}` : "None provided"}

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
${JSON.stringify(names, null, 2)}
`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const parsed = JSON.parse(extractJson(rawText));
    const parsedCampaigns = Array.isArray(parsed.campaigns)
      ? parsed.campaigns
      : [];
    const resultsByNormalizedName = new Map<
      string,
      { campaignName: string; products: string[] }
    >();

    parsedCampaigns.forEach((item: unknown) => {
      if (!item || typeof item !== "object") return;

      const campaign = item as {
        campaignName?: unknown;
        products?: unknown;
      };

      if (typeof campaign.campaignName !== "string") return;

      resultsByNormalizedName.set(normalizeCampaignName(campaign.campaignName), {
        campaignName: campaign.campaignName,
        products: normalizeProducts(campaign.products),
      });
    });

    const campaigns = names.map((campaignName) => ({
      campaignName,
      products:
        resultsByNormalizedName.get(normalizeCampaignName(campaignName))
          ?.products || [],
    }));

    return NextResponse.json({ campaigns });
  } catch (error: unknown) {
    console.error("Campaign product inference failed:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
