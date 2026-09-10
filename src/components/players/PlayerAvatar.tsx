import Image from "next/image";

const SIZE_MAP = {
  sm: { px: 32, text: "text-xs" },
  md: { px: 44, text: "text-sm" },
  lg: { px: 72, text: "text-xl" },
  xl: { px: 112, text: "text-3xl" },
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PlayerAvatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZE_MAP;
  className?: string;
}) {
  const { px, text } = SIZE_MAP[size];

  if (photoUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-full shrink-0 bg-pitch-tint ${className}`}
        style={{ width: px, height: px }}
      >
        <Image
          src={photoUrl}
          alt={name}
          fill
          sizes={`${px}px`}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full shrink-0 bg-pitch-tint text-pitch-dark font-display font-semibold ${text} ${className}`}
      style={{ width: px, height: px }}
    >
      {initials(name)}
    </div>
  );
}
