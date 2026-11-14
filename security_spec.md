# Firestore Security Specification — Mina Khairat Engineering Hub

## 1. Data Invariants
1. **Admin Authority**: Only the bootstrapped administrator (`minakhairat1@gmail.com` with `email_verified == true`) or UIDs explicitly listed in `/admins/{uid}` can create, edit, or delete `/apps/{appId}` and `/notifications/{notificationId}`, or list `/users` and all `/activityLogs`.
2. **PII Isolation**: User profile documents (`/users/{userId}`) contain PII (`email`, `phone`, `jobTitle`, `company`). A signed-in user can ONLY `get`, `create`, or `update` their own `/users/{userId}` document (`request.auth.uid == userId`), and can NEVER `list` `/users` or read another user's profile.
3. **Anti-Privilege-Escalation**: On `/users/{userId}` creation, `role` MUST equal `'user'`. On `/users/{userId}` update by a non-admin, `role`, `uid`, `email`, and `createdAt` MUST remain immutable.
4. **Master Gate Subcollection**: `/users/{userId}/readNotifications/{notificationId}` checks `exists(/databases/$(database)/documents/users/$(userId))` and restricts access to `request.auth.uid == userId` or `isAdmin()`.
5. **Temporal Integrity**: All `createdAt`, `updatedAt`, `lastActiveAt`, and `readAt` timestamps must match `request.time`.
6. **Public-Safe Catalog Query Enforcement**: `/apps/{appId}` allows `get` and `list` only when `resource.data.isActive == true || isAdmin()`, ensuring inactive/draft apps cannot be scraped.
7. **Broadcast Notification Query Enforcement**: `/notifications/{notificationId}` allows `get` and `list` for signed-in verified users only when `resource.data.isActive == true || isAdmin()`.
8. **Activity Log Ownership**: Users may only create `/activityLogs/{logId}` where `incoming().userId == request.auth.uid` and may only `get`/`list` logs where `resource.data.userId == request.auth.uid || isAdmin()`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: User with `email: "minakhairat1@gmail.com"` and `email_verified: false` tries to create `/apps/evil-app`.
2. **Self-Assigned Admin Role**: Normal user creates `/users/{uid}` with `role: "admin"`.
3. **Role Escalation via Update**: Normal user updates their own `/users/{uid}` changing `role` from `"user"` to `"admin"`.
4. **PII Directory Scraping**: Normal user runs `list` on `/users`.
5. **Cross-User Profile Read**: User A runs `get` on `/users/{userB_uid}`.
6. **Shadow Ghost Field Injection**: User creates `/users/{uid}` with an unexpected key `isSuperAdmin: true`.
7. **ID Poisoning**: Admin or user tries to write `/apps/{1500_char_invalid_id}` or `/activityLogs/invalid$id`.
8. **Forged Timestamp**: User creates `/activityLogs/{logId}` with a client-supplied `createdAt` in the past instead of `request.time`.
9. **Impersonated Activity Log**: User A creates `/activityLogs/{logId}` with `userId: "userB_uid"`.
10. **Non-Admin App Injection**: Normal user tries to create or update `/apps/skill-matrix`.
11. **Non-Admin Broadcast Spoof**: Normal user tries to create `/notifications/fake-alert`.
12. **Oversized String DoS**: User updates `/users/{uid}` with a 50,000-character `displayName` or `jobTitle`.
