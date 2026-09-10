export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-40 animate-pulse rounded bg-line" />
      <div className="h-12 w-full animate-pulse rounded-2xl bg-line" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-line" />
        ))}
      </div>
    </div>
  );
}
