// ============================================================
// LLM PROVIDER — OpenAI
// ============================================================
// Needs OPENAI_API_KEY. Set it in a local .env for testing (see
// .env.example) or in Netlify's environment variables for production
// — never paste a real key into a chat conversation with anyone,
// AI or human; treat it like a password.
//
// MODEL is a guess at a reasonable current model name as of this
// writing — OpenAI's lineup moves fast enough that you should check
// platform.openai.com/docs/models and update this constant if it's
// stale by the time you're reading this.

const OpenAI = require("openai");

// Override with OPENAI_MODEL to test a faster/cheaper option against the
// exact same conversations. Check platform.openai.com/docs/models for the
// current mini-class model name — that naming shifts more often than
// Anthropic's.
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

/**
 * @param {string} systemPrompt
 * @param {string} userContent
 * @returns {Promise<string>} raw text response from the model
 */
async function complete(systemPrompt, userContent) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  return response.choices[0].message.content;
}

module.exports = { complete };
