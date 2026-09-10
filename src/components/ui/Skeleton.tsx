export function CardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line">
      <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-full bg-line" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-line" />
      </div>
    </div>
  );
}
