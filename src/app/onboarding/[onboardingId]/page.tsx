"use client";

import { useState, useEffect } from "react";
import { INITIAL_WAVE, QUESTIONS } from "@/lib/onboardingQuestions";
import { getNextWave } from "@/lib/nextWave";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

type FileAnswer = {
  type: "file";
  originalName: string;
};

type CompetitorAnswer = {
  name?: string;
};

type MarketingGoalAnswer = {
  goal: string;
  percentage: number;
};

type Answer =
  | string
  | number
  | string[]
  | FileAnswer
  | CompetitorAnswer[]
  | MarketingGoalAnswer[];

export default function OnboardingPage() {

  const router = useRouter();
  const params = useParams();
  const onboardingId = params.onboardingId as string;

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [currentWave, setCurrentWave] = useState(INITIAL_WAVE);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "onboardings", onboardingId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const loadedCompanyId = String(snap.data().companyId || "");
        const companyRef = doc(db, "companies", loadedCompanyId);
        const companySnap = await getDoc(companyRef);

        if (!companySnap.exists()) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const role = userSnap.data()?.role;
        const companyData = companySnap.data();

        if (role !== "admin" && companyData.createdBy !== currentUser.uid) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        setCompanyId(loadedCompanyId);
        setAccessDenied(false);
        setLoading(false);
      } catch (err) {
        console.error("Error loading onboarding:", err);
        setAccessDenied(true);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [onboardingId]);

  function updateAnswer(id: string, value: Answer) {
    setAnswers((prev) => ({
      ...prev,
      [id]: value
    }));
  }

  async function submitWave() {
    if (submitting) return;

    const next = getNextWave(answers);
    const unanswered = next.filter((qid) => answers[qid] === undefined);

    if (unanswered.length === 0) {
      try {
        setSubmitting(true);
        setError("");
        const user = auth.currentUser;

        if (!user) {
          throw new Error("You must be logged in to submit onboarding.");
        }

        const idToken = await user.getIdToken();
        const submitRes = await fetch("/api/complete-onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            onboardingId,
            answers,
          }),
        });
        const submitData = await submitRes.json();

        if (!submitRes.ok) {
          throw new Error(submitData.error || "Onboarding submission failed.");
        }

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
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Onboarding submission failed. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
      return;

    }

    setCurrentWave(unanswered);

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
          You do not have access to this onboarding.
        </div>
      </main>
    );
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
            Fill out each section to personalize company setup and reporting.
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
                        {(answers[qid] as FileAnswer | undefined)?.originalName || "No file selected"}
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

                    {(answers[qid] as FileAnswer | undefined)?.type === "file" && (
                    <div className="text-sm text-emerald-700 font-medium">
                        Uploaded: {(answers[qid] as FileAnswer).originalName}
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
                        value={(answers[qid] as CompetitorAnswer[] | undefined)?.[index]?.name || ""}
                        onChange={(e) => {
                        setAnswers((prev) => {
                            const current = [...((prev[qid] as CompetitorAnswer[] | undefined) || [])];

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
                    const currentGoal = (answers[qid] as MarketingGoalAnswer[] | undefined)?.find(
                      (item) => item.goal === goal
                    );

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
                            setAnswers((prev) => {
                                const current = [...((prev[qid] as MarketingGoalAnswer[] | undefined) || [])];
                                const existingIndex = current.findIndex(
                                (item) => item.goal === goal
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
                {q.type === "campaign_names" && (
                  <textarea
                    className="w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 min-h-[180px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                    placeholder={"Summer Glow SPF Push\nHydration Bundle Launch"}
                    value={String(answers[qid] || "")}
                    onChange={(e) => updateAnswer(qid, e.target.value)}
                  />
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

                            setAnswers((prev) => {

                              const current = (prev[qid] as string[] | undefined) || [];

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
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            onClick={submitWave}
            disabled={!companyId || submitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Processing..." : "Submit"}
          </button>

        </div>

      </div>

    </main>

  );

}
