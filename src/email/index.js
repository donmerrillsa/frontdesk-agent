// ============================================================
// EMAIL PROVIDER — switch
// ============================================================
const mode = process.env.PROVIDER_MODE || "mock";

module.exports = mode === "live" ? require("./resend") : require("./mock");
