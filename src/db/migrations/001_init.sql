CREATE TABLE groups (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  currency   TEXT NOT NULL CHECK (currency IN ('JPY', 'USD', 'EUR', 'UZS')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE members (
  id          INTEGER PRIMARY KEY,
  group_id    TEXT NOT NULL REFERENCES groups(id),
  name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
  archived_at TEXT
);

CREATE TABLE expenses (
  id           INTEGER PRIMARY KEY,
  group_id     TEXT NOT NULL REFERENCES groups(id),
  paid_by      INTEGER NOT NULL REFERENCES members(id),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  note         TEXT NOT NULL DEFAULT '',
  spent_on     TEXT NOT NULL CHECK (date(spent_on) IS spent_on),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at  TEXT
);

CREATE TABLE splits (
  expense_id  INTEGER NOT NULL REFERENCES expenses(id),
  member_id   INTEGER NOT NULL REFERENCES members(id),
  share_minor INTEGER NOT NULL CHECK (share_minor >= 0),
  PRIMARY KEY (expense_id, member_id)
);

CREATE TABLE settlements (
  id           INTEGER PRIMARY KEY,
  group_id     TEXT NOT NULL REFERENCES groups(id),
  from_member  INTEGER NOT NULL REFERENCES members(id),
  to_member    INTEGER NOT NULL REFERENCES members(id),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (from_member <> to_member)
);

-- Indexes
CREATE INDEX idx_members_group ON members(group_id);
CREATE UNIQUE INDEX idx_members_group_name_active
  ON members(group_id, name) WHERE archived_at IS NULL;
CREATE INDEX idx_expenses_group_spent_on ON expenses(group_id, spent_on);
CREATE INDEX idx_splits_member ON splits(member_id);
CREATE INDEX idx_settlements_group_created ON settlements(group_id, created_at);

-- Balance = paid - owed + settlements sent - settlements received
CREATE VIEW member_balances AS
SELECT
  m.id AS member_id,
  m.group_id,
  m.name,
  m.archived_at,
  COALESCE(p.total, 0) - COALESCE(o.total, 0)
    + COALESCE(s.total, 0) - COALESCE(r.total, 0) AS balance_minor
FROM members m
LEFT JOIN (
  SELECT paid_by AS member_id, SUM(amount_minor) AS total
  FROM expenses WHERE archived_at IS NULL
  GROUP BY paid_by
) p ON p.member_id = m.id
LEFT JOIN (
  SELECT sp.member_id, SUM(sp.share_minor) AS total
  FROM splits sp
  JOIN expenses e ON e.id = sp.expense_id
  WHERE e.archived_at IS NULL
  GROUP BY sp.member_id
) o ON o.member_id = m.id
LEFT JOIN (
  SELECT from_member AS member_id, SUM(amount_minor) AS total
  FROM settlements GROUP BY from_member
) s ON s.member_id = m.id
LEFT JOIN (
  SELECT to_member AS member_id, SUM(amount_minor) AS total
  FROM settlements GROUP BY to_member
) r ON r.member_id = m.id;