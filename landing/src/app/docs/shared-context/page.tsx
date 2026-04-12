export default function SharedContextPage() {
  return (
    <>
      <h1>Shared Context</h1>
      <p className="subtitle">
        A shared notepad that all agents can read and write.
      </p>

      <h2>Writing context</h2>
      <p>
        Any agent can write a labeled note to shared context. For example, an
        agent might write a note with the key{" "}
        <code>api-schema-change</code> and the value{" "}
        <code>Added &apos;role&apos; field to /api/users response</code>.
      </p>
      <p>
        If the key already exists, its value is overwritten. Each write records
        which agent made the update and when.
      </p>

      <h2>Reading context</h2>
      <p>
        Agents can read all context entries at once, or look up a specific key.
        Each entry shows the key, value, which agent wrote it, and when it was
        last updated.
      </p>

      <h2>Best practices</h2>
      <ul>
        <li>
          <strong>Keep values concise</strong> — every agent reads shared
          context, so brevity saves tokens. Use bullet points and key facts, not
          verbose prose.
        </li>
        <li>
          <strong>Use descriptive keys</strong> — keys like{" "}
          <code>auth-migration-plan</code> are better than <code>plan</code>.
        </li>
        <li>
          <strong>Write after meaningful work</strong> — when you finish a task
          or discover something important, write it to context so other agents
          benefit.
        </li>
        <li>
          <strong>Read before starting</strong> — check shared context at the
          beginning of your task to see what others have already figured out.
        </li>
      </ul>

      <h2>Context viewer</h2>
      <p>
        The dashboard includes a <strong>Context</strong> tab that shows all
        current entries in real time. You can see which agent wrote each entry
        and when. Context entries can also be deleted from the dashboard or via
        the REST API.
      </p>
    </>
  );
}
