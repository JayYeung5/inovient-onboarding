import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type CampaignMetadata = {
  id: string;
  companyId: string;
  campaignName: string;
  campaignNameNormalized: string;
  products: string[];
  source: "ai_generated" | "manual";
  reviewed: boolean;
};

export function normalizeCampaignName(name: string) {
  return name.trim().toLowerCase();
}

export function parseCampaignNames(text: string) {
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

export async function getExistingCampaign(
  companyId: string,
  campaignNameNormalized: string
) {
  const campaignsRef = collection(db, "companies", companyId, "campaigns");
  const campaignsQuery = query(
    campaignsRef,
    where("campaignNameNormalized", "==", campaignNameNormalized)
  );
  const snapshot = await getDocs(campaignsQuery);

  if (!snapshot.empty) {
    const campaignDoc = snapshot.docs[0];
    return {
      id: campaignDoc.id,
      ...campaignDoc.data(),
    } as CampaignMetadata;
  }

  const deterministicRef = doc(
    db,
    "companies",
    companyId,
    "campaigns",
    getCampaignDocId(campaignNameNormalized)
  );
  const deterministicSnap = await getDoc(deterministicRef);

  if (!deterministicSnap.exists()) return null;

  return {
    id: deterministicSnap.id,
    ...deterministicSnap.data(),
  } as CampaignMetadata;
}

export async function inferProductsFromCampaignName(
  campaignName: string,
  companyContext?: { companyId?: string; companyName?: string }
) {
  const campaigns = await inferProductsFromCampaignNames(
    [campaignName],
    companyContext
  );

  return campaigns[0]?.products || [];
}

export async function inferProductsFromCampaignNames(
  campaignNames: string[],
  companyContext?: { companyId?: string; companyName?: string }
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in to infer campaign products.");
  }

  const names = campaignNames
    .map((campaignName) => campaignName.trim())
    .filter(Boolean);

  if (names.length === 0) return [];

  const idToken = await user.getIdToken();
  const res = await fetch("/api/infer-campaign-products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      campaignNames: names,
      companyContext,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to infer campaign products.");
  }

  return Array.isArray(data.campaigns)
    ? data.campaigns
        .filter(
          (item: unknown) =>
            item &&
            typeof item === "object" &&
            "campaignName" in item &&
            typeof item.campaignName === "string"
        )
        .map((item: { campaignName: string; products?: unknown }) => ({
          campaignName: item.campaignName,
          products: Array.isArray(item.products)
            ? item.products.filter(
                (product: unknown) => typeof product === "string"
              )
            : [],
        }))
    : [];
}

export async function saveCampaignMetadata(
  companyId: string,
  campaignName: string,
  products: string[],
  source: "ai_generated" | "manual" = "ai_generated"
) {
  const campaignNameNormalized = normalizeCampaignName(campaignName);
  const campaignRef = doc(
    db,
    "companies",
    companyId,
    "campaigns",
    getCampaignDocId(campaignNameNormalized)
  );

  await setDoc(
    campaignRef,
    {
      companyId,
      campaignName,
      campaignNameNormalized,
      products,
      source,
      reviewed: false,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    id: campaignRef.id,
    companyId,
    campaignName,
    campaignNameNormalized,
    products,
    source,
    reviewed: false,
  } satisfies CampaignMetadata;
}

export async function updateCompanyProducts(
  companyId: string,
  products: string[],
  companyName?: string
) {
  const companyRef = doc(db, "companies", companyId);
  const companySnap = await getDoc(companyRef);
  const existingProducts = companySnap.exists()
    ? companySnap.data().products || []
    : [];

  const mergedProducts = Array.from(
    new Set(
      [...existingProducts, ...products]
        .filter((product) => typeof product === "string")
        .map((product) => product.trim())
        .filter(Boolean)
    )
  );

  await setDoc(
    companyRef,
    {
      ...(companyName ? { name: companyName } : {}),
      products: mergedProducts,
      updatedAt: serverTimestamp(),
      ...(companySnap.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );

  return mergedProducts;
}
