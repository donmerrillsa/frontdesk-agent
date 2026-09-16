// ============================================================
// netlify/functions/demo-chat.js
// ============================================================
// Demo-only endpoint for the sandboxed website chat (demo.html).
// Modeled on sms-incoming.js, but stripped down: no phone numbers,
// no trial lookup, no lead record, no SMS, no owner/emergency
// alerts. It calls the exact same handleTurn() used in production
// and hands the result straight back as JSON so the browser can
// render it. Nothing here ever touches the real leads/trials
// tables or sends a real message anywhere.

const { handleTurn } = require("../../src/conversation/engine");

const DEFAULT_BUSINESS_NAME = "a local HVAC company";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON body" };
  }

  const { businessName, history, message, capturedFields, emergency } = payload;

  if (!message || typeof message !== "string") {
    return { statusCode: 400, body: "Missing required field: message" };
  }

  try {
    const result = await handleTurn({
      businessName: (businessName && String(businessName).trim()) || DEFAULT_BUSINESS_NAME,
      pricing: {},
      history: Array.isArray(history) ? history : [],
      message,
      capturedFields: capturedFields && typeof capturedFields === "object" ? capturedFields : {},
      // The demo has no persisted lead row, so the browser is the only thing
      // that remembers whether this conversation already crossed into
      // emergency status — it echoes back the "emergency" flag from the
      // previous response, same as it does for capturedFields.
      alreadyEmergency: Boolean(emergency),
    });

    // Demo mode: no db writes, no SMS, no owner/emergency alerts — the
    // emergency flag is just passed straight through so the UI can
    // show it, never acted on.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reply: result.reply,
        capturedFields: result.capturedFields,
        emergency: result.emergency,
        readyToWrapUp: result.readyToWrapUp,
      }),
    };
  } catch (err) {
    console.error("demo-chat handler error:", err);
    return { statusCode: 500, body: "Internal error" };
  }
};
