"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { PhotoCropper } from "./PhotoCropper";

export function ChangeMyPhotoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Load into the cropper first (zoom/align), then upload the cropped result.
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = ""; // allow re-picking the same file later
  }

  async function handleCropped(cropped: File) {
    setCropSrc(null);
    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("photo", cropped);
      const uploadRes = await fetch("/api/uploads/player-photo", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => null);
        throw new Error(d?.error || "Upload failed.");
      }
      const { photoUrl } = await uploadRes.json();

      const setRes = await fetch("/api/member/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });
      if (!setRes.ok) {
        const d = await setRes.json().catch(() => null);
        throw new Error(d?.error || "Could not update photo.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-pitch px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-pitch-dark">
        <Camera size={15} />
        {busy ? "Updating\u2026" : "Change my photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          disabled={busy}
          className="hidden"
        />
      </label>
      {error && <p className="mt-1 text-xs text-red">{error}</p>}
      {cropSrc && (
        <PhotoCropper
          imageSrc={cropSrc}
          onCancel={() => setCropSrc(null)}
          onCropped={handleCropped}
        />
      )}
    </div>
  );
}
