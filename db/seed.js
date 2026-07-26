// db/seed.js
// Builds data/subsidy.db from schema.sql and loads ~40 sample distribution
// records, including the awkward cases required by the task:
//   1. A record with a missing value      -> record_id 14 (village is missing)
//   2. Two very similar farmer names       -> "Muthu Kumar" (F020) and
//                                              "Muthukumar" (F021), same village
//   3. A record with nothing related to it -> farmer_id F999 (a stray / test
//                                              row that does not belong to any
//                                              real distribution round)
//
// Balance is calculated exactly the way the server calculates it for a new
// submission: balance = entitlement_qty - (sum of issued_qty so far for that
// farmer_id + input_type, including the current row). This is why two rows
// for the same farmer_id + input_type below (F005) show a shrinking balance
// across the two issues, ending at 0 once the entitlement is fully drawn.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "..", "data", "subsidy.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

// Reset the database file so re-running `npm run seed` always gives a clean,
// predictable dataset.
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

// Each row: [farmer_id, farmer_name, village, input_type, entitlement_qty, issued_qty, issue_date]
// entitlement_qty or village or issue_date may be null to represent real-world gaps in the register.
const rows = [
  ["F001", "Ravi Kumar",       "Kambainallur", "Paddy Seed",     25, 25, "2026-06-02"],
  ["F002", "Lakshmi Devi",     "Sirumalai",    "Urea Fertiliser", 50, 50, "2026-06-02"],
  ["F003", "Murugan S",        "Vadamadurai",  "DAP Fertiliser",  40, 20, "2026-06-02"],
  ["F004", "Kavitha M",        "Natham",       "Paddy Seed",     20, 20, "2026-06-03"],
  ["F005", "Selvi Rajan",      "Thoppampatti", "Paddy Seed",     25, 10, "2026-06-03"],
  ["F005", "Selvi Rajan",      "Thoppampatti", "Paddy Seed",     25, 15, "2026-06-10"], // second, partial top-up issue for the same entitlement
  ["F006", "Anbu Selvam",      "Kambainallur", "Urea Fertiliser", 50, 30, "2026-06-03"],
  ["F007", "Karthikeyan R",    "Sirumalai",    "DAP Fertiliser",  40, 40, "2026-06-04"],
  ["F008", "Meena Kumari",     "Vadamadurai",  "Paddy Seed",     22, 22, "2026-06-04"],
  ["F009", "Prabhakaran V",    "Natham",       "Urea Fertiliser", 55, 55, "2026-06-04"],
  ["F010", "Saraswathi K",     "Thoppampatti", "Paddy Seed",     18, 18, "2026-06-05"],
  ["F011", "Dinesh Babu",      "Kambainallur", "DAP Fertiliser",  40, 25, "2026-06-05"],
  ["F012", "Vasanthi R",       "Sirumalai",    "Paddy Seed",     20, 20, "2026-06-05"],
  ["F013", "Manikandan T",     "Vadamadurai",  "Urea Fertiliser", 50, 40, "2026-06-06"],
  ["F014", "Elumalai P",       null,           "Urea Fertiliser", 50, 50, "2026-06-06"], // awkward case: village missing
  ["F015", "Chitra Devi",      "Thoppampatti", "DAP Fertiliser",  40, 40, "2026-06-06"],
  ["F016", "Gopalakrishnan",   "Kambainallur", "Paddy Seed",     25, 25, "2026-06-07"],
  ["F017", "Yamuna S",         "Sirumalai",    "Urea Fertiliser", 50, 20, "2026-06-07"],
  ["F018", "Rajendran K",      "Vadamadurai",  "Paddy Seed",     20, 20, "2026-06-07"],
  ["F019", "Sumathi B",        "Natham",       "DAP Fertiliser",  40, 40, "2026-06-08"],
  ["F020", "Muthu Kumar",      "Natham",       "Paddy Seed",     22, 22, "2026-06-08"], // awkward case: similar name #1
  ["F021", "Muthukumar",       "Natham",       "Paddy Seed",     22, 10, "2026-06-08"], // awkward case: similar name #2
  ["F022", "Valli Ammal",      "Thoppampatti", "Urea Fertiliser", 50, 50, "2026-06-09"],
  ["F023", "Senthil Nathan",   "Kambainallur", "DAP Fertiliser",  40, 30, "2026-06-09"],
  ["F024", "Padma Priya",      "Sirumalai",    "Paddy Seed",     20, 20, "2026-06-09"],
  ["F025", "Raja Mohan",       "Vadamadurai",  "Urea Fertiliser", 50, 50, "2026-06-10"],
  ["F026", "Deepa Lakshmi",    "Natham",       "Paddy Seed",     18, 18, "2026-06-10"],
  ["F027", "Sivakumar A",      "Thoppampatti", "DAP Fertiliser",  40, 20, "2026-06-10"],
  ["F028", "Nirmala Devi",     "Kambainallur", "Urea Fertiliser", 50, 50, "2026-06-11"],
  ["F029", "Balamurugan S",    "Sirumalai",    "Paddy Seed",     25, 25, "2026-06-11"],
  ["F030", "Revathi K",        "Vadamadurai",  "DAP Fertiliser",  40, 40, "2026-06-11"],
  ["F031", "Ganesan M",        "Natham",       "Urea Fertiliser", 50, 25, "2026-06-12"],
  ["F032", "Amutha R",         "Thoppampatti", "Paddy Seed",     20, 20, "2026-06-12"],
  ["F033", "Krishnamoorthy",   "Kambainallur", "DAP Fertiliser",  40, 40, "2026-06-12"],
  ["F034", "Shanthi P",        "Sirumalai",    "Urea Fertiliser", 50, 50, "2026-06-13"],
  ["F035", "Velmurugan K",     "Vadamadurai",  "Paddy Seed",     22, 22, "2026-06-13"],
  ["F036", "Jayalakshmi S",    "Natham",       "DAP Fertiliser",  40, 15, "2026-06-13"],
  ["F037", "Palanisamy R",     "Thoppampatti", "Urea Fertiliser", 50, 50, "2026-06-14"],
  ["F038", "Kalaivani M",      "Kambainallur", "Paddy Seed",     20, 20, "2026-06-14"],
  ["F999", "Test Record - Unrelated", null, "Unknown", null, 0, null], // awkward case: stray record with nothing related to it
];

const insert = db.prepare(`
  INSERT INTO distributions
    (farmer_id, farmer_name, village, input_type, entitlement_qty, issued_qty, issue_date, balance)
  VALUES (@farmer_id, @farmer_name, @village, @input_type, @entitlement_qty, @issued_qty, @issue_date, @balance)
`);

// Track cumulative issued qty per farmer_id + input_type, same as server.js does at write time.
const cumulative = {};

const insertMany = db.transaction((data) => {
  for (const [farmer_id, farmer_name, village, input_type, entitlement_qty, issued_qty, issue_date] of data) {
    const key = `${farmer_id}::${input_type}`;
    const priorIssued = cumulative[key] || 0;
    const newTotalIssued = priorIssued + issued_qty;
    cumulative[key] = newTotalIssued;

    const balance =
      entitlement_qty === null || entitlement_qty === undefined
        ? null
        : Math.round((entitlement_qty - newTotalIssued) * 100) / 100;

    insert.run({
      farmer_id,
      farmer_name,
      village,
      input_type,
      entitlement_qty,
      issued_qty,
      issue_date,
      balance,
    });
  }
});

insertMany(rows);

console.log(`Seeded ${rows.length} records into ${DB_PATH}`);
db.close();
