import { auth } from "@/lib/firebase";

type UploadFileParams = {
  file: File;
  companyId: string;
  onboardingId: string;
  fieldKey: string;
};

export async function uploadFileClient({
  file,
  companyId,
  onboardingId,
  fieldKey,
}: UploadFileParams) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in to upload files.");
  }

  const idToken = await user.getIdToken();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("companyId", companyId);
  formData.append("onboardingId", onboardingId);
  formData.append("fieldKey", fieldKey);

  const res = await fetch("/api/upload-file", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Upload failed");
  }

  return data.file;
}