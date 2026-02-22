// ============================================================
// Axon — Shared Role Constants
//
// Single source of truth for role → route mappings and labels.
// Used by PostLoginRouter, SelectRolePage, UserProfileDropdown, etc.
// ============================================================

/** Map role → default landing route after login or role switch */
export const ROLE_ROUTES: Record<string, string> = {
  owner: '/professor',
  admin: '/professor',
  professor: '/professor',
  student: '/student',
};

/** Human-readable role labels (Spanish) */
export const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  professor: 'Profesor',
  student: 'Estudiante',
};
