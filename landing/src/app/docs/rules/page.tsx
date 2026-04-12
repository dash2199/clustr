export default function RulesPage() {
  return (
    <>
      <h1>Rules</h1>
      <p className="subtitle">
        A shared instructions file that every agent follows.
      </p>

      <h2>What are Rules?</h2>
      <p>
        Rules is a shared file that Clustr manages for you. Every agent
        receives its contents when it starts, and agents periodically re-read
        it to pick up any changes.
      </p>
      <p>
        Think of it as a team rulebook — anything you put here applies to
        every agent in the workspace.
      </p>

      <h2>Default contents</h2>
      <pre>
        <code>{`# Global Agent Instructions

This file is read by every agent at startup and should be re-read periodically.
Keep entries concise to save tokens.

## Rules
- Write concise context: bullet points, key facts only — no verbose prose.
- Re-read this file periodically to stay current with team knowledge.
- When stuck, list other agents and ask for help.
- Before starting work, read shared context to see what others have already discovered.

## Project Notes
- **Never push from master branch.** Only push from feature branches.
- Branch naming: \`corpID/JIRA_ID\` (e.g. \`apatel15/PLICS-1234\`)`}</code>
      </pre>

      <h2>Editing Rules</h2>
      <p>You can edit the rules from three places:</p>
      <ul>
        <li>
          <strong>Dashboard</strong> — the <strong>Rules</strong> tab provides
          a live editor
        </li>
        <li>
          <strong>Any agent</strong> — agents can read and edit the rules file
          directly using their file editing tools
        </li>
        <li>
          <strong>REST API</strong> — read and update programmatically
        </li>
      </ul>

      <h2>What to put in Rules</h2>
      <ul>
        <li>
          <strong>Team rules</strong> — e.g., &quot;never push directly to the
          main branch&quot;, &quot;always run tests before committing&quot;
        </li>
        <li>
          <strong>Naming conventions</strong> — branch naming patterns, commit
          message formats
        </li>
        <li>
          <strong>Project notes</strong> — architectural decisions, known
          issues, migration status
        </li>
        <li>
          <strong>Agent coordination</strong> — e.g., &quot;Agent A owns the
          API; check with it before changing endpoints&quot;
        </li>
        <li>
          <strong>Context writing guidelines</strong> — what to write to shared
          context and when
        </li>
      </ul>

      <div className="callout">
        <p>
          <strong>Tip:</strong> Keep the rules concise. Every token in this
          file is included in every agent&apos;s context, so verbose
          instructions waste capacity across all agents.
        </p>
      </div>
    </>
  );
}
