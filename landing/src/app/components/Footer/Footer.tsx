import ClustrLogo from "../ClustrLogo";

export default function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between px-10 py-10 border-t border-border gap-4">
      <div className="flex items-center gap-3 text-text-muted text-xs">
        <ClustrLogo size={16} />
        Clustr
      </div>
      <div className="flex gap-6">
        <a
          href="https://www.npmjs.com/package/clustr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-text-muted hover:text-text transition-colors"
        >
          npm
        </a>
      </div>
    </footer>
  );
}
