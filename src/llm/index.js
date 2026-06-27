// ============================================================
// LLM PROVIDER — switch
// ============================================================
// Set LLM_PROVIDER=openai to use OpenAI; defaults to anthropic.
// This is a separate switch from PROVIDER_MODE (mock/live) — this
// one picks WHICH real model to call, since both are real options,
// not a mock/live distinction.

const provider = process.env.LLM_PROVIDER || "anthropic";

module.exports = provider === "openai" ? require("./openai") : require("./anthropic");
