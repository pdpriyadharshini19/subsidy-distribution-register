# Agricultural Input Subsidy Distribution Register

**SIH 2026 — Internal Practical Assessment (Easy Level)**

## The Problem, in Two Lines

Subsidised seed and fertiliser are checked against a farmer's entitlement by manually searching a paper register, which is too slow to do at peak distribution, so farmers sometimes collect the same entitlement twice while others are missed. This project is a small web register that checks the entitlement automatically the moment an officer records an issue, and shows how much of it remains.

## Tech Stack

- **Frontend:** Plain HTML, CSS and JavaScript (no framework) — a "New Entry" screen and a "Distribution List" screen.
- **Backend:** Node.js with Express.
- **Database:** SQLite (via `better-sqlite3`), a single `distributions` table.

All validation, the entitlement check, and the balance calculation happen **on the server**, so every screen shows the same number and a rejected save can never look like a success.

## How to Run It

1. **Install Node.js** (v18 or later) if you don't already have it.
2. **Clone this repository and install dependencies:**
   ```bash
   git clone <this-repo-url>
   cd subsidy-register
   npm install
   ```
3. **Create and seed the database** (this builds `data/subsidy.db` with 40 sample records):
   ```bash
   npm run seed
   ```
4. **Start the server:**
   ```bash
   npm start
   ```
5. **Open the app** at [http://localhost:3000](http://localhost:3000) in your browser.
6. To reset the sample data at any point, just run `npm run seed` again — it rebuilds the database from scratch.

## What Every Field Means

| Field | Meaning | Values it may take |
|---|---|---|
| `record_id` | Unique ID of this distribution entry, assigned automatically | Positive integer, auto-generated |
| `farmer_id` | The farmer's ID as recorded in the entitlement rolls | Short text, e.g. `F001` |
| `farmer_name` | The farmer's full name | Free text |
| `village` | The farmer's village | Free text (may be missing on old/imported records — see note below) |
| `input_type` | Which subsidised input this row is about | One of: `Paddy Seed`, `Urea Fertiliser`, `DAP Fertiliser` |
| `entitlement_qty` | Total quantity (kg) this farmer is entitled to for this input type | Positive number |
| `issued_qty` | Quantity (kg) issued to the farmer **in this transaction** | Positive number |
| `issue_date` | Date the issue took place | `YYYY-MM-DD` |
| `balance` | Quantity (kg) still remaining against the entitlement **after** this issue — see calculation below | Non-negative number, or blank if it could not be calculated |

**Note on data quality:** the sample dataset intentionally includes a few awkward, real-world rows: one record with a missing village, two farmers with very similar names (`Muthu Kumar` and `Muthukumar`) to test that search doesn't confuse them, and one stray/unrelated test record (`F999`) with mostly blank fields, to prove the list and search handle incomplete data without breaking.

## How the Balance Is Calculated

This is the number an officer acts on, so it is always calculated on the server, never typed in by hand:

1. When a new distribution is submitted for a `farmer_id` + `input_type`, the server adds up every `issued_qty` **already recorded** for that same farmer and input type.
2. `remaining = entitlement_qty − already_issued`
3. **If `remaining` is already 0 or less**, the save is rejected outright — the entitlement has already been fully drawn. This is the check that stops duplicate collection.
4. **If the newly requested `issued_qty` is more than `remaining`**, the save is rejected — this prevents an over-issue in one go.
5. Otherwise the record is saved, and `balance = remaining − issued_qty` is stored with it.

A farmer can therefore collect an entitlement across more than one visit (see `F005` in the sample data, who collects 10 kg and then 15 kg of a 25 kg entitlement), but the moment the entitlement reaches 0, any further attempt for that farmer + input type is blocked with a clear message.

## Where to Find Each Task

- **Task 1 (sample data):** `db/seed.js` — 40 records with commented notes on the three intentional awkward cases.
- **Task 2 (register form):** "New Entry" tab in the UI, backed by `POST /api/records` in `server.js`, which validates every field and performs the entitlement check above.
- **Task 3 (listing, search, ordering):** "Distribution List" tab, backed by `GET /api/records`. Search matches farmer ID or name; filters narrow by village and input type; the count of records shown is always visible. Rows are ordered so what needs attention appears first: records whose balance could not be calculated come first, then records with the least balance remaining (closest to being fully drawn), then most recent.
- **Task 4 (states):** Both screens show a loading message while fetching, an empty-state message when a search/filter matches nothing, a 404 message for a record that doesn't exist, and an error message (never a false success) if a save or fetch fails.
- **Task 5 (integration & manual check):** See the worked example below.
- **Task 6 (this file, screenshots, video):** see the Demonstration section.

## Manual Check of a Calculated Figure

Sample record for farmer `F005` (Selvi Rajan), input type `Paddy Seed`, entitlement `25` kg:

- First issue: `10` kg issued → balance = `25 − 10 = 15` kg ✅ matches the stored value.
- Second issue: `15` kg issued → total issued so far = `10 + 15 = 25` kg → balance = `25 − 25 = 0` kg ✅ matches the stored value.
- A third attempt to issue anything further to `F005` for `Paddy Seed` is correctly rejected by the server with *"This entitlement has already been fully drawn."*

## What Is Not Finished

- No login/authentication — this build assumes a single trusted operator, as appropriate for an Easy-level assessment.
- No editing or deleting of existing records (append-only register, matching how a physical register is normally used).
- No pagination on the list — fine at the current sample size (40 records), but would be needed at real distribution-point volumes.

## Demonstration

- Screenshots: see `/screenshots` in this repository (New Entry screen, Distribution List with a search applied, and a rejected duplicate-entitlement attempt).
- Video walkthrough: `<add your video link here>` — a short recording showing the full flow: adding a record, searching/filtering the list, and a blocked duplicate attempt.

## Project Structure

```
subsidy-register/
├── server.js          # Express server: API routes, validation, entitlement logic
├── db/
│   ├── schema.sql      # Table definition
│   └── seed.js         # Builds data/subsidy.db and loads 40 sample records
├── public/
│   ├── index.html      # New Entry + Distribution List screens
│   ├── style.css
│   └── app.js           # Fetch calls, rendering, states, search/filter
├── data/                # subsidy.db is generated here by `npm run seed` (not committed)
└── package.json
```
