-- Agricultural Input Subsidy Distribution Register
-- One flat table, matching the fields required by the problem statement.
-- entitlement_qty is repeated on every row for the same farmer_id + input_type
-- on purpose: this is a flat distribution log, not a normalised entitlement master.

CREATE TABLE IF NOT EXISTS distributions (
  record_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id        TEXT NOT NULL,
  farmer_name      TEXT,
  village          TEXT,
  input_type       TEXT NOT NULL,
  entitlement_qty  REAL,
  issued_qty       REAL NOT NULL,
  issue_date       TEXT,
  balance          REAL
);
