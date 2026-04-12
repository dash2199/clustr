import Link from "next/link";
import ClustrLogo from "../ClustrLogo";

export default function Header() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 h-16 bg-black/80 backdrop-blur-xl border-b border-border">
      <a href="#" className="flex items-center gap-3 text-white">
        <ClustrLogo size={24} />
        <span className="text-sm font-semibold tracking-widest uppercase">
          Clustr
        </span>
      </a>
      <div className="hidden md:flex items-center gap-8">
        <a
          href="#features"
          className="text-[13px] text-text-muted hover:text-text transition-colors"
        >
          Features
        </a>
        <a
          href="#how-it-works"
          className="text-[13px] text-text-muted hover:text-text transition-colors"
        >
          How It Works
        </a>
        <Link
          href="/docs"
          className="text-[13px] text-text-muted hover:text-text transition-colors"
        >
          Docs
        </Link>
        <a
          href="#get-started"
          className="px-5 py-2 bg-white text-black rounded-md text-[13px] font-semibold tracking-wide hover:bg-neutral-300 transition-colors"
        >
          Get Started
        </a>
      </div>
    </nav>
  );
}
