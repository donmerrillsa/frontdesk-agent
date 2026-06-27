// ============================================================
// LLM PROVIDER — Anthropic
// ============================================================
// Needs ANTHROPIC_API_KEY (console.anthropic.com — a developer API
// key, separate from claude.ai chat access).

const Anthropic = require("@anthropic-ai/sdk");

// Default to Sonnet for quality; override with ANTHROPIC_MODEL to test a
// faster/cheaper option (e.g. claude-haiku-4-5-20251001) against the exact
// same conversations and compare directly.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

/**
 * @param {string} systemPrompt
 * @param {string} userContent
 * @returns {Promise<string>} raw text response from the model
 */
async function complete(systemPrompt, userContent) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

module.exports = { complete };
