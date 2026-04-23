import { auth } from "@/lib/firebase";

export async function getSignedFileUrl(bucket: string, path: string) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const idToken = await user.getIdToken();

  const res = await fetch("/api/file-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ bucket, path }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to get file URL");
  }

  return data.signedUrl as string;
}