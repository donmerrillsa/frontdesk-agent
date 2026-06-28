// ============================================================
// DB PROVIDER — LIVE (Supabase)
// ============================================================
// Needs these env vars set in Netlify (Project configuration >
// Environment variables) — use the SERVICE ROLE key, never the
// anon key, since this runs server-side only and RLS has zero
// policies (see supabase/schema.sql):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

// Node 20 (this project's runtime) doesn't have the native WebSocket
// support that @supabase/supabase-js's realtime subsystem expects by
// default — it initializes that subsystem just from calling createClient(),
// even though we never use realtime/live subscriptions anywhere in this
// codebase. Providing the `ws` package as the transport is Supabase's own
// documented fix for any Node version before 22.
function getClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    realtime: { transport: WebSocket },
  });
}

async function createTrial(fields) {
  const supabase = getClient();
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("trials")
    .insert([{
      business_name: fields.business_name,
      owner_name: fields.owner_name,
      mobile_number: fields.mobile_number,
      backup_number: fields.backup_number || null,
      email: fields.email,
      status: "pending_setup",
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      pricing: fields.pricing || {},
      terms_accepted_at: fields.terms_accepted_at || null,
      terms_version: fields.terms_version || null,
      sample_reviewed_at: fields.sample_reviewed_at || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateTrial(trialId, patch) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("trials")
    .update(patch)
    .eq("id", trialId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getTrial(trialId) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("trials")
    .select("*")
    .eq("id", trialId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getTrialByNumber(frontdeskNumber) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("trials")
    .select("*")
    .eq("frontdesk_number", frontdeskNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createLead(fields) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("leads")
    .insert([{
      trial_id: fields.trial_id,
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
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getInProgressLead(trialId, callerNumber) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("trial_id", trialId)
    .eq("caller_number", callerNumber)
    .eq("status", "in_progress")
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateLead(leadId, patch) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId)
    .select()
    .single();

  if (error) throw error;
  return data;
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
