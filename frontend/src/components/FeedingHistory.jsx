import React, { useState } from 'react';
import './FeedingHistory.css';

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EVENT_TYPE_LABELS = {
  feeding: '🍽 Fed',
  walk: '🦮 Walk',
  peed: '💧 Peed',
  pooped: '💩 Pooped',
  litterbox: '🪣 Litterbox',
};

export default function FeedingHistory({ feedings, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  if (!feedings || feedings.length === 0) return null;

  const visible = expanded ? feedings : feedings.slice(0, 3);

  return (
    <div className="feeding-history">
      <button
        className="history-toggle"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? '▲ Hide' : `▼ History (${feedings.length})`}
      </button>
      {expanded && (
        <ul className="history-list">
          {visible.map(f => (
            <li key={f.id} className="history-item">
              <span className="history-event-type">
                {EVENT_TYPE_LABELS[f.event_type] || EVENT_TYPE_LABELS.feeding}
              </span>
              <span className="history-time">{formatTime(f.fed_at)}</span>
              {f.member_name && (
                <span className="history-member">by {f.member_name}</span>
              )}
              <button
                className="history-delete"
                onClick={() => onDelete(f.id)}
                title="Delete record"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
