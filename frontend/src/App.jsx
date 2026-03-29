import React, { useState, useEffect, useCallback } from 'react';
import PetCard from './components/PetCard.jsx';
import AddPetForm from './components/AddPetForm.jsx';
import MemberSelector from './components/MemberSelector.jsx';
import './App.css';

export default function App() {
  const [pets, setPets] = useState([]);
  const [members, setMembers] = useState([]);
  const [feedings, setFeedings] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [view, setView] = useState('home'); // home | manage
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [petsRes, membersRes, feedingsRes] = await Promise.all([
        fetch('/api/pets'),
        fetch('/api/members'),
        fetch('/api/feedings'),
      ]);
      if (!petsRes.ok || !membersRes.ok || !feedingsRes.ok) throw new Error('Fetch failed');
      const [petsData, membersData, feedingsData] = await Promise.all([
        petsRes.json(),
        membersRes.json(),
        feedingsRes.json(),
      ]);
      setPets(petsData);
      setMembers(membersData);
      setFeedings(feedingsData);
      setError(null);
    } catch (err) {
      setError('Could not connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleFeed = async (petId, eventType = 'feeding') => {
    const body = { pet_id: petId, event_type: eventType };
    if (selectedMember) body.member_id = parseInt(selectedMember);
    const res = await fetch('/api/feedings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) fetchAll();
  };

  const handleDeletePet = async (petId) => {
    if (!confirm('Delete this pet and all their feeding history?')) return;
    await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
    fetchAll();
  };

  const handleAddPet = async (petData) => {
    const res = await fetch('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(petData),
    });
    if (res.ok) fetchAll();
  };

  const handleUpdatePet = async (petId, petData) => {
    const res = await fetch(`/api/pets/${petId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(petData),
    });
    if (res.ok) fetchAll();
  };

  const handleAddMember = async (name) => {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) fetchAll();
  };

  const handleDeleteMember = async (id) => {
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const handleDeleteFeeding = async (id) => {
    await fetch(`/api/feedings/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const getLastFeeding = (petId) => {
    return feedings.find(f => f.pet_id === petId && (f.event_type === 'feeding' || !f.event_type)) || null;
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1>🐾 Pet Tracker</h1>
          <nav>
            <button
              className={`nav-btn ${view === 'home' ? 'active' : ''}`}
              onClick={() => setView('home')}
            >
              Pets
            </button>
            <button
              className={`nav-btn ${view === 'manage' ? 'active' : ''}`}
              onClick={() => setView('manage')}
            >
              Manage
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {error && <div className="error-banner">{error}</div>}

        {view === 'home' && (
          <>
            <div className="member-bar">
              <MemberSelector
                members={members}
                selected={selectedMember}
                onChange={setSelectedMember}
              />
            </div>
            {pets.length === 0 ? (
              <div className="empty-state">
                <p>No pets yet. Go to Manage to add your first pet!</p>
              </div>
            ) : (
              <div className="pet-grid">
                {pets.map(pet => (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    lastFeeding={getLastFeeding(pet.id)}
                    feedings={feedings.filter(f => f.pet_id === pet.id)}
                    onFeed={handleFeed}
                    onDeleteFeeding={handleDeleteFeeding}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {view === 'manage' && (
          <div className="manage-view">
            <section className="manage-section">
              <h2>Pets</h2>
              <AddPetForm onAdd={handleAddPet} />
              <div className="manage-list">
                {pets.map(pet => (
                  <div key={pet.id} className="manage-item">
                    <span className="manage-item-label">
                      {pet.emoji} {pet.name}
                      {pet.species && <span className="species"> ({pet.species})</span>}
                      <span className="interval"> — every {pet.feeding_interval_hours}h</span>
                    </span>
                    <button
                      className="btn-danger-sm"
                      onClick={() => handleDeletePet(pet.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {pets.length === 0 && <p className="empty-sm">No pets added yet.</p>}
              </div>
            </section>

            <section className="manage-section">
              <h2>Family Members</h2>
              <AddMemberForm onAdd={handleAddMember} />
              <div className="manage-list">
                {members.map(m => (
                  <div key={m.id} className="manage-item">
                    <span className="manage-item-label">{m.name}</span>
                    <button
                      className="btn-danger-sm"
                      onClick={() => handleDeleteMember(m.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {members.length === 0 && <p className="empty-sm">No members added yet.</p>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function AddMemberForm({ onAdd }) {
  const [name, setName] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
  };
  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Member name"
        required
      />
      <button type="submit" className="btn-primary">Add</button>
    </form>
  );
}
