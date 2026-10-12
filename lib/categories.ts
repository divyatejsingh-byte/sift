export type Category = "Payment" | "Auth" | "Tooling";
export const CATEGORIES: Category[] = ["Payment", "Auth", "Tooling"];

const EXPLICIT: Record<string, Category> = {
  "stripe/stripe-node": "Payment",
  "auth0/node-auth0": "Auth",
};

const PAYMENT_RE = /(stripe|pay|plaid|adyen|braintree|checkout|bank|ledger|billing|invoice|square|wise|dwolla|razorpay)/i;
const AUTH_RE = /(auth|oauth|oidc|jwt|jose|passport|okta|keycloak|saml|sso|clerk|session|passkey|webauthn)/i;

export function categoryForRepo(repo: string): Category {
  const explicit = EXPLICIT[repo.toLowerCase()];
  if (explicit) return explicit;
  if (PAYMENT_RE.test(repo)) return "Payment";
  if (AUTH_RE.test(repo)) return "Auth";
  return "Tooling";
}
