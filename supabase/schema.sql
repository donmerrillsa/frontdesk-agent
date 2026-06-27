-- ============================================================
-- FRONTDESK — SUPABASE SCHEMA
-- ============================================================
-- Run this in your Supabase project's SQL Editor (a NEW project,
-- separate from your PIA and MOS Supabase projects — keep each
-- product's data isolated).
--
-- Security model: RLS is enabled on every table with ZERO policies.
-- That means the anon/public key (the one that could theoretically
-- end up in client-side code) has NO access at all, by default.
-- All real access happens through the service_role key, which is
-- only ever used inside Netlify Functions (server-side), never
-- shipped to the browser. The service_role key bypasses RLS
-- entirely — that's its job — so no policies need to be written
-- for it to work.
--
-- This mirrors the RLS gap you had to retroactively fix on PIA;
-- doing it from day one here instead of after the fact.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TRIALS — one row per signup
-- ------------------------------------------------------------
create table if not exists trials (
  id               uuid primary key default gen_random_uuid(),
  business_name    text not null,
  owner_name       text not null,
  mobile_number    text not null,
  backup_number    text,
  email            text not null,

  -- pending_setup -> active -> converted | paused | cancelled
  status           text not null default 'pending_setup',

  trial_start      timestamptz not null default now(),
  trial_end        timestamptz not null,

  -- Filled in by later phases (Twilio + Google Sheets provisioning).
  -- Null until that automation exists; fine to leave null for now.
  frontdesk_number text,
  sheet_id         text,
  sheet_url        text,

  -- Set once Step 6 (forwarding verification) is built and confirms
  -- a real call made it through.
  forwarding_verified_at timestamptz,

  -- Owner-configured price list, injected into the conversation engine's
  -- system prompt. Free-form JSON (string keys -> string descriptions) —
  -- deliberately not rigid columns, since pricing structures vary a lot
  -- business to business. Empty/null means "no pricing configured," in
  -- which case the engine defers every pricing question to a callback
  -- rather than guessing. See src/conversation/prompts.js for exactly
  -- how this gets used.
  --
  -- Example value:
  -- {
  --   "diagnostic_fee": "$89, waived if you proceed with the repair",
  --   "ac_tune_up": "$129",
  --   "heater_tune_up": "$129",
  --   "tune_up_bundle": "$199 for both AC and heater",
  --   "notes": "Repair and replacement costs depend on what the technician finds and are quoted on-site."
  -- }
  pricing          jsonb default '{}'::jsonb,

  -- Set once a trial actually converts to paid. payment_subscription_id
  -- is provider-agnostic on purpose — it holds whichever ID PayPal or
  -- Stripe gives back, so switching providers later doesn't need a
  -- schema change, just a different value in the same column.
  plan                    text,            -- 'monthly' | 'annual'
  payment_subscription_id text,
  converted_at            timestamptz,

  -- Clickwrap consent record — when they agreed, and which dated version
  -- of terms.html was live at that moment. Update TERMS_VERSION in
  -- trial-signup.html's hidden field whenever terms.html's "Last updated"
  -- date changes, so old consent records stay tied to what they actually
  -- saw, not whatever the current version happens to say.
  terms_accepted_at      timestamptz,
  terms_version           text,
  sample_reviewed_at      timestamptz,

  created_at       timestamptz not null default now()
);

alter table trials enable row level security;

create index if not exists idx_trials_status on trials (status);
create index if not exists idx_trials_email on trials (email);
create index if not exists idx_trials_frontdesk_number on trials (frontdesk_number);
create index if not exists idx_trials_payment_subscription_id on trials (payment_subscription_id);

-- ------------------------------------------------------------
-- LEADS — one row per call, once the telephony layer exists.
-- Defined now so the schema is ready; nothing writes to this
-- table yet until the Twilio + AI conversation layers are built.
-- ------------------------------------------------------------
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  trial_id        uuid references trials(id) on delete cascade,

  call_timestamp  timestamptz not null default now(),
  caller_number   text,

  -- normal | emergency
  call_type       text not null default 'normal',

  address         text,
  issue           text,
  urgency         text,
  preferred_time  text,

  -- booked | callback | no_answer
  outcome         text,

  notes           text,

  -- in_progress | complete — each incoming SMS is a stateless webhook
  -- call, so the running conversation has to live somewhere between
  -- turns. transcript holds the full back-and-forth as JSON.
  status          text not null default 'in_progress',
  transcript      jsonb not null default '[]'::jsonb,

  created_at      timestamptz not null default now()
);

alter table leads enable row level security;

create index if not exists idx_leads_trial_id on leads (trial_id);
create index if not exists idx_leads_call_type on leads (call_type);
create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_caller_number on leads (caller_number);
