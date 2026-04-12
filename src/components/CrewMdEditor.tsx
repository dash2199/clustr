import { useState, useEffect, useRef } from 'react';
import './CrewMdEditor.css';

interface Props {
  content: string;
  onChange: (content: string) => void;
}

export default function CrewMdEditor({ content, onChange }: Props) {
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!dirty) setDraft(content);
  }, [content, dirty]);

  const handleChange = (value: string) => {
    setDraft(value);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/crewmd', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      });
      onChange(draft);
      setDirty(false);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (dirty) handleSave();
    }
  };

  return (
    <div className="crewmd-editor">
      <div className="crewmd-header">
        <span className="crewmd-title">Rules</span>
        <div className="crewmd-actions">
          {dirty && <span className="crewmd-dirty">unsaved</span>}
          <button
            className="crewmd-save-btn"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        className="crewmd-textarea"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder="Write global instructions for all agents..."
      />
    </div>
  );
}
