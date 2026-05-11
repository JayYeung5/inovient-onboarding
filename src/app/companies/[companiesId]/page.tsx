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

export default function CompanyPage() {
  const params = useParams();
  const companyId = params?.companiesId as string;

  const [responses, setResponses] = useState<any[]>([]);
  const [parsers, setParsers] = useState<any[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const role = userSnap.data()?.role;

        const companyRef = doc(db, "companies", companyId);
        const companySnap = await getDoc(companyRef);

        if (!companySnap.exists()) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const companyData = companySnap.data();

        if (role !== "admin" && companyData.createdBy !== currentUser.uid) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const responsesQuery = query(
          collection(db, "responses"),
          where("companyId", "==", companyId)
        );

        const responsesSnap = await getDocs(responsesQuery);

        let responsesData = responsesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        responsesData.sort((a: any, b: any) => {
          const getNum = (qid: string) => Number(qid.replace("q", ""));
          return getNum(a.questionId) - getNum(b.questionId);
        });

        setResponses(responsesData);

        const parsersQuery = query(
          collection(db, "parsers"),
          where("companyId", "==", companyId)
        );

        const parsersSnap = await getDocs(parsersQuery);

        const parsersData = parsersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setParsers(parsersData);
        setAccessDenied(false);
        setLoading(false);
      } catch (err) {
        console.error("Error loading company data:", err);
        setAccessDenied(true);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [companyId]);

  async function handleViewFile(answer: any) {
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex justify-center">
      <div className="w-full max-w-4xl mt-16 mb-16 space-y-8 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 mb-3">
            Company Profile
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 mb-8 tracking-tight">
            Company Answers
          </h1>

          {responses.length === 0 && (
            <div className="text-slate-500 text-sm">No responses found.</div>
          )}

          <div className="space-y-5">
            {responses.map((r) => {
              const questionText =
                QUESTIONS[r.questionId]?.question || r.questionId;

              return (
                <div
                  key={r.id}
                  className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 shadow-sm hover:shadow-md hover:border-slate-300 transition"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-sm text-slate-400 font-medium pt-[2px] min-w-[24px]">
                      {r.questionId.replace("q", "")}.
                    </span>

                    <span className="text-[17px] font-medium text-slate-900 leading-snug">
                      {questionText}
                    </span>
                  </div>

                  <div className="text-slate-700 text-[15px] leading-7">
                    {r.questionId === "q32" && Array.isArray(r.answer) && (
                      <div className="space-y-3">
                        {r.answer.map((field: any, index: number) => (
                          <div
                            key={index}
                            className="rounded-lg border border-slate-200 p-4 bg-slate-50"
                          >
                            <div className="mb-1">
                              <span className="text-slate-500">
                                Field Name:
                              </span>{" "}
                              <span className="text-slate-900 font-medium">
                                {field.fieldName || "(empty)"}
                              </span>
                            </div>

                            <div className="whitespace-pre-wrap">
                              <span className="text-slate-500">Values:</span>{" "}
                              <span className="text-slate-800">
                                {field.valuesText || "(empty)"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.questionId !== "q32" &&
                      Array.isArray(r.answer) &&
                      r.answer.every(
                        (item: any) =>
                          typeof item === "object" &&
                          item !== null &&
                          "goal" in item &&
                          "percentage" in item
                      ) && (
                        <div className="space-y-1">
                          {r.answer.map((item: any, index: number) => (
                            <div key={`${item.goal}-${index}`}>
                              <span className="text-slate-500">{item.goal}:</span>{" "}
                              <span className="text-slate-800">
                                {item.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                    {r.questionId !== "q32" &&
                      Array.isArray(r.answer) &&
                      !r.answer.every(
                        (item: any) =>
                          typeof item === "object" &&
                          item !== null &&
                          "goal" in item &&
                          "percentage" in item
                      ) &&
                      r.answer.join(", ")}

                    {!Array.isArray(r.answer) &&
                      typeof r.answer === "object" &&
                      r.answer?.type === "file" && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-slate-500">File:</span>{" "}
                            {r.answer.originalName}
                          </div>

                          <div>
                            <span className="text-slate-500">Type:</span>{" "}
                            {r.answer.mimeType}
                          </div>

                          <div>
                            <span className="text-slate-500">Size:</span>{" "}
                            {r.answer.size} bytes
                          </div>

                          <button
                            onClick={() => handleViewFile(r.answer)}
                            className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 font-medium hover:bg-blue-100 transition"
                          >
                            View file
                          </button>
                        </div>
                      )}

                    {!Array.isArray(r.answer) &&
                      typeof r.answer === "object" &&
                      r.answer?.type !== "file" && (
                        <div className="space-y-1">
                          {Object.entries(r.answer).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-slate-500">{key}:</span>{" "}
                              {String(value)}
                            </div>
                          ))}
                        </div>
                      )}

                    {typeof r.answer === "string" && r.answer}

                    {typeof r.answer === "number" && String(r.answer)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 mb-3">
            Output
          </p>
          <h2 className="text-3xl font-semibold text-slate-900 mb-8 tracking-tight">
            Campaign Parsers
          </h2>

          {parsers.length === 0 && (
            <div className="text-slate-500 text-sm">
              No campaign parsers generated.
            </div>
          )}

          <div className="space-y-6">
            {parsers.map((p) => (
              <div
                key={p.id}
                className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 shadow-sm"
              >
                <div className="text-lg font-semibold text-slate-900 mb-1">
                  {p.channel}
                </div>

                <div className="text-sm text-slate-600 mb-4">
                  {p.structure}
                </div>

                <pre className="bg-white border border-slate-200 text-slate-800 text-xs p-4 rounded-xl overflow-x-auto leading-6 whitespace-pre-wrap shadow-inner">
                  {p.luaScript}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}