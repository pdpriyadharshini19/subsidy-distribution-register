// server.js
// Agricultural Input Subsidy Distribution Register - backend
//
// All validation and the balance calculation happen here, on the server,
// so that every screen (and every officer) sees the same number, and a
// record can never be saved that the server has not itself checked.

const path = require("path");
const fs = require("fs");
const express = require("express");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "data", "subsidy.db");

if (!fs.existsSync(DB_PATH)) {
  console.error(
    "Database not found. Run `npm run seed` first to create data/subsidy.db."
  );
  process.exit(1);
}

const db = new Database(DB_PATH);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const VALID_INPUT_TYPES = ["Paddy Seed", "Urea Fertiliser", "DAP Fertiliser"];

// ---------- GET /api/meta ----------
app.get("/api/meta", (req, res) => {
  const villages = db
    .prepare(
      "SELECT DISTINCT village FROM distributions WHERE village IS NOT NULL AND village <> '' ORDER BY village"
    )
    .all()
    .map((r) => r.village);
  const inputTypes = db
    .prepare(
      "SELECT DISTINCT input_type FROM distributions WHERE input_type IS NOT NULL ORDER BY input_type"
    )
    .all()
    .map((r) => r.input_type);
  res.json({ villages, inputTypes });
});

// ---------- GET /api/records ----------
app.get("/api/records", (req, res) => {
  const { search = "", village = "", input_type = "" } = req.query;

  let sql = "SELECT * FROM distributions WHERE 1=1";
  const params = {};

  if (search.trim()) {
    sql += " AND (farmer_id LIKE @search OR farmer_name LIKE @search)";
    params.search = `%${search.trim()}%`;
  }
  if (village.trim()) {
    sql += " AND village = @village";
    params.village = village.trim();
  }
  if (input_type.trim()) {
    sql += " AND input_type = @input_type";
    params.input_type = input_type.trim();
  }

  sql +=
    " ORDER BY (balance IS NULL) DESC, balance ASC, issue_date DESC, record_id DESC";

  const records = db.prepare(sql).all(params);
  res.json({ count: records.length, records });
});

// ---------- GET /api/records/:id ----------
app.get("/api/records/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid record id." });
  }
  const record = db
    .prepare("SELECT * FROM distributions WHERE record_id = ?")
    .get(id);
  if (!record) {
    return res.status(404).json({ error: "Record not found." });
  }
  res.json({ record });
});

// ---------- POST /api/records ----------
// On-Spot Change 2: the check ("how much remains?") and the write ("save the
// issue") are wrapped in one atomic SQLite transaction, using an IMMEDIATE
// lock. BEGIN IMMEDIATE takes the write lock the moment the transaction
// starts, instead of only when the INSERT itself runs, so a second
// transaction trying to run at the same time cannot read a stale "remaining"
// value while the first is still mid-way through deciding whether to save.
// SQLite queues the second transaction until the first commits or rolls
// back, so exactly one of two simultaneous requests for the same farmer +
// input type can succeed; the other sees the balance *after* the first one
// committed and is correctly refused.
const saveDistribution = db.transaction((fields) => {
  const { farmer_id, farmer_name, phone_number, village, input_type, entitlement_qty, issued_qty, issue_date } = fields;

  const priorRows = db
    .prepare(
      "SELECT issued_qty, entitlement_qty FROM distributions WHERE farmer_id = ? AND input_type = ?"
    )
    .all(farmer_id, input_type);

  const alreadyIssued = priorRows.reduce((sum, r) => sum + (r.issued_qty || 0), 0);

  const effectiveEntitlement =
    priorRows.length > 0 ? priorRows[0].entitlement_qty : entitlement_qty;

  const remainingBefore = effectiveEntitlement - alreadyIssued;

  if (priorRows.length > 0 && remainingBefore <= 0) {
    return {
      conflict: true,
      status: 409,
      error: "This entitlement has already been fully drawn.",
      details: [
        `${farmer_name || farmer_id} has already collected ${alreadyIssued} of ${effectiveEntitlement} for ${input_type}.`,
      ],
    };
  }

  if (issued_qty > remainingBefore) {
    return {
      conflict: true,
      status: 409,
      error: "Issued quantity exceeds the remaining entitlement.",
      details: [`Only ${remainingBefore} remains for ${input_type} against this entitlement.`],
    };
  }

  const balance = Math.round((remainingBefore - issued_qty) * 100) / 100;

  const result = db
    .prepare(
      `INSERT INTO distributions
        (farmer_id, farmer_name, phone_number, village, input_type, entitlement_qty, issued_qty, issue_date, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      farmer_id,
      farmer_name,
      phone_number || null,
      village,
      input_type,
      effectiveEntitlement,
      issued_qty,
      issue_date,
      balance
    );

  const record = db
    .prepare("SELECT * FROM distributions WHERE record_id = ?")
    .get(result.lastInsertRowid);

  return { conflict: false, record };
}, { immediate: true });

app.post("/api/records", (req, res) => {
  const body = req.body || {};
  const errors = [];

  const farmer_id = String(body.farmer_id || "").trim();
  const farmer_name = String(body.farmer_name || "").trim();
  const phone_number = String(body.phone_number || "").trim();
  const village = String(body.village || "").trim();
  const input_type = String(body.input_type || "").trim();
  const issue_date = String(body.issue_date || "").trim();
  const entitlement_qty = Number(body.entitlement_qty);
  const issued_qty = Number(body.issued_qty);

  if (!farmer_id) errors.push("Farmer ID is required.");
  if (!farmer_name) errors.push("Farmer name is required.");
  if (!village) errors.push("Village is required.");
  if (!input_type) errors.push("Input type is required.");
  else if (!VALID_INPUT_TYPES.includes(input_type))
    errors.push(`Input type must be one of: ${VALID_INPUT_TYPES.join(", ")}.`);
  if (!issue_date) errors.push("Issue date is required.");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(issue_date))
    errors.push("Issue date must be in YYYY-MM-DD format.");
  if (!Number.isFinite(entitlement_qty) || entitlement_qty <= 0)
    errors.push("Entitlement quantity must be a number greater than 0.");
  if (!Number.isFinite(issued_qty) || issued_qty <= 0)
    errors.push("Issued quantity must be a number greater than 0.");
  if (phone_number && !/^\d{10}$/.test(phone_number))
    errors.push("Phone number must be exactly 10 digits, if provided.");

  if (errors.length) {
    return res.status(400).json({ error: "Validation failed.", details: errors });
  }

  let outcome;
  try {
    outcome = saveDistribution({
      farmer_id,
      farmer_name,
      phone_number,
      village,
      input_type,
      entitlement_qty,
      issued_qty,
      issue_date,
    });
  } catch (err) {
    return res.status(409).json({
      error: "Could not save right now — another request for this record was in progress. Please try again.",
      details: [],
    });
  }

  if (outcome.conflict) {
    return res.status(outcome.status).json({ error: outcome.error, details: outcome.details });
  }

  res.status(201).json({ record: outcome.record });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Subsidy Distribution Register running at http://localhost:${PORT}`);
});