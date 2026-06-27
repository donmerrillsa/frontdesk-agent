// ============================================================
// EMERGENCY KEYWORD MATCHER — deterministic safety net
// ============================================================
// Why this exists alongside the LLM's own judgment, not instead of it:
//
// The LLM (engine.js) assesses emergency status from full conversational
// context, which catches paraphrases a fixed keyword list would miss
// ("my furnace just made a loud bang and there's a weird smell" — no
// exact keyword match, but a human would flag it instantly).
//
// This keyword list exists as a guaranteed catch for the exact phrases
// the spec calls out, so emergency detection never depends ENTIRELY on
// a model call behaving correctly on a given turn. The two signals are
// combined with OR, never AND: either one can flag an emergency, neither
// can un-flag one. False positives here just mean an occasional routine
// call gets treated with extra urgency, which is a fine direction to
// err in. False negatives mean someone with a gas leak doesn't get help
// fast enough — that's the direction this system must never fail in.

const TRIGGER_PHRASES = [
  "no cooling",
  "no heat",
  "burning smell",
  "water leak",
  "system down",
  "smoke",
  "sparks",
  "danger",
];

/**
 * Returns true if any trigger phrase appears in the message, case-insensitive.
 * @param {string} message - the caller's raw text message
 * @returns {boolean}
 */
function matchesEmergencyKeyword(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return TRIGGER_PHRASES.some((phrase) => lower.includes(phrase));
}

module.exports = { matchesEmergencyKeyword, TRIGGER_PHRASES };
