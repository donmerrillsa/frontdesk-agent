// ============================================================
// DB PROVIDER — MOCK
// ============================================================
// A local JSON file standing in for the trials/leads Supabase tables.
// Same shape as the real schema (supabase/schema.sql), so swapping to
// live later is just swapping which file gets required.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "..", "..", ".mockdata");
const DB_PATH = path.join(DATA_DIR, "db.json");

function readDb() {
  if (!fs.existsSync(DB_PATH)) return { trials: [], leads: [] };
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/**
 * @param {object} fields - business_name, owner_name, mobile_number, backup_number, email
 * @returns {Promise<object>} the inserted trial row
 */
async function createTrial(fields) {
  const db = readDb();
  const now = new Date();
  const trial = {
    id: crypto.randomUUID(),
    business_name: fields.business_name,
    owner_name: fields.owner_name,
    mobile_number: fields.mobile_number,
    backup_number: fields.backup_number || null,
    email: fields.email,
    status: "pending_setup",
    trial_start: now.toISOString(),
    trial_end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    frontdesk_number: null,
    sheet_id: null,
    sheet_url: null,
    forwarding_verified_at: null,
    pricing: fields.pricing || {},
    plan: null,
    payment_subscription_id: null,
    converted_at: null,
    terms_accepted_at: fields.terms_accepted_at || null,
    terms_version: fields.terms_version || null,
    sample_reviewed_at: fields.sample_reviewed_at || null,
    created_at: now.toISOString(),
  };
  db.trials.push(trial);
  writeDb(db);
  console.log(`[MOCK DB] Created trial ${trial.id} for ${trial.business_name}`);
  return trial;
}

/**
 * @param {string} trialId
 * @param {object} patch - fields to update
 */
async function updateTrial(trialId, patch) {
  const db = readDb();
  const trial = db.trials.find((t) => t.id === trialId);
  if (!trial) throw new Error(`Trial ${trialId} not found`);
  Object.assign(trial, patch);
  writeDb(db);
  console.log(`[MOCK DB] Updated trial ${trialId}:`, patch);
  return trial;
}

async function getTrial(trialId) {
  const db = readDb();
  return db.trials.find((t) => t.id === trialId) || null;
}

/**
 * @param {string} frontdeskNumber
 * @returns {Promise<object|null>}
 */
async function getTrialByNumber(frontdeskNumber) {
  const db = readDb();
  return db.trials.find((t) => t.frontdesk_number === frontdeskNumber) || null;
}

/**
 * @param {object} fields - trial_id, caller_number, call_type, address, issue, urgency, preferred_time, outcome, notes
 * @returns {Promise<object>} the inserted lead row
 */
async function createLead(fields) {
  const db = readDb();
  const lead = {
    id: crypto.randomUUID(),
    trial_id: fields.trial_id,
    call_timestamp: new Date().toISOString(),
    caller_number: fields.caller_number || null,
    call_type: fields.call_type || "normal",
    address: fields.address || null,
    issue: fields.issue || null,
    urgency: fields.urgency || null,
    preferred_time: fields.preferred_time || null,
    outcome: fields.outcome || null,
    notes: fields.notes || null,
    status: fields.status || "in_progress",
    transcript: fields.transcript || [],
    created_at: new Date().toISOString(),
  };
  db.leads.push(lead);
  writeDb(db);
  console.log(`[MOCK DB] Created lead ${lead.id} for trial ${lead.trial_id}`);
  return lead;
}

/**
 * Finds the open conversation for this caller on this trial, if one exists.
 * @param {string} trialId
 * @param {string} callerNumber
 * @returns {Promise<object|null>}
 */
async function getInProgressLead(trialId, callerNumber) {
  const db = readDb();
  return (
    db.leads.find(
      (l) => l.trial_id === trialId && l.caller_number === callerNumber && l.status === "in_progress"
    ) || null
  );
}

/**
 * @param {string} leadId
 * @param {object} patch
 */
async function updateLead(leadId, patch) {
  const db = readDb();
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);
  Object.assign(lead, patch);
  writeDb(db);
  console.log(`[MOCK DB] Updated lead ${leadId}:`, Object.keys(patch));
  return lead;
}

module.exports = {
  createTrial,
  updateTrial,
  getTrial,
  getTrialByNumber,
  createLead,
  getInProgressLead,
  updateLead,
};
