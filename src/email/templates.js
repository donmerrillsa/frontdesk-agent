// ============================================================
// EMAIL TEMPLATES
// ============================================================
// Deliberately does NOT promise things that aren't built yet —
// no specific phone number (provisioning isn't wired into signup),
// no "verify your forwarding now" (there's no number to forward to),
// no automated reports (not built). This says exactly one true
// thing: we got your signup, and a real person will follow up.
//
// When number provisioning gets wired in, a SECOND email (a
// different template, triggered at that later point) should carry
// the actual number + forwarding instructions — see the README
// note on this. This template intentionally stays narrower than
// that until that's real.

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

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9; border-left:4px solid #1857c9; border-radius:4px; margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#15191c;">
                    <strong>We'll reach out by phone or email within 24 hours</strong> to confirm a few details and get your trial number set up on our end.
                  </p>
                </td>
              </tr>
            </table>

            <h2 style="margin:0 0 12px; font-family:Arial, Helvetica, sans-serif; font-size:17px; color:#15191c;">What Frontdesk does once it's live</h2>
            <p style="margin:0 0 8px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#15191c;">
              When a call to your business goes unanswered, Frontdesk texts the caller back within seconds, asks what's going on, captures the job details, and flags anything urgent straight to your phone — automatically, for the full 14 days of your trial.
            </p>

            <p style="margin:20px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#5b6470;">
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

module.exports = { welcomeEmail };
