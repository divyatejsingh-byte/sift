// DEMO-ONLY auth. These are published test credentials for the Sift demo workspace — not a real identity system.
export const DEMO_EMAIL = "keerthi@fintech.dev";
export const DEMO_PASSWORD = "1234";
export const SESSION_COOKIE = "sift_session";
// A fixed token is fine for a demo gate; replace with a signed/random session before real use.
export const SESSION_TOKEN = process.env.SIFT_SESSION_TOKEN || "sift-demo-session-v1";
export const SESSION_MAX_AGE = 60 * 60 * 8;
