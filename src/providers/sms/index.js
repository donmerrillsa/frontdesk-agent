// ============================================================
// SMS PROVIDER — switch
// ============================================================
// Auto-detects live vs. mock based on whether real Twilio
// credentials are present. PROVIDER_MODE=mock forces mock
// regardless, as an explicit safety override.

const forceMock = process.env.PROVIDER_MODE === "mock";
const hasCreds = Boolean(
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
);

module.exports = (!forceMock && hasCreds) ? require("./twilio") : require("./mock");
