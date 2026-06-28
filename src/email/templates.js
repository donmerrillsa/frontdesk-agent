// ============================================================
// EMAIL TEMPLATES
// ============================================================
// Deliberately does NOT promise things that aren't built yet —
// no specific phone number (provisioning isn't wired into signup),
// no "verify your forwarding now" (there's no number to forward to),
// no automated reports (not built). The timeline section below
// describes the INTENDED process honestly — it says what's planned
// and roughly when, not that each step already fires automatically.
// Mirrors Frontdesk_Trial_What_To_Expect_v1.0.docx — keep both in
// sync if either changes; don't let the email promise something
// the doc doesn't, or vice versa.

function welcomeEmail({ ownerName, businessName }) {
  const subject = `You're on the list, ${ownerName.split(" ")[0]} — what happens next`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#f5f7f9; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9; padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">

        <tr>
          <td style="background-color:#15191c; padding:24px 32px;">
            <span style="font-family:Arial, Helvetica, sans-serif; font-weight:bold; font-size:20px; letter-spacing:2px; color:#ffffff;">FRONTDESK</span>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px; font-family:Arial, Helvetica, sans-serif; font-size:22px; color:#15191c;">Thanks, ${ownerName} — we've got ${businessName}'s trial request.</h1>

            <p style="margin:0 0 20px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#15191c;">
              Here's exactly what happens next — no automated setup steps to follow on your end yet, just one real step:
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9; border-left:4px solid #1857c9; border-radius:4px; margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#15191c;">
                    <strong>We'll reach out by phone or email within 24 hours</strong> to confirm a few details and get your trial number set up on our end.
                  </p>
                </td>
              </tr>
            </table>

            <h2 style="margin:0 0 12px; font-family:Arial, Helvetica, sans-serif; font-size:17px; color:#15191c;">Your 14 days, at a glance</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#15191c; margin-bottom:28px;">
              <tr>
                <td style="padding:6px 0; vertical-align:top; width:90px; color:#1857c9; font-weight:bold;">Day 0</td>
                <td style="padding:6px 0;">Don personally sets up your trial number and walks you through call forwarding.</td>
              </tr>
              <tr>
                <td style="padding:6px 0; vertical-align:top; color:#1857c9; font-weight:bold;">Days 1–14</td>
                <td style="padding:6px 0;">Every missed call gets an instant text-back, a captured job, and an emergency alert if it's urgent — automatically.</td>
              </tr>
              <tr>
                <td style="padding:6px 0; vertical-align:top; color:#1857c9; font-weight:bold;">Around Day 12</td>
                <td style="padding:6px 0;">We'll check in with how the trial's gone and what it's caught so far.</td>
              </tr>
              <tr>
                <td style="padding:6px 0; vertical-align:top; color:#1857c9; font-weight:bold;">Day 14</td>
                <td style="padding:6px 0;">Your decision point — continue as a paying customer, or let the trial end. No pressure either way, and nothing's charged until you say yes.</td>
              </tr>
            </table>

            <h2 style="margin:0 0 12px; font-family:Arial, Helvetica, sans-serif; font-size:17px; color:#15191c;">What Frontdesk does once it's live</h2>
            <p style="margin:0 0 24px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#15191c;">
              When a call to your business goes unanswered, Frontdesk texts the caller back within seconds, asks what's going on, captures the job details, and flags anything urgent straight to your phone.
            </p>

            <h2 style="margin:0 0 12px; font-family:Arial, Helvetica, sans-serif; font-size:17px; color:#15191c;">Pricing, if you decide to continue</h2>
            <p style="margin:0 0 4px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#15191c;">
              <strong>Core Plan:</strong> $395/month, flat rate, no per-minute fees.
            </p>
            <p style="margin:0 0 20px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#15191c;">
              <strong>Annual Plan:</strong> $3,600/year (equivalent to $300/month).
            </p>
            <p style="margin:0 0 20px; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.6; color:#5b6470;">
              No payment information is collected during your trial — that conversation only happens if and when you decide to continue.
            </p>

            <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#5b6470;">
              Questions in the meantime? Just reply to this email, or reach Don directly at (210) 846-6685.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background-color:#f5f7f9; padding:20px 32px; border-top:1px solid #e3e6ea;">
            <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#5b6470;">
              Frontdesk · Built for HVAC ·
              <a href="https://frontdesk-hvac.netlify.app/privacy-policy.html" style="color:#5b6470; text-decoration:underline;">Privacy Policy</a> ·
              <a href="https://frontdesk-hvac.netlify.app/terms.html" style="color:#5b6470; text-decoration:underline;">Terms</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, html };
}

function adminNotification({ businessName, ownerName, mobileNumber, backupNumber, email, trialId }) {
  const subject = `New trial signup: ${businessName}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#f5f7f9; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9; padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="500" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
        <tr>
          <td style="background-color:#15191c; padding:20px 28px;">
            <span style="font-family:Arial, Helvetica, sans-serif; font-weight:bold; font-size:18px; letter-spacing:2px; color:#ffffff;">FRONTDESK</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <h1 style="margin:0 0 16px; font-family:Arial, Helvetica, sans-serif; font-size:19px; color:#15191c;">New trial signup</h1>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#15191c;">
              <tr><td style="padding:4px 0; color:#5b6470; width:140px;">Business</td><td style="padding:4px 0;"><strong>${businessName}</strong></td></tr>
              <tr><td style="padding:4px 0; color:#5b6470;">Owner</td><td style="padding:4px 0;">${ownerName}</td></tr>
              <tr><td style="padding:4px 0; color:#5b6470;">Mobile</td><td style="padding:4px 0;">${mobileNumber}</td></tr>
              <tr><td style="padding:4px 0; color:#5b6470;">Backup</td><td style="padding:4px 0;">${backupNumber || "(none provided)"}</td></tr>
              <tr><td style="padding:4px 0; color:#5b6470;">Email</td><td style="padding:4px 0;">${email}</td></tr>
              <tr><td style="padding:4px 0; color:#5b6470;">Trial ID</td><td style="padding:4px 0; font-family:monospace; font-size:12px;">${trialId}</td></tr>
            </table>
            <p style="margin:20px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#5b6470;">
              Next: buy them a Twilio number, set its webhooks, set <code>frontdesk_number</code> on this trial row, then call them.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, html };
}

module.exports = { welcomeEmail, adminNotification };
