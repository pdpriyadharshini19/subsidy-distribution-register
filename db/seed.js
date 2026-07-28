// db/seed.js
// Builds data/subsidy.db from schema.sql and loads ~40 sample distribution
// records, including the awkward cases required by the task:
//   1. A record with a missing value      -> record_id 14 (village is missing),
//                                              record_id 15 (phone_number is missing)
//   2. Two very similar farmer names       -> "Muthu Kumar" (F020) and
//                                              "Muthukumar" (F021), same village
//   3. A record with nothing related to it -> farmer_id F999 (a stray / test
//                                              row that does not belong to any
//                                              real distribution round)
//
// Balance is calculated exactly the way the server calculates it for a new
// submission: balance = entitlement_qty - (sum of issued_qty so far for that
// farmer_id + input_type, including the current row).
//
// phone_number is the new field: it is optional (a few rows deliberately
// leave it blank, like village) but saves and reloads correctly like every
// other field.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "..", "data", "subsidy.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

// Each row: [farmer_id, farmer_name, phone_number, village, input_type, entitlement_qty, issued_qty, issue_date]
const rows = [
  ["F001", "Ravi Kumar",       "9840011121", "Kambainallur", "Paddy Seed",     25, 25, "2026-06-02"],
  ["F002", "Lakshmi Devi",     "9840011122", "Sirumalai",    "Urea Fertiliser", 50, 50, "2026-06-02"],
  ["F003", "Murugan S",        "9840011123", "Vadamadurai",  "DAP Fertiliser",  40, 20, "2026-06-02"],
  ["F004", "Kavitha M",        "9840011124", "Natham",       "Paddy Seed",     20, 20, "2026-06-03"],
  ["F005", "Selvi Rajan",      "9840011125", "Thoppampatti", "Paddy Seed",     25, 10, "2026-06-03"],
  ["F005", "Selvi Rajan",      "9840011125", "Thoppampatti", "Paddy Seed",     25, 15, "2026-06-10"],
  ["F006", "Anbu Selvam",      "9840011126", "Kambainallur", "Urea Fertiliser", 50, 30, "2026-06-03"],
  ["F007", "Karthikeyan R",    "9840011127", "Sirumalai",    "DAP Fertiliser",  40, 40, "2026-06-04"],
  ["F008", "Meena Kumari",     "9840011128", "Vadamadurai",  "Paddy Seed",     22, 22, "2026-06-04"],
  ["F009", "Prabhakaran V",    "9840011129", "Natham",       "Urea Fertiliser", 55, 55, "2026-06-04"],
  ["F010", "Saraswathi K",     "9840011130", "Thoppampatti", "Paddy Seed",     18, 18, "2026-06-05"],
  ["F011", "Dinesh Babu",      "9840011131", "Kambainallur", "DAP Fertiliser",  40, 25, "2026-06-05"],
  ["F012", "Vasanthi R",       "9840011132", "Sirumalai",    "Paddy Seed",     20, 20, "2026-06-05"],
  ["F013", "Manikandan T",     "9840011133", "Vadamadurai",  "Urea Fertiliser", 50, 40, "2026-06-06"],
  ["F014", "Elumalai P",       "9840011134", null,           "Urea Fertiliser", 50, 50, "2026-06-06"],
  ["F015", "Chitra Devi",      null,         "Thoppampatti", "DAP Fertiliser",  40, 40, "2026-06-06"],
  ["F016", "Gopalakrishnan",   "9840011136", "Kambainallur", "Paddy Seed",     25, 25, "2026-06-07"],
  ["F017", "Yamuna S",         "9840011137", "Sirumalai",    "Urea Fertiliser", 50, 20, "2026-06-07"],
  ["F018", "Rajendran K",      "9840011138", "Vadamadurai",  "Paddy Seed",     20, 20, "2026-06-07"],
  ["F019", "Sumathi B",        "9840011139", "Natham",       "DAP Fertiliser",  40, 40, "2026-06-08"],
  ["F020", "Muthu Kumar",      "9840011140", "Natham",       "Paddy Seed",     22, 22, "2026-06-08"],
  ["F021", "Muthukumar",       "9840011141", "Natham",       "Paddy Seed",     22, 10, "2026-06-08"],
  ["F022", "Valli Ammal",      "9840011142", "Thoppampatti", "Urea Fertiliser", 50, 50, "2026-06-09"],
  ["F023", "Senthil Nathan",   "9840011143", "Kambainallur", "DAP Fertiliser",  40, 30, "2026-06-09"],
  ["F024", "Padma Priya",      "9840011144", "Sirumalai",    "Paddy Seed",     20, 20, "2026-06-09"],
  ["F025", "Raja Mohan",       "9840011145", "Vadamadurai",  "Urea Fertiliser", 50, 50, "2026-06-10"],
  ["F026", "Deepa Lakshmi",    "9840011146", "Natham",       "Paddy Seed",     18, 18, "2026-06-10"],
  ["F027", "Sivakumar A",      "9840011147", "Thoppampatti", "DAP Fertiliser",  40, 20, "2026-06-10"],
  ["F028", "Nirmala Devi",     "9840011148", "Kambainallur", "Urea Fertiliser", 50, 50, "2026-06-11"],
  ["F029", "Balamurugan S",    "9840011149", "Sirumalai",    "Paddy Seed",     25, 25, "2026-06-11"],
  ["F030", "Revathi K",        "9840011150", "Vadamadurai",  "DAP Fertiliser",  40, 40, "2026-06-11"],
  ["F031", "Ganesan M",        "9840011151", "Natham",       "Urea Fertiliser", 50, 25, "2026-06-12"],
  ["F032", "Amutha R",         "9840011152", "Thoppampatti", "Paddy Seed",     20, 20, "2026-06-12"],
  ["F033", "Krishnamoorthy",   "9840011153", "Kambainallur", "DAP Fertiliser",  40, 40, "2026-06-12"],
  ["F034", "Shanthi P",        "9840011154", "Sirumalai",    "Urea Fertiliser", 50, 50, "2026-06-13"],
  ["F035", "Velmurugan K",     "9840011155", "Vadamadurai",  "Paddy Seed",     22, 22, "2026-06-13"],
  ["F036", "Jayalakshmi S",    "9840011156", "Natham",       "DAP Fertiliser",  40, 15, "2026-06-13"],
  ["F037", "Palanisamy R",     "9840011157", "Thoppampatti", "Urea Fertiliser", 50, 50, "2026-06-14"],
  ["F038", "Kalaivani M",      "9840011158", "Kambainallur", "Paddy Seed",     20, 20, "2026-06-14"],
  ["F999", "Test Record - Unrelated", null, null, "Unknown", null, 0, null],
];

const insert = db.prepare(`
  INSERT INTO distributions
    (farmer_id, farmer_name, phone_number, village, input_type, entitlement_qty, issued_qty, issue_date, balance)
  VALUES (@farmer_id, @farmer_name, @phone_number, @village, @input_type, @entitlement_qty, @issued_qty, @issue_date, @balance)
`);

const cumulative = {};

const insertMany = db.transaction((data) => {
  for (const [farmer_id, farmer_name, phone_number, village, input_type, entitlement_qty, issued_qty, issue_date] of data) {
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
      phone_number,
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