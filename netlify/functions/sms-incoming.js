// ============================================================
// netlify/functions/sms-incoming.js
// ============================================================
// This is what Twilio calls (via TWILIO_SMS_WEBHOOK_URL on the
// provisioned number) every time a caller texts the Frontdesk
// number — including their very first reply after the missed-call
// text-back. Twilio sends this as application/x-www-form-urlencoded,
// not JSON, with the caller's number in "From" and the Frontdesk
// number in "To".
//
// NEEDS real PROVIDER_MODE=live + Twilio credentials to actually
// receive traffic. With PROVIDER_MODE unset (mock), this function
// is still fully real and testable — you'd just invoke it directly
// with a fake From/To/Body in place of an actual Twilio request,
// since there's no live phone number to text in mock mode.

const { handleTurn } = require("../../src/conversation/engine");
const db = require("../../src/providers/db");
const sms = require("../../src/providers/sms");
const sheets = require("../../src/providers/sheets");

function parseTwilioBody(rawBody) {
  const params = new URLSearchParams(rawBody);
  return {
    from: params.get("From"),
    to: params.get("To"),
    body: params.get("Body"),
  };
}

exports.handler = async (event) => {
  try {
    const { from: callerNumber, to: frontdeskNumber, body: message } = parseTwilioBody(event.body);

    if (!callerNumber || !frontdeskNumber || !message) {
      console.error("sms-incoming: missing From/To/Body in webhook payload");
      return { statusCode: 400, body: "Missing required Twilio fields" };
    }

    const trial = await db.getTrialByNumber(frontdeskNumber);
    if (!trial) {
      console.error(`sms-incoming: no trial found for number ${frontdeskNumber}`);
      return { statusCode: 404, body: "No trial associated with this number" };
    }

    // Find or start the conversation for this caller.
    let lead = await db.getInProgressLead(trial.id, callerNumber);
    if (!lead) {
      lead = await db.createLead({
        trial_id: trial.id,
        caller_number: callerNumber,
        status: "in_progress",
        transcript: [],
      });
    }

    const capturedFields = {
      address: lead.address,
      issue: lead.issue,
      urgency: lead.urgency,
      preferred_time: lead.preferred_time,
    };

    const history = (lead.transcript || []).map((turn) => ({
      role: turn.role,
      text: turn.text,
    }));

    const result = await handleTurn({
      businessName: trial.business_name,
      pricing: trial.pricing || {},
      history,
      message,
      capturedFields,
    });

    const updatedTranscript = [
      ...history,
      { role: "caller", text: message },
      { role: "assistant", text: result.reply },
    ];

    const wasAlreadyEmergency = lead.call_type === "emergency";
    const callType = result.emergency ? "emergency" : lead.call_type;

    await db.updateLead(lead.id, {
      address: result.capturedFields.address || null,
      issue: result.capturedFields.issue || null,
      urgency: result.capturedFields.urgency || null,
      preferred_time: result.capturedFields.preferred_time || null,
      call_type: callType,
      transcript: updatedTranscript,
      status: result.readyToWrapUp ? "complete" : "in_progress",
    });

    // Reply to the caller.
    await sms.sendSms({ to: callerNumber, body: result.reply, from: frontdeskNumber });

    // Emergency alerting — only fire the FIRST time a conversation
    // crosses into emergency status, not on every subsequent turn.
    if (result.emergency && !wasAlreadyEmergency) {
      const alertMessage =
        `Emergency call detected: ${result.capturedFields.issue || "unspecified issue"}. ` +
        `Caller: ${callerNumber}. Address: ${result.capturedFields.address || "not yet provided"}. ` +
        `Urgency: ${result.capturedFields.urgency || "unspecified"}. Check your lead log for details.`;

      await sms.sendSms({ to: trial.mobile_number, body: alertMessage, from: frontdeskNumber });
      if (trial.backup_number) {
        await sms.sendSms({ to: trial.backup_number, body: alertMessage, from: frontdeskNumber });
      }
    }

    // Once the conversation wraps up, log the final row to the Sheet.
    if (result.readyToWrapUp) {
      if (!trial.sheet_id) {
        const { sheetId, sheetUrl } = await sheets.createAndShareSheet({
          trialId: trial.id,
          businessName: trial.business_name,
          ownerEmail: trial.email,
        });
        await db.updateTrial(trial.id, { sheet_id: sheetId, sheet_url: sheetUrl });
        trial.sheet_id = sheetId;
      }

      // Emergencies get dispatched directly, not scheduled — no slot was
      // confirmed, so "booked" would be inaccurate. Only call it booked
      // when a preferred time was actually captured.
      const outcome = callType === "emergency"
        ? "callback"
        : result.capturedFields.preferred_time
          ? "booked"
          : "callback";

      await sheets.appendRow({
        sheetId: trial.sheet_id,
        row: {
          timestamp: new Date().toISOString(),
          caller_number: callerNumber,
          call_type: callType,
          address: result.capturedFields.address || "",
          issue: result.capturedFields.issue || "",
          urgency: result.capturedFields.urgency || "",
          preferred_time: result.capturedFields.preferred_time || "",
          outcome,
          notes: "",
        },
      });
    }

    // Twilio expects a 200 with TwiML (even if empty) for SMS webhooks.
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: "<Response></Response>",
    };
  } catch (err) {
    console.error("sms-incoming handler error:", err);
    return { statusCode: 500, body: "Internal error" };
  }
};
