// ============================================================
// SMS PROVIDER — switch
// ============================================================
// Defaults to mock. You have to explicitly set PROVIDER_MODE=live
// to touch real Twilio infrastructure — the safe direction to
// default in is "nothing real happens by accident."

const mode = process.env.PROVIDER_MODE || "mock";

module.exports = mode === "live" ? require("./twilio") : require("./mock");
