// ============================================================
// CLI SIMULATOR
// ============================================================
// Simulates a caller texting the Frontdesk number, end to end,
// using the REAL sms-incoming.js handler and REAL conversation
// engine — just pointed at mock SMS/Sheets/DB providers instead
// of live Twilio/Google/Supabase.
//
// REQUIRES a real ANTHROPIC_API_KEY (from console.anthropic.com,
// a developer API key — separate from claude.ai chat access) to
// actually run, since engine.js makes a real model call. Set it
// either in your shell or in a .env file (see .env.example).
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node test/cli-simulator.js
//
// Then just type as the caller. Type "exit" to quit and see the
// final captured lead record.

const readline = require("readline");
const path = require("path");
const fs = require("fs");

// Force mock for every provider regardless of what's in the shell's
// real environment — this script should never touch live Twilio,
// Supabase, Sheets, or payments infrastructure no matter what
// credentials happen to be set elsewhere on this machine.
process.env.PROVIDER_MODE = "mock";

const db = require("../src/providers/db");
const { handler } = require("../netlify/functions/sms-incoming");

const FAKE_FRONTDESK_NUMBER = "+15125550100";
const FAKE_CALLER_NUMBER = "+15125559999";

const EXAMPLE_PRICING = {
  diagnostic_fee: "$89, waived if you proceed with the repair",
  ac_tune_up: "$129",
  heater_tune_up: "$129",
  tune_up_bundle: "$199 for both AC and heater",
  notes: "Repair and replacement costs depend on what the technician finds and are quoted on-site.",
};

async function seedTrial() {
  const trial = await db.createTrial({
    business_name: "Apex Air & Heat",
    owner_name: "Don Merrill",
    mobile_number: "+12108466685",
    backup_number: null,
    email: "don@buy-mos.com",
  });
  const patch = { frontdesk_number: FAKE_FRONTDESK_NUMBER };
  if (process.env.SEED_PRICING === "true") {
    patch.pricing = EXAMPLE_PRICING;
  }
  await db.updateTrial(trial.id, patch);
  return { ...trial, ...patch };
}

function buildTwilioBody(message) {
  const params = new URLSearchParams({
    From: FAKE_CALLER_NUMBER,
    To: FAKE_FRONTDESK_NUMBER,
    Body: message,
  });
  return params.toString();
}

async function main() {
  const provider = process.env.LLM_PROVIDER || "anthropic";
  const requiredKey = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";

  if (!process.env[requiredKey]) {
    console.error(
      `\nLLM_PROVIDER is set to "${provider}" but ${requiredKey} isn't set.\n` +
      `This simulator calls a real model — set the key for whichever provider\n` +
      `you're using. Example:\n` +
      `  ${requiredKey}=... node test/cli-simulator.js\n` +
      `  LLM_PROVIDER=openai OPENAI_API_KEY=... node test/cli-simulator.js\n`
    );
    process.exit(1);
  }

  const trial = await seedTrial();
  console.log(`\nSeeded mock trial for "${trial.business_name}".`);
  console.log(
    trial.pricing
      ? `Pricing IS configured for this run — the engine should quote from it directly.\n`
      : `No pricing configured — the engine should defer any pricing question to a callback.\n` +
        `(Run with SEED_PRICING=true to test the quoting path instead.)\n`
  );
  console.log(`Simulating a caller texting in. Type as the caller. Type "exit" when done.\n`);
  console.log(`(First message is being sent as if this is their reply to the initial missed-call text-back.)\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = () =>
    new Promise((resolve) => rl.question("Caller> ", resolve));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const message = await ask();
    if (message.trim().toLowerCase() === "exit") break;

    const event = { body: buildTwilioBody(message) };
    const response = await handler(event);

    if (response.statusCode !== 200) {
      console.log(`\n[ERROR ${response.statusCode}] ${response.body}\n`);
      continue;
    }

    // Pull the latest lead state to show captured fields + emergency status.
    const lead = await db.getInProgressLead(trial.id, FAKE_CALLER_NUMBER);
    const completedLead = lead || (await getLastLead(trial.id));

    const sentLog = require("../src/providers/sms/mock").getSentLog();
    const lastReply = sentLog[sentLog.length - 1];

    console.log(`\nFrontdesk> ${lastReply ? lastReply.body : "(no reply sent)"}`);
    console.log(
      `  [captured: ${JSON.stringify({
        address: completedLead?.address,
        issue: completedLead?.issue,
        urgency: completedLead?.urgency,
        preferred_time: completedLead?.preferred_time,
      })}]`
    );
    console.log(`  [call_type: ${completedLead?.call_type}] [status: ${completedLead?.status}]\n`);
  }

  rl.close();
  console.log("\nFinal lead record:");
  const finalLead = await getLastLead(trial.id);
  console.log(JSON.stringify(finalLead, null, 2));

  console.log(
    `\nMock data written to: ${path.join(__dirname, "..", ".mockdata")}\n` +
    `(sent-sms.json, db.json — inspect these directly any time.)\n`
  );
}

async function getLastLead(trialId) {
  const dbPath = path.join(__dirname, "..", ".mockdata", "db.json");
  if (!fs.existsSync(dbPath)) return null;
  const raw = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const leads = raw.leads.filter((l) => l.trial_id === trialId);
  return leads[leads.length - 1] || null;
}

main().catch((err) => {
  console.error("Simulator crashed:", err);
  process.exit(1);
});
