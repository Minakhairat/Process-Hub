# Firestore Security Specification — Mina Khairat Engineering Hub

## 1. Data Invariants
1. **Admin Authority**: Only the bootstrapped administrator (`minakhairat1@gmail.com` with `email_verified == true`) or UIDs explicitly listed in `/admins/{uid}` can create, edit, or delete `/apps/{appId}` and `/notifications/{notificationId}`, approve/reject user accounts, or list `/users` and all `/activityLogs`.
2. **PII Isolation**: User profile documents (`/users/{userId}`) contain PII (`email`, `employeeCode`, `phone`, `jobTitle`, `company`). A signed-in user can ONLY `get`, `create`, or `update` their own `/users/{userId}` document (`request.auth.uid == userId`), and can NEVER `list` `/users` or read another user's profile.
3. **Anti-Privilege-Escalation & Approval Lock**: On `/users/{userId}` creation, `role` MUST equal `'user'` and `approvalStatus` MUST equal `'pending'` (except bootstrapped admin). On `/users/{userId}` update by a non-admin, `role`, `approvalStatus`, `uid`, `email`, and `createdAt` MUST remain immutable (users cannot self-approve).
4. **Profile Completeness Gate**: When `profileCompleted == true`, `displayName`, `employeeCode`, `phone`, `jobTitle`, and `company` must all meet minimum length requirements. Users cannot unlock single-doc app access or log activity unless `approvalStatus == 'approved'` and `profileCompleted == true`.
5. **Master Gate Subcollection**: `/users/{userId}/readNotifications/{notificationId}` checks `exists(/databases/$(database)/documents/users/$(userId))` and restricts access to `request.auth.uid == userId` or `isAdmin()`.
6. **Temporal Integrity**: All `createdAt`, `updatedAt`, `lastActiveAt`, and `readAt` timestamps must match `request.time`.
7. **Authenticated Catalog Query Enforcement**: `/apps/{appId}` requires verified authentication for `list` and approved status (`approvalStatus == 'approved' && profileCompleted == true`) for `get`, only when `resource.data.isActive == true || isAdmin()`.
8. **Broadcast Notification Query Enforcement**: `/notifications/{notificationId}` allows `list` for verified users and `get` for approved users only when `resource.data.isActive == true || isAdmin()`.
9. **Activity Log Ownership**: Only approved users may create `/activityLogs/{logId}` where `incoming().userId == request.auth.uid` and may only `get`/`list` logs where `resource.data.userId == request.auth.uid || isAdmin()`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: User with `email: "minakhairat1@gmail.com"` and `email_verified: false` tries to create `/apps/evil-app`.
2. **Self-Assigned Admin Role**: Normal user creates `/users/{uid}` with `role: "admin"`.
3. **Self-Approval Escalation**: Normal user creates or updates `/users/{uid}` setting `approvalStatus: "approved"`.
4. **PII Directory Scraping**: Normal user runs `list` on `/users`.
5. **Cross-User Profile Read**: User A runs `get` on `/users/{userB_uid}`.
6. **Shadow Ghost Field Injection**: User creates `/users/{uid}` with an unexpected key `isSuperAdmin: true`.
7. **ID Poisoning**: Admin or user tries to write `/apps/{1500_char_invalid_id}` or `/activityLogs/invalid$id`.
8. **Forged Timestamp**: User creates `/activityLogs/{logId}` with a client-supplied `createdAt` in the past instead of `request.time`.
9. **Impersonated Activity Log**: User A creates `/activityLogs/{logId}` with `userId: "userB_uid"`.
10. **Unauthenticated App Scraping**: Unauthenticated visitor tries to `list` or `get` `/apps`.
11. **Incomplete Profile Bypass**: User sets `profileCompleted: true` with empty `phone` or `jobTitle`.
12. **Oversized String DoS**: User updates `/users/{uid}` with a 50,000-character `displayName` or `jobTitle`.
