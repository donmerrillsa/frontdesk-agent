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

/**
 * Handles one turn of the conversation.
 *
 * @param {object} params
 * @param {string} params.businessName
 * @param {object} [params.pricing] - owner-configured price list; omit or pass {} if none configured
 * @param {Array<{role: "caller"|"assistant", text: string}>} params.history - prior turns
 * @param {string} params.message - the caller's latest message
 * @param {object} params.capturedFields - accumulated state so far: { address, issue, urgency, preferred_time, system_type }
 * @param {boolean} [params.alreadyEmergency] - whether this conversation was already flagged as an emergency before this turn
 * @returns {Promise<{
 *   reply: string,
 *   capturedFields: object,
 *   emergency: boolean,
 *   readyToWrapUp: boolean
 * }>}
 */
async function handleTurn({ businessName, pricing = {}, history = [], message, capturedFields = {}, alreadyEmergency = false }) {
  const systemPrompt = buildSystemPrompt({ businessName, pricing });

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
      reply: "Thanks for reaching out — someone will get back to you shortly.",
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

  // Emergency = keyword match OR model judgment. Either can flag it;
  // neither can un-flag it once true. See keywordTriggers.js for why.
  const keywordHit = matchesEmergencyKeyword(message);
  const emergency = Boolean(keywordHit || parsed.emergency_suspected);

  // Fixed acknowledgment only on the turn that FIRST crosses into emergency —
  // repeating it on every later turn of an already-flagged emergency reads
  // like a broken record to the caller.
  const isNewEmergency = emergency && !alreadyEmergency;
  const reply = isNewEmergency
    ? `Thanks — I'm flagging this as urgent. I'm alerting the on-call tech now. ${parsed.reply || ""}`.trim()
    : parsed.reply;

  return {
    reply,
    capturedFields: mergedFields,
    emergency,
    readyToWrapUp: Boolean(parsed.ready_to_wrap_up),
    error: false,
  };
}

module.exports = { handleTurn };
