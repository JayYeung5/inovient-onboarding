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

    <main className="min-h-screen bg-slate-50 flex justify-center">

      <div className="w-full max-w-xl mt-16">

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 space-y-8">

          <h1 className="text-2xl text-slate-800">
            Company Onboarding
          </h1>

          {currentWave.map((qid) => {

            const q = QUESTIONS[qid];

            return (

              <div key={qid} className="space-y-3">

                <div className="text-slate-800">
                  {q.question}
                </div>


                {q.type === "text" && (
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    onChange={(e) => updateAnswer(qid, e.target.value)}
                  />
                )}


                {q.type === "number" && (
                  <input
                    type="number"
                    className="w-full border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    onChange={(e) => updateAnswer(qid, Number(e.target.value))}
                  />
                )}


                {q.type === "file" && (
                <div className="space-y-2">
                    <input
                    type="file"
                    className="w-full border border-slate-300 rounded-md p-2"
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

                    {answers[qid]?.type === "file" && (
                    <div className="text-sm text-green-700">
                        Uploaded: {answers[qid].originalName}
                    </div>
                    )}
                </div>
                )}
                {q.type === "metadata_fields" && (
                    <div className="space-y-4">
                        {((answers[qid] as any[]) || []).map((field, index) => (
                        <div
                            key={index}
                            className="border border-slate-200 rounded-lg p-4 space-y-3"
                        >
                            <input
                            className="w-full border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                            className="w-full border border-slate-300 rounded-md p-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                            className="text-red-600 text-sm underline"
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
                        className="rounded-md bg-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-300"
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
                    className="w-full border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
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

                      <div key={channel} className="space-y-2">

                        <div className="text-sm text-slate-600">
                          {channel} campaign example
                        </div>

                        <input
                          className="w-full border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                        className="flex items-center gap-2 text-sm text-slate-700"
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
            className="
            w-full
            bg-slate-900
            hover:bg-slate-800
            text-white
            rounded-lg
            py-2.5
            transition
            disabled:opacity-50
            disabled:cursor-not-allowed
            "
          >
            Submit
          </button>

        </div>

      </div>

    </main>

  );

}