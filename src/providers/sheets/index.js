// ============================================================
// SHEETS PROVIDER — switch
// ============================================================
// Auto-detects live vs. mock based on whether a real Google
// service account key is present. PROVIDER_MODE=mock forces mock
// regardless, as an explicit safety override.

const forceMock = process.env.PROVIDER_MODE === "mock";
const hasCreds = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

module.exports = (!forceMock && hasCreds) ? require("./google") : require("./mock");
