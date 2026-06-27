// ============================================================
// PAYMENTS PROVIDER — LIVE (Stripe) — the swappable alternative
// ============================================================
// Needs:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
//   STRIPE_PRICE_ID_MONTHLY      — created once in the Stripe Dashboard
//   STRIPE_PRICE_ID_ANNUAL
//
// ONE-TIME SETUP: create a Product with two recurring Prices in the
// Stripe Dashboard (Product catalog > Add product), one monthly
// ($395/mo), one annual ($3,600/yr). Put the resulting price IDs in
// the env vars above. Register your deployed stripe-webhook.js URL
// under Developers > Webhooks, listening for at least
// checkout.session.completed and invoice.payment_failed.

const Stripe = require("stripe");

function getClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
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
  const stripe = getClient();

  const priceId = plan === "annual"
    ? process.env.STRIPE_PRICE_ID_ANNUAL
    : process.env.STRIPE_PRICE_ID_MONTHLY;

  if (!priceId) {
    throw new Error(`No Stripe price ID configured for plan="${plan}" — check env vars`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    // client_reference_id is how the webhook later knows which trial converted —
    // direct equivalent of PayPal's custom_id.
    client_reference_id: trialId,
    metadata: { trial_id: trialId, business_name: businessName },
    success_url: "https://frontdesk-hvac.netlify.app/payment-success.html",
    cancel_url: "https://frontdesk-hvac.netlify.app/payment-cancelled.html",
  });

  return { checkoutUrl: session.url, subscriptionId: session.id };
}

/**
 * Verifies a webhook actually came from Stripe, not a forged request.
 *
 * @param {string} rawBody - the UNPARSED request body (Stripe's signature
 *   covers the exact raw bytes — parsing to JSON first and re-stringifying
 *   would break verification)
 * @param {string} signatureHeader - the "stripe-signature" header
 * @returns {object|null} the verified event object, or null if invalid
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const stripe = getClient();
  try {
    return stripe.webhooks.constructEvent(rawBody, signatureHeader, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook verification failed:", err.message);
    return null;
  }
}

module.exports = { createCheckoutLink, verifyWebhookSignature };
