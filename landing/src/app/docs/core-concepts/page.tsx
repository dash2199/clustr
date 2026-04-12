export default function CoreConceptsPage() {
  return (
    <>
      <h1>Core Concepts</h1>
      <p className="subtitle">
        The building blocks of a Clustr workspace — explained simply.
      </p>

      <h2>Agents</h2>
      <p>
        An <strong>agent</strong> is an AI assistant that works on your code.
        When you spawn an agent, Clustr launches a coding AI (like Claude or
        Codex) in its own terminal and gives it a task to work on.
      </p>
      <p>Each agent gets:</p>
      <ul>
        <li>Its own terminal with full access to your project files</li>
        <li>A name you choose (e.g., <code>frontend-refactor</code>)</li>
        <li>A task that tells it what to do</li>
        <li>Built-in tools to talk to other agents</li>
        <li>
          A safety snapshot of your code taken before it starts, so you can
          undo its changes if needed
        </li>
      </ul>
      <p>
        Agents go through three states: <code>spawning</code> (starting up),{" "}
        <code>running</code> (actively working), and <code>done</code>{" "}
        (finished or stopped). Clustr automatically detects when an agent has
        stopped working and marks it as done.
      </p>

      <h2>Messages</h2>
      <p>
        Agents can <strong>talk to each other</strong> by sending messages.
        This is how they coordinate — for example, one agent can tell another
        that it changed an API endpoint, or ask another agent for help.
      </p>
      <p>Messages come in two flavors:</p>
      <ul>
        <li>
          <strong>Direct messages</strong> — sent to one specific agent by name
          (e.g., &quot;Hey test-runner, please re-run the tests&quot;)
        </li>
        <li>
          <strong>Broadcasts</strong> — sent to every agent at once (e.g.,
          &quot;Build is passing, everyone can proceed&quot;)
        </li>
      </ul>
      <p>
        All messages are saved and show up in the dashboard&apos;s message
        feed in real time. When an agent receives a message, it gets notified
        immediately.
      </p>

      <h2>Shared context</h2>
      <p>
        Think of shared context as a <strong>team whiteboard</strong> that all
        agents can see. It&apos;s a simple list of labeled notes (key-value
        pairs) that any agent can add to or read from.
      </p>
      <p>
        For example, if one agent figures out that the database schema changed,
        it can write that to shared context. Every other agent can then read
        that note and adjust their work accordingly — without anyone having to
        send individual messages.
      </p>
      <p>
        The dashboard shows the shared context in real time, so you can always
        see what your agents know.
      </p>

      <h2>Rules</h2>
      <p>
        Clustr has a shared rules file where you write{" "}
        <strong>rules and instructions</strong> that apply to every agent. Every
        agent reads this file when it starts and checks it periodically for
        updates.
      </p>
      <p>Use it for things like:</p>
      <ul>
        <li>Team rules — &quot;never push directly to the main branch&quot;</li>
        <li>Naming conventions — &quot;use this branch naming format&quot;</li>
        <li>Project notes — &quot;we&apos;re in the middle of migrating the auth system&quot;</li>
        <li>Coordination — &quot;Agent A owns the API; check with it before changing endpoints&quot;</li>
      </ul>
      <p>
        You can edit the rules from the dashboard, or any agent can update
        them too.
      </p>

      <h2>Services (Claude & Codex)</h2>
      <p>
        A <strong>service</strong> is which AI coding tool an agent uses.
        Clustr currently supports two:
      </p>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>What it is</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>claude</code></td>
            <td>Anthropic&apos;s Claude Code</td>
            <td>Interactive tasks, complex reasoning, multi-step work</td>
          </tr>
          <tr>
            <td><code>codex</code></td>
            <td>OpenAI&apos;s Codex</td>
            <td>Autonomous execution, quick focused tasks</td>
          </tr>
        </tbody>
      </table>
      <p>
        You can mix and match — run Claude agents and Codex agents in the same
        workspace. They all use the same messaging and shared context system,
        so they can collaborate regardless of which AI powers them.
      </p>

      <h2>Built-in collaboration tools</h2>
      <p>
        Every agent automatically gets a set of <strong>built-in tools</strong>{" "}
        that let it interact with the Clustr workspace. These tools let agents:
      </p>
      <ul>
        <li>Register themselves and announce what they&apos;re working on</li>
        <li>See who else is in the workspace</li>
        <li>Send and receive messages</li>
        <li>Read and write shared context</li>
        <li>Spawn new agents to delegate work</li>
      </ul>
      <p>
        You don&apos;t need to configure these — Clustr sets them up
        automatically for every agent it spawns.
      </p>
    </>
  );
}
