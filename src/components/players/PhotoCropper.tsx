"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut } from "lucide-react";

/** Crops the selected area of an image and returns it as a square PNG File. */
async function getCroppedFile(imageSrc: string, cropPixels: Area): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const size = 512; // output square size
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    size,
    size
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
  );
  if (!blob) throw new Error("Could not process image");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export function PhotoCropper({
  imageSrc,
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCropPixels(pixels);
  }, []);

  async function handleSave() {
    if (!cropPixels) return;
    setSaving(true);
    try {
      const file = await getCroppedFile(imageSrc, cropPixels);
      onCropped(file);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink">Adjust photo</h2>
          <button onClick={onCancel} className="text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="relative h-64 w-full bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <ZoomOut size={16} className="text-ink-muted" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-pitch"
            />
            <ZoomIn size={16} className="text-ink-muted" />
          </div>
          <p className="text-center text-xs text-ink-muted">Drag to reposition · slide to zoom</p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-ink-muted ring-1 ring-line"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !cropPixels}
              className="flex-1 rounded-lg bg-pitch px-4 py-2 text-sm font-semibold text-white transition hover:bg-pitch-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
