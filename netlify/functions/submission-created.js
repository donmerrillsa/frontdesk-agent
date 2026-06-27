// ============================================================
// netlify/functions/submission-created.js
// ============================================================
// Netlify automatically invokes a function with exactly this name
// after every verified Netlify Forms submission on the site. No
// changes needed to trial-signup.html for this to fire.

const db = require("../../src/providers/db");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const payload = body.payload;

    // Ignore submissions from any other form that might exist on the site.
    if (payload.form_name !== "trial-signup") {
      return { statusCode: 200, body: "Ignored: not trial-signup form" };
    }

    const data = payload.data;
    const { business_name, owner_name, mobile_number, backup_number, email, terms_accepted, terms_version, sample_reviewed } = data;

    if (!business_name || !owner_name || !mobile_number || !email) {
      console.error("submission-created: missing required field(s):", data);
      return { statusCode: 400, body: "Missing required field(s)" };
    }

    // Don't trust the client-side `required` attribute alone — someone
    // could POST directly to this endpoint bypassing the HTML form
    // entirely. Netlify Forms omits unchecked checkboxes from the
    // payload rather than sending false, so absence = not accepted.
    if (!terms_accepted) {
      console.error("submission-created: terms not accepted, rejecting signup");
      return { statusCode: 400, body: "Terms and Conditions must be accepted" };
    }
    if (!sample_reviewed) {
      console.error("submission-created: sample conversation not acknowledged, rejecting signup");
      return { statusCode: 400, body: "Sample conversation acknowledgment is required" };
    }

    const trial = await db.createTrial({
      business_name,
      owner_name,
      mobile_number,
      backup_number,
      email,
      terms_accepted_at: new Date().toISOString(),
      terms_version: terms_version || "unknown",
      sample_reviewed_at: new Date().toISOString(),
    });

    console.log(`Trial created: ${trial.id} (${trial.business_name})`);
    return { statusCode: 200, body: JSON.stringify({ trial_id: trial.id }) };
  } catch (err) {
    console.error("submission-created handler error:", err);
    return { statusCode: 500, body: "Internal error" };
  }
};
