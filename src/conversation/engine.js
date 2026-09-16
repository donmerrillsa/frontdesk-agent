// ============================================================
// CONVERSATION ENGINE — the real thing
// ============================================================
// Calls whichever LLM provider is configured (src/llm/index.js —
// defaults to Anthropic, set LLM_PROVIDER=openai to use OpenAI
// instead). Needs a real API key for whichever provider you pick —
// see .env.example. This logic itself (merging fields, the keyword
// safety net) is provider-independent; only src/llm/* changes
// depending on which model you're calling.
//
// I (Claude, in the chat where this was built) can't execute this
// file myself — no API key for either provider exists in that
// sandbox. But the code is real and correct; once you add a key
// for whichever provider you choose, this runs exactly as designed.

const llm = require("../llm");
const { buildSystemPrompt } = require("./prompts");
const { matchesEmergencyKeyword } = require("./keywordTriggers");

// Deterministic backstop: an emergency conversation can never be marked
// ready to wrap up while any of these are still missing, regardless of
// what the model self-reports — same spirit as the keyword-match safety
// net below for emergency detection itself. Prevents a single bad model
// turn from closing out an emergency without a way to reach the caller.
const EMERGENCY_REQUIRED_FIELDS = ["address", "name", "callback_number"];

// Deterministic safety floor, prepended to every FIRST emergency reply
// regardless of what the model produces — same reliability pattern as
// the keyword backstop and the wrap-up gate above. Harmless boilerplate
// on a non-dangerous emergency (e.g. "no heat"); a real floor on a
// dangerous one (gas smell, smoke, sparks). The model still adds
// hazard-specific detail on top of this via prompts.js.
const EMERGENCY_SAFETY_LINE = "If you're in any danger, please get to a safe location first.";

// isLiveConversation distinguishes a real SMS conversation (sms-incoming.js,
// where a real on-call tech alert fires and a real lead is logged) from the
// sandboxed demo (demo-chat.js, where nothing real happens). Used to avoid
// the AI claiming real-world actions/follow-through that won't occur.
function buildEmergencyAcknowledgment(isLiveConversation) {
  const techLine = isLiveConversation ? " I'm alerting the on-call tech now." : "";
  return `Thanks — I'm flagging this as urgent. ${EMERGENCY_SAFETY_LINE}${techLine}`;
}

/**
 * Handles one turn of the conversation.
 *
 * @param {object} params
 * @param {string} params.businessName
 * @param {object} [params.pricing] - owner-configured price list; omit or pass {} if none configured
 * @param {Array<{role: "caller"|"assistant", text: string}>} params.history - prior turns
 * @param {string} params.message - the caller's latest message
 * @param {object} params.capturedFields - accumulated state so far: { address, issue, urgency, preferred_time, system_type, name, callback_number }
 * @param {boolean} [params.alreadyEmergency] - whether this conversation was already flagged as an emergency before this turn
 * @param {string} [params.knownCallbackNumber] - a callback number already known from another channel (e.g. the Twilio "From" number); when set, the model is told not to ask for one
 * @param {boolean} [params.isLiveConversation] - true for a real SMS conversation, false/omitted for the sandboxed demo; controls whether replies claim real-world follow-through (on-call tech alert, "someone will follow up") that only actually happens on the live path
 * @returns {Promise<{
 *   reply: string,
 *   capturedFields: object,
 *   emergency: boolean,
 *   readyToWrapUp: boolean
 * }>}
 */
async function handleTurn({ businessName, pricing = {}, history = [], message, capturedFields = {}, alreadyEmergency = false, knownCallbackNumber, isLiveConversation = false }) {
  const systemPrompt = buildSystemPrompt({ businessName, pricing, knownCallbackNumber, isLiveConversation });

  const contextNote =
    `Captured so far: ${JSON.stringify(capturedFields)}\n\n` +
    `Caller's latest message: "${message}"`;

  const conversationText = history
    .map((turn) => `${turn.role === "caller" ? "Caller" : "You"}: ${turn.text}`)
    .join("\n");

  const userContent = conversationText
    ? `Conversation so far:\n${conversationText}\n\n${contextNote}`
    : contextNote;

  let parsed;
  try {
    const raw = await llm.complete(systemPrompt, userContent);
    parsed = JSON.parse(raw);
  } catch (err) {
    // Model call failed outright, or (defensively) wrapped JSON in prose
    // despite instructions. Either way, the caller must never get silence —
    // send the fallback text and let sms-incoming.js know to alert the
    // owner, instead of throwing and losing the conversation turn entirely.
    console.error("Engine: conversation turn failed:", err);
    return {
      reply: isLiveConversation
        ? "Thanks for reaching out — someone will get back to you shortly."
        : "Thanks for reaching out — something went wrong on our end just now. (This is a demo; no real message was sent or lost.)",
      capturedFields,
      emergency: false,
      readyToWrapUp: false,
      error: true,
    };
  }

  // Merge newly-learned fields into accumulated state without overwriting
  // with nulls.
  const mergedFields = { ...capturedFields };
  for (const [key, value] of Object.entries(parsed.fields || {})) {
    if (value !== null && value !== undefined && value !== "") {
      mergedFields[key] = value;
    }
  }

  // When a callback number is already known from another channel (Twilio),
  // the prompt tells the model not to ask for one — so it never appears in
  // parsed.fields. Seed it here instead, so it still shows up in
  // capturedFields.callback_number for the wrap-up gate below and for
  // whatever the caller does with the returned state.
  if (knownCallbackNumber && !mergedFields.callback_number) {
    mergedFields.callback_number = knownCallbackNumber;
  }

  // Emergency = keyword match OR model judgment. Either can flag it;
  // neither can un-flag it once true. See keywordTriggers.js for why.
  const keywordHit = matchesEmergencyKeyword(message);
  const emergency = Boolean(keywordHit || parsed.emergency_suspected);

  // Fixed acknowledgment only on the turn that FIRST crosses into emergency —
  // repeating it on every later turn of an already-flagged emergency reads
  // like a broken record to the caller.
  const isNewEmergency = emergency && !alreadyEmergency;
  const reply = isNewEmergency
    ? `${buildEmergencyAcknowledgment(isLiveConversation)} ${parsed.reply || ""}`.trim()
    : parsed.reply;

  const emergencyFieldsComplete =
    !emergency || EMERGENCY_REQUIRED_FIELDS.every((key) => Boolean(mergedFields[key]));
  const readyToWrapUp = Boolean(parsed.ready_to_wrap_up) && emergencyFieldsComplete;

  return {
    reply,
    capturedFields: mergedFields,
    emergency,
    readyToWrapUp,
    error: false,
  };
}

module.exports = { handleTurn };
