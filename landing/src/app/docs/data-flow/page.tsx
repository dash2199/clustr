export default function DataFlowPage() {
  return (
    <>
      <h1>Data Flow</h1>
      <p className="subtitle">
        How information moves through Clustr when agents collaborate.
      </p>

      <h2>Agent spawn flow</h2>
      <ol>
        <li>
          You click <strong>New Agent</strong> in the dashboard (or an existing
          agent spawns one programmatically)
        </li>
        <li>
          Clustr takes a git snapshot of your code for safe rollback
        </li>
        <li>
          Clustr launches the AI (Claude or Codex) in its own terminal with
          your task and collaboration tools
        </li>
        <li>
          Startup prompts and permissions are handled automatically
        </li>
        <li>
          The agent appears in the dashboard and begins working
        </li>
      </ol>

      <h2>Message flow</h2>
      <ol>
        <li>
          Agent A sends a message to Agent B (by name or to everyone)
        </li>
        <li>
          Clustr saves the message and delivers it to Agent B&apos;s terminal
        </li>
        <li>
          The dashboard message feed updates in real time
        </li>
        <li>
          Agent B sees the notification, reads the full message, and can
          respond
        </li>
      </ol>

      <h2>Context flow</h2>
      <ol>
        <li>
          An agent writes a note to shared context (e.g., key:{" "}
          <code>&quot;api-status&quot;</code>, value:{" "}
          <code>&quot;migration complete&quot;</code>)
        </li>
        <li>
          Clustr saves it and notifies the dashboard instantly
        </li>
        <li>
          Any other agent can read it at any time
        </li>
      </ol>

      <h2>Real-time updates</h2>
      <p>
        The dashboard stays in sync with the server through a live connection.
        Here&apos;s what updates automatically:
      </p>
      <table>
        <thead>
          <tr>
            <th>What changes</th>
            <th>When it updates</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Agent list</strong></td>
            <td>When an agent is spawned, starts running, finishes, or is stopped</td>
          </tr>
          <tr>
            <td><strong>Messages</strong></td>
            <td>When any agent sends a message</td>
          </tr>
          <tr>
            <td><strong>Shared context</strong></td>
            <td>When any agent writes or removes a context entry</td>
          </tr>
          <tr>
            <td><strong>Terminal output</strong></td>
            <td>As agents produce output in their terminals</td>
          </tr>
          <tr>
            <td><strong>Rules</strong></td>
            <td>When anyone edits the shared rules file</td>
          </tr>
          <tr>
            <td><strong>File changes</strong></td>
            <td>When agents create, modify, or delete files in your project</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
