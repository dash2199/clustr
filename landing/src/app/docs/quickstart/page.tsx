export default function QuickstartPage() {
  return (
    <>
      <h1>Quickstart</h1>
      <p className="subtitle">
        Get Clustr running in under a minute.
      </p>

      <h2>1. Install and launch</h2>
      <p>
        Run Clustr directly with <code>npx</code> — no global install needed:
      </p>
      <pre>
        <code>npx clustr-ai</code>
      </pre>
      <p>
        This downloads, builds, and starts the Clustr server. On first run it
        may take a moment to compile.
      </p>

      <h2>2. Open the dashboard</h2>
      <p>
        Once the server is running, open your browser to:
      </p>
      <pre>
        <code>http://localhost:3100</code>
      </pre>
      <p>
        You&apos;ll see the Clustr workspace with the agent graph, terminal tabs,
        messaging panel, and context viewer.
      </p>

      <h2>3. Open a project</h2>
      <p>
        Click <strong>Open Project</strong> in the title bar to select a project
        directory. This sets the working directory for all new agents.
      </p>

      <h2>4. Spawn your first agent</h2>
      <p>
        Click <strong>New Agent</strong> to open the spawn dialog. Fill in:
      </p>
      <ul>
        <li>
          <strong>Name</strong> — a descriptive name (e.g.,{" "}
          <code>frontend-refactor</code>)
        </li>
        <li>
          <strong>Task</strong> — what the agent should work on
        </li>
        <li>
          <strong>Service</strong> — choose <code>claude</code> or{" "}
          <code>codex</code>
        </li>
      </ul>
      <p>
        The agent starts in its own terminal. You can watch its output live, and
        it will automatically connect to the workspace for inter-agent
        communication.
      </p>

      <h2>5. Spawn more agents</h2>
      <p>
        Repeat step 4 to add more agents. They&apos;ll discover each other
        automatically and can communicate via messages and shared context. You
        can also use the Rules file to give all agents shared rules and instructions.
      </p>

      <h2>Environment variables</h2>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>CLUSTR_PORT</code></td>
            <td><code>3100</code></td>
            <td>Port for the Clustr server</td>
          </tr>
          <tr>
            <td><code>CLUSTR_MAX_AGENTS</code></td>
            <td><code>5</code></td>
            <td>Maximum number of concurrent agents</td>
          </tr>
        </tbody>
      </table>

      <div className="callout">
        <p>
          <strong>Tip:</strong> Agents spawned from the UI (or by other agents
          via other agents) automatically get the Clustr collaboration
          tools injected. No manual config needed.
        </p>
      </div>
    </>
  );
}
