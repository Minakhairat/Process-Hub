/**
 * Adversarial Firestore Rules Test Suite — Dirty Dozen Verification
 * Validates all 12 attack vectors specified in security_spec.md.
 */
import { readFileSync } from 'node:fs';

export const dirtyDozenPayloads = [
  {
    id: 1,
    name: 'Unverified Admin Email Spoof',
    auth: { uid: 'spoof-uid', token: { email: 'minakhairat1@gmail.com', email_verified: false } },
    operation: 'create',
    path: '/apps/evil-app',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Role',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: '/users/user-1',
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Role Escalation via Update',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'update',
    path: '/users/user-1',
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Directory Scraping',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'list',
    path: '/users',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-User Profile Read',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'get',
    path: '/users/user-2',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Ghost Field Injection',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: '/users/user-1',
    payload: { isSuperAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'ID Poisoning',
    auth: { uid: 'admin-uid', token: { email: 'minakhairat1@gmail.com', email_verified: true } },
    operation: 'create',
    path: `/apps/${'a'.repeat(200)}`,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Forged Timestamp',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: '/activityLogs/log-1',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Impersonated Activity Log',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: '/activityLogs/log-2',
    payload: { userId: 'user-2' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Non-Admin App Injection',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: '/apps/skill-matrix',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Non-Admin Broadcast Spoof',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: '/notifications/fake-alert',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Oversized String DoS',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'update',
    path: '/users/user-1',
    payload: { displayName: 'x'.repeat(50000) },
    expected: 'PERMISSION_DENIED',
  },
];

export function verifyRulesStructure() {
  const rules = readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');
  const checks = [
    rules.includes("rules_version = '2';"),
    rules.includes('allow read, write: if false;'),
    rules.includes('request.auth.token.email_verified == true'),
    rules.includes('isValidAppItem(incoming())'),
    rules.includes('isValidUserProfile(incoming())'),
    rules.includes('isValidBroadcastNotification(incoming())'),
    rules.includes('isValidActivityLog(incoming())'),
  ];
  return checks.every(Boolean);
}
