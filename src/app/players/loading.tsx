import { CardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 animate-pulse rounded bg-line" />
        <div className="h-4 w-16 animate-pulse rounded bg-line" />
      </div>
      <div className="h-9 w-full animate-pulse rounded-lg bg-line" />
      <div className="h-9 w-64 animate-pulse rounded-lg bg-line" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
