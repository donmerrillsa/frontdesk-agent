// ============================================================
// PAYMENTS PROVIDER — MOCK
// ============================================================
// Simulates a checkout link without touching real PayPal/Stripe.
// Logs everything to .mockdata/checkout-links.json so you can
// inspect what would have been sent.
//
// There's no real webhook to fire in mock mode — instead,
// simulateWebhook() lets test code (or the CLI simulator) call the
// exact same conversion logic a real webhook would trigger, so the
// "mark trial converted" path is fully testable without a live
// PayPal/Stripe account.

const fs = require("fs");
const path = require("path");
const { markTrialConverted } = require("./handleConversion");

const LOG_PATH = path.join(__dirname, "..", "..", "..", ".mockdata", "checkout-links.json");

function readLog() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
}

function writeLog(entries) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(entries, null, 2));
}

/**
 * @param {object} params
 * @param {string} params.trialId
 * @param {string} params.businessName
 * @param {string} params.email
 * @param {"monthly"|"annual"} params.plan
 * @returns {Promise<{checkoutUrl: string, subscriptionId: string}>}
 */
async function createCheckoutLink({ trialId, businessName, email, plan }) {
  const subscriptionId = `mock-sub-${trialId}`;
  const checkoutUrl = `https://mock-checkout.example/${subscriptionId}`;

  const entries = readLog();
  entries.push({ trialId, businessName, email, plan, subscriptionId, checkoutUrl, createdAt: new Date().toISOString() });
  writeLog(entries);

  console.log(`[MOCK PAYMENTS] Checkout link for ${businessName} (${plan}): ${checkoutUrl}`);
  return { checkoutUrl, subscriptionId };
}

/**
 * Test-only helper: simulates the customer actually completing payment,
 * running the exact same conversion logic the real webhook handlers run.
 *
 * @param {string} trialId
 * @param {string} subscriptionId
 * @param {"monthly"|"annual"} plan
 */
async function simulateWebhook(trialId, subscriptionId, plan) {
  console.log(`[MOCK PAYMENTS] Simulating successful payment for trial ${trialId}`);
  return markTrialConverted({ trialId, subscriptionId, plan });
}

module.exports = { createCheckoutLink, simulateWebhook };
