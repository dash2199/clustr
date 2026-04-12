import type { ContextEntry } from '../hooks/useSocket';
import './ContextViewer.css';

interface Props {
  entries: ContextEntry[];
  onRemove: (key: string) => void;
}

export default function ContextViewer({ entries, onRemove }: Props) {

  return (
    <div className="context-viewer">
      <div className="context-header">Shared Context</div>
      {entries.length === 0 && (
        <div className="context-empty">No context entries yet</div>
      )}
      <table className="context-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
            <th>Updated By</th>
            <th>Updated At</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.key}>
              <td className="context-key">{entry.key}</td>
              <td className="context-value">{entry.value}</td>
              <td>{entry.updated_by || '—'}</td>
              <td className="context-time">
                {entry.updated_at ? new Date(entry.updated_at).toLocaleTimeString() : '—'}
              </td>
              <td>
                <button
                  className="context-remove-btn"
                  onClick={() => onRemove(entry.key)}
                  title={`Remove "${entry.key}"`}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
