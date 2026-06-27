// ============================================================
// netlify/functions/stripe-webhook.js
// ============================================================
// Register this deployed URL in the Stripe dashboard if you ever
// switch PAYMENTS_PROVIDER to "stripe". Not wired to anything by
// default while PayPal is the active provider — kept here so the
// swap is a real, complete option, not a half-finished one.

const stripe = require("../../src/payments/stripe");
const { markTrialConverted } = require("../../src/payments/handleConversion");

exports.handler = async (event) => {
  try {
    const signature = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
    // Stripe's signature covers the exact raw request body — do NOT
    // JSON.parse before verifying, or the bytes won't match and every
    // webhook will fail verification.
    const stripeEvent = stripe.verifyWebhookSignature(event.body, signature);

    if (!stripeEvent) {
      console.error("stripe-webhook: signature verification failed — rejecting");
      return { statusCode: 400, body: "Invalid signature" };
    }

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const trialId = session.client_reference_id;
      const subscriptionId = session.subscription || session.id;

      if (!trialId) {
        console.error("stripe-webhook: session missing client_reference_id, cannot match to a trial");
        return { statusCode: 200, body: "Acknowledged, but no trial reference found" };
      }

      // Stripe sessions don't directly carry "monthly" vs "annual" the way
      // PayPal's plan_id does — that'd need to be read off the line item's
      // price ID and compared against your configured STRIPE_PRICE_ID_*
      // env vars. Left as a straightforward addition for whoever wires
      // this up for real, since it's not exercised until Stripe is
      // actually the active provider.
      const plan = "monthly"; // TODO: derive from session.line_items / price ID if switching to Stripe

      await markTrialConverted({ trialId, subscriptionId, plan });
      return { statusCode: 200, body: "OK" };
    }

    if (stripeEvent.type === "invoice.payment_failed") {
      console.warn(`stripe-webhook: payment failed for invoice ${stripeEvent.data.object.id}`);
      return { statusCode: 200, body: "Acknowledged" };
    }

    return { statusCode: 200, body: "Acknowledged, no action taken" };
  } catch (err) {
    console.error("stripe-webhook handler error:", err);
    return { statusCode: 500, body: "Internal error" };
  }
};
