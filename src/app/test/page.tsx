"use client";

import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function TestPage() {

  async function testWrite() {
    console.log("🔥 CLICKED");

    try {
      console.log("🔥 Attempting Firestore write...");

      const docRef = await addDoc(
        collection(db, "test"),
        {
          message: "Hello Firestore",
          createdAt: new Date()
        }
      );

      console.log("✅ SUCCESS:", docRef.id);
      alert("WRITE SUCCESS");

    } catch (err) {
      console.error("❌ FIRESTORE ERROR:", err);
      alert("WRITE FAILED");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <button
        onClick={testWrite}
        style={{
          padding: "12px 20px",
          background: "black",
          color: "white",
          cursor: "pointer"
        }}
      >
        Write To Firestore
      </button>
    </div>
  );
}