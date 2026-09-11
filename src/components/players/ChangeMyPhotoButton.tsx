"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

export function ChangeMyPhotoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);

    try {
      // 1. Upload the file, get a URL.
      const formData = new FormData();
      formData.append("photo", file);
      const uploadRes = await fetch("/api/uploads/player-photo", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => null);
        throw new Error(d?.error || "Upload failed.");
      }
      const { photoUrl } = await uploadRes.json();

      // 2. Set it as MY photo (server ties it to the session, not to any id we send).
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
        {busy ? "Updating…" : "Change my photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          disabled={busy}
          className="hidden"
        />
      </label>
      {error && <p className="mt-1 text-xs text-red">{error}</p>}
    </div>
  );
}
