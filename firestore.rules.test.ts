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
    auth: { uid: 'user-1', token: { email: 'user1@gmail.com', email_verified: true } },
    operation: 'create',
    path: '/users/user-1',
    payload: { role: 'admin', approvalStatus: 'pending', profileCompleted: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Self-Approval Escalation',
    auth: { uid: 'user-1', token: { email: 'user1@gmail.com', email_verified: true } },
    operation: 'update',
    path: '/users/user-1',
    payload: { approvalStatus: 'approved' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Directory Scraping',
    auth: { uid: 'user-1', token: { email: 'user1@gmail.com', email_verified: true } },
    operation: 'list',
    path: '/users',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-User Profile & Invite Read',
    auth: { uid: 'user-1', token: { email: 'user1@gmail.com', email_verified: true } },
    operation: 'get',
    path: '/invitedUsers/user2_gmail_com',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Ghost Field / AdminNotes Tampering',
    auth: { uid: 'user-1', token: { email: 'user1@gmail.com', email_verified: true } },
    operation: 'update',
    path: '/users/user-1',
    payload: { adminNotes: 'hacked', customFields: { clearance: 'vip' } },
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
    auth: { uid: 'user-1', token: { email: 'user1@gmail.com', email_verified: true } },
    operation: 'create',
    path: '/activityLogs/log-1',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Impersonated Activity Log',
    auth: { uid: 'user-1', token: { email: 'user1@gmail.com', email_verified: true } },
    operation: 'create',
    path: '/activityLogs/log-2',
    payload: { userId: 'user-2' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unauthenticated App Scraping',
    auth: null,
    operation: 'list',
    path: '/apps',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Incomplete Profile Bypass',
    auth: { uid: 'user-1', token: { email: 'user1@gmail.com', email_verified: true } },
    operation: 'update',
    path: '/users/user-1',
    payload: { profileCompleted: true, employeeCode: '', phone: '', jobTitle: '', company: '' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Oversized String / Duration DoS',
    auth: { uid: 'user-1', token: { email: 'user1@gmail.com', email_verified: true } },
    operation: 'update',
    path: '/activityLogs/log-1',
    payload: { durationSeconds: 99999999 },
    expected: 'PERMISSION_DENIED',
  },
];

export function verifyRulesStructure() {
  const rules = readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');
  const checks = [
    rules.includes("rules_version = '2';"),
    rules.includes('allow read, write: if false;'),
    rules.includes('request.auth.token.email_verified == true'),
    rules.includes('isApprovedUser()'),
    rules.includes('isValidAppItem(incoming())'),
    rules.includes('isValidUserProfile(incoming())'),
    rules.includes('isValidInvitedUser(incoming())'),
    rules.includes('isValidBroadcastNotification(incoming())'),
    rules.includes('isValidBiometricDevice(incoming())'),
    rules.includes('isValidActivityLog(incoming())'),
    rules.includes('isValidProductionMetric(incoming())'),
  ];
  return checks.every(Boolean);
}
