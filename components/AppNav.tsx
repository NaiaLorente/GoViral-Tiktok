"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/icons/Logo";

const TABS = [
  { href: "/", label: "Analyze" },
  { href: "/ideate", label: "Ideate" },
  { href: "/wrapped", label: "Wrapped" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full flex items-center justify-between px-8 py-4 bg-white border-b-2 border-[#111]">
      <Link href="/" className="flex items-center gap-2.5">
        <Logo size={27} />
        <span className="font-display font-extrabold text-[18px] tracking-tight text-[#111]">
          Viral<span style={{ color: "var(--accent)" }}>Score</span>
        </span>
      </Link>

      <div className="flex gap-6">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="font-display font-bold text-[14.5px] pb-1"
              style={{
                color: active ? "#111" : "#999",
                borderBottom: active ? "3px solid var(--accent)" : "3px solid transparent",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
