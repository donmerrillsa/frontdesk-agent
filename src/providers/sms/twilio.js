// ============================================================
// SMS PROVIDER — LIVE (Twilio)
// ============================================================
// Real Twilio integration. Needs these env vars set in Netlify
// (Project configuration > Environment variables), never in code:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM_NUMBER   — the Frontdesk number for this trial/account

const twilio = require("twilio");

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * @param {object} params
 * @param {string} params.to - recipient phone number, E.164 format (+1XXXXXXXXXX)
 * @param {string} params.body - message text
 * @returns {Promise<{sid: string, status: string}>}
 */
async function sendSms({ to, body }) {
  const client = getClient();
  const message = await client.messages.create({
    to,
    from: process.env.TWILIO_FROM_NUMBER,
    body,
  });
  return { sid: message.sid, status: message.status };
}

/**
 * Buys a local Twilio number for a given area code, for trial provisioning.
 * Not wired into anything yet — Phase 2 territory — but the real call
 * is correct and ready when that phase starts.
 *
 * @param {string} areaCode - 3-digit US area code
 * @returns {Promise<{phoneNumber: string, sid: string}>}
 */
async function provisionNumber(areaCode) {
  const client = getClient();
  const available = await client
    .availablePhoneNumbers("US")
    .local.list({ areaCode, limit: 1 });

  if (!available.length) {
    throw new Error(`No available numbers found for area code ${areaCode}`);
  }

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    smsUrl: process.env.TWILIO_SMS_WEBHOOK_URL,
    voiceUrl: process.env.TWILIO_VOICE_WEBHOOK_URL, // -> voice-incoming.js
  });

  return { phoneNumber: purchased.phoneNumber, sid: purchased.sid };
}

module.exports = { sendSms, provisionNumber };
