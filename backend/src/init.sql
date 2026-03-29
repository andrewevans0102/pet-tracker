CREATE TABLE IF NOT EXISTS pets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT,
  emoji TEXT DEFAULT '🐾',
  feeding_interval_hours NUMERIC DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedings (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
  fed_at TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT DEFAULT 'feeding',
  notes TEXT
);

ALTER TABLE feedings ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'feeding';
