// ============================================================
// SHEETS PROVIDER — LIVE (Google Sheets API)
// ============================================================
// Needs a Google Cloud service account with Sheets + Drive API
// enabled. Set this env var in Netlify (the full JSON key, as a
// single-line string):
//   GOOGLE_SERVICE_ACCOUNT_KEY

const { google } = require("googleapis");

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
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
 * Creates a new Sheet named "Frontdesk — <Business Name> — Trial" and
 * shares it with the owner's email.
 *
 * @param {object} params
 * @param {string} params.trialId - unused in live provider, kept for signature parity with mock
 * @param {string} params.businessName
 * @param {string} params.ownerEmail
 * @returns {Promise<{sheetId: string, sheetUrl: string}>}
 */
async function createAndShareSheet({ trialId, businessName, ownerEmail }) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `Frontdesk — ${businessName} — Trial` },
      sheets: [{ properties: { title: "Leads" } }],
    },
  });

  const sheetId = createRes.data.spreadsheetId;

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Leads!A1",
    valueInputOption: "RAW",
    requestBody: { values: [COLUMNS] },
  });

  await drive.permissions.create({
    fileId: sheetId,
    requestBody: { type: "user", role: "writer", emailAddress: ownerEmail },
  });

  return {
    sheetId,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
  };
}

/**
 * @param {object} params
 * @param {string} params.sheetId
 * @param {object} params.row - matches COLUMNS by key
 */
async function appendRow({ sheetId, row }) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Leads!A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [COLUMNS.map((col) => row[col] ?? "")] },
  });
}

module.exports = { createAndShareSheet, appendRow };
