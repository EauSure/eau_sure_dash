# Implementation Updates

## Step 1 - Admin User Backend
- Added admin-only API routes:
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/[id]`
  - `DELETE /api/admin/users/[id]`
- Added account status support in user model (`active` / `suspended`).
- Added suspended-account guard during NextAuth credential sign-in.
- Added reusable `alert-dialog` UI primitive for upcoming destructive confirmations.

## Step 2 - Manage Users Page
- Replaced placeholder admin manage-users screen with a full client-side user management interface.
- Added data fetch (`/api/admin/users`) with loading, error, and retry states.
- Added search by name/email, role filter, status filter, and sortable columns.
- Added desktop table plus responsive mobile card layout.
- Added per-user actions menu: change role, suspend/reactivate, delete.
- Added confirmation dialogs for all mutations and automatic list refresh after successful actions.
- Protected current admin account from self-modification and self-deletion in the UI.

## Step 3 - i18n Coverage
- Added a full `manageUsers` namespace to:
  - `messages/en.json`
  - `messages/fr.json`
  - `messages/ar.json`
- Wired all visible manage-users UI strings to `useTranslations('manageUsers')`.

## Step 4 - Sidebar Flicker Stabilization
- Moved persistent shell rendering to true App Router layouts:
  - `app/[locale]/dashboard/layout.tsx`
  - `app/[locale]/admin/layout.tsx`
- Removed page-level `DashboardLayout` and `AdminLayout` wrappers from all dashboard/admin child pages.
- This ensures the sidebar is mounted once per segment and does not remount on intra-segment navigation.
- Preserved existing localStorage collapse initialization logic to avoid first-paint snap.

## Step 5 - Real-Time Presence
- Added presence model fields and helpers (`isOnline`, `lastSeen`) in the user data layer.
- Added auth lifecycle presence updates (online on sign-in, offline on sign-out).
- Added heartbeat endpoints and client hook/provider for periodic online updates and unload offline beacon.
- Exposed presence fields in profile/admin APIs with stale-online timeout handling in admin list results.
- Updated admin manage-users UI with presence column, status dot, relative last-seen text, and manual/interval refresh.

## Step 6 - EauSure API Integration
- Added secure server-side EauSure token management with automatic login, refresh, and retry on 401.
- Added internal proxy routes for dashboard consumption:
  - `GET /api/eausure/stats`
  - `GET /api/eausure/latest`
  - `GET /api/eausure/sensor-data`
- Added shared typed contracts for EauSure responses and sensor documents.
- Added MQTT-backed live hook with fallback polling when broker/WebSocket is unavailable.
- Replaced static dashboard and alerts placeholders with real EauSure-powered data rendering and refresh controls.
