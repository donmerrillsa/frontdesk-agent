// ============================================================
// EMAIL PROVIDER — MOCK
// ============================================================
const fs = require("fs");
const path = require("path");
const os = require("os");

// See src/providers/db/mock.js for why this isn't __dirname-relative.
const LOG_PATH = path.join(os.tmpdir(), "frontdesk-mockdata", "sent-emails.json");

function readLog() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
}

function writeLog(entries) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(entries, null, 2));
}

/**
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.html
 */
async function sendEmail({ to, subject, html }) {
  const entry = { to, subject, html, sentAt: new Date().toISOString() };
  const log = readLog();
  log.push(entry);
  writeLog(log);
  console.log(`[MOCK EMAIL] -> ${to}: "${subject}"`);
  return { id: `mock-email-${Date.now()}` };
}

function getSentLog() {
  return readLog();
}

module.exports = { sendEmail, getSentLog };
