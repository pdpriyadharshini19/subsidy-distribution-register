// public/app.js
// Handles: tab switching, the new-entry form (submit + validation display),
// and the listing screen (fetch, search, filter, loading/empty/error states).

// ---------- Tabs ----------
const tabs = document.querySelectorAll(".tab");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById(`view-${tab.dataset.view}`).classList.add("active");
    if (tab.dataset.view === "list") loadRecords();
  });
});

// ---------- New entry form ----------
const form = document.getElementById("entry-form");
const submitBtn = document.getElementById("submit-btn");
const formStatus = document.getElementById("form-status");
const resultPanel = document.getElementById("result-panel");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultPanel.className = "result-panel hidden";
  formStatus.textContent = "";
  formStatus.className = "form-status";
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();

    if (!res.ok) {
      // Server rejected the save. The screen must show the error and must
      // never claim success.
      showResult("error", body.error, body.details);
      formStatus.textContent = "Not saved.";
      formStatus.className = "form-status error";
      return;
    }

    const r = body.record;
    const balanceText = r.balance === null || r.balance === undefined ? "unknown" : r.balance;
    const stampClass = r.balance > 0 ? "ok" : "warn";
    resultPanel.className = "result-panel success";
    resultPanel.innerHTML = `
      <div class="stamp ${stampClass}">${balanceText}<br/>REMAINING</div>
      <strong>Record #${r.record_id} saved.</strong><br/>
      ${escapeHtml(r.farmer_name)} (${escapeHtml(r.farmer_id)}) — ${r.issued_qty} kg of ${r.input_type} issued on ${r.issue_date}.<br/>
      Remaining balance against this entitlement: <strong>${balanceText} kg</strong>.
    `;
    formStatus.textContent = "Saved.";
    form.reset();
  } catch (err) {
    // Network / server unreachable.
    showResult("error", "Could not reach the server.", [
      "Check your connection and try again. Nothing was saved.",
    ]);
    formStatus.textContent = "Not saved.";
    formStatus.className = "form-status error";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Distribution";
  }
});

function showResult(type, title, details) {
  resultPanel.className = `result-panel ${type}`;
  resultPanel.innerHTML = `
    <strong>${escapeHtml(title || "Something went wrong.")}</strong>
    ${details && details.length ? `<ul>${details.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>` : ""}
  `;
}

// ---------- Listing screen ----------
const searchInput = document.getElementById("search-input");
const villageFilter = document.getElementById("village-filter");
const inputFilter = document.getElementById("input-filter");
const listBody = document.getElementById("list-body");
const resultCount = document.getElementById("result-count");

let metaLoaded = false;
let debounceTimer = null;

async function loadMeta() {
  if (metaLoaded) return;
  try {
    const res = await fetch("/api/meta");
    if (!res.ok) return;
    const { villages, inputTypes } = await res.json();
    villages.forEach((v) => villageFilter.add(new Option(v, v)));
    inputTypes.forEach((i) => inputFilter.add(new Option(i, i)));
    metaLoaded = true;
  } catch (_) {
    // Filters simply stay at "All" if meta fails to load — not fatal.
  }
}

async function loadRecords() {
  await loadMeta();
  listBody.innerHTML = `<div class="state-msg" id="list-loading">Loading register…</div>`;
  resultCount.textContent = "";

  const params = new URLSearchParams({
    search: searchInput.value,
    village: villageFilter.value,
    input_type: inputFilter.value,
  });

  try {
    const res = await fetch(`/api/records?${params.toString()}`);
    if (!res.ok) {
      listBody.innerHTML = `<div class="state-msg error">Could not load the register. Please try again.</div>`;
      return;
    }
    const { count, records } = await res.json();
    resultCount.textContent = `${count} record${count === 1 ? "" : "s"} shown`;

    if (count === 0) {
      listBody.innerHTML = `<div class="state-msg">No records match this search or filter. Try clearing the search box or selecting "All" in the filters.</div>`;
      return;
    }

    renderTable(records);
  } catch (err) {
    listBody.innerHTML = `<div class="state-msg error">Network error — could not reach the server. Check your connection and try again.</div>`;
  }
}

function renderTable(records) {
  const rows = records
    .map((r) => {
      const balanceBadge = balanceBadgeHtml(r.balance, r.entitlement_qty);
      return `
        <tr>
          <td data-label="ID">${r.record_id}</td>
          <td data-label="Farmer">${escapeHtml(r.farmer_name) || missing()}<br/><span class="missing-val">${escapeHtml(r.farmer_id)}</span></td>
          <td data-label="Phone">${r.phone_number ? escapeHtml(r.phone_number) : missing()}</td>
          <td data-label="Village">${r.village ? escapeHtml(r.village) : missing()}</td>
          <td data-label="Input">${escapeHtml(r.input_type)}</td>
          <td data-label="Entitlement">${numOrMissing(r.entitlement_qty)}</td>
          <td data-label="Issued">${numOrMissing(r.issued_qty)}</td>
          <td data-label="Date">${r.issue_date ? escapeHtml(r.issue_date) : missing()}</td>
          <td data-label="Balance">${balanceBadge}</td>
        </tr>`;
    })
    .join("");

  listBody.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Farmer</th><th>Phone</th><th>Village</th><th>Input</th>
          <th>Entitlement</th><th>Issued</th><th>Date</th><th>Balance</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function balanceBadgeHtml(balance, entitlement) {
  if (balance === null || balance === undefined) {
    return `<span class="badge missing">not calculable</span>`;
  }
  if (balance <= 0) return `<span class="badge zero">0 — fully collected</span>`;
  if (entitlement && balance / entitlement <= 0.25) {
    return `<span class="badge low">${balance} left</span>`;
  }
  return `<span class="badge ok">${balance} left</span>`;
}

function numOrMissing(v) {
  return v === null || v === undefined ? missing() : v;
}
function missing() {
  return `<span class="missing-val">missing</span>`;
}
function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

[searchInput, villageFilter, inputFilter].forEach((el) => {
  const evt = el.tagName === "SELECT" ? "change" : "input";
  el.addEventListener(evt, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadRecords, 250);
  });
});
