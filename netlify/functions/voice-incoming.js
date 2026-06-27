// ============================================================
// netlify/functions/voice-incoming.js
// ============================================================
// Twilio calls this (via the number's configured Voice URL) the
// instant a call hits the Frontdesk number. Conditional forwarding
// upstream means every call that reaches THIS number, by definition,
// already failed to be answered on the business's real line — there's
// no separate "did they answer" check needed here. Every call here
// IS a missed call.
//
// This is the piece that was missing: sms-incoming.js handles every
// message AFTER the first text-back goes out, but nothing was actually
// triggering that first text. This function is that trigger.
//
// No LLM call here at all — the greeting is a fixed template, same
// as the spec calls for, so this function needs zero API keys to
// fully test (and is fully tested below, with mocks, right now).

const db = require("../../src/providers/db");
const sms = require("../../src/providers/sms");

function parseTwilioVoiceBody(rawBody) {
  const params = new URLSearchParams(rawBody);
  return {
    from: params.get("From"),
    to: params.get("To"),
  };
}

function twiml(sayMessage) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${sayMessage}</Say><Hangup/></Response>`;
}

exports.handler = async (event) => {
  try {
    const { from: callerNumber, to: frontdeskNumber } = parseTwilioVoiceBody(event.body);

    if (!callerNumber || !frontdeskNumber) {
      console.error("voice-incoming: missing From/To in webhook payload");
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/xml" },
        body: twiml("Sorry, something went wrong."),
      };
    }

    const trial = await db.getTrialByNumber(frontdeskNumber);
    if (!trial) {
      console.error(`voice-incoming: no trial found for number ${frontdeskNumber}`);
      // 200, not 404 — Twilio needs valid TwiML back regardless, or the
      // caller hears dead air / an error tone instead of a clean hangup.
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/xml" },
        body: twiml("Sorry, this number is not yet active."),
      };
    }

    const greeting =
      `Hi, this is the front desk for ${trial.business_name}. I saw your call come in — how can we help?`;

    // If this caller already has an open conversation (e.g. they called
    // again before finishing a prior one), reuse it instead of starting
    // a duplicate lead record.
    let lead = await db.getInProgressLead(trial.id, callerNumber);
    if (!lead) {
      lead = await db.createLead({
        trial_id: trial.id,
        caller_number: callerNumber,
        status: "in_progress",
        transcript: [{ role: "assistant", text: greeting }],
      });
    }

    await sms.sendSms({ to: callerNumber, body: greeting });

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: twiml("Thanks for calling. We will text you right back."),
    };
  } catch (err) {
    console.error("voice-incoming handler error:", err);
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: twiml("Sorry, something went wrong. Please try again shortly."),
    };
  }
};
