export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <div className="h-28 w-28 animate-pulse rounded-full bg-line" />
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-line" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-line" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-line" />
        ))}
      </div>
      <div className="h-64 w-full animate-pulse rounded-2xl bg-line" />
    </div>
  );
}
