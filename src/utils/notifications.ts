import {
  DEFAULT_PRODUCTION_LINES,
  DEFAULT_SHIFTS,
  type BroadcastNotification,
  type NotificationReadReceipt,
  type UserProfile,
} from '../types/platform';

function normalizeAr(value?: string): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function tokenMatches(candidate: string, targets: string[]): boolean {
  const normCandidate = normalizeAr(candidate);
  if (!normCandidate) return false;
  return targets.some((target) => {
    const normTarget = normalizeAr(target);
    if (!normTarget) return false;
    if (normCandidate === normTarget) return true;
    if (normTarget.length >= 3 && normCandidate.includes(normTarget)) return true;
    if (normCandidate.length >= 3 && normTarget.includes(normCandidate)) return true;
    return false;
  });
}

export function getUserProductionLine(user: Pick<UserProfile, 'customFields' | 'company'>): string {
  const fromCustom = user.customFields?.['خط الإنتاج']?.trim();
  if (fromCustom) return fromCustom;
  const fromCompany = user.company?.trim();
  if (fromCompany) return fromCompany;
  return 'غير محدد';
}

export function getUserShift(user: Pick<UserProfile, 'customFields'>): string {
  return user.customFields?.['الوردية']?.trim() || '';
}

export function collectAvailableLines(users: UserProfile[]): string[] {
  const seen = new Map<string, string>();
  for (const line of DEFAULT_PRODUCTION_LINES) {
    seen.set(normalizeAr(line), line);
  }
  for (const u of users) {
    const customLine = u.customFields?.['خط الإنتاج']?.trim();
    if (customLine) {
      const key = normalizeAr(customLine);
      if (!seen.has(key)) seen.set(key, customLine);
    }
    const companyLine = u.company?.trim();
    if (companyLine && companyLine.length <= 50) {
      const key = normalizeAr(companyLine);
      if (!seen.has(key)) seen.set(key, companyLine);
    }
  }
  return Array.from(seen.values());
}

export function collectAvailableShifts(users: UserProfile[]): string[] {
  const seen = new Map<string, string>();
  for (const shift of DEFAULT_SHIFTS) {
    seen.set(normalizeAr(shift), shift);
  }
  for (const u of users) {
    const customShift = u.customFields?.['الوردية']?.trim();
    if (customShift) {
      const key = normalizeAr(customShift);
      if (!seen.has(key)) seen.set(key, customShift);
    }
  }
  return Array.from(seen.values());
}

export function doesUserMatchNotification(
  user: UserProfile | null | undefined,
  notif: BroadcastNotification,
  bypassForAdmin = false
): boolean {
  if (bypassForAdmin && user?.role === 'admin') return true;

  const targetLines = notif.targetLines || [];
  const targetShifts = notif.targetShifts || [];
  const isTargeted =
    notif.targetMode === 'targeted' && (targetLines.length > 0 || targetShifts.length > 0);

  if (!isTargeted) return true;
  if (!user) return false;

  if (targetLines.length > 0) {
    const userLineCustom = user.customFields?.['خط الإنتاج'] || '';
    const userCompany = user.company || '';
    const lineOk =
      tokenMatches(userLineCustom, targetLines) || tokenMatches(userCompany, targetLines);
    if (!lineOk) return false;
  }

  if (targetShifts.length > 0) {
    const userShift = user.customFields?.['الوردية'] || '';
    if (!tokenMatches(userShift, targetShifts)) return false;
  }

  return true;
}

export function describeNotificationAudience(notif: BroadcastNotification): string {
  const lines = notif.targetLines || [];
  const shifts = notif.targetShifts || [];
  if (notif.targetMode !== 'targeted' || (lines.length === 0 && shifts.length === 0)) {
    return 'الجميع (كل خطوط الإنتاج والورديات)';
  }
  const parts: string[] = [];
  if (lines.length > 0) parts.push(`الخطوط: ${lines.join('، ')}`);
  if (shifts.length > 0) parts.push(`الورديات: ${shifts.join('، ')}`);
  return parts.join(' · ');
}

export interface LineReadStat {
  lineName: string;
  totalTargeted: number;
  readCount: number;
  unreadCount: number;
  percentage: number;
  readers: UserProfile[];
  nonReaders: UserProfile[];
}

export interface NotificationReadAnalytics {
  totalTargeted: number;
  totalRead: number;
  overallPercentage: number;
  byLine: LineReadStat[];
}

export function computeNotificationReadAnalytics(
  notif: BroadcastNotification,
  allUsers: UserProfile[],
  receipts: NotificationReadReceipt[]
): NotificationReadAnalytics {
  const readUserIds = new Set<string>();
  for (const r of receipts) {
    if (r.notificationId === notif.id) {
      readUserIds.add(r.userId);
    }
  }

  const approvedMembers = allUsers.filter(
    (u) => u.role !== 'admin' && u.approvalStatus === 'approved'
  );
  const targetedUsers = approvedMembers.filter((u) =>
    doesUserMatchNotification(u, notif, false)
  );

  const lineGroups = new Map<string, UserProfile[]>();
  for (const u of targetedUsers) {
    const line = getUserProductionLine(u);
    const arr = lineGroups.get(line) || [];
    arr.push(u);
    lineGroups.set(line, arr);
  }

  const byLine: LineReadStat[] = Array.from(lineGroups.entries())
    .map(([lineName, members]) => {
      const readers = members.filter((m) => readUserIds.has(m.uid));
      const nonReaders = members.filter((m) => !readUserIds.has(m.uid));
      const totalTargeted = members.length;
      const readCount = readers.length;
      const percentage = totalTargeted > 0 ? Math.round((readCount / totalTargeted) * 100) : 0;
      return {
        lineName,
        totalTargeted,
        readCount,
        unreadCount: totalTargeted - readCount,
        percentage,
        readers,
        nonReaders,
      };
    })
    .sort((a, b) => b.totalTargeted - a.totalTargeted || b.percentage - a.percentage);

  const totalTargeted = targetedUsers.length;
  const totalRead = targetedUsers.filter((u) => readUserIds.has(u.uid)).length;
  const overallPercentage =
    totalTargeted > 0 ? Math.round((totalRead / totalTargeted) * 100) : 0;

  return {
    totalTargeted,
    totalRead,
    overallPercentage,
    byLine,
  };
}
