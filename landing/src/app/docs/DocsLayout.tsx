"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ClustrLogo from "../components/ClustrLogo";

interface NavItem {
  title: string;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    label: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Quickstart", href: "/docs/quickstart" },
      { title: "Core Concepts", href: "/docs/core-concepts" },
    ],
  },
  {
    label: "Architecture",
    items: [
      { title: "Overview", href: "/docs/architecture" },
      { title: "Data Flow", href: "/docs/data-flow" },
    ],
  },
  {
    label: "Guides",
    items: [
      { title: "Spawning Agents", href: "/docs/spawning-agents" },
      { title: "Agent Communication", href: "/docs/agent-communication" },
      { title: "Shared Context", href: "/docs/shared-context" },
      { title: "Rules", href: "/docs/rules" },
    ],
  },
  {
    label: "Reference",
    items: [
      { title: "CLI & Configuration", href: "/docs/cli" },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Find current, prev, next for footer nav
  const allItems = navigation.flatMap((g) => g.items);
  const currentIdx = allItems.findIndex((item) => item.href === pathname);
  const prev = currentIdx > 0 ? allItems[currentIdx - 1] : null;
  const next = currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-14 bg-black/80 backdrop-blur-xl border-b border-[#2a2a2a]">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 text-white">
            <ClustrLogo size={20} />
            <span className="text-sm font-semibold tracking-widest uppercase">
              Clustr
            </span>
          </Link>
          <span className="text-[#2a2a2a]">/</span>
          <span className="text-[13px] text-[#707070] font-medium">Docs</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="hidden md:block text-[13px] text-[#707070] hover:text-[#eeeeee] transition-colors"
          >
            Home
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[#707070] hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-14 left-0 z-40 w-64 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-[#2a2a2a] bg-black md:bg-transparent px-5 py-8 transition-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {navigation.map((group) => (
            <div key={group.label} className="mb-6">
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#505050] mb-3 px-3">
                {group.label}
              </h4>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                          active
                            ? "text-white bg-[#1a1a1a] font-medium"
                            : "text-[#707070] hover:text-[#b0b0b0] hover:bg-[#0a0a0a]"
                        }`}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-3xl mx-auto px-6 md:px-12 py-12">
          <article className="docs-content">{children}</article>

          {/* Prev / Next */}
          {(prev || next) && (
            <div className="flex justify-between mt-16 pt-8 border-t border-[#2a2a2a]">
              {prev ? (
                <Link
                  href={prev.href}
                  className="group flex flex-col gap-1"
                >
                  <span className="text-[11px] uppercase tracking-widest text-[#505050]">
                    Previous
                  </span>
                  <span className="text-sm text-[#707070] group-hover:text-white transition-colors">
                    &larr; {prev.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={next.href}
                  className="group flex flex-col gap-1 text-right"
                >
                  <span className="text-[11px] uppercase tracking-widest text-[#505050]">
                    Next
                  </span>
                  <span className="text-sm text-[#707070] group-hover:text-white transition-colors">
                    {next.title} &rarr;
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
