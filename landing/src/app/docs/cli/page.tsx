export default function CliPage() {
  return (
    <>
      <h1>CLI & Configuration</h1>
      <p className="subtitle">
        Running Clustr from the command line and configuring your workspace.
      </p>

      <h2>Quick start</h2>
      <pre>
        <code>npx clustr-ai</code>
      </pre>
      <p>
        This is the simplest way to run Clustr. It downloads the package,
        auto-builds if needed, and starts the server on port 3100.
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
            <td>Port for the Clustr server and dashboard</td>
          </tr>
          <tr>
            <td><code>CLUSTR_MAX_AGENTS</code></td>
            <td><code>5</code></td>
            <td>Maximum number of concurrent agents</td>
          </tr>
          <tr>
            <td><code>CLUSTR_TUNNEL</code></td>
            <td><code>—</code></td>
            <td>Set to <code>1</code> to start a Cloudflare tunnel for remote (cellular) access</td>
          </tr>
        </tbody>
      </table>

      <h2>Mobile access</h2>
      <p>
        Clustr has built-in support for monitoring and controlling your agent
        swarm from a phone or tablet on the same network.
      </p>
      <ol>
        <li>
          Click the <strong>Connect Phone</strong> button (📱) in the dashboard
          header.
        </li>
        <li>
          A QR code will appear — scan it with your phone&apos;s camera.
        </li>
        <li>
          Your phone opens the dashboard with a secure session token. No
          account or sign-in needed.
        </li>
      </ol>
      <p>
        The dashboard is a PWA — you can add it to your home screen for a
        native-app feel.
      </p>

      <h2>Remote access over cellular</h2>
      <p>
        To reach your Clustr instance from outside your local network (e.g.
        over a cellular connection), start Clustr with the tunnel flag:
      </p>
      <pre>
        <code>CLUSTR_TUNNEL=1 npx clustr-ai</code>
      </pre>
      <p>
        This starts a Cloudflare tunnel and displays a public URL you can
        use from anywhere. The pairing QR code will automatically include the
        tunnel URL.
      </p>
      <div className="callout">
        <p>
          <strong>Prerequisite:</strong> <code>cloudflared</code> must be
          installed. Install it with{" "}
          <code>brew install cloudflared</code> (macOS) or from the{" "}
          <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" target="_blank" rel="noopener noreferrer">
            Cloudflare downloads page
          </a>.
        </p>
      </div>

      <h2>Data storage</h2>
      <p>
        Clustr stores all runtime data in a local folder on your machine
        (created automatically on first run). This includes the agent database,
        the shared rules file, temporary agent configs, and any
        uploaded images. Everything stays local — nothing is sent to external
        servers.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>
          <strong>Node.js 18+</strong> — required for the Clustr server
        </li>
        <li>
          <strong>Claude Code CLI</strong> — install with{" "}
          <code>npm install -g @anthropic-ai/claude-code</code> (for Claude
          agents)
        </li>
        <li>
          <strong>Codex CLI</strong> — install with{" "}
          <code>npm install -g @openai/codex</code> (for Codex agents)
        </li>
      </ul>
      <p>
        You need at least one of the AI CLIs installed. You can use both in
        the same workspace.
      </p>

      <div className="callout">
        <p>
          <strong>Tip:</strong> You can customize the port with{" "}
          <code>CLUSTR_PORT=8080 npx clustr-ai</code> if port 3100 is already in
          use.
        </p>
      </div>
    </>
  );
}
