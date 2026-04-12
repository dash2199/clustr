export default function ArchitecturePage() {
  return (
    <>
      <h1>Architecture</h1>
      <p className="subtitle">
        A simple overview of how Clustr is built and how the pieces fit
        together.
      </p>

      <h2>The big picture</h2>
      <p>
        Clustr has two main parts:
      </p>
      <ul>
        <li>
          <strong>The server</strong> — the brain that manages agents, handles
          messages, stores data, and launches AI processes. It runs on your
          machine and exposes a web API.
        </li>
        <li>
          <strong>The dashboard</strong> — a web app you open in your browser
          to see what your agents are doing, read their messages, view shared
          context, and interact with their terminals.
        </li>
      </ul>
      <p>
        When you run <code>npx clustr-ai</code>, both parts start together. The
        dashboard talks to the server over a real-time connection, so
        everything you see updates instantly.
      </p>

      <h2>What the server does</h2>
      <p>
        The server is made up of several pieces, each handling a specific job:
      </p>

      <h3>Agent Spawner</h3>
      <p>
        Launches AI coding tools (Claude or Codex) as separate processes, each
        in its own terminal. It handles the startup sequence automatically —
        accepting prompts, injecting your task, and connecting the agent to the
        workspace.
      </p>

      <h3>Message Broker</h3>
      <p>
        Delivers messages between agents. When Agent A sends a message to
        Agent B, the broker saves it, pushes it into Agent B&apos;s terminal
        so it sees the notification, and updates the dashboard.
      </p>

      <h3>Agent Registry</h3>
      <p>
        Keeps track of which agents are alive. Each agent sends periodic
        &quot;heartbeat&quot; signals. If an agent stops responding for 60
        seconds, the registry marks it as done.
      </p>

      <h3>Context Store</h3>
      <p>
        A shared notepad where agents store and retrieve key-value notes. When
        any entry changes, the dashboard updates immediately.
      </p>

      <h3>Database</h3>
      <p>
        A lightweight local database that stores three things: the list of
        agents, all messages between them, and the shared context entries.
        Everything is stored in a single file on your machine.
      </p>

      <h3>Collaboration Bridge</h3>
      <p>
        A small connector that gives each agent its collaboration tools
        (send messages, read context, spawn agents, etc.). Each agent gets its
        own bridge that connects it to the workspace.
      </p>

      <h3>Git Integration</h3>
      <p>
        Before each agent starts, Clustr takes a snapshot of your code (a git
        checkpoint). Later, you can see exactly what the agent changed (as a
        diff) or roll everything back to how it was before.
      </p>

      <h2>What the dashboard shows</h2>
      <p>
        The dashboard is a web app with several views:
      </p>
      <table>
        <thead>
          <tr>
            <th>View</th>
            <th>What it shows</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Agent Graph</strong></td>
            <td>
              A visual map of all agents and how they&apos;re connected — who
              is talking to whom
            </td>
          </tr>
          <tr>
            <td><strong>Terminal</strong></td>
            <td>
              Live terminal output for each agent — you can watch them work
              and even type commands
            </td>
          </tr>
          <tr>
            <td><strong>Messages</strong></td>
            <td>
              A feed of all messages between agents, updated in real time
            </td>
          </tr>
          <tr>
            <td><strong>Context</strong></td>
            <td>
              The shared notepad — see all the notes agents have written for
              each other
            </td>
          </tr>
          <tr>
            <td><strong>Files</strong></td>
            <td>
              A log of file changes happening in your project as agents work
            </td>
          </tr>
          <tr>
            <td><strong>Rules</strong></td>
            <td>
              An editor for the shared rules file that all agents follow
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Where Clustr stores things</h2>
      <p>
        All of Clustr&apos;s data lives in a single folder on your machine
        (created automatically on first run). This includes:
      </p>
      <ul>
        <li>The database with agents, messages, and shared context</li>
        <li>The shared rules file</li>
        <li>Temporary config files for each agent (cleaned up automatically)</li>
        <li>Any images you paste into agent tasks</li>
      </ul>

      <div className="callout">
        <p>
          <strong>Everything is local.</strong> Clustr runs entirely on your
          machine. No data is sent to external servers (beyond the AI API
          calls that Claude and Codex make themselves).
        </p>
      </div>
    </>
  );
}
