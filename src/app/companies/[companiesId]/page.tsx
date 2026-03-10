"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function CompanyPage() {

  const params = useParams()
  const companyId = params?.companiesId as string
  console.log("Company ID:", companyId)

  const [responses, setResponses] = useState<any[]>([])

  useEffect(() => {

    if (!companyId) return

    async function loadResponses() {

      const q = query(
        collection(db, "responses"),
        where("companyId", "==", companyId)
      )
      const snap = await getDocs(q)
      console.log("Responses:", snap.docs.map(d => d.data()))

      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))

      setResponses(data)
    }

    loadResponses()

  }, [companyId])

  return (
    <div className="p-10 max-w-xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">
        Company Answers
      </h1>

      <div className="space-y-4">

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

    </div>
  )
}