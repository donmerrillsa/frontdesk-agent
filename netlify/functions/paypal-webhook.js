// ============================================================
// netlify/functions/paypal-webhook.js
// ============================================================
// Register this deployed URL in the PayPal developer dashboard,
// subscribed to BILLING.SUBSCRIPTION.ACTIVATED at minimum.
//
// This calls paypal.js directly, not the provider switch — this
// endpoint only ever makes sense when you're actually using PayPal,
// since PayPal is the one sending it real webhook payloads. The
// switch (src/payments/index.js) matters for which provider GENERATES
// the checkout link; it doesn't apply here.

const paypal = require("../../src/payments/paypal");
const { markTrialConverted } = require("../../src/payments/handleConversion");

function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

exports.handler = async (event) => {
  try {
    const headers = normalizeHeaders(event.headers);
    const body = JSON.parse(event.body);

    const isValid = await paypal.verifyWebhookSignature(headers, body);
    if (!isValid) {
      console.error("paypal-webhook: signature verification failed — rejecting");
      return { statusCode: 400, body: "Invalid signature" };
    }

    if (body.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      const resource = body.resource;
      const trialId = resource.custom_id;
      const subscriptionId = resource.id;
      const plan = resource.plan_id === process.env.PAYPAL_PLAN_ID_ANNUAL ? "annual" : "monthly";

      if (!trialId) {
        console.error("paypal-webhook: ACTIVATED event missing custom_id, cannot match to a trial");
        // Still 200 — this is a data problem on our end, not something
        // retrying the webhook delivery would fix.
        return { statusCode: 200, body: "Acknowledged, but no trial reference found" };
      }

      await markTrialConverted({ trialId, subscriptionId, plan });
      return { statusCode: 200, body: "OK" };
    }

    if (body.event_type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
      // Logged for now. PayPal already retries the charge itself (see
      // paypal.js setup notes) — deciding whether/how to alert the owner
      // on a failed renewal is a real product decision for later, not
      // built here yet.
      console.warn(`paypal-webhook: payment failed for subscription ${body.resource?.id}`);
      return { statusCode: 200, body: "Acknowledged" };
    }

    // Any other event type — acknowledge so PayPal doesn't keep retrying,
    // we just don't act on it.
    return { statusCode: 200, body: "Acknowledged, no action taken" };
  } catch (err) {
    console.error("paypal-webhook handler error:", err);
    return { statusCode: 500, body: "Internal error" };
  }
};
