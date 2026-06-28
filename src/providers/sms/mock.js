// ============================================================
// SMS PROVIDER — MOCK
// ============================================================
// Logs to console and appends to a local file instead of sending a
// real text. Use this to verify the surrounding app logic (who gets
// texted, when, with what content) without touching Twilio at all.

const fs = require("fs");
const path = require("path");
const os = require("os");

// See db/mock.js for why this isn't __dirname-relative.
const LOG_PATH = path.join(os.tmpdir(), "frontdesk-mockdata", "sent-sms.json");

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
 * @param {string} params.to - recipient phone number
 * @param {string} params.body - message text
 * @param {string} [params.from] - which number this should appear to send from
 * @returns {Promise<{sid: string, status: string}>}
 */
async function sendSms({ to, body, from }) {
  const entry = {
    to,
    from: from || null,
    body,
    sentAt: new Date().toISOString(),
  };
  const log = readLog();
  log.push(entry);
  writeLog(log);

  console.log(`[MOCK SMS] ${from || "(default number)"} -> ${to}: ${body}`);

  return { sid: `mock-${Date.now()}`, status: "sent (mock)" };
}

function getSentLog() {
  return readLog();
}

module.exports = { sendSms, getSentLog };
