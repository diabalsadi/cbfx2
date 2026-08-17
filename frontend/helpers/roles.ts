// Roles that belong to the admin portal (/admin/*). Everything else ("user",
// the default role for public self-registration) belongs to the site portal.
// Mirrors backend/app/schemas/user.py's ADMIN_ROLES.
export const ADMIN_ROLES = ["super_admin", "editor", "broker"] as const;

export function isAdminRole(role: string | undefined | null): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

// "client" accounts aren't admin staff (isAdminRole is false for them) but
// they may sign in through the admin portal to see their own referral view.
// Mirrors backend/app/routers/auth.py's can_use_admin_portal.
export function canAccessAdminPortal(role: string | undefined | null): boolean {
  return isAdminRole(role) || role === "client";
}
