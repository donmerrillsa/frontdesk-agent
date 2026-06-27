// ============================================================
// PAYMENTS PROVIDER — LIVE (PayPal Subscriptions)
// ============================================================
// Needs these env vars:
//   PAYPAL_CLIENT_ID
//   PAYPAL_CLIENT_SECRET
//   PAYPAL_ENV                  — "sandbox" or "live"
//   PAYPAL_PLAN_ID_MONTHLY       — created once, see setup note below
//   PAYPAL_PLAN_ID_ANNUAL
//   PAYPAL_WEBHOOK_ID            — from registering your webhook URL
//
// ONE-TIME SETUP (not code — done once per PayPal account, before
// any of this works): you need a Product and two Billing Plans
// created in PayPal first. Easiest path is PayPal's dashboard
// (Pay & Get Paid > Subscriptions > Create plan), or via the API:
//   POST /v1/catalogs/products        (create the Product once)
//   POST /v1/billing/plans            (create Monthly plan, $395/mo)
//   POST /v1/billing/plans            (create Annual plan, $3,600/yr)
// Put the resulting plan IDs in the env vars above. Then register
// your deployed paypal-webhook.js URL under Apps & Credentials in
// the PayPal developer dashboard, subscribed to at least
// BILLING.SUBSCRIPTION.ACTIVATED and BILLING.SUBSCRIPTION.PAYMENT.FAILED
// — that gives you PAYPAL_WEBHOOK_ID.

const BASE_URL = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal OAuth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
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
  const accessToken = await getAccessToken();

  const planId = plan === "annual"
    ? process.env.PAYPAL_PLAN_ID_ANNUAL
    : process.env.PAYPAL_PLAN_ID_MONTHLY;

  if (!planId) {
    throw new Error(`No PayPal plan ID configured for plan="${plan}" — check env vars`);
  }

  const res = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: trialId, // <- this is how the webhook later knows which trial converted
      subscriber: {
        email_address: email,
        name: { given_name: businessName },
      },
      application_context: {
        brand_name: "Frontdesk",
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`PayPal subscription creation failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const approveLink = data.links.find((l) => l.rel === "approve");

  if (!approveLink) {
    throw new Error("PayPal response did not include an approve link");
  }

  return { checkoutUrl: approveLink.href, subscriptionId: data.id };
}

/**
 * Verifies a webhook actually came from PayPal, not a forged request.
 * PayPal's own verification endpoint does the cryptographic check for you.
 *
 * @param {object} headers - the incoming request's headers (lowercased keys)
 * @param {object} body - the parsed webhook event body
 * @returns {Promise<boolean>}
 */
async function verifyWebhookSignature(headers, body) {
  const accessToken = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    }),
  });

  if (!res.ok) {
    console.error(`PayPal webhook verification request failed: ${res.status}`);
    return false;
  }

  const data = await res.json();
  return data.verification_status === "SUCCESS";
}

module.exports = { createCheckoutLink, verifyWebhookSignature };
