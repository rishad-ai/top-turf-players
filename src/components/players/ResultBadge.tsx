export function ResultBadge({
  result,
  size = "md",
}: {
  result: "win" | "loss" | "draw";
  size?: "sm" | "md";
}) {
  const styles = {
    win: "bg-pitch-tint text-pitch-dark",
    loss: "bg-red-tint text-red",
    draw: "bg-line text-ink-muted",
  };
  const labels = { win: "W", loss: "L", draw: "D" };
  const sizeClass = size === "sm" ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizeClass} ${styles[result]}`}
    >
      {labels[result]}
    </span>
  );
}
