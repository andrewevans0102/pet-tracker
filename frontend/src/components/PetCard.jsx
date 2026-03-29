import React from 'react';
import FeedButton from './FeedButton.jsx';
import FeedingHistory from './FeedingHistory.jsx';
import './PetCard.css';

function getTimeSince(isoString) {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ${diffMins % 60}m ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function getStatus(lastEvent, intervalHours) {
  if (!lastEvent) return 'overdue';
  const now = Date.now();
  const eventAt = new Date(lastEvent.fed_at).getTime();
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const elapsed = now - eventAt;
  if (elapsed < intervalMs - 60 * 60 * 1000) return 'ok';
  if (elapsed < intervalMs) return 'soon';
  return 'overdue';
}

const FEEDING_STATUS_LABEL = { ok: 'Fed', soon: 'Due Soon', overdue: 'Overdue' };

const ACTIVITY_INTERVALS = { walk: 8, peed: 6, pooped: 24, litterbox: 48 };

const ACTIVITY_STATUS_LABELS = {
  walk:      { ok: 'Walked',  soon: 'Walk Soon',  overdue: 'Walk Due'   },
  peed:      { ok: 'Peed',    soon: 'Pee Soon',   overdue: 'Pee Due'    },
  pooped:    { ok: 'Pooped',  soon: 'Poop Soon',  overdue: 'Poop Due'   },
  litterbox: { ok: 'Clean',   soon: 'Clean Soon', overdue: 'Change Due' },
};

const EVENT_LABELS = {
  feeding: '🍽 Fed',
  walk: '🦮 Walk',
  peed: '💧 Peed',
  pooped: '💩 Pooped',
  litterbox: '🪣 Litterbox',
};

function ActivityRow({ label, last, eventType }) {
  const status = getStatus(last, ACTIVITY_INTERVALS[eventType]);
  const statusLabel = ACTIVITY_STATUS_LABELS[eventType][status];
  return (
    <div className="last-fed">
      <span className="last-fed-label">{label}</span>
      {last ? (
        <>
          <span className="last-fed-time">{getTimeSince(last.fed_at)}</span>
          {last.member_name && (
            <span className="last-fed-member">by {last.member_name}</span>
          )}
        </>
      ) : (
        <span className="last-fed-time">never</span>
      )}
      <span className={`status-badge status-badge--${status} activity-badge`}>
        {statusLabel}
      </span>
    </div>
  );
}

export default function PetCard({ pet, lastFeeding, feedings, onFeed, onDeleteFeeding }) {
  const feedingStatus = getStatus(lastFeeding, pet.feeding_interval_hours);
  const species = pet.species?.toLowerCase() || '';
  const isDog = species.includes('dog');
  const isCat = species.includes('cat');

  const getLastEvent = (eventType) =>
    feedings.find(f => f.event_type === eventType) || null;

  return (
    <div className={`pet-card pet-card--${feedingStatus}`}>
      <div className="pet-card-header">
        <span className="pet-emoji">{pet.emoji}</span>
        <div className="pet-info">
          <h3 className="pet-name">{pet.name}</h3>
          {pet.species && <span className="pet-species">{pet.species}</span>}
        </div>
        <span className={`status-badge status-badge--${feedingStatus}`}>
          {FEEDING_STATUS_LABEL[feedingStatus]}
        </span>
      </div>

      <div className="pet-card-body">
        <div className="last-fed">
          <span className="last-fed-label">Last fed:</span>
          {lastFeeding ? (
            <>
              <span className="last-fed-time">{getTimeSince(lastFeeding.fed_at)}</span>
              {lastFeeding.member_name && (
                <span className="last-fed-member">by {lastFeeding.member_name}</span>
              )}
            </>
          ) : (
            <span className="last-fed-time">never</span>
          )}
        </div>

        {isDog && ['walk', 'peed', 'pooped'].map(type => (
          <ActivityRow
            key={type}
            label={`Last ${type}:`}
            last={getLastEvent(type)}
            eventType={type}
          />
        ))}

        {isCat && (
          <ActivityRow label="Litterbox:" last={getLastEvent('litterbox')} eventType="litterbox" />
        )}

        <div className="interval-info">
          Feed every {pet.feeding_interval_hours}h
        </div>

        <div className="activity-buttons">
          <FeedButton petId={pet.id} onFeed={onFeed} />
          {isDog && (
            <>
              <FeedButton petId={pet.id} onFeed={onFeed} label="🦮 Walk" eventType="walk" />
              <FeedButton petId={pet.id} onFeed={onFeed} label="💧 Peed" eventType="peed" />
              <FeedButton petId={pet.id} onFeed={onFeed} label="💩 Pooped" eventType="pooped" />
            </>
          )}
          {isCat && (
            <FeedButton petId={pet.id} onFeed={onFeed} label="🪣 Litterbox" eventType="litterbox" />
          )}
        </div>
        <FeedingHistory feedings={feedings} onDelete={onDeleteFeeding} />
      </div>
    </div>
  );
}
