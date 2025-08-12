export const ROLES = ['God','Superuser','Admin','User','Viewer'] as const;
export type Role = typeof ROLES[number];

export function rank(role: Role): number {
  const idx = ROLES.indexOf(role);
  return idx === -1 ? ROLES.length : idx;
}

export function hasAtLeast(userRole: Role, requiredRole: Role): boolean {
  return rank(userRole) <= rank(requiredRole);
}
