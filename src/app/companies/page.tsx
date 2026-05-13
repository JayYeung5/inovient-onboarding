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

type CompanyListItem = {
  id: string;
  name?: string;
};

export default function CompaniesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const ready = Boolean(user);

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
    })) as CompanyListItem[];

    setCompanies(results);
  }

  useEffect(() => {
    if (!user) return;

    queueMicrotask(() => {
      void loadCompanies(user.uid);
    });
  }, [user]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          Loading companies...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex justify-center px-4 py-24">
      <div className="w-full max-w-3xl">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 md:p-10">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Companies
            </h1>

            <p className="text-sm text-slate-600 mt-2">
              Select a company to view its onboarding profile
            </p>
          </div>

          <div className="space-y-3">

            {companies.length === 0 && (
              <div className="text-slate-500 text-sm rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                No companies yet.
              </div>
            )}

            {companies.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/companies/${c.id}`)}
                className="group border border-slate-200 rounded-xl bg-white px-5 py-4 transition hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-900 font-medium">
                    {c.name}
                  </div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-700 transition">
                    View profile
                  </div>
                </div>
              </div>
            ))}

          </div>

        </div>

      </div>

    </main>
  );
}
