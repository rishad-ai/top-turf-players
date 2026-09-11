import Link from "next/link";
import Image from "next/image";
import { getMemberSession } from "@/lib/auth";
import { MemberAuthControl } from "./MemberAuthControl";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
  { href: "/matches", label: "Matches" },
  { href: "/rankings", label: "Rankings" },
  { href: "/admin", label: "Admin" },
];

export async function AppHeader() {
  const member = await getMemberSession();

  return (
    <header className="sticky top-0 z-30 border-b border-navy-dark bg-navy text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="TOP Turf Players" width={40} height={40} className="rounded-full ring-2 ring-white/20" priority />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            TOP Turf Players
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-white/75 transition hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <MemberAuthControl memberName={member?.name ?? null} />
        </div>
      </div>
    </header>
  );
}
