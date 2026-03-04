"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

export default function CompaniesPage() {
  const { user } = useAuth();

  const [companies, setCompanies] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);

  async function createCompany() {
    if (!user) return;

    await addDoc(collection(db, "companies"), {
      name,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });

    setName("");
    loadCompanies(user.uid);
  }

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
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Companies
      </h1>

      <div className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Company name"
          className="border p-2 flex-1"
        />

        <button
          onClick={createCompany}
          className="bg-black text-white px-4 py-2"
        >
          Create
        </button>
      </div>

      <div className="space-y-2">
        {companies.map((c) => (
          <div key={c.id} className="border p-3 rounded">
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
}