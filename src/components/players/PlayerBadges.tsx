export function PlayerTypeBadge({ type }: { type: "regular" | "irregular" }) {
  if (type === "regular") {
    return (
      <span className="inline-flex items-center rounded-full bg-pitch-tint px-2.5 py-0.5 text-xs font-medium text-pitch-dark">
        Regular
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-tint px-2.5 py-0.5 text-xs font-medium text-ink">
      Irregular
    </span>
  );
}

export function InactiveBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-line px-2.5 py-0.5 text-xs font-medium text-ink-muted">
      Inactive
    </span>
  );
}

export function InjuredBadge({ days }: { days?: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-tint px-2.5 py-0.5 text-xs font-medium text-red">
      🚑 Injured{typeof days === "number" && days > 0 ? ` · ${days}d` : ""}
    </span>
  );
}
