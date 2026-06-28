// ============================================================
// EMAIL PROVIDER — switch
// ============================================================
// Auto-detects live vs. mock based on whether a real Resend API
// key is present. PROVIDER_MODE=mock forces mock regardless, as an
// explicit safety override.

const forceMock = process.env.PROVIDER_MODE === "mock";
const hasCreds = Boolean(process.env.RESEND_API_KEY);

module.exports = (!forceMock && hasCreds) ? require("./resend") : require("./mock");
