"use client";

import { useState, useEffect } from "react";
import { INITIAL_WAVE, QUESTIONS } from "@/lib/onboardingQuestions";
import { getNextWave } from "@/lib/nextWave";
import { useRouter, useParams } from "next/navigation";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function OnboardingPage() {

  const router = useRouter();
  const params = useParams();
  const onboardingId = params.onboardingId as string;

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [currentWave, setCurrentWave] = useState(INITIAL_WAVE);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {

    async function loadOnboarding() {
      const ref = doc(db, "onboardings", onboardingId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setCompanyId(snap.data().companyId);
      }
    }

    loadOnboarding();

  }, [onboardingId]);

  function updateAnswer(id: string, value: any) {
    setAnswers((prev) => ({
      ...prev,
      [id]: value
    }));
  }

  async function saveAnswers() {

    if (!companyId) return;

    const entries = Object.entries(answers);

    for (const [questionId, answer] of entries) {
      await addDoc(collection(db, "responses"), {
        companyId,
        onboardingId,
        questionId,
        answer
      });
    }
  }

async function generateParsers() {
  const rawMetadataFields = answers.q32 || [];

  if (rawMetadataFields.length === 0) return;

  const res = await fetch("/api/generate-parser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rawMetadataFields
    })
  });

  const data = await res.json();
  const parsers = data.parsers;

  for (const channel in parsers) {
    const parser = parsers[channel];

    await fetch("/api/store-parser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        companyId,
        channel,
        structure: parser.structure,
        luaScript: parser.lua
      })
    });
  }
}

  async function submitWave() {

    const next = getNextWave(answers);
    const unanswered = next.filter((qid) => answers[qid] === undefined);

    if (unanswered.length === 0) {

      await saveAnswers();
      await generateParsers();

      await fetch("/api/send-onboarding-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          companyId,
          answers
        })
      });

      alert("Onboarding complete!");
      router.push("/companies");
      return;

    }

    setCurrentWave(unanswered);

  }

  return (

    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex justify-center px-4 py-24">
      <div className="w-full max-w-3xl">
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Onboarding Wizard
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 tracking-tight">
            Company Onboarding
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Fill out each section to personalize campaign parsing and reporting.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 md:p-10 space-y-8">
          {currentWave.map((qid) => {

            const q = QUESTIONS[qid];

            return (

              <div key={qid} className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-5">
                <div className="text-slate-900 font-medium leading-relaxed">
                  {q.question}
                </div>


                {q.type === "text" && (
                  <input
                    className="w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                    onChange={(e) => updateAnswer(qid, e.target.value)}
                  />
                )}


                {q.type === "number" && (
                  <input
                    type="number"
                    className="w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                    onChange={(e) => updateAnswer(qid, Number(e.target.value))}
                  />
                )}
                {q.type === "file" && (
                <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3 w-full border border-slate-300 rounded-lg bg-white p-3.5 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="rounded-md bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 text-sm font-medium whitespace-nowrap">
                        Choose file
                        </span>

                        <span className="text-sm text-slate-500 truncate">
                        {answers[qid]?.originalName || "No file selected"}
                        </span>
                    </div>

                    <input
                        type="file"
                        className="hidden"
                        onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !companyId) return;

                        try {
                            const { uploadFileClient } = await import("@/lib/uploadFileClient");

                            const fileMeta = await uploadFileClient({
                            file,
                            companyId,
                            onboardingId,
                            fieldKey: qid,
                            });

                            updateAnswer(qid, fileMeta);
                        } catch (err) {
                            console.error(err);
                            alert(err instanceof Error ? err.message : "File upload failed");
                        }
                        }}
                    />
                    </label>

                    {answers[qid]?.type === "file" && (
                    <div className="text-sm text-emerald-700 font-medium">
                        Uploaded: {answers[qid].originalName}
                    </div>
                    )}
                </div>
                )}
                {q.type === "competitors" && (
                <div className="space-y-3">
                    {[0, 1, 2].map((index) => (
                    <input
                        key={index}
                        className="w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                        placeholder={`Competitor ${index + 1}`}
                        value={answers[qid]?.[index]?.name || ""}
                        onChange={(e) => {
                        setAnswers((prev: any) => {
                            const current = [...(prev[qid] || [])];

                            current[index] = {
                            ...current[index],
                            name: e.target.value
                            };

                            return {
                            ...prev,
                            [qid]: current
                            };
                        });
                        }}
                    />
                    ))}
                </div>
                )}
                {q.type === "marketing_goals" && (
                <div className="space-y-3">
                    {["Awareness", "Revenue", "Trials", "Leads"].map((goal) => {
                    const currentGoal = answers[qid]?.find((item: any) => item.goal === goal);

                    return (
                        <div key={goal} className="flex items-center gap-3">
                        <div className="w-32 text-sm font-medium text-slate-700">
                            {goal}
                        </div>

                        <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                            placeholder="0"
                            value={currentGoal?.percentage || ""}
                            onChange={(e) => {
                            setAnswers((prev: any) => {
                                const current = [...(prev[qid] || [])];
                                const existingIndex = current.findIndex(
                                (item: any) => item.goal === goal
                                );

                                const updatedGoal = {
                                goal,
                                percentage: Number(e.target.value)
                                };

                                if (existingIndex >= 0) {
                                current[existingIndex] = updatedGoal;
                                } else {
                                current.push(updatedGoal);
                                }

                                return {
                                ...prev,
                                [qid]: current
                                };
                            });
                            }}
                        />

                        <span className="text-sm text-slate-500">%</span>
                        </div>
                    );
                    })}
                </div>
                )}
                {q.type === "metadata_fields" && (
                    <div className="space-y-4">
                        {((answers[qid] as any[]) || []).map((field, index) => (
                        <div
                            key={index}
                            className="border border-slate-200 rounded-xl bg-white p-4 space-y-3 shadow-sm"
                        >
                            <input
                            className="w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                            placeholder="Field name (e.g. Product, Country, Audience)"
                            value={field.fieldName || ""}
                            onChange={(e) => {
                                setAnswers((prev: any) => {
                                const current = [...(prev[qid] || [])];
                                current[index] = {
                                    ...current[index],
                                    fieldName: e.target.value
                                };
                                return {
                                    ...prev,
                                    [qid]: current
                                };
                                });
                            }}
                            />

                            <textarea
                            className="w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 min-h-[120px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                            placeholder="Enter one value per line, e.g.&#10;AutoCAD&#10;Revit&#10;Fusion 360"
                            value={field.valuesText || ""}
                            onChange={(e) => {
                                setAnswers((prev: any) => {
                                const current = [...(prev[qid] || [])];
                                current[index] = {
                                    ...current[index],
                                    valuesText: e.target.value
                                };
                                return {
                                    ...prev,
                                    [qid]: current
                                };
                                });
                            }}
                            />

                            <button
                            type="button"
                            className="text-rose-600 text-sm font-medium hover:text-rose-700 transition"
                            onClick={() => {
                                setAnswers((prev: any) => {
                                const current = [...(prev[qid] || [])];
                                current.splice(index, 1);
                                return {
                                    ...prev,
                                    [qid]: current
                                };
                                });
                            }}
                            >
                            Remove field
                            </button>
                        </div>
                        ))}

                        <button
                        type="button"
                        className="rounded-lg bg-slate-200 px-4 py-2 text-slate-800 font-medium hover:bg-slate-300 transition"
                        onClick={() => {
                            setAnswers((prev: any) => ({
                            ...prev,
                            [qid]: [
                                ...(prev[qid] || []),
                                { fieldName: "", valuesText: "" }
                            ]
                            }));
                        }}
                        >
                        Add metadata field
                        </button>
                    </div>
                    )}
                
                {q.type === "select" && (
                  <select
                    className="w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                    onChange={(e) => updateAnswer(qid, e.target.value)}
                  >
                    <option value="">Select</option>
                    {q.options?.map((o: string) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                )}


                {q.type === "channel_examples" && (

                  <div className="space-y-6">

                    {(answers.q18 || []).map((channel: string) => (

                      <div key={channel} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">

                        <div className="text-sm text-slate-600 font-medium">
                          {channel} campaign example
                        </div>

                        <input
                          className="w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                          placeholder="Paste campaign naming example"
                          onChange={(e) => {

                            setAnswers((prev: any) => ({
                              ...prev,
                              q31: {
                                ...prev.q31,
                                [channel]: e.target.value
                              }
                            }));

                          }}
                        />

                      </div>

                    ))}

                  </div>

                )}


                {}
                {q.type === "multiselect" && (

                  <div className="flex flex-col gap-2">

                    {q.options?.map((o: string) => (

                      <label
                        key={o}
                        className="flex items-center gap-2.5 text-sm text-slate-700 rounded-md px-2 py-1.5 hover:bg-slate-100/70 transition"
                      >

                        <input
                          type="checkbox"
                          onChange={(e) => {

                            setAnswers((prev: any) => {

                              const current = prev[qid] || [];

                              if (e.target.checked) {
                                return {
                                  ...prev,
                                  [qid]: [...current, o]
                                };
                              }

                              return {
                                ...prev,
                                [qid]: current.filter((x: string) => x !== o)
                              };

                            });

                          }}
                        />

                        {o}

                      </label>

                    ))}

                  </div>

                )}

              </div>

            );

          })}


          {}
          <button
            onClick={submitWave}
            disabled={!companyId}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>

        </div>

      </div>

    </main>

  );

}