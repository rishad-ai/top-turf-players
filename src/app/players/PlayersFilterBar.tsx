"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-pitch text-white"
          : "bg-surface text-ink-muted ring-1 ring-line hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function PlayersFilterBar({
  status,
  type,
}: {
  status: string;
  type: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: "status" | "type", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1.5">
        <Pill active={status === "active"} onClick={() => update("status", "active")}>
          Active
        </Pill>
        <Pill active={status === "all"} onClick={() => update("status", "all")}>
          All
        </Pill>
        <Pill active={status === "inactive"} onClick={() => update("status", "inactive")}>
          Inactive
        </Pill>
      </div>
      <div className="h-4 w-px bg-line" />
      <div className="flex gap-1.5">
        <Pill active={type === "all"} onClick={() => update("type", "all")}>
          All types
        </Pill>
        <Pill active={type === "regular"} onClick={() => update("type", "regular")}>
          Regular
        </Pill>
        <Pill active={type === "irregular"} onClick={() => update("type", "irregular")}>
          Irregular
        </Pill>
      </div>
    </div>
  );
}
