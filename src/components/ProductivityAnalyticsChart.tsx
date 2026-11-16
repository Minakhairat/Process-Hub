import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ActivityLog, UserProfile } from '../types/platform';

interface ProductivityAnalyticsChartProps {
  activityLogs: ActivityLog[];
  allUsers: UserProfile[];
}

type ChartMode = 'daily' | 'apps';

interface DailyPoint {
  dateKey: string;
  label: string;
  launches: number;
  activeUsers: number;
}

interface AppUsagePoint {
  name: string;
  launches: number;
  uniqueUsers: number;
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}

const AnalyticsTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 shadow-lg text-xs">
      <p className="font-bold text-zinc-900 dark:text-white mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="text-zinc-600 dark:text-zinc-300">{entry.name}:</span>
            <span className="font-mono-nums font-bold text-zinc-900 dark:text-white">
              {entry.value ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProductivityAnalyticsChart: React.FC<ProductivityAnalyticsChartProps> = ({
  activityLogs,
  allUsers,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('daily');

  const { dailyData, appUsageData, summary } = useMemo(() => {
    const daysCount = 14;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayMap = new Map<string, { label: string; launches: number; users: Set<string> }>();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
      dayMap.set(key, { label, launches: 0, users: new Set<string>() });
    }

    const appMap = new Map<string, { launches: number; users: Set<string> }>();
    let launches14d = 0;
    const activeUsers14d = new Set<string>();

    for (const log of activityLogs) {
      const createdDate = log.createdAt?.toDate ? log.createdAt.toDate() : null;
      if (createdDate) {
        const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
        const bucket = dayMap.get(key);
        if (bucket) {
          bucket.launches += 1;
          bucket.users.add(log.userId);
          launches14d += 1;
          activeUsers14d.add(log.userId);
        }
      }

      const appName = (log.appTitle || log.appId || 'أداة').trim();
      const existingApp = appMap.get(appName) || { launches: 0, users: new Set<string>() };
      existingApp.launches += 1;
      existingApp.users.add(log.userId);
      appMap.set(appName, existingApp);
    }

    const dailyPoints: DailyPoint[] = Array.from(dayMap.entries()).map(([dateKey, item]) => ({
      dateKey,
      label: item.label,
      launches: item.launches,
      activeUsers: item.users.size,
    }));

    const appPoints: AppUsagePoint[] = Array.from(appMap.entries())
      .map(([name, info]) => ({
        name: name.length > 18 ? `${name.slice(0, 16)}…` : name,
        launches: info.launches,
        uniqueUsers: info.users.size,
      }))
      .sort((a, b) => b.launches - a.launches)
      .slice(0, 8);

    const approvedCount = allUsers.filter(
      (u) => u.role === 'admin' || u.approvalStatus === 'approved'
    ).length;

    const avgDaily = Number((launches14d / daysCount).toFixed(1));
    const topApp = appPoints[0]?.name || '—';

    return {
      dailyData: dailyPoints,
      appUsageData: appPoints,
      summary: {
        launches14d,
        avgDaily,
        activeUsersCount: activeUsers14d.size,
        approvedCount,
        topApp,
      },
    };
  }, [activityLogs, allUsers]);

  return (
    <section
      aria-label="مؤشرات النشاط والإنتاجية"
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 space-y-5"
    >
      {/* Header + Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white">
              تحليل النشاط والإنتاجية اليومية
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            متابعة حية لمعدل استخدام الأدوات الهندسية وتفاعل فريق العمل خلال آخر <span className="font-mono-nums">14</span> يوماً
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 self-start">
          <button
            type="button"
            onClick={() => setChartMode('daily')}
            className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              chartMode === 'daily'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>النشاط اليومي</span>
          </button>

          <button
            type="button"
            onClick={() => setChartMode('apps')}
            className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              chartMode === 'apps'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>إنتاجية الأدوات</span>
          </button>
        </div>
      </div>

      {/* Inline Analytical Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-stone-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-3">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">تشغيلات آخر 14 يوم</p>
          <p className="mt-1 text-xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
            {summary.launches14d}
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-3">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">المتوسط اليومي للتشغيل</p>
          <p className="mt-1 text-xl font-extrabold font-mono-nums text-red-600 dark:text-red-400">
            {summary.avgDaily}
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-3">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">الأعضاء النشطون / المعتمدون</p>
          <p className="mt-1 text-xl font-extrabold font-mono-nums text-emerald-700 dark:text-emerald-400">
            {summary.activeUsersCount} / {summary.approvedCount}
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-3">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">الأداة الأكثر استخداماً</p>
          <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white truncate font-latin">
            {summary.topApp}
          </p>
        </div>
      </div>

      {/* Chart Canvas */}
      {activityLogs.length === 0 ? (
        <div className="h-64 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center p-6">
          <BarChart3 className="h-8 w-8 text-zinc-400 mb-2" />
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            لا توجد بيانات تشغيل مسجلة بعد
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-md">
            سيظهر الرسم البياني تلقائياً بمجرد قيام مهندسي ومشرفي المصنع بفتح أي من الأدوات التشغيلية.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-600 inline-block" />
                <span>مرات التشغيل</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600 inline-block" />
                <span>المستخدمون النشطون</span>
              </span>
            </div>
            <span className="font-mono-nums">آخر {activityLogs.length} عملية مسجلة</span>
          </div>

          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'daily' ? (
                <AreaChart data={dailyData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="freshLaunchesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="freshUsersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#71717A" strokeOpacity={0.18} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#71717A' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#71717A' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="launches"
                    name="مرات التشغيل"
                    stroke="#DC2626"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#freshLaunchesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="activeUsers"
                    name="المستخدمون النشطون"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#freshUsersGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={appUsageData} margin={{ top: 10, right: 12, left: -16, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#71717A" strokeOpacity={0.18} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#71717A' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={46}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#71717A' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar
                    dataKey="launches"
                    name="مرات التشغيل"
                    fill="#DC2626"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="uniqueUsers"
                    name="عدد المستخدمين"
                    fill="#059669"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
};
