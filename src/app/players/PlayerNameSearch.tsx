"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

export function PlayerNameSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      router.push(`${pathname}?${params.toString()}`);
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        type="text"
        placeholder="Search players by name…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
      />
    </div>
  );
}
