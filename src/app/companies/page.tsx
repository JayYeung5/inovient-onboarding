"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function CompaniesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [companies, setCompanies] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  async function loadCompanies(uid: string) {
    const userDoc = await getDoc(doc(db, "users", uid));
    const role = userDoc.data()?.role;

    let snapshot;

    if (role === "admin") {
      snapshot = await getDocs(collection(db, "companies"));
    } else {
      const q = query(
        collection(db, "companies"),
        where("createdBy", "==", uid)
      );

      snapshot = await getDocs(q);
    }

    const results = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setCompanies(results);
  }

  useEffect(() => {
    if (!user) return;

    setReady(true);
    loadCompanies(user.uid);
  }, [user]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading companies...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex justify-center">

      <div className="w-full max-w-2xl mt-16">

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">

          <div className="mb-6">
            <h1 className="text-2xl text-slate-800">
              Companies
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Select a company to view its onboarding profile
            </p>
          </div>

          <div className="space-y-3">

            {companies.length === 0 && (
              <div className="text-slate-500 text-sm">
                No companies yet.
              </div>
            )}

            {companies.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/companies/${c.id}`)}
                className="
                  border border-slate-200
                  rounded-lg
                  px-4 py-3
                  cursor-pointer
                  transition
                  hover:bg-slate-50
                  hover:border-slate-300
                "
              >
                <div className="text-slate-800">
                  {c.name}
                </div>
              </div>
            ))}

          </div>

        </div>

      </div>

    </main>
  );
}