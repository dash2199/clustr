"use client";

/* ── Tiny SVG icons ───────────────────────────────────────── */
const ClustrIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <circle cx="5" cy="6" r="2" />
    <circle cx="19" cy="6" r="2" />
    <circle cx="5" cy="18" r="2" />
    <circle cx="19" cy="18" r="2" />
    <path d="M7 6h3M14 6h3M7 18h3M14 18h3" />
  </svg>
);

/* ── Agent sidebar item ───────────────────────────────────── */
function AgentItem({
  name,
  badge,
  status,
  badgeColor = "bg-claude",
  active = false,
}: {
  name: string;
  badge: string;
  status: string;
  badgeColor?: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-colors ${
        active ? "bg-[#1a1a1a]" : ""
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          status === "running" ? "bg-[#4ade80]" : "bg-[#555]"
        }`}
      />
      <span className="text-[#ccc] font-medium truncate">{name}</span>
      <span
        className={`ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold uppercase text-black flex-shrink-0 ${badgeColor}`}
      >
        {badge}
      </span>
      <span className="text-[8px] text-[#555] flex-shrink-0">{status}</span>
    </div>
  );
}

/* ── Terminal line ─────────────────────────────────────────── */
function TermLine({
  bullet,
  children,
  dim = false,
}: {
  bullet?: string;
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div className={`flex gap-1.5 leading-[1.65] ${dim ? "text-[#555]" : "text-[#999]"}`}>
      {bullet && (
        <span
          className={`flex-shrink-0 ${
            bullet === "green"
              ? "text-[#4ade80]"
              : bullet === "blue"
              ? "text-[#60a5fa]"
              : bullet === "yellow"
              ? "text-[#fbbf24]"
              : "text-[#555]"
          }`}
        >
          {"\u25CF"}
        </span>
      )}
      <span className="break-all">{children}</span>
    </div>
  );
}

/* ── Main mock ─────────────────────────────────────────────── */
export default function DashboardMock() {
  return (
    <div
      className="w-full rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] overflow-hidden font-mono text-[11px]"
      style={{
        boxShadow:
          "0 0 0 1px rgba(74,222,128,0.04), 0 4px 24px rgba(0,0,0,0.5), 0 16px 80px rgba(0,0,0,0.6), 0 0 120px rgba(74,222,128,0.03)",
      }}
    >
      {/* ── Title bar ──────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0e0e0e] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2.5">
          <ClustrIcon />
          <span className="text-[12px] font-semibold tracking-widest text-white uppercase font-sans">
            Clustr
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] text-[#707070] font-sans">
            Open Project
          </span>
          <span className="px-3 py-1 rounded-md bg-white text-black text-[10px] font-semibold font-sans">
            New Agent
          </span>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────── */}
      <div className="flex items-center gap-0 px-5 bg-[#0a0a0a] border-b border-[#2a2a2a] text-[10px] font-sans">
        {["GRAPH", "TERMINAL", "FILES", "MESSAGES", "CONTEXT", "RULES"].map(
          (tab) => (
            <span
              key={tab}
              className={`px-4 py-2.5 ${
                tab === "TERMINAL"
                  ? "text-white border-b border-white"
                  : "text-[#555]"
              }`}
            >
              {tab}
            </span>
          )
        )}
      </div>

      {/* ── Body: sidebar + terminals ───────────────── */}
      <div className="flex" style={{ height: 420 }}>
        {/* Sidebar */}
        <div className="w-[170px] flex-shrink-0 border-r border-[#2a2a2a] bg-[#0a0a0a] p-2.5 overflow-hidden">
          <div className="text-[9px] text-[#555] font-sans font-semibold tracking-wider uppercase mb-2.5 px-1">
            Agents (5)
          </div>
          <div className="flex flex-col gap-0.5">
            <AgentItem name="researcher" badge="CLAUDE" status="running" active />
            <AgentItem name="builder" badge="CODEX" status="running" badgeColor="bg-codex" />
            <AgentItem name="reviewer" badge="CLAUDE" status="running" />
            <AgentItem name="test-runner" badge="CLAUDE" status="done" />
            <AgentItem name="deployer" badge="CODEX" status="done" badgeColor="bg-codex" />
          </div>
        </div>

        {/* Terminal split */}
        <div className="flex-1 flex min-w-0">
          {/* Left terminal — researcher */}
          <div className="flex-1 border-r border-[#1a1a1a] overflow-hidden flex flex-col">
            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#0e0e0e] border-b border-[#1a1a1a] text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              <span className="text-[#999] font-sans font-medium">researcher</span>
            </div>
            <div className="flex-1 p-4 text-[10px] leading-[1.7] overflow-hidden space-y-1">
              <TermLine bullet="blue">
                clustr &middot; write_context <span className="text-[#555]">(MCP)</span>
              </TermLine>
              <TermLine dim>
                <span className="text-[#444]">&#9492;</span>{" "}
                <span className="text-[#4ade80]">key:</span> &quot;auth-findings&quot;
                <span className="text-[#555]">, value: &quot;OAuth flow uses PKCE...&quot;</span>
              </TermLine>
              <div className="h-1.5" />
              <TermLine bullet="green">
                Shared context updated. Notifying builder.
              </TermLine>
              <div className="h-1.5" />
              <TermLine bullet="blue">
                clustr &middot; send_message <span className="text-[#555]">(MCP)</span>
              </TermLine>
              <TermLine dim>
                <span className="text-[#444]">&#9492;</span>{" "}
                <span className="text-[#4ade80]">to:</span> &quot;builder&quot;
                <span className="text-[#555]">, content: &quot;Auth research done — check context.&quot;</span>
              </TermLine>
              <div className="h-1.5" />
              <TermLine bullet="yellow">
                <span className="text-[#fbbf24]">*</span>{" "}
                <span className="text-[#888]">Thinking...</span>
              </TermLine>
            </div>
          </div>

          {/* Right terminal — builder */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#0e0e0e] border-b border-[#1a1a1a] text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              <span className="text-[#999] font-sans font-medium">builder</span>
            </div>
            <div className="flex-1 p-4 text-[10px] leading-[1.7] overflow-hidden space-y-1">
              <TermLine bullet="green">
                Message from <span className="text-white">researcher</span>
                : auth research done.
              </TermLine>
              <div className="h-1.5" />
              <TermLine bullet="blue">
                clustr &middot; read_context <span className="text-[#555]">(MCP)</span>
              </TermLine>
              <TermLine dim>
                <span className="text-[#444]">&#9492;</span>{" "}
                <span className="text-[#4ade80]">key:</span> &quot;auth-findings&quot;
              </TermLine>
              <div className="h-1.5" />
              <TermLine bullet="green">
                Got it. Implementing OAuth PKCE flow in
              </TermLine>
              <TermLine dim>
                src/auth/handler.ts based on shared context.
              </TermLine>
              <TermLine dim>
                Writing token refresh logic now...
              </TermLine>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer bar ─────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-[#0e0e0e] border-t border-[#2a2a2a] text-[10px] font-sans">
        <span className="px-2.5 py-1 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] text-[9px]">
          All Agents
        </span>
        <div className="flex-1 px-3 py-1.5 rounded bg-[#111] border border-[#2a2a2a] text-[#444]">
          Broadcast message to all agents...
        </div>
      </div>
    </div>
  );
}
