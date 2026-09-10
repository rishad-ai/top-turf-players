import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
  { href: "/matches", label: "Matches" },
  { href: "/rankings", label: "Rankings" },
  { href: "/admin", label: "Admin" },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pitch font-display text-sm font-bold text-white">
            TT
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            TOP Turf Players
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-muted transition hover:text-pitch"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
