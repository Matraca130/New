// ============================================================
// Axon — Post-Login Router
// After authentication, redirects user to the correct area
// based on their membership role(s).
// ============================================================
import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';

/** Map role → default landing route */
const ROLE_ROUTES: Record<string, string> = {
  owner: '/owner',
  admin: '/admin',
  professor: '/professor',
  student: '/student',
};

export function PostLoginRouter() {
  const { status, memberships, activeMembership } = useAuth();

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  // If user has no memberships, send to student as default
  if (memberships.length === 0) {
    return <Navigate to="/student" replace />;
  }

  // If user has multiple memberships and hasn't selected one, show picker
  if (memberships.length > 1 && !activeMembership) {
    return <Navigate to="/select-role" replace />;
  }

  // Single membership or already selected — route by role
  const role = activeMembership?.role || memberships[0]?.role || 'student';
  const route = ROLE_ROUTES[role] || '/student';

  return <Navigate to={route} replace />;
}
