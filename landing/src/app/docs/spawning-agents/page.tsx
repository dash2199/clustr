export default function SpawningAgentsPage() {
  return (
    <>
      <h1>Spawning Agents</h1>
      <p className="subtitle">
        How to create and manage agents in your workspace.
      </p>

      <h2>From the dashboard</h2>
      <p>
        Click <strong>New Agent</strong> in the dashboard title bar. The spawn
        dialog asks for:
      </p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Name</strong></td>
            <td>
              A human-readable identifier (e.g., <code>api-refactor</code>).
              Other agents can message by name.
            </td>
          </tr>
          <tr>
            <td><strong>Task</strong></td>
            <td>
              A natural language description of what the agent should do. Be
              specific — this becomes the agent&apos;s primary instruction.
            </td>
          </tr>
          <tr>
            <td><strong>Service</strong></td>
            <td>
              <code>claude</code> or <code>codex</code> — which AI to use.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        The working directory defaults to the project you opened (via{" "}
        <strong>Open Project</strong>), or you can set it per-agent.
      </p>

      <h2>From another agent</h2>
      <p>
        Any running agent can spawn new agents to delegate work. For example,
        one agent discovers a problem and spawns a specialist to fix it. The
        spawning agent provides a name, task, and optionally the service type
        and working directory.
      </p>

      <h2>What happens at spawn</h2>
      <ol>
        <li>
          Clustr configures the agent with collaboration tools and instructions
        </li>
        <li>
          The AI is launched in its own terminal with your task
        </li>
        <li>
          Clustr handles all startup prompts and permissions automatically
        </li>
        <li>
          The agent appears in the dashboard and can start collaborating with
          other agents
        </li>
      </ol>

      <h2>Managing agents</h2>
      <p>
        From the dashboard, you can manage any agent:
      </p>
      <ul>
        <li>
          <strong>Kill</strong> — stops the agent but keeps its record so you
          can review what it did
        </li>
        <li>
          <strong>Remove</strong> — stops the agent and deletes its record
          entirely
        </li>
        <li>
          <strong>User Shell</strong> — open your own terminal in the same
          project folder when you want to run commands yourself
        </li>
      </ul>
    </>
  );
}
