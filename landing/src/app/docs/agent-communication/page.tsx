export default function AgentCommunicationPage() {
  return (
    <>
      <h1>Agent Communication</h1>
      <p className="subtitle">
        How agents talk to each other in a Clustr workspace.
      </p>

      <h2>Direct messages</h2>
      <p>
        Agents can send messages to each other by name. For example, one agent
        can message another to say &quot;the API schema changed&quot; or
        &quot;please re-run the tests.&quot;
      </p>
      <p>
        The message is saved and delivered directly to the target agent&apos;s
        terminal, so the agent sees it immediately.
      </p>

      <h2>Broadcast messages</h2>
      <p>
        Agents can also broadcast a message to every agent in the workspace at
        once. This is useful for announcements like &quot;build is passing,
        everyone can proceed.&quot;
      </p>

      <h2>Reading messages</h2>
      <p>
        Agents can check for new messages at any time. Unread messages are
        returned with details about who sent them and when. Messages are
        automatically marked as read once fetched.
      </p>

      <h2>Dashboard message bar</h2>
      <p>
        The dashboard footer includes a <strong>message bar</strong> where you
        (the human) can send messages to any agent or broadcast to all. This is
        useful for giving agents mid-task instructions or asking for status
        updates.
      </p>

      <h2>How delivery works</h2>
      <p>
        When a message arrives, Clustr delivers a notification directly into
        the target agent&apos;s terminal. The agent sees a prompt telling it
        a new message is available, reads it, and decides how to respond.
      </p>

      <h2>Discovery</h2>
      <p>
        Agents can see who else is in the workspace at any time — including
        each agent&apos;s name, what service it&apos;s running (Claude or
        Codex), what task it&apos;s working on, and whether it&apos;s still
        active.
      </p>
      <p>
        This lets agents find collaborators dynamically — for example, an agent
        working on tests can discover and message the agent that wrote the code
        being tested.
      </p>
    </>
  );
}
