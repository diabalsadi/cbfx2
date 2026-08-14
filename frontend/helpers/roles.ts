// Roles that belong to the admin portal (/admin/*). Everything else ("user",
// the default role for public self-registration) belongs to the site portal.
// Mirrors backend/app/schemas/user.py's ADMIN_ROLES.
export const ADMIN_ROLES = ["super_admin", "editor", "broker"] as const;

export function isAdminRole(role: string | undefined | null): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}
