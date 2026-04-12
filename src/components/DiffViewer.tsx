import './DiffViewer.css';

interface Props {
  diff: string;
  fileName?: string;
}

export default function DiffViewer({ diff, fileName }: Props) {
  const lines = diff.split('\n');

  return (
    <div className="diff-viewer">
      {fileName && <div className="diff-filename">{fileName}</div>}
      <pre className="diff-content">
        {lines.map((line, i) => {
          let cls = 'diff-line';
          if (line.startsWith('+') && !line.startsWith('+++')) cls += ' diff-add';
          else if (line.startsWith('-') && !line.startsWith('---')) cls += ' diff-del';
          else if (line.startsWith('@@')) cls += ' diff-hunk';
          else if (line.startsWith('\\')) cls += ' diff-meta';
          return (
            <div key={i} className={cls}>
              {line}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
