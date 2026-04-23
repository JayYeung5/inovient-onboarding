"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import { QUESTIONS } from "@/lib/onboardingQuestions";
import { getSignedFileUrl } from "@/lib/getSignedFileUrl";

export default function CompanyPage() {

  const params = useParams();
  const companyId = params?.companiesId as string;

  const [responses, setResponses] = useState<any[]>([]);
  const [parsers, setParsers] = useState<any[]>([]);

  useEffect(() => {

    if (!companyId) return;

    async function loadData() {

      try {

        const responsesQuery = query(
          collection(db, "responses"),
          where("companyId", "==", companyId)
        );

        const responsesSnap = await getDocs(responsesQuery);

        let responsesData = responsesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data()
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
          ...d.data()
        }));

        setParsers(parsersData);

      } catch (err) {
        console.error("Error loading company data:", err);
      }

    }

    loadData();

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

  return (
    <main className="min-h-screen bg-slate-50 flex justify-center">

      <div className="w-full max-w-3xl mt-16 space-y-8">

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">

          <h1 className="text-2xl text-slate-800 mb-6">
            Company Answers
          </h1>

          {responses.length === 0 && (
            <div className="text-slate-500 text-sm">
              No responses found.
            </div>
          )}

          <div className="space-y-4">

            {responses.map((r) => {

              const questionText =
                QUESTIONS[r.questionId]?.question || r.questionId;

              return (

                <div
                  key={r.id}
                  className="border border-slate-200 rounded-lg p-4"
                >

                  {/* QUESTION HEADER */}
                  <div className="flex items-center gap-3 text-slate-800 mb-2">

                    <span>
                      {r.questionId}
                    </span>

                    <span>
                      {questionText}
                    </span>

                  </div>

                  <div className="text-slate-600 text-sm">
                    {r.questionId === "q32" && Array.isArray(r.answer) && (
                      <div className="space-y-3">
                        {r.answer.map((field: any, index: number) => (
                          <div
                            key={index}
                            className="rounded-md border border-slate-200 p-3 bg-slate-50"
                          >
                            <div className="mb-1">
                              <span className="text-slate-500">Field Name:</span>{" "}
                              <span className="text-slate-800">
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
                            className="text-blue-600 underline"
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


        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">

          <h2 className="text-2xl text-slate-800 mb-6">
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
                className="border border-slate-200 rounded-lg p-5"
              >

                <div className="text-lg text-slate-800 mb-1">
                  {p.channel}
                </div>

                <div className="text-sm text-slate-500 mb-4">
                  {p.structure}
                </div>

                <pre className="bg-slate-100 text-xs p-4 rounded overflow-x-auto">
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