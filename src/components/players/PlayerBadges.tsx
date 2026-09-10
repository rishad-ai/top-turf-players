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
