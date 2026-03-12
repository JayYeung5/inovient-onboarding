"use client";

import { useState } from "react";
import { INITIAL_WAVE, QUESTIONS } from "@/lib/onboardingQuestions";
import { getNextWave } from "@/lib/nextWave";
import { useRouter } from "next/navigation"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useSearchParams } from "next/navigation"
import { useParams } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { useEffect } from "react"


export default function OnboardingPage(){
    
  const router = useRouter()
  const searchParams = useSearchParams()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const params = useParams()
  const onboardingId = params.onboardingId as string
    useEffect(() => {

    async function loadOnboarding() {

        const ref = doc(db, "onboardings", onboardingId)

        const snap = await getDoc(ref)

        if (snap.exists()) {
        setCompanyId(snap.data().companyId)
        }

    }

    loadOnboarding()

    }, [onboardingId])
  const [currentWave, setCurrentWave] = useState(INITIAL_WAVE);
  const [answers, setAnswers] = useState<Record<string, any>>({})
  

  function updateAnswer(id: string, value: any) {
    setAnswers((prev) => ({
      ...prev,
      [id]: value
    }));
  }

    async function saveAnswers() {
    if (!companyId) {
        console.error("Company ID not loaded yet")
        return
    }
    const entries = Object.entries(answers)

    for (const [questionId, answer] of entries) {

        await addDoc(collection(db, "responses"), {
        companyId,
        onboardingId,
        questionId,
        answer
        })

    }

}
async function generateParsers() {

  const examples = answers.q31
  if (!examples) return

  const res = await fetch("/api/generate-parser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      examples
    })
  })

  const data = await res.json()

  console.log("PARSER GENERATED:", data)

  const parsers = data.parsers

  for (const channel in parsers) {

    const parser = parsers[channel]

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
    })

  }

}

async function submitWave() {

        // determine next possible questions
        const next = getNextWave(answers)

        // remove questions already answered
        const unanswered = next.filter((qid) => answers[qid] === undefined)

        // onboarding finished
        if (unanswered.length === 0) {

            await saveAnswers()

            await generateParsers()

            console.log("ONBOARDING COMPLETE")

            alert("Onboarding complete!")

            router.push("/companies")

            return
        }

        // move to next wave
        setCurrentWave(unanswered)

        }

  return (

    <div className="max-w-xl mx-auto p-8 space-y-6">

      {currentWave.map((qid) => {

        const q = QUESTIONS[qid];

        return (
          <div key={qid}>

            <p className="font-semibold">{q.question}</p>

            {q.type === "text" && (
            <input
                className="border p-2 w-full"
                onChange={(e) => updateAnswer(qid, e.target.value)}
            />
            )}

            {q.type === "number" && (
            <input
                type="number"
                className="border p-2 w-full"
                onChange={(e) => updateAnswer(qid, Number(e.target.value))}
            />
            )}

            {q.type === "file" && (
            <input
                type="file"
                className="border p-2 w-full"
                onChange={(e) => updateAnswer(qid, e.target.files?.[0])}
            />
            )}

            {q.type === "select" && (
            <select
                className="border p-2 w-full"
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

                    <div className="font-semibold">
                    {channel} campaign example
                    </div>

                    <input
                    className="border p-2 w-full"
                    placeholder="Paste campaign naming example"
                    onChange={(e) => {

                        setAnswers((prev:any) => ({
                        ...prev,
                        q31: {
                            ...prev.q31,
                            [channel]: e.target.value
                        }
                        }))

                    }}
                    />

                </div>

                ))}

            </div>

            )}

            {q.type === "multiselect" && (
            <div className="flex flex-col gap-2">

                {q.options?.map((o: string) => (

                <label key={o} className="flex gap-2 items-center">

                    <input
                    type="checkbox"
                    onChange={(e) => {

                        setAnswers((prev: any) => {

                        const current = prev[qid] || []

                        if (e.target.checked) {
                            return {
                            ...prev,
                            [qid]: [...current, o]
                            }
                        }

                        return {
                            ...prev,
                            [qid]: current.filter((x: string) => x !== o)
                        }

                        })

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

    <button
    onClick={submitWave}
    disabled={!companyId}
    className="bg-blue-600 text-white p-2 rounded disabled:opacity-50"
    >
    Submit
    </button>

    </div>

  );
}