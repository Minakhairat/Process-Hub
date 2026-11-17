import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Download,
  Edit3,
  Factory,
  Gauge,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePlatform, type ProductionMetricInput } from '../context/PlatformContext';
import {
  DEFAULT_SHIFTS,
  PRODUCTION_LINE_CATALOG,
  SCHEMA_LIMITS,
  type ProductionMetric,
  type ProductionShift,
} from '../types/platform';

type RangeKey = '7d' | '14d' | '30d' | 'all';

const RANGE_OPTIONS: { value: RangeKey; label: string; days: number }[] = [
  { value: '7d', label: 'آخر 7 أيام', days: 7 },
  { value: '14d', label: 'آخر 14 يوم', days: 14 },
  { value: '30d', label: 'آخر 30 يوم', days: 30 },
  { value: 'all', label: 'كل السجلات', days: 0 },
];

function computeRates(
  targetUnits: number,
  actualUnits: number,
  defectUnits: number,
  downtimeMinutes: number,
  plannedMinutes: number
) {
  const safePlanned = Math.max(1, plannedMinutes);
  const safeTarget = Math.max(1, targetUnits);
  const safeActual = Math.max(0, actualUnits);
  const safeDefects = Math.min(safeActual, Math.max(0, defectUnits));
  const operatingMinutes = Math.max(0, safePlanned - Math.max(0, downtimeMinutes));

  const availabilityPct = Math.min(100, Math.round((operatingMinutes / safePlanned) * 1000) / 10);
  const achievementPct = Math.round((safeActual / safeTarget) * 1000) / 10;
  const performanceRatio = Math.min(1.15, safeActual / safeTarget);
  const qualityPct =
    safeActual > 0
      ? Math.round(((safeActual - safeDefects) / safeActual) * 1000) / 10
      : 100;
  const oeePct =
    Math.min(
      100,
      Math.round((availabilityPct / 100) * performanceRatio * (qualityPct / 100) * 1000) / 10
    );

  return {
    availabilityPct,
    achievementPct,
    qualityPct,
    oeePct,
  };
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  unit?: string;
}

const ChartTooltipContent: React.FC<{
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      dir="rtl"
      className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg text-xs"
    >
      <p className="font-bold text-zinc-900 dark:text-white mb-1.5 font-mono-nums">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: entry.color || '#DC2626' }}
              />
              <span>{entry.name}</span>
            </span>
            <span className="font-mono-nums font-bold text-zinc-900 dark:text-white">
              {typeof entry.value === 'number'
                ? entry.value.toLocaleString('en-US')
                : entry.value}
              {entry.unit || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const EMPTY_METRIC_FORM = (): ProductionMetricInput => {
  const defaultLine = PRODUCTION_LINE_CATALOG[0];
  return {
    date: new Date().toISOString().slice(0, 10),
    lineId: defaultLine.id,
    lineName: defaultLine.name,
    shift: 'الوردية الصباحية',
    targetUnits: defaultLine.defaultTarget,
    actualUnits: Math.round(defaultLine.defaultTarget * 0.95),
    defectUnits: 4,
    downtimeMinutes: 20,
    plannedMinutes: 480,
    operatorsCount: 16,
    notes: '',
    isActive: true,
  };
};

export const ProductionDashboardView: React.FC = () => {
  const {
    user,
    isAdmin,
    productionMetrics,
    productionMetricsLoading,
    saveProductionMetric,
    removeProductionMetric,
    seedSampleProductionMetrics,
  } = usePlatform();

  const [range, setRange] = useState<RangeKey>('14d');
  const [selectedLineId, setSelectedLineId] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductionMetricInput>(EMPTY_METRIC_FORM);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const lineOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of PRODUCTION_LINE_CATALOG) {
      map.set(l.id, l.name);
    }
    for (const m of productionMetrics) {
      if (!map.has(m.lineId)) {
        map.set(m.lineId, m.lineName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [productionMetrics]);

  const filteredMetrics = useMemo(() => {
    const selectedRange = RANGE_OPTIONS.find((r) => r.value === range);
    let cutoffDate = '';
    if (selectedRange && selectedRange.days > 0) {
      const d = new Date();
      d.setDate(d.getDate() - (selectedRange.days - 1));
      cutoffDate = d.toISOString().slice(0, 10);
    }

    return productionMetrics.filter((m) => {
      if (!isAdmin && !m.isActive) return false;
      if (cutoffDate && m.date < cutoffDate) return false;
      if (selectedLineId !== 'all' && m.lineId !== selectedLineId) return false;
      if (selectedShift !== 'all' && m.shift !== selectedShift) return false;
      return true;
    });
  }, [productionMetrics, isAdmin, range, selectedLineId, selectedShift]);

  const kpis = useMemo(() => {
    let targetUnits = 0;
    let actualUnits = 0;
    let defectUnits = 0;
    let downtimeMinutes = 0;
    let plannedMinutes = 0;

    for (const m of filteredMetrics) {
      targetUnits += m.targetUnits;
      actualUnits += m.actualUnits;
      defectUnits += m.defectUnits;
      downtimeMinutes += m.downtimeMinutes;
      plannedMinutes += m.plannedMinutes;
    }

    const rates = computeRates(
      targetUnits || 1,
      actualUnits,
      defectUnits,
      downtimeMinutes,
      plannedMinutes || 1
    );

    return {
      targetUnits,
      actualUnits,
      defectUnits,
      downtimeMinutes,
      plannedMinutes,
      recordsCount: filteredMetrics.length,
      ...rates,
    };
  }, [filteredMetrics]);

  // Daily trend data aggregated by date (sorted ascending for Recharts XAxis)
  const dailyChartData = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        targetUnits: number;
        actualUnits: number;
        defectUnits: number;
        downtimeMinutes: number;
        plannedMinutes: number;
      }
    >();

    for (const m of filteredMetrics) {
      const current = byDate.get(m.date) || {
        date: m.date,
        targetUnits: 0,
        actualUnits: 0,
        defectUnits: 0,
        downtimeMinutes: 0,
        plannedMinutes: 0,
      };
      current.targetUnits += m.targetUnits;
      current.actualUnits += m.actualUnits;
      current.defectUnits += m.defectUnits;
      current.downtimeMinutes += m.downtimeMinutes;
      current.plannedMinutes += m.plannedMinutes;
      byDate.set(m.date, current);
    }

    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => {
        const rates = computeRates(
          row.targetUnits,
          row.actualUnits,
          row.defectUnits,
          row.downtimeMinutes,
          row.plannedMinutes
        );
        return {
          ...row,
          dateLabel: formatShortDate(row.date),
          ...rates,
        };
      });
  }, [filteredMetrics]);

  // Per-line comparison data for Recharts BarChart
  const lineComparisonData = useMemo(() => {
    const byLine = new Map<
      string,
      {
        lineId: string;
        lineName: string;
        targetUnits: number;
        actualUnits: number;
        defectUnits: number;
        downtimeMinutes: number;
        plannedMinutes: number;
      }
    >();

    for (const m of filteredMetrics) {
      const catalogItem = PRODUCTION_LINE_CATALOG.find((c) => c.id === m.lineId);
      const current = byLine.get(m.lineId) || {
        lineId: m.lineId,
        lineName: catalogItem?.shortName || m.lineName,
        targetUnits: 0,
        actualUnits: 0,
        defectUnits: 0,
        downtimeMinutes: 0,
        plannedMinutes: 0,
      };
      current.targetUnits += m.targetUnits;
      current.actualUnits += m.actualUnits;
      current.defectUnits += m.defectUnits;
      current.downtimeMinutes += m.downtimeMinutes;
      current.plannedMinutes += m.plannedMinutes;
      byLine.set(m.lineId, current);
    }

    return Array.from(byLine.values()).map((row) => {
      const rates = computeRates(
        row.targetUnits,
        row.actualUnits,
        row.defectUnits,
        row.downtimeMinutes,
        row.plannedMinutes
      );
      return {
        ...row,
        ...rates,
      };
    });
  }, [filteredMetrics]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_METRIC_FORM());
    setStatusError('');
    setFormOpen(true);
  };

  const openEditForm = (m: ProductionMetric) => {
    setEditingId(m.id);
    setForm({
      id: m.id,
      date: m.date,
      lineId: m.lineId,
      lineName: m.lineName,
      shift: m.shift,
      targetUnits: m.targetUnits,
      actualUnits: m.actualUnits,
      defectUnits: m.defectUnits,
      downtimeMinutes: m.downtimeMinutes,
      plannedMinutes: m.plannedMinutes,
      operatorsCount: m.operatorsCount,
      notes: m.notes,
      isActive: m.isActive,
    });
    setStatusError('');
    setFormOpen(true);
  };

  const handleSelectLineInForm = (lineId: string) => {
    const matched = PRODUCTION_LINE_CATALOG.find((l) => l.id === lineId);
    setForm((prev) => ({
      ...prev,
      lineId,
      lineName: matched ? matched.name : prev.lineName,
      targetUnits: !editingId && matched ? matched.defaultTarget : prev.targetUnits,
    }));
  };

  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError('');
    setStatusSuccess('');

    if (!SCHEMA_LIMITS.DATE_REGEX.test(form.date.trim())) {
      setStatusError('يرجى إدخال تاريخ صحيح بصيغة YYYY-MM-DD.');
      return;
    }
    if (form.targetUnits < 1 || form.plannedMinutes < 1) {
      setStatusError('المستهدف وزمن التشغيل المخطط يجب أن يكونا أكبر من صفر.');
      return;
    }

    setSaving(true);
    try {
      await saveProductionMetric({
        ...form,
        id: editingId || undefined,
      });
      setFormOpen(false);
      setEditingId(null);
      setStatusSuccess('تم حفظ قراءة خط الإنتاج في Firestore وتحديث الرسوم البيانية.');
    } catch {
      setStatusError('تعذر حفظ القراءة في Firestore، تأكد من الصلاحيات والاتصال.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedSamples = async () => {
    if (!isAdmin) return;
    setSeeding(true);
    setStatusError('');
    setStatusSuccess('');
    try {
      const inserted = await seedSampleProductionMetrics();
      setStatusSuccess(
        inserted > 0
          ? `تم إدراج ${inserted} سجل أداء يومي لخطوط المصنع في Firestore.`
          : 'البيانات الافتراضية موجودة بالفعل في Firestore.'
      );
    } catch {
      setStatusError('تعذر إدراج البيانات الافتراضية في Firestore.');
    } finally {
      setSeeding(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'التاريخ',
      'خط الإنتاج',
      'الوردية',
      'المستهدف',
      'الإنتاج الفعلي',
      'نسبة التحقيق %',
      'المعيب',
      'نسبة الجودة %',
      'دقائق التوقف',
      'زمن الوردية المخطط',
      'OEE %',
      'العمالة',
      'ملاحظات',
    ];
    const rows = filteredMetrics.map((m) => {
      const r = computeRates(
        m.targetUnits,
        m.actualUnits,
        m.defectUnits,
        m.downtimeMinutes,
        m.plannedMinutes
      );
      return [
        m.date,
        m.lineName,
        m.shift,
        String(m.targetUnits),
        String(m.actualUnits),
        String(r.achievementPct),
        String(m.defectUnits),
        String(r.qualityPct),
        String(m.downtimeMinutes),
        String(m.plannedMinutes),
        String(r.oeePct),
        String(m.operatorsCount),
        m.notes || '',
      ];
    });

    const csv =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fresh-production-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            لوحة معلومات الأداء اليومي لخطوط الإنتاج
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            متابعة حية لمؤشرات الإنتاج والكفاءة (OEE) والجودة والتوقفات المسترجعة مباشرة من Firestore
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              type="button"
              disabled={seeding}
              onClick={() => void handleSeedSamples()}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Database className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <span>{seeding ? 'جاري التهيئة...' : 'تعبئة بيانات المصنع (Firestore)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredMetrics.length === 0}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تصدير CSV</span>
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>تسجيل قراءة يومية</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {statusError && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
          <span>{statusError}</span>
          <button type="button" onClick={() => setStatusError('')} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {statusSuccess && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
          <span>{statusSuccess}</span>
          <button type="button" onClick={() => setStatusSuccess('')} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 self-start overflow-x-auto max-w-full">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRange(opt.value)}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                range === opt.value
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[460px]">
          <select
            aria-label="تصفية حسب خط الإنتاج"
            value={selectedLineId}
            onChange={(e) => setSelectedLineId(e.target.value)}
            className="w-full min-h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-xs font-semibold text-zinc-900 dark:text-white"
          >
            <option value="all">كل خطوط الإنتاج ({lineOptions.length})</option>
            {lineOptions.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>

          <select
            aria-label="تصفية حسب الوردية"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full min-h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-xs font-semibold text-zinc-900 dark:text-white"
          >
            <option value="all">كل الورديات</option>
            {DEFAULT_SHIFTS.map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {productionMetricsLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 h-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse" />
            <div className="lg:col-span-5 h-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse" />
          </div>
        </div>
      ) : filteredMetrics.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              لا توجد قراءات أداء يومية مسجلة في Firestore لهذه الفترة
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              ابدأ بتسجيل قراءة إنتاج يومية لخطوط المبرد الصحراوي والميكروويف لعرض رسوم الإنتاجية ومؤشر OEE والجودة مباشرة من قاعدة البيانات.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={openCreateForm}
              className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>تسجيل أول قراءة يومية</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedSamples()}
                className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Database className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span>{seeding ? 'جاري الإدراج...' : 'إدراج بيانات المصنع الافتراضية (10 أيام)'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 4-Column Tabular KPI Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>الإنتاج الفعلي / المستهدف</span>
                <Factory className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="mt-1.5 text-xl sm:text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
                {kpis.actualUnits.toLocaleString('en-US')}
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {' '}
                  / {kpis.targetUnits.toLocaleString('en-US')}
                </span>
              </p>
              <p className="mt-1 text-xs font-mono-nums font-semibold text-emerald-700 dark:text-emerald-400">
                نسبة التحقيق: {kpis.achievementPct}%
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>الكفاءة الإجمالية (OEE)</span>
                <Gauge className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="mt-1.5 text-xl sm:text-2xl font-extrabold font-mono-nums text-red-600 dark:text-red-400">
                {kpis.oeePct}%
              </p>
              <p className="mt-1 text-xs font-mono-nums text-zinc-500 dark:text-zinc-400">
                التوافر: {kpis.availabilityPct}% · {kpis.recordsCount} سجل
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>معدل الجودة (FPY)</span>
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-1.5 text-xl sm:text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
                {kpis.qualityPct}%
              </p>
              <p className="mt-1 text-xs font-mono-nums text-zinc-500 dark:text-zinc-400">
                وحدات معيبة: {kpis.defectUnits.toLocaleString('en-US')}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>إجمالي التوقفات</span>
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-1.5 text-xl sm:text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
                {kpis.downtimeMinutes.toLocaleString('en-US')}
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400"> د</span>
              </p>
              <p className="mt-1 text-xs font-mono-nums text-amber-700 dark:text-amber-400">
                {(kpis.downtimeMinutes / 60).toFixed(1)} ساعة توقف غير مخطط
              </p>
            </div>
          </section>

          {/* Row 1 Charts: Daily Production Target vs Actual + OEE Trend */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart 1: Daily Output vs Target & Achievement % */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  الإنتاج اليومي: المستهدف مقابل الفعلي ونسبة التحقيق
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  مقارنة الوحدات المنتجة يومياً بالخطة المستهدفة ومنحنى نسبة الإنجاز (%)
                </p>
              </div>

              <div dir="ltr" className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={dailyChartData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.45} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="units"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      domain={[0, 120]}
                      unit="%"
                      tick={{ fontSize: 11, fill: '#16A34A' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      yAxisId="units"
                      dataKey="targetUnits"
                      name="المستهدف"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                    <Bar
                      yAxisId="units"
                      dataKey="actualUnits"
                      name="الإنتاج الفعلي"
                      fill="#DC2626"
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="achievementPct"
                      name="نسبة التحقيق"
                      unit="%"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#16A34A' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Daily OEE % & Quality % */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  مؤشر الكفاءة (OEE%) ومعدل الجودة اليومي
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  تطور الكفاءة الإجمالية للمعدات ونسبة الوحدات السليمة يومياً
                </p>
              </div>

              <div dir="ltr" className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={dailyChartData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="oeeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DC2626" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="qualFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.45} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[50, 100]}
                      unit="%"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey="qualityPct"
                      name="نسبة الجودة"
                      unit="%"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#qualFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="oeePct"
                      name="كفاءة OEE"
                      unit="%"
                      stroke="#DC2626"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#oeeFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Row 2 Charts: Per-Line Comparison & Downtime/Defects */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart 3: Production Line Comparison */}
            <div className="lg:col-span-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  مقارنة الإنتاجية حسب خط الإنتاج
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  مجموع الإنتاج الفعلي مقارنة بالمستهدف لكل خط إنتاج خلال الفترة المحددة
                </p>
              </div>

              <div dir="ltr" className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={lineComparisonData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.45} />
                    <XAxis
                      dataKey="lineName"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey="targetUnits"
                      name="المستهدف"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="actualUnits"
                      name="الإنتاج الفعلي"
                      fill="#DC2626"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Daily Downtime & Defects */}
            <div className="lg:col-span-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  تحليل التوقفات (دقيقة) والوحدات المعيبة يومياً
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  رصد فاقد الوقت والعيوب لدعم خطط الصيانة الوقائية وتحسين الجودة
                </p>
              </div>

              <div dir="ltr" className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart
                    data={dailyChartData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.45} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="mins"
                      tick={{ fontSize: 11, fill: '#D97706' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="defects"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#DC2626' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      yAxisId="mins"
                      dataKey="downtimeMinutes"
                      name="دقائق التوقف"
                      unit=" د"
                      fill="#D97706"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />
                    <Line
                      yAxisId="defects"
                      type="monotone"
                      dataKey="defectUnits"
                      name="وحدات معيبة"
                      stroke="#DC2626"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#DC2626' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Daily Production Records Table */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-600 dark:text-red-400" />
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    سجل قراءات خطوط الإنتاج اليومية ({filteredMetrics.length})
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    جميع القيم محفوظة ومزامنة لحظياً من مجموعة productionMetrics في Firestore
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-stone-50 dark:bg-zinc-950 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">التاريخ</th>
                    <th className="py-3 px-4 font-semibold">خط الإنتاج</th>
                    <th className="py-3 px-4 font-semibold">الوردية</th>
                    <th className="py-3 px-4 font-semibold">المستهدف</th>
                    <th className="py-3 px-4 font-semibold">الفعلي</th>
                    <th className="py-3 px-4 font-semibold">التحقيق</th>
                    <th className="py-3 px-4 font-semibold">المعيب</th>
                    <th className="py-3 px-4 font-semibold">التوقف</th>
                    <th className="py-3 px-4 font-semibold">OEE</th>
                    <th className="py-3 px-4 font-semibold text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredMetrics.map((m) => {
                    const r = computeRates(
                      m.targetUnits,
                      m.actualUnits,
                      m.defectUnits,
                      m.downtimeMinutes,
                      m.plannedMinutes
                    );
                    const canEdit = isAdmin || (user && m.createdBy === user.uid);
                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40"
                      >
                        <td className="py-2.5 px-4 font-mono-nums text-xs font-semibold text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
                          {m.date}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                          {m.lineName}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                          {m.shift}
                        </td>
                        <td className="py-2.5 px-4 font-mono-nums text-xs text-zinc-600 dark:text-zinc-300">
                          {m.targetUnits.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-4 font-mono-nums text-xs font-bold text-zinc-900 dark:text-white">
                          {m.actualUnits.toLocaleString('en-US')}
                        </td>
                        <td
                          className={`py-2.5 px-4 font-mono-nums text-xs font-bold whitespace-nowrap ${
                            r.achievementPct >= 95
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : r.achievementPct >= 85
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {r.achievementPct}%
                        </td>
                        <td className="py-2.5 px-4 font-mono-nums text-xs text-zinc-700 dark:text-zinc-300">
                          {m.defectUnits}
                        </td>
                        <td className="py-2.5 px-4 font-mono-nums text-xs text-amber-700 dark:text-amber-400 whitespace-nowrap">
                          {m.downtimeMinutes} د
                        </td>
                        <td className="py-2.5 px-4 font-mono-nums text-xs font-bold text-red-700 dark:text-red-400 whitespace-nowrap">
                          {r.oeePct}%
                        </td>
                        <td className="py-2.5 px-4 text-left whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openEditForm(m)}
                                title="تعديل القراءة"
                                className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {isAdmin &&
                              (confirmDeleteId === m.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void removeProductionMetric(m.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="min-h-[32px] px-2.5 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                                  >
                                    حذف
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="min-h-[32px] px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(m.id)}
                                  title="حذف السجل"
                                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Modal Form: Add / Edit Daily Production Metric */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="تسجيل قراءة أداء يومية"
        >
          <form
            onSubmit={(e) => void handleSaveMetric(e)}
            className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                  {editingId ? 'تعديل قراءة خط الإنتاج' : 'تسجيل قراءة أداء يومية جديدة'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  تُحفظ البيانات مباشرة في Firestore وتظهر فوراً في لوحة المعلومات
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {statusError && (
              <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  التاريخ
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  خط الإنتاج
                </label>
                <select
                  value={form.lineId}
                  onChange={(e) => handleSelectLineInForm(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
                >
                  {PRODUCTION_LINE_CATALOG.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  الوردية
                </label>
                <select
                  value={form.shift}
                  onChange={(e) =>
                    setForm({ ...form, shift: e.target.value as ProductionShift })
                  }
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
                >
                  {DEFAULT_SHIFTS.map((shift) => (
                    <option key={shift} value={shift}>
                      {shift}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  المستهدف (وحدة)
                </label>
                <input
                  type="number"
                  min={1}
                  max={SCHEMA_LIMITS.METRIC_UNITS_MAX}
                  required
                  value={form.targetUnits}
                  onChange={(e) =>
                    setForm({ ...form, targetUnits: Number(e.target.value) })
                  }
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  الإنتاج الفعلي (وحدة)
                </label>
                <input
                  type="number"
                  min={0}
                  max={SCHEMA_LIMITS.METRIC_UNITS_MAX}
                  required
                  value={form.actualUnits}
                  onChange={(e) =>
                    setForm({ ...form, actualUnits: Number(e.target.value) })
                  }
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  وحدات معيبة / إعادة
                </label>
                <input
                  type="number"
                  min={0}
                  max={SCHEMA_LIMITS.METRIC_UNITS_MAX}
                  required
                  value={form.defectUnits}
                  onChange={(e) =>
                    setForm({ ...form, defectUnits: Number(e.target.value) })
                  }
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  دقائق التوقف
                </label>
                <input
                  type="number"
                  min={0}
                  max={SCHEMA_LIMITS.METRIC_MINUTES_MAX}
                  required
                  value={form.downtimeMinutes}
                  onChange={(e) =>
                    setForm({ ...form, downtimeMinutes: Number(e.target.value) })
                  }
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  الوقت المخطط (دقيقة)
                </label>
                <input
                  type="number"
                  min={1}
                  max={SCHEMA_LIMITS.METRIC_MINUTES_MAX}
                  required
                  value={form.plannedMinutes}
                  onChange={(e) =>
                    setForm({ ...form, plannedMinutes: Number(e.target.value) })
                  }
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  عدد العمالة
                </label>
                <input
                  type="number"
                  min={1}
                  max={SCHEMA_LIMITS.METRIC_OPERATORS_MAX}
                  required
                  value={form.operatorsCount}
                  onChange={(e) =>
                    setForm({ ...form, operatorsCount: Number(e.target.value) })
                  }
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                ملاحظات التشغيل أو سبب التوقف (اختياري)
              </label>
              <textarea
                rows={2}
                maxLength={SCHEMA_LIMITS.METRIC_NOTES_MAX}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="مثال: ضبط ماكينة اللحام أو تغيير موديل..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 p-3 text-sm text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'حفظ القراءة في Firestore'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
