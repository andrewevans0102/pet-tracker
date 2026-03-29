import React, { useState } from 'react';
import './AddPetForm.css';

const EMOJI_OPTIONS = ['🐶', '🐱', '🐰', '🐹', '🐦', '🐠', '🐢', '🦎', '🐍', '🐾'];

export default function AddPetForm({ onAdd }) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [emoji, setEmoji] = useState('🐾');
  const [interval, setInterval] = useState('8');
  const [open, setOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      species: species.trim() || undefined,
      emoji,
      feeding_interval_hours: parseFloat(interval) || 8,
    });
    setName('');
    setSpecies('');
    setEmoji('🐾');
    setInterval('8');
    setOpen(false);
  };

  if (!open) {
    return (
      <button className="add-pet-trigger btn-primary" onClick={() => setOpen(true)}>
        + Add Pet
      </button>
    );
  }

  return (
    <form className="add-pet-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="emoji-picker">
          <label>Icon</label>
          <div className="emoji-options">
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                type="button"
                className={`emoji-btn ${emoji === e ? 'selected' : ''}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="form-row">
        <label>Name *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Buddy"
          required
        />
      </div>
      <div className="form-row">
        <label>Species</label>
        <input
          value={species}
          onChange={e => setSpecies(e.target.value)}
          placeholder="e.g. Dog, Cat, Rabbit"
        />
      </div>
      <div className="form-row">
        <label>Feeding interval (hours)</label>
        <input
          type="number"
          value={interval}
          onChange={e => setInterval(e.target.value)}
          min="0.5"
          max="48"
          step="0.5"
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save Pet</button>
        <button type="button" className="btn-cancel" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
