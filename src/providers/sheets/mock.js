// ============================================================
// SHEETS PROVIDER — MOCK
// ============================================================
// Writes to a local CSV instead of creating/sharing a real Google
// Sheet. Same row shape as the real provider, so switching to live
// later doesn't change anything calling code does.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "..", ".mockdata");

function sheetPath(trialId) {
  return path.join(DATA_DIR, `sheet-${trialId}.csv`);
}

const COLUMNS = [
  "timestamp",
  "caller_number",
  "call_type",
  "address",
  "issue",
  "urgency",
  "preferred_time",
  "outcome",
  "notes",
];

/**
 * @param {object} params
 * @param {string} params.trialId
 * @param {string} params.businessName
 * @param {string} params.ownerEmail - unused in mock, kept for signature parity with live provider
 * @returns {Promise<{sheetId: string, sheetUrl: string}>}
 */
async function createAndShareSheet({ trialId, businessName, ownerEmail }) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const filePath = sheetPath(trialId);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, COLUMNS.join(",") + "\n");
  }
  console.log(`[MOCK SHEETS] Created lead log for ${businessName} -> ${filePath}`);
  return { sheetId: `mock-sheet-${trialId}`, sheetUrl: `file://${filePath}` };
}

/**
 * @param {object} params
 * @param {string} params.sheetId - the mock sheetId returned above (encodes the trialId)
 * @param {object} params.row - matches the COLUMNS order by key
 */
async function appendRow({ sheetId, row }) {
  const trialId = sheetId.replace(/^mock-sheet-/, "");
  const filePath = sheetPath(trialId);
  const line = COLUMNS.map((col) => `"${(row[col] ?? "").toString().replace(/"/g, '""')}"`).join(",");
  fs.appendFileSync(filePath, line + "\n");
  console.log(`[MOCK SHEETS] Logged row to ${filePath}`);
}

module.exports = { createAndShareSheet, appendRow };
