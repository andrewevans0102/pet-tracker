import React, { useState } from 'react';
import './FeedButton.css';

export default function FeedButton({ petId, onFeed, label = '🍽 Fed!', eventType = 'feeding' }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onFeed(petId, eventType);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="feed-btn" onClick={handleClick} disabled={loading}>
      {loading ? 'Logging...' : label}
    </button>
  );
}
