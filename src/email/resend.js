// ============================================================
// EMAIL PROVIDER — LIVE (Resend)
// ============================================================
// Needs RESEND_API_KEY set in Netlify. Same provider you already
// use for PIA — no new account needed, just a new key/domain setup
// if Frontdesk should send from its own address rather than
// whatever PIA currently uses.
//
// FROM_EMAIL should be a verified sending domain in your Resend
// account — set it via the RESEND_FROM_EMAIL env var.

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Frontdesk <hello@buy-mos.com>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

module.exports = { sendEmail };
