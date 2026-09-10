export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <div className="h-56 w-full animate-pulse rounded-2xl bg-line" />
      </div>
      <div className="space-y-6">
        <div className="h-32 w-full animate-pulse rounded-2xl bg-line" />
        <div className="h-32 w-full animate-pulse rounded-2xl bg-line" />
        <div className="h-48 w-full animate-pulse rounded-2xl bg-line" />
      </div>
    </div>
  );
}
