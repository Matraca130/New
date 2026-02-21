// ============================================================
// Axon — Owner Routes (children of OwnerLayout)
//
// ADDING A NEW OWNER PAGE:
//   1. Create the component in /src/app/components/roles/pages/owner/
//   2. Import it here
//   3. Add { path: 'my-slug', Component: MyPage }
//   That's it — no other files need changes.
//
// PARALLEL-SAFE: Only owner-area devs touch this file.
// ============================================================
import type { RouteObject } from 'react-router';

import { OwnerDashboardPage } from '@/roles/pages/owner/OwnerDashboardPage';
import { OwnerInstitutionPage } from '@/roles/pages/owner/OwnerInstitutionPage';
import { OwnerMembersPage } from '@/roles/pages/owner/OwnerMembersPage';
import { OwnerPlansPage } from '@/roles/pages/owner/OwnerPlansPage';
import { OwnerSubscriptionsPage } from '@/roles/pages/owner/OwnerSubscriptionsPage';
import { OwnerAccessRulesPage } from '@/roles/pages/owner/OwnerAccessRulesPage';
import { OwnerReportsPage } from '@/roles/pages/owner/OwnerReportsPage';
import { OwnerSettingsPage } from '@/roles/pages/owner/OwnerSettingsPage';

export const ownerChildren: RouteObject[] = [
  { index: true,           Component: OwnerDashboardPage },
  { path: 'institution',   Component: OwnerInstitutionPage },
  { path: 'members',       Component: OwnerMembersPage },
  { path: 'plans',         Component: OwnerPlansPage },
  { path: 'subscriptions', Component: OwnerSubscriptionsPage },
  { path: 'access-rules',  Component: OwnerAccessRulesPage },
  { path: 'reports',       Component: OwnerReportsPage },
  { path: 'settings',      Component: OwnerSettingsPage },
];
