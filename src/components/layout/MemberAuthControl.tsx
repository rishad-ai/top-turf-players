"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, X } from "lucide-react";

export function MemberAuthControl({ memberName }: { memberName: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/member/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobileNumber: mobile }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Login failed.");
      return;
    }
    setOpen(false);
    setMobile("");
    router.refresh();
  }

  async function handleLogout() {
    await fetch("/api/member/logout", { method: "POST" });
    router.refresh();
  }

  if (memberName) {
    return (
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-white/80 transition hover:text-white"
        title="Log out"
      >
        <span className="hidden sm:inline">Hi, {memberName.split(" ")[0]}</span>
        <LogOut size={16} />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        <LogIn size={16} />
        <span className="hidden sm:inline">Log in</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Member login</h2>
              <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-ink-muted">
              Enter your registered mobile number to identify yourself. You&apos;ll stay logged in on
              this device.
            </p>
            <form onSubmit={handleLogin} className="space-y-3">
              {error && (
                <p className="rounded-lg bg-red-tint px-3 py-2 text-sm text-red">{error}</p>
              )}
              <input
                type="tel"
                inputMode="numeric"
                autoFocus
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-pitch px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pitch-dark disabled:opacity-60"
              >
                {busy ? "Logging in…" : "Log in"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
