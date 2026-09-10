export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-32 animate-pulse rounded bg-line" />
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-line" />
        ))}
      </div>
      <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-line">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? "border-t border-line" : ""}`}
          >
            <div className="h-6 w-6 animate-pulse rounded bg-line" />
            <div className="h-11 w-11 animate-pulse rounded-full bg-line" />
            <div className="h-4 flex-1 animate-pulse rounded bg-line" />
          </div>
        ))}
      </div>
    </div>
  );
}
