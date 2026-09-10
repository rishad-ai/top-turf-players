export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-32 animate-pulse rounded bg-line" />
      <div className="h-32 w-full animate-pulse rounded-2xl bg-line" />
      <div className="h-48 w-full animate-pulse rounded-2xl bg-line" />
    </div>
  );
}
