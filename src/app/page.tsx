"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

export default function HomePage() {

  const router = useRouter();
  const auth = getAuth();

  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  async function createCompanyAndStartOnboarding() {

    if (!companyName) return;

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in");
      return;
    }

    try {
      setLoading(true);

      // Create company
      const companyRef = await addDoc(collection(db, "companies"), {
        name: companyName,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: Date.now()
      });

      const companyId = companyRef.id;

      // Update user document
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        companyIds: arrayUnion(companyId)
      });

      // Create onboarding session
      const onboardingRef = await addDoc(collection(db, "onboardings"), {
        companyId,
        createdBy: user.uid,
        status: "started",
        createdAt: Date.now()
      });

      const onboardingId = onboardingRef.id;

      router.push(`/onboarding/${onboardingId}`);

    } catch (err) {
      console.error(err);
      alert("Error creating company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 w-[420px]">

        <div className="text-center mb-8">
          <h1 className="text-2xl text-slate-800">
            Inovient Onboarding
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Create a company to begin onboarding
          </p>
        </div>

        <div className="flex flex-col gap-4">

          <input
            type="text"
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="
              w-full
              border border-slate-300
              rounded-lg
              px-4 py-2.5
              text-slate-700
              placeholder:text-slate-400
              focus:outline-none
              focus:ring-2
              focus:ring-slate-400
              focus:border-slate-400
              transition
            "
          />

          <button
            onClick={createCompanyAndStartOnboarding}
            disabled={loading}
            className="
              w-full
              bg-slate-900
              hover:bg-slate-800
              text-white
              rounded-lg
              py-2.5
              shadow-sm
              hover:shadow
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading ? "Creating..." : "Create Company & Start Onboarding"}
          </button>

        </div>

      </div>

    </main>
  );
}