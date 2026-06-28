// ============================================================
// DB PROVIDER — switch
// ============================================================
// Auto-detects live vs. mock based on whether real Supabase
// credentials are actually present — no separate flag to remember
// to flip. PROVIDER_MODE=mock is kept as an explicit override (e.g.
// for testing) that forces mock even if real credentials exist.
//
// This was previously gated behind one global PROVIDER_MODE switch
// shared with SMS/Sheets/Email/Payments, which meant the database
// stayed stuck in mock even after its own credentials were ready,
// just because Twilio/Google weren't. Each provider now goes live
// independently, matching how rollout actually happens in stages.

const forceMock = process.env.PROVIDER_MODE === "mock";
const hasCreds = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = (!forceMock && hasCreds) ? require("./supabase") : require("./mock");
