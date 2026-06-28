// ============================================================
// PAYMENTS PROVIDER — switch
// ============================================================
// Auto-detects live vs. mock per-provider, based on whichever
// real credentials are present. PAYMENTS_PROVIDER picks which one
// to prefer if both happen to be configured (defaults to paypal,
// since that's the account you already have). PROVIDER_MODE=mock
// forces mock regardless, as an explicit safety override.

const forceMock = process.env.PROVIDER_MODE === "mock";
const preferred = process.env.PAYMENTS_PROVIDER || "paypal";

const hasPaypalCreds = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
const hasStripeCreds = Boolean(process.env.STRIPE_SECRET_KEY);

let liveModule = null;
if (!forceMock) {
  if (preferred === "stripe" && hasStripeCreds) liveModule = require("./stripe");
  else if (preferred === "paypal" && hasPaypalCreds) liveModule = require("./paypal");
  // Fall back to whichever IS configured, even if it's not the preferred one.
  else if (hasStripeCreds) liveModule = require("./stripe");
  else if (hasPaypalCreds) liveModule = require("./paypal");
}

module.exports = liveModule || require("./mock");
