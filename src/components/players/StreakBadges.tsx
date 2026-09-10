import { Flame, Snowflake } from "lucide-react";

export function HotStreakBadge({ count }: { count: number }) {
  if (count < 3) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold text-ink">
      <Flame size={13} className="text-amber" />
      {count} win streak
    </span>
  );
}

export function ColdStreakBadge({ count, unit }: { count: number; unit: "days" | "matches" }) {
  if (count < 3) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-tint px-2.5 py-1 text-xs font-semibold text-red">
      <Snowflake size={13} />
      {count} {unit === "days" ? "day" : "match"} cold streak
    </span>
  );
}
