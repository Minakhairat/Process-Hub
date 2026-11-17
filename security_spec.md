# Firestore Security Specification — Mina Khairat Engineering Hub

## 1. Data Invariants
1. **Admin Authority**: Only the bootstrapped administrator (`minakhairat1@gmail.com` with `email_verified == true`) or UIDs explicitly listed in `/admins/{uid}` can create, edit, or delete `/apps/{appId}`, `/notifications/{notificationId}`, and `/invitedUsers/{emailKey}`, edit any user's account fields (`customFields`, `adminNotes`, `role`, `approvalStatus`), or list `/users`, `/invitedUsers`, and all `/activityLogs`.
2. **PII Isolation**: User profile documents (`/users/{userId}`) and pre-registered invites (`/invitedUsers/{emailKey}`) contain PII (`email`, `employeeCode`, `phone`, `jobTitle`, `company`). A signed-in user can ONLY `get`, `create`, or `update` their own `/users/{userId}` document (`request.auth.uid == userId`), can ONLY `get` an `/invitedUsers/{emailKey}` document matching their own verified email key, and can NEVER `list` `/users` or `/invitedUsers` or read another user's profile.
3. **Anti-Privilege-Escalation & Approval Lock**: On `/users/{userId}` creation, `role` MUST equal `'user'` and `approvalStatus` MUST equal `'pending'` (except bootstrapped admin or an explicit `/invitedUsers/{emailKey}` record created by admin). On `/users/{userId}` update by a non-admin, `role`, `approvalStatus`, `uid`, `email`, `adminNotes`, `customFields`, and `createdAt` MUST remain immutable.
4. **Profile Completeness Gate**: When `profileCompleted == true`, `displayName`, `employeeCode`, `phone`, `jobTitle`, and `company` must all meet minimum length requirements. Users cannot unlock single-doc app access or log activity unless `approvalStatus == 'approved'` and `profileCompleted == true`.
5. **Master Gate Subcollection**: `/users/{userId}/readNotifications/{notificationId}` checks `exists(/databases/$(database)/documents/users/$(userId))` and restricts access to `request.auth.uid == userId` or `isAdmin()`.
6. **Temporal Integrity**: All `createdAt`, `updatedAt`, `lastActiveAt`, and `readAt` timestamps must match `request.time`.
7. **Authenticated Catalog Query Enforcement**: `/apps/{appId}` requires verified authentication for `list` and approved status (`approvalStatus == 'approved' && profileCompleted == true`) for `get`, only when `resource.data.isActive == true || isAdmin()`.
8. **Broadcast Notification Query Enforcement**: `/notifications/{notificationId}` allows `list` for verified users and `get` for approved users only when `resource.data.isActive == true || isAdmin()`.
9. **Activity Log Ownership & Duration Integrity**: Only approved users may create `/activityLogs/{logId}` where `incoming().userId == request.auth.uid`. Updates to `/activityLogs/{logId}` are restricted to the log owner or admin and may ONLY modify `durationSeconds` (`0..28800`), `sessionStatus`, and `updatedAt == request.time`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: User with `email: "minakhairat1@gmail.com"` and `email_verified: false` tries to create `/apps/evil-app`.
2. **Self-Assigned Admin Role**: Normal user creates `/users/{uid}` with `role: "admin"`.
3. **Self-Approval Escalation**: Normal user creates or updates `/users/{uid}` setting `approvalStatus: "approved"`.
4. **PII Directory Scraping**: Normal user runs `list` on `/users` or `/invitedUsers`.
5. **Cross-User Profile Read**: User A runs `get` on `/users/{userB_uid}` or `/invitedUsers/{userB_emailKey}`.
6. **Shadow Ghost Field Injection**: User creates `/users/{uid}` with an unexpected key `isSuperAdmin: true` or modifies `adminNotes`/`customFields`.
7. **ID Poisoning**: Admin or user tries to write `/apps/{1500_char_invalid_id}` or `/activityLogs/invalid$id`.
8. **Forged Timestamp**: User creates `/activityLogs/{logId}` with a client-supplied `createdAt` in the past instead of `request.time`.
9. **Impersonated Activity Log**: User A creates `/activityLogs/{logId}` with `userId: "userB_uid"`.
10. **Unauthenticated App Scraping**: Unauthenticated visitor tries to `list` or `get` `/apps`.
11. **Incomplete Profile Bypass**: User sets `profileCompleted: true` with empty `phone` or `jobTitle`.
12. **Oversized String / Duration DoS**: User updates `/users/{uid}` with a 50,000-character `displayName` or sets `activityLogs/{logId}.durationSeconds` to `99999999`.
