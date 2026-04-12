export default function IntroductionPage() {
  return (
    <>
      <h1>Introduction</h1>
      <p className="subtitle">
        Clustr is a multi-agent workspace that orchestrates multiple AI coding
        agents in one place. Spawn Claude Code, OpenAI Codex, and more — all
        collaborating in real time.
      </p>

      <h2>What is Clustr?</h2>
      <p>
        Clustr lets you run a <strong>swarm of AI coding agents</strong> on your
        codebase simultaneously. Each agent gets its own terminal, shell access,
        and built-in tools for communicating with other agents. You monitor
        and control everything from a real-time web dashboard.
      </p>
      <p>
        Think of it as a control plane for AI pair programming — except instead
        of one assistant, you have a whole team working in parallel.
      </p>

      <h2>Key capabilities</h2>
      <ul>
        <li>
          <strong>Multi-agent orchestration</strong> — spawn multiple agents
          that work on different parts of your project at the same time
        </li>
        <li>
          <strong>Inter-agent messaging</strong> — agents talk to each other,
          share findings, and coordinate automatically
        </li>
        <li>
          <strong>Shared context store</strong> — a key-value memory that all
          agents can read and write, so discoveries propagate instantly
        </li>
        <li>
          <strong>Multi-service support</strong> — run Claude Code and OpenAI
          Codex agents side by side
        </li>
        <li>
          <strong>Real-time dashboard</strong> — live terminals, agent graph,
          message feed, context viewer, and file change tracking
        </li>
        <li>
          <strong>Git checkpoints & rollback</strong> — auto-snapshots before
          each agent starts, one-click rollback if things go wrong
        </li>
        <li>
          <strong>Rules</strong> — a shared rules file that every agent
          reads, giving you global control over agent behavior
        </li>
      </ul>

      <h2>Who is it for?</h2>
      <p>
        Clustr is built for developers who want to leverage multiple AI agents
        on large or complex tasks — refactoring across many files, building
        features in parallel, running agents with different specializations, or
        exploring different approaches simultaneously.
      </p>

      <div className="callout">
        <p>
          <strong>Prerequisite:</strong> You need Node.js 18+ and either{" "}
          <code>claude</code> (Claude Code CLI) or <code>codex</code> (OpenAI
          Codex CLI) installed on your system.
        </p>
      </div>
    </>
  );
}
