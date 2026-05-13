"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useParams } from "next/navigation";
import { QUESTIONS } from "@/lib/onboardingQuestions";
import { getSignedFileUrl } from "@/lib/getSignedFileUrl";
import { onAuthStateChanged } from "firebase/auth";

type FileAnswer = {
  type: "file";
  originalName: string;
  mimeType: string;
  size: number;
  bucket: string;
  path: string;
};

type ResponseAnswer =
  | string
  | number
  | string[]
  | FileAnswer
  | Record<string, unknown>
  | Array<{ goal: string; percentage: number }>;

type OnboardingResponse = {
  id: string;
  questionId: string;
  answer: ResponseAnswer;
};

type CompanyProfile = {
  id: string;
  name?: string;
  createdBy?: string;
  members?: string[];
  products?: string[];
};

type CampaignProfile = {
  id: string;
  campaignName?: string;
  products?: string[];
  source?: string;
  reviewed?: boolean;
};

type UserProfile = {
  role?: string;
  companyIds?: string[];
};

function isGoalAnswer(
  answer: ResponseAnswer
): answer is Array<{ goal: string; percentage: number }> {
  return (
    Array.isArray(answer) &&
    answer.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "goal" in item &&
        "percentage" in item
    )
  );
}

function isFileAnswer(answer: ResponseAnswer): answer is FileAnswer {
  return (
    typeof answer === "object" &&
    answer !== null &&
    !Array.isArray(answer) &&
    "type" in answer &&
    answer.type === "file"
  );
}

function canViewCompany(
  userId: string,
  userProfile: UserProfile | undefined,
  companyData: CompanyProfile
) {
  const role = String(userProfile?.role || "").toLowerCase();

  return (
    role === "admin" ||
    companyData.createdBy === userId ||
    companyData.members?.includes(userId) ||
    userProfile?.companyIds?.includes(companyData.id) ||
    false
  );
}

function formatAnswerValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not answered";
  return String(value);
}

export default function CompanyPage() {
  const params = useParams();
  const companyId = params?.companiesId as string;

  const [responses, setResponses] = useState<OnboardingResponse[]>([]);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignProfile[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!companyId) return;

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      try {
        setLoadError("");
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userProfile = userSnap.data() as UserProfile | undefined;

        const companyRef = doc(db, "companies", companyId);
        const companySnap = await getDoc(companyRef);

        if (!companySnap.exists()) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const companyData = {
          id: companySnap.id,
          ...companySnap.data(),
        } as CompanyProfile;

        if (!canViewCompany(currentUser.uid, userProfile, companyData)) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const responsesQuery = query(
          collection(db, "responses"),
          where("companyId", "==", companyId)
        );

        const responsesSnap = await getDocs(responsesQuery);

        const responsesData = responsesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as OnboardingResponse[];

        responsesData.sort((a, b) => {
          const getNum = (qid: string) => Number(qid.replace("q", ""));
          return getNum(a.questionId) - getNum(b.questionId);
        });

        setResponses(responsesData);
        setCompany(companyData);

        try {
          const campaignsSnap = await getDocs(
            collection(db, "companies", companyId, "campaigns")
          );

          const campaignsData = campaignsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as CampaignProfile[];

          campaignsData.sort((a, b) =>
            String(a.campaignName || "").localeCompare(String(b.campaignName || ""))
          );

          setCampaigns(campaignsData);
        } catch (err) {
          console.error("Error loading campaign products:", err);
          setCampaigns([]);
          setLoadError("Company loaded, but campaign products could not be loaded.");
        }

        setAccessDenied(false);
        setLoading(false);
      } catch (err) {
        console.error("Error loading company data:", err);
        setLoadError("Could not load this company profile.");
        setAccessDenied(false);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [companyId]);

  async function handleViewFile(answer: FileAnswer) {
    try {
      const signedUrl = await getSignedFileUrl(answer.bucket, answer.path);
      window.open(signedUrl, "_blank");
    } catch (err) {
      console.error("Error opening file:", err);
      alert(err instanceof Error ? err.message : "Could not open file");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex justify-center items-center">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          Loading...
        </div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex justify-center items-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-slate-700">
          You do not have access to this company.
        </div>
      </main>
    );
  }

  const companyProducts = company?.products ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex justify-center">
      <div className="w-full max-w-4xl mt-16 mb-16 space-y-8 px-4">
        {loadError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {loadError}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 mb-3">
            Company Profile
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            {company?.name || "Company Answers"}
          </h1>
          <p className="mt-2 mb-8 text-sm text-slate-600">
            Onboarding responses and inferred product metadata.
          </p>

          {responses.length === 0 && (
            <div className="text-slate-500 text-sm">No responses found.</div>
          )}

          <div className="grid gap-4">
            {responses.map((r) => {
              const questionText =
                QUESTIONS[r.questionId]?.question || r.questionId;
              const goalAnswer = isGoalAnswer(r.answer) ? r.answer : null;
              const fileAnswer = isFileAnswer(r.answer) ? r.answer : null;

              return (
                <div
                  key={r.id}
                  className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="text-[15px] font-semibold text-slate-900 leading-snug">
                    {questionText}
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 text-[15px] leading-7">
                    {goalAnswer && (
                        <div className="space-y-1">
                          {goalAnswer.map((item, index) => (
                            <div key={`${item.goal}-${index}`}>
                              <span className="text-slate-500">{item.goal}:</span>{" "}
                              <span className="text-slate-800">
                                {item.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                    {Array.isArray(r.answer) &&
                      !isGoalAnswer(r.answer) &&
                      (r.answer.length > 0 ? r.answer.join(", ") : "Not answered")}

                    {fileAnswer && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-slate-500">File:</span>{" "}
                            {fileAnswer.originalName}
                          </div>

                          <div>
                            <span className="text-slate-500">Type:</span>{" "}
                            {fileAnswer.mimeType}
                          </div>

                          <div>
                            <span className="text-slate-500">Size:</span>{" "}
                            {fileAnswer.size} bytes
                          </div>

                          <button
                            onClick={() => handleViewFile(fileAnswer)}
                            className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 font-medium hover:bg-blue-100 transition"
                          >
                            View file
                          </button>
                        </div>
                      )}

                    {!Array.isArray(r.answer) &&
                      typeof r.answer === "object" &&
                      r.answer !== null &&
                      !fileAnswer && (
                        <div className="space-y-1">
                          {Object.entries(r.answer).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-slate-500">{key}:</span>{" "}
                              {formatAnswerValue(value)}
                            </div>
                          ))}
                        </div>
                      )}

                    {typeof r.answer === "string" && formatAnswerValue(r.answer)}

                    {typeof r.answer === "number" && formatAnswerValue(r.answer)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 mb-3">
            Product Metadata
          </p>
          <h2 className="text-3xl font-semibold text-slate-900 mb-8 tracking-tight">
            Campaign Products
          </h2>

          {companyProducts.length > 0 && (
            <div className="mb-8">
              <div className="text-sm font-medium text-slate-700 mb-3">
                Company products
              </div>
              <div className="flex flex-wrap gap-2">
                {companyProducts.map((product) => (
                  <span
                    key={product}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                  >
                    {product}
                  </span>
                ))}
              </div>
            </div>
          )}

          {campaigns.length === 0 && (
            <div className="text-slate-500 text-sm">
              No campaign products stored.
            </div>
          )}

          <div className="space-y-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 shadow-sm"
              >
                <div className="text-lg font-semibold text-slate-900 mb-1">
                  {campaign.campaignName}
                </div>

                <div className="text-sm text-slate-600 mb-4">
                  {campaign.products?.length
                    ? campaign.products.join(", ")
                    : "No products inferred"}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                    {campaign.source}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                    {campaign.reviewed ? "reviewed" : "unreviewed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
