// ============================================================
// SHARED CONVERSION LOGIC
// ============================================================
// Both webhook handlers (paypal-webhook.js, stripe-webhook.js) and
// the mock provider's test helper all funnel through this single
// function for the actual "mark trial as paid" step. One place to
// get this right, instead of duplicating it per provider.

const db = require("../providers/db");

/**
 * @param {object} params
 * @param {string} params.trialId
 * @param {string} params.subscriptionId - provider's subscription/customer ID
 * @param {"monthly"|"annual"} params.plan
 */
async function markTrialConverted({ trialId, subscriptionId, plan }) {
  const trial = await db.getTrial(trialId);
  if (!trial) {
    throw new Error(`markTrialConverted: trial ${trialId} not found`);
  }

  // Idempotency matters here — PayPal and Stripe both retry webhook
  // delivery on anything other than a clean 2xx response. If this trial
  // is already converted, treat a repeat event as a no-op success
  // rather than re-running side effects (e.g. don't re-send a
  // "you're all set" confirmation twice).
  if (trial.status === "converted") {
    console.log(`markTrialConverted: trial ${trialId} already converted, ignoring duplicate event`);
    return trial;
  }

  const updated = await db.updateTrial(trialId, {
    status: "converted",
    plan,
    payment_subscription_id: subscriptionId,
    converted_at: new Date().toISOString(),
  });

  console.log(`Trial ${trialId} converted to paid (${plan}, subscription ${subscriptionId})`);
  return updated;
}

module.exports = { markTrialConverted };
