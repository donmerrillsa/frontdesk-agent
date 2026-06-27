// ============================================================
// netlify/functions/send-checkout-link.js
// ============================================================
// Manual stand-in for what the Day-12 reminder automation will
// eventually trigger automatically. Until that's built, call this
// yourself when a trial customer says they want to continue:
//
//   curl -X POST https://your-site.netlify.app/.netlify/functions/send-checkout-link \
//     -H "Content-Type: application/json" \
//     -H "x-admin-secret: <your ADMIN_TRIGGER_SECRET>" \
//     -d '{"trialId": "...", "plan": "monthly"}'
//
// Goes through the provider switch (src/payments/index.js) — this IS
// the moment provider choice matters, unlike the webhook receivers,
// since this is what actually decides whether the customer pays
// through PayPal or Stripe.
//
// Protected with a shared secret (ADMIN_TRIGGER_SECRET env var) since
// this sends a real payment link to a real customer — not something
// that should be triggerable by anyone who finds the URL.

const db = require("../../src/providers/db");
const sms = require("../../src/providers/sms");
const payments = require("../../src/payments");

exports.handler = async (event) => {
  try {
    const providedSecret = event.headers["x-admin-secret"] || event.headers["X-Admin-Secret"];
    if (!process.env.ADMIN_TRIGGER_SECRET || providedSecret !== process.env.ADMIN_TRIGGER_SECRET) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    const { trialId, plan } = JSON.parse(event.body);

    if (!trialId || !["monthly", "annual"].includes(plan)) {
      return { statusCode: 400, body: 'Required: trialId, plan ("monthly" or "annual")' };
    }

    const trial = await db.getTrial(trialId);
    if (!trial) {
      return { statusCode: 404, body: "Trial not found" };
    }

    const { checkoutUrl, subscriptionId } = await payments.createCheckoutLink({
      trialId: trial.id,
      businessName: trial.business_name,
      email: trial.email,
      plan,
    });

    const message =
      `Thanks for confirming! Here's your secure checkout link to continue with Frontdesk ` +
      `(${plan === "annual" ? "$3,600/year" : "$395/month"}): ${checkoutUrl}`;

    await sms.sendSms({ to: trial.mobile_number, body: message });

    console.log(`send-checkout-link: sent ${plan} checkout link to trial ${trialId} (subscription ${subscriptionId})`);
    return { statusCode: 200, body: JSON.stringify({ checkoutUrl, subscriptionId }) };
  } catch (err) {
    console.error("send-checkout-link handler error:", err);
    return { statusCode: 500, body: "Internal error" };
  }
};
