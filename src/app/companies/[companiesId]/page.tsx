"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function CompanyPage() {

  const params = useParams()
  const companyId = params?.companiesId as string

  const [responses, setResponses] = useState<any[]>([])
  const [parsers, setParsers] = useState<any[]>([])

  useEffect(() => {

    if (!companyId) return

    async function loadData() {

      console.log("Loading company data for:", companyId)

      try {

        // RESPONSES
        const responsesQuery = query(
          collection(db, "responses"),
          where("companyId", "==", companyId)
        )

        const responsesSnap = await getDocs(responsesQuery)

        const responsesData = responsesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))

        console.log("Responses:", responsesData)

        setResponses(responsesData)


        // PARSERS
        const parsersQuery = query(
          collection(db, "parsers"),
          where("companyId", "==", companyId)
        )

        const parsersSnap = await getDocs(parsersQuery)

        const parsersData = parsersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))

        console.log("Parsers:", parsersData)

        setParsers(parsersData)

      } catch (err) {
        console.error("Error loading company data:", err)
      }

    }

    loadData()

  }, [companyId])


  return (
    <div className="p-10 max-w-3xl mx-auto">

      {/* RESPONSES */}
      <h1 className="text-2xl font-bold mb-6">
        Company Answers
      </h1>

      <div className="space-y-4 mb-10">

        {responses.length === 0 && (
          <div className="text-gray-500">
            No responses found.
          </div>
        )}

        {responses.map((r) => (

          <div key={r.id} className="border p-3 rounded">

            <div className="font-semibold">
              {r.questionId}
            </div>

            <div className="text-gray-700">
              {JSON.stringify(r.answer)}
            </div>

          </div>

        ))}

      </div>


      {/* PARSERS */}
      <h2 className="text-2xl font-bold mb-6">
        Campaign Parsers
      </h2>

      <div className="space-y-6">

        {parsers.length === 0 && (
          <div className="text-gray-500">
            No campaign parsers generated.
          </div>
        )}

        {parsers.map((p) => (

          <div key={p.id} className="border p-4 rounded">

            <div className="font-bold mb-2 text-lg">
              {p.channel}
            </div>

            <div className="text-sm text-gray-500 mb-3">
              {p.structure}
            </div>

            <pre className="bg-gray-100 p-3 text-xs overflow-x-auto rounded">
              {p.luaScript}
            </pre>

          </div>

        ))}

      </div>

    </div>
  )
}