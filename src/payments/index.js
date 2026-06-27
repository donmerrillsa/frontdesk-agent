// ============================================================
// PAYMENTS PROVIDER — switch
// ============================================================
// PROVIDER_MODE=mock (the global default) -> mock.js, no real
// account needed at all.
//
// PROVIDER_MODE=live -> picks PAYMENTS_PROVIDER (paypal | stripe),
// defaulting to paypal since that's the account you already have.
// Switching to Stripe later is one env var, not a rewrite.

const providerMode = process.env.PROVIDER_MODE || "mock";
const paymentsProvider = process.env.PAYMENTS_PROVIDER || "paypal";

module.exports = providerMode === "live"
  ? (paymentsProvider === "stripe" ? require("./stripe") : require("./paypal"))
  : require("./mock");
