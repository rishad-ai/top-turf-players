"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PhotoCropper } from "@/components/players/PhotoCropper";

export type PlayerFormValues = {
  id?: number;
  name: string;
  playerType: "regular" | "irregular";
  photoUrl: string | null;
  mobileNumber?: string | null;
};

export function PlayerForm({ initial }: { initial?: PlayerFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name || "");
  const [playerType, setPlayerType] = useState<"regular" | "irregular">(
    initial?.playerType || "regular"
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photoUrl || null);
  const [mobileNumber, setMobileNumber] = useState(initial?.mobileNumber || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Load into the cropper (zoom/align) first, then upload the cropped result.
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropped(cropped: File) {
    setCropSrc(null);
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("photo", cropped);

    const res = await fetch("/api/uploads/player-photo", {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Photo upload failed.");
      return;
    }

    const data = await res.json();
    setPhotoUrl(data.photoUrl);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Player name is required.");
      return;
    }

    setSaving(true);

    const url = isEdit ? `/api/players/${initial!.id}` : "/api/players";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), playerType, photoUrl, mobileNumber: mobileNumber.trim() }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Failed to save player.");
      return;
    }

    router.push("/admin/players");
    router.refresh();
  }

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line"
    >
      {error && (
        <p className="rounded-lg bg-red-tint px-3 py-2 text-sm text-red">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <PlayerAvatar name={name || "?"} photoUrl={photoUrl} size="xl" />
        <div>
          <label className="inline-block cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-pitch-dark ring-1 ring-line transition hover:bg-pitch-tint">
            {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <p className="mt-1 text-xs text-ink-muted">JPEG, PNG or WebP, up to 5MB</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Mobile number</label>
        <input
          type="tel"
          inputMode="numeric"
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          placeholder="10-digit number"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
        <p className="mt-1 text-xs text-ink-muted">
          Used by this member to log in. Optional, but needed for them to identify themselves.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Player type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPlayerType("regular")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              playerType === "regular"
                ? "bg-pitch text-white"
                : "bg-bg text-ink-muted ring-1 ring-line"
            }`}
          >
            Regular
          </button>
          <button
            type="button"
            onClick={() => setPlayerType("irregular")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              playerType === "irregular"
                ? "bg-amber text-white"
                : "bg-bg text-ink-muted ring-1 ring-line"
            }`}
          >
            Irregular / Foreign
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Regular players get calendar-day losing streaks. Irregular players get
          played-match losing streaks.
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex-1 rounded-lg bg-pitch px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pitch-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add player"}
        </button>
      </div>
    </form>
    {cropSrc && (
      <PhotoCropper
        imageSrc={cropSrc}
        onCancel={() => setCropSrc(null)}
        onCropped={handleCropped}
      />
    )}
    </>
  );
}
