# Frontdesk — App Backend

This repo contains the static site (already live at frontdesk-hvac.netlify.app)
plus the real trial-automation backend: database, conversation engine, and
swappable providers for SMS, Sheets, and the database itself.

## What's real right now vs. what needs your credentials

| Layer | Status |
|---|---|
| Trial signup → database record | **Real, once Supabase env vars are set — see below.** `submission-created.js` writes a real trial row. |
| Missed-call detection + first text-back | **Real code, needs Twilio credentials to actually fire.** `voice-incoming.js` — Twilio's Voice webhook fires this the instant a forwarded call lands; sends the fixed greeting and opens the lead record. Needs zero LLM key to test — it's a fixed template, fully tested with mocks already. |
| Welcome email on signup | **Real code, needs `RESEND_API_KEY` to actually send.** Sent via `submission-created.js` right after the trial record is created (Resend, same provider as PIA). Deliberately doesn't mention a phone number or ask the owner to verify forwarding — neither exists yet since number provisioning isn't wired into signup. A second, richer email (real number + forwarding steps) belongs once that automation is real — don't add that content here before it's true. |
| Conversation engine logic (state machine, merging, emergency OR-logic) | **Real.** |
| Conversation engine's actual model call | **Real code, needs your `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`** depending on `LLM_PROVIDER`. |
| SMS sending | **Mock until real Twilio credentials are present**, then automatic — no flag to flip. Logs to `.mockdata/sent-sms.json` while mocked. |
| Google Sheets lead log | **Mock until `GOOGLE_SERVICE_ACCOUNT_KEY` is present**, then automatic. Writes a local CSV while mocked. |
| Database (trials/leads) | **Mock until `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are present**, then automatic. Local `.mockdata/db.json` while mocked. |
| Pricing in conversation | **Not built yet.** The engine currently has no price list and will defer/callback rather than quote — flagged, not fixed. |
| Number provisioning, A2P 10DLC | Not built yet — later phases. |
| Trial → paid conversion (checkout link, webhook, DB update) | **Mock until PayPal or Stripe credentials are present**, then automatic. Defaults to PayPal (you already have the account) if both happen to be configured. Idempotent against duplicate webhook delivery — tested. |
| Triggering a conversion (Day-12 reminder) | **Not automated yet.** `send-checkout-link.js` does the real work once called — call it manually for now (see below) until the Day-12 reminder is built. |

**Each provider goes live independently, the moment its own real credentials
exist — there's no single switch to remember to flip.** Database, SMS,
Sheets, email, and payments each check for their own specific environment
variables and use the real provider automatically once those are set; until
then they fall back to mock on their own. This means Supabase can be live
today even though Twilio isn't ready yet — they don't block each other.
`PROVIDER_MODE=mock` is available as an explicit override (forces every
provider to mock regardless of what credentials exist) — useful for testing,
never required for normal use.

## One-time setup

### 1. Supabase (new project — separate from PIA and MOS)
- Create a new project at supabase.com.
- Open the SQL Editor, paste in `supabase/schema.sql`, run it.
- Under Project Settings → API, grab the **Project URL** and the
  **service_role key** (not the anon key — this runs server-side only).

### 2. GitHub repo
This needs Git-based deploys to support functions — drag-and-drop can't run
server-side code. From this folder:
```
git init
git add .
git commit -m "Initial backend: trial DB + conversation engine + mock providers"
```
Create a new empty repo on GitHub (e.g. `donmerrillsa/frontdesk-app`), then:
```
git remote add origin https://github.com/donmerrillsa/frontdesk-app.git
git branch -M main
git push -u origin main
```

### 3. Link your existing Netlify site to this repo
Your current site (frontdesk-hvac.netlify.app) was deployed by drag-and-drop.
You don't need to create a new site — link the existing one instead:
**Project configuration → Build & deploy → Continuous deployment → Link a repository.**
Point it at the repo you just pushed. From now on, `git push` deploys the site
instead of dragging a folder.

### 4. Environment variables
**Project configuration → Environment variables**, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (when ready to go live with the conversation engine)
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`,
  `TWILIO_SMS_WEBHOOK_URL`, `TWILIO_VOICE_WEBHOOK_URL` (point these at your
  deployed `sms-incoming` and `voice-incoming` function URLs once Phase 2
  provisions a number)
- Google: `GOOGLE_SERVICE_ACCOUNT_KEY` (the full service account JSON, one line)

### 5. Payments (PayPal by default)
One-time setup in your PayPal account, before any of this works:
- Create a Product and two Billing Plans (Monthly $395, Annual $3,600) —
  PayPal Dashboard → Pay & Get Paid → Subscriptions → Create plan.
- Register your deployed `paypal-webhook.js` URL under Apps & Credentials,
  subscribed to at least `BILLING.SUBSCRIPTION.ACTIVATED`.
- Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_ID_MONTHLY`,
  `PAYPAL_PLAN_ID_ANNUAL`, `PAYPAL_WEBHOOK_ID` in Netlify.
- Set `ADMIN_TRIGGER_SECRET` to any random string — this protects the
  manual conversion trigger below from being callable by anyone who
  finds the URL.

**Converting a trial to paid today** (until the Day-12 reminder is automated):
```
curl -X POST https://frontdesk-hvac.netlify.app/.netlify/functions/send-checkout-link \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: <your ADMIN_TRIGGER_SECRET>" \
  -d '{"trialId": "<the trial'\''s id from Supabase>", "plan": "monthly"}'
```
This sends the customer a real checkout link by text. When they pay,
PayPal's webhook fires automatically and marks the trial converted —
that part doesn't need any manual step.

Switching to Stripe later: set `PAYMENTS_PROVIDER=stripe`, fill in the
Stripe env vars, register `stripe-webhook.js` in the Stripe dashboard
instead. Nothing else in the codebase changes.

## Testing the conversation engine locally

```
npm install
ANTHROPIC_API_KEY=sk-ant-... node test/cli-simulator.js
```

This seeds a fake trial, then lets you type as the caller in your terminal.
Every reply, captured field, and emergency flag comes from the real engine —
it's the actual production logic, just pointed at mock SMS/Sheets/DB instead
of live ones. Inspect `.mockdata/db.json` afterward to see the final lead
record exactly as it would land in Supabase.

## What's NOT in this repo yet
- Number provisioning automation (the `provisionNumber` function in
  `twilio.js` is written and correct, just not wired into the signup flow).
- Pricing — the engine has no price list and defers any pricing question
  to a callback rather than guessing. See the "Pricing in conversation" row
  above.
- A2P 10DLC compliance — that's registration through Twilio's console with
  your real business details, not code.
- Forwarding verification + no-activity monitoring (Steps 6–7 of the
  onboarding doc).
- Weekly/Day-12/Day-14 reporting — including the Day-12 reminder that
  would eventually call `send-checkout-link.js` automatically instead of
  you calling it by hand.
