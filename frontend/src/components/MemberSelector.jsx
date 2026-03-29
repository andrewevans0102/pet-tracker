import React from 'react';
import './MemberSelector.css';

export default function MemberSelector({ members, selected, onChange }) {
  return (
    <div className="member-selector">
      <label htmlFor="member-select">Who's feeding?</label>
      <select
        id="member-select"
        value={selected}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— Select family member —</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );
}
