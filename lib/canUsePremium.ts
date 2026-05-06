// Centralized premium access check.
// Returns true for everyone today (no paywall yet).
// When Stripe is integrated, this will check subscription status.
export function canUsePremium(_user: { id: string; email?: string }): boolean {
  return true;
}
