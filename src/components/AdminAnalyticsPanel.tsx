import React, { useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  Download,
  Filter,
  Layers,
  Search,
  Users,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import {
  ACTIVITY_ACTION_LABELS,
  CATEGORY_LABELS,
  type ActivityAction,
} from '../types/platform';
import { formatDurationAr } from '../utils/device';

type TimeRange = 'today' | '7d' | '30d' | 'all';

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'اليوم' },
  { value: '7d', label: 'آخر 7 أيام' },
  { value: '30d', label: 'آخر 30 يوم' },
  { value: 'all', label: 'كل الفترات' },
];

export const AdminAnalyticsPanel: React.FC = () => {
  const { apps, allUsers, activityLogs } = usePlatform();

  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const cutoffMs =
      timeRange === 'today'
        ? startOfToday.getTime()
        : timeRange === '7d'
          ? now - 7 * 24 * 60 * 60 * 1000
          : timeRange === '30d'
            ? now - 30 * 24 * 60 * 60 * 1000
            : 0;

    const q = searchTerm.trim().toLowerCase();

    return activityLogs.filter((log) => {
      const ts = log.createdAt?.toMillis?.() ?? now;
      if (cutoffMs > 0 && ts < cutoffMs) return false;
      if (selectedUserId !== 'all' && log.userId !== selectedUserId) return false;
      if (selectedAppId !== 'all' && log.appId !== selectedAppId) return false;
      if (q) {
        const hay = `${log.userName} ${log.userEmail} ${log.appTitle} ${log.details || ''} ${log.deviceType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activityLogs, timeRange, selectedUserId, selectedAppId, searchTerm]);

  const launchLogs = useMemo(
    () =>
      filteredLogs.filter(
        (l) => !l.action || l.action === 'launch' || l.action === 'embedded_launch'
      ),
    [filteredLogs]
  );

  const summary = useMemo(() => {
    const totalLaunches = launchLogs.length;
    const totalSeconds = launchLogs.reduce(
      (acc, l) => acc + Math.max(0, l.durationSeconds || 0),
      0
    );
    const completedWithTime = launchLogs.filter((l) => (l.durationSeconds || 0) > 0);
    const avgSeconds =
      completedWithTime.length > 0
        ? Math.round(totalSeconds / completedWithTime.length)
        : 0;
    const uniqueUsers = new Set(filteredLogs.map((l) => l.userId)).size;
    return {
      totalLaunches,
      totalSeconds,
      avgSeconds,
      uniqueUsers,
      totalActions: filteredLogs.length,
    };
  }, [filteredLogs, launchLogs]);

  // Per-Tool Analytics (covering ALL available apps)
  const toolStats = useMemo(() => {
    const map = new Map<
      string,
      {
        appId: string;
        title: string;
        titleAr: string;
        categoryLabel: string;
        launches: number;
        totalSeconds: number;
        completedCount: number;
        users: Set<string>;
        lastUsedMs: number;
      }
    >();

    for (const app of apps) {
      map.set(app.id, {
        appId: app.id,
        title: app.title,
        titleAr: app.titleAr,
        categoryLabel: CATEGORY_LABELS[app.category],
        launches: 0,
        totalSeconds: 0,
        completedCount: 0,
        users: new Set(),
        lastUsedMs: 0,
      });
    }

    for (const log of launchLogs) {
      const existing = map.get(log.appId) || {
        appId: log.appId,
        title: log.appTitle,
        titleAr: log.appTitle,
        categoryLabel: 'أداة مسجلة',
        launches: 0,
        totalSeconds: 0,
        completedCount: 0,
        users: new Set<string>(),
        lastUsedMs: 0,
      };
      existing.launches += 1;
      const dur = Math.max(0, log.durationSeconds || 0);
      if (dur > 0) {
        existing.totalSeconds += dur;
        existing.completedCount += 1;
      }
      existing.users.add(log.userId);
      const ts = log.createdAt?.toMillis?.() ?? 0;
      if (ts > existing.lastUsedMs) existing.lastUsedMs = ts;
      map.set(log.appId, existing);
    }

    const list = Array.from(map.values()).map((row) => ({
      ...row,
      uniqueUsersCount: row.users.size,
      avgSeconds:
        row.completedCount > 0 ? Math.round(row.totalSeconds / row.completedCount) : 0,
    }));

    list.sort((a, b) => b.launches - a.launches || b.totalSeconds - a.totalSeconds);
    return list;
  }, [apps, launchLogs]);

  const maxToolLaunches = Math.max(1, ...toolStats.map((t) => t.launches));

  // Per-User Analytics (who used what, how many times, how much time, and last action)
  const userStats = useMemo(() => {
    const map = new Map<
      string,
      {
        uid: string;
        name: string;
        email: string;
        employeeCode: string;
        department: string;
        launchesInPeriod: number;
        durationInPeriod: number;
        allTimeLaunches: number;
        allTimeDuration: number;
        toolCounts: Record<string, number>;
        lastActionText: string;
        lastActionMs: number;
      }
    >();

    for (const u of allUsers) {
      map.set(u.uid, {
        uid: u.uid,
        name: u.displayName,
        email: u.email,
        employeeCode: u.employeeCode || '—',
        department: [u.jobTitle, u.company].filter(Boolean).join(' · ') || '—',
        launchesInPeriod: 0,
        durationInPeriod: 0,
        allTimeLaunches: u.totalLaunches || 0,
        allTimeDuration: u.totalDurationSeconds || 0,
        toolCounts: {},
        lastActionText: 'لم يسجل نشاط بعد في هذه الفترة',
        lastActionMs: 0,
      });
    }

    for (const log of filteredLogs) {
      const entry = map.get(log.userId) || {
        uid: log.userId,
        name: log.userName,
        email: log.userEmail,
        employeeCode: '—',
        department: '—',
        launchesInPeriod: 0,
        durationInPeriod: 0,
        allTimeLaunches: 0,
        allTimeDuration: 0,
        toolCounts: {},
        lastActionText: '—',
        lastActionMs: 0,
      };

      const isLaunch =
        !log.action || log.action === 'launch' || log.action === 'embedded_launch';
      if (isLaunch) {
        entry.launchesInPeriod += 1;
        entry.durationInPeriod += Math.max(0, log.durationSeconds || 0);
        entry.toolCounts[log.appTitle] = (entry.toolCounts[log.appTitle] || 0) + 1;
      }

      const ts = log.createdAt?.toMillis?.() ?? 0;
      if (ts >= entry.lastActionMs) {
        entry.lastActionMs = ts;
        const actionLabel = log.action
          ? ACTIVITY_ACTION_LABELS[log.action]
          : 'تشغيل الأداة';
        entry.lastActionText = `${actionLabel}: ${log.appTitle}`;
      }

      map.set(log.userId, entry);
    }

    const list = Array.from(map.values()).map((u) => {
      let topTool = '—';
      let topCount = 0;
      for (const [toolName, cnt] of Object.entries(u.toolCounts)) {
        if (cnt > topCount) {
          topCount = cnt;
          topTool = `${toolName} (${cnt})`;
        }
      }
      return { ...u, topTool };
    });

    list.sort(
      (a, b) =>
        b.launchesInPeriod - a.launchesInPeriod ||
        b.durationInPeriod - a.durationInPeriod ||
        b.allTimeLaunches - a.allTimeLaunches
    );
    return list;
  }, [allUsers, filteredLogs]);

  const handleExportCsv = () => {
    const headers = [
      'التاريخ والوقت',
      'اسم المستخدم',
      'البريد الإلكتروني',
      'نوع الإجراء',
      'الأداة / الهدف',
      'التفاصيل',
      'المدة (ثانية)',
      'حالة الجلسة',
      'الجهاز',
    ];
    const rows = filteredLogs.map((log) => {
      const dt = log.createdAt?.toDate ? log.createdAt.toDate().toISOString() : '';
      const actionLabel = log.action
        ? ACTIVITY_ACTION_LABELS[log.action as ActivityAction]
        : ACTIVITY_ACTION_LABELS.launch;
      const statusLabel =
        log.sessionStatus === 'active'
          ? 'نشطة الآن'
          : log.sessionStatus === 'instant'
            ? 'حدث فوري'
            : 'مكتملة';
      return [
        dt,
        log.userName,
        log.userEmail,
        actionLabel,
        log.appTitle,
        log.details || '',
        String(log.durationSeconds ?? 0),
        statusLabel,
        log.deviceType,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fresh-ops-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter & Export Toolbar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 self-start overflow-x-auto max-w-full">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeRange(opt.value)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeRange === opt.value
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="min-h-[38px] inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تصدير تقرير CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم، الأداة، التفاصيل..."
              className="w-full min-h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 pr-9 pl-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="relative">
            <Filter className="h-3.5 w-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full min-h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 pr-9 pl-3 text-xs text-zinc-900 dark:text-white"
            >
              <option value="all">كل المستخدمين ({allUsers.length})</option>
              {allUsers.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.displayName} ({u.employeeCode || u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full min-h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-xs text-zinc-900 dark:text-white"
            >
              <option value="all">كل الأدوات والإجراءات</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} — {a.titleAr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Analytics KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>مرات الدخول للأدوات</span>
            <Layers className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
            {summary.totalLaunches}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>إجمالي وقت الاستخدام</span>
            <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold font-mono-nums text-red-600 dark:text-red-400">
            {formatDurationAr(summary.totalSeconds)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>متوسط مدة الجلسة</span>
            <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
            {summary.avgSeconds > 0 ? formatDurationAr(summary.avgSeconds) : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>الأعضاء النشطون</span>
            <Users className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
            {summary.uniqueUsers}{' '}
            <span className="text-xs font-normal text-zinc-500">/ {allUsers.length}</span>
          </p>
        </div>
      </div>

      {/* Section 1: Tool Usage & Duration Matrix */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              تحليل دخول الأدوات المتاحة والوقت المستغرق
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              عدد مرات الفتح، إجمالي الوقت الفعلي، ومتوسط مدة الجلسة لكل أداة في المنصة
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-stone-50 dark:bg-zinc-950 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-semibold">الأداة</th>
                <th className="py-3 px-4 font-semibold">مرات الدخول</th>
                <th className="py-3 px-4 font-semibold">إجمالي الوقت</th>
                <th className="py-3 px-4 font-semibold">متوسط الجلسة</th>
                <th className="py-3 px-4 font-semibold">المستخدمون</th>
                <th className="py-3 px-4 font-semibold">مؤشر الإقبال</th>
                <th className="py-3 px-4 font-semibold text-left">آخر استخدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {toolStats.map((tool) => {
                const ratio = Math.round((tool.launches / maxToolLaunches) * 100);
                return (
                  <tr key={tool.appId} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40">
                    <td className="py-3 px-4">
                      <p className="font-bold text-zinc-900 dark:text-white font-latin text-xs sm:text-sm">
                        {tool.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {tool.titleAr} · {tool.categoryLabel}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono-nums font-bold text-zinc-900 dark:text-white">
                      {tool.launches}
                    </td>
                    <td className="py-3 px-4 font-mono-nums font-bold text-red-700 dark:text-red-400 whitespace-nowrap">
                      {formatDurationAr(tool.totalSeconds)}
                    </td>
                    <td className="py-3 px-4 font-mono-nums text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                      {tool.avgSeconds > 0 ? formatDurationAr(tool.avgSeconds) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono-nums text-xs text-zinc-700 dark:text-zinc-200">
                      {tool.uniqueUsersCount}
                    </td>
                    <td className="py-3 px-4 min-w-[120px]">
                      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-600 transition-all"
                          style={{ width: `${tool.launches > 0 ? Math.max(6, ratio) : 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-nums text-xs text-zinc-500 text-left whitespace-nowrap">
                      {tool.lastUsedMs > 0
                        ? new Date(tool.lastUsedMs).toLocaleString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'لم تُستخدم'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Per-User Breakdown */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              ملخص نشاط كل مستخدم (مرات الدخول والوقت)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              اضغط على «سجل العضو» لفلترة سجل العمليات التفصيلي بالأسفل على هذا المستخدم
            </p>
          </div>
          {selectedUserId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedUserId('all')}
              className="min-h-[34px] px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              عرض كل المستخدمين
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-stone-50 dark:bg-zinc-950 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-semibold">المستخدم</th>
                <th className="py-3 px-4 font-semibold">الكود</th>
                <th className="py-3 px-4 font-semibold">دخول الفترة</th>
                <th className="py-3 px-4 font-semibold">وقت الفترة</th>
                <th className="py-3 px-4 font-semibold">الإجمالي الكلي</th>
                <th className="py-3 px-4 font-semibold">الأداة الأكثر استخداماً</th>
                <th className="py-3 px-4 font-semibold">آخر نشاط مسجل</th>
                <th className="py-3 px-4 font-semibold text-left">تصفية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {userStats.map((u) => (
                <tr key={u.uid} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40">
                  <td className="py-3 px-4">
                    <p className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">
                      {u.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{u.department}</p>
                  </td>
                  <td
                    className="py-3 px-4 font-mono-nums text-xs font-bold text-red-700 dark:text-red-400 whitespace-nowrap"
                    dir="ltr"
                  >
                    {u.employeeCode}
                  </td>
                  <td className="py-3 px-4 font-mono-nums font-bold text-zinc-900 dark:text-white">
                    {u.launchesInPeriod}
                  </td>
                  <td className="py-3 px-4 font-mono-nums font-bold text-red-700 dark:text-red-400 whitespace-nowrap">
                    {formatDurationAr(u.durationInPeriod)}
                  </td>
                  <td className="py-3 px-4 font-mono-nums text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                    {u.allTimeLaunches} مرة · {formatDurationAr(u.allTimeDuration)}
                  </td>
                  <td className="py-3 px-4 font-latin text-xs text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
                    {u.topTool}
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-300 max-w-[240px] truncate">
                    {u.lastActionText}
                  </td>
                  <td className="py-3 px-4 text-left whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedUserId((prev) => (prev === u.uid ? 'all' : u.uid))
                      }
                      className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        selectedUserId === u.uid
                          ? 'bg-red-600 text-white'
                          : 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {selectedUserId === u.uid ? 'مُحدد' : 'سجل العضو'}
                    </button>
                  </td>
                </tr>
              ))}
              {userStats.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-zinc-500">
                    لا توجد بيانات مستخدمين مسجلة حتى الآن.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Detailed Audit Trail ("مين عمل إيه") */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-600 dark:text-red-400" />
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                سجل العمليات التفصيلي — مين عمل إيه ({filteredLogs.length})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                يوضح كل عملية تشغيل أو نسخ رابط أو تعديل ملف شخصي مع مدة الجلسة الفعلية
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-stone-50 dark:bg-zinc-950 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-semibold">المستخدم</th>
                <th className="py-3 px-4 font-semibold">الإجراء</th>
                <th className="py-3 px-4 font-semibold">الأداة / العنصر</th>
                <th className="py-3 px-4 font-semibold">التفاصيل</th>
                <th className="py-3 px-4 font-semibold">الوقت المستغرق</th>
                <th className="py-3 px-4 font-semibold">الجهاز</th>
                <th className="py-3 px-4 font-semibold text-left">التوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredLogs.map((log, i) => {
                const actionLabel = log.action
                  ? ACTIVITY_ACTION_LABELS[log.action]
                  : ACTIVITY_ACTION_LABELS.launch;
                const isActiveSession = log.sessionStatus === 'active';
                return (
                  <tr key={log.id || i} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <p className="font-semibold text-zinc-900 dark:text-white">{log.userName}</p>
                      <p className="font-latin text-zinc-500">{log.userEmail}</p>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
                      {actionLabel}
                    </td>
                    <td className="py-2.5 px-4 font-latin text-xs font-semibold text-red-700 dark:text-red-400 whitespace-nowrap">
                      {log.appTitle}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-zinc-600 dark:text-zinc-300 max-w-[240px] truncate">
                      {log.details || 'تشغيل الأداة'}
                    </td>
                    <td className="py-2.5 px-4 font-mono-nums text-xs whitespace-nowrap">
                      {log.sessionStatus === 'instant' ? (
                        <span className="text-zinc-400">فوري</span>
                      ) : isActiveSession && (log.durationSeconds || 0) === 0 ? (
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          جلسة نشطة
                        </span>
                      ) : (
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {formatDurationAr(log.durationSeconds)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono-nums text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {log.deviceType}
                    </td>
                    <td className="py-2.5 px-4 font-mono-nums text-xs text-zinc-500 text-left whitespace-nowrap">
                      {log.createdAt?.toDate
                        ? log.createdAt.toDate().toLocaleString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'الآن'}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-zinc-500">
                    لا توجد سجلات مطابقة لعوامل التصفية الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
