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

      // 1️⃣ Create company
      const companyRef = await addDoc(collection(db, "companies"), {
        name: companyName,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: Date.now()
      });

      const companyId = companyRef.id;

      // 2️⃣ Update user's companyIds
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        companyIds: arrayUnion(companyId)
      });

      // 3️⃣ Create onboarding session
      const onboardingRef = await addDoc(collection(db, "onboardings"), {
        companyId,
        createdBy: user.uid,
        status: "started",
        createdAt: Date.now()
      });

      const onboardingId = onboardingRef.id;

      // 4️⃣ Redirect to onboarding
      router.push(`/onboarding/${onboardingId}`);

    } catch (err) {
      console.error(err);
      alert("Error creating company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6">

      <h1 className="text-3xl font-bold">
        Inovient Onboarding
      </h1>

      <div className="flex flex-col gap-4 w-80">

        <input
          type="text"
          placeholder="Enter company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={createCompanyAndStartOnboarding}
          disabled={loading}
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          {loading ? "Creating..." : "Create Company & Start Onboarding"}
        </button>

      </div>

    </main>
  );
}