// Mirrors backend/app/services/stripe_client.py's gating rule — keep in sync.
const UNLOCKED_STATUSES = new Set(["active", "trialing"]);

export function hasProAccess(user: { subscription_status: string } | null): boolean {
  return !!user && UNLOCKED_STATUSES.has(user.subscription_status);
}
