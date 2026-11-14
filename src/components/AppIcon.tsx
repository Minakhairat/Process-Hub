import React, { useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  BrainCircuit,
  CheckSquare,
  ClipboardCheck,
  Compass,
  Cpu,
  Factory,
  FileSpreadsheet,
  Gauge,
  GitBranch,
  Grid,
  Layers,
  LineChart,
  PackageCheck,
  SearchCheck,
  ShieldCheck,
  Sliders,
  Target,
  Timer,
  Workflow,
  Wrench,
} from 'lucide-react';
import type { AccentColor, IconType } from '../types/platform';

export const ICON_REGISTRY = {
  Grid,
  GitBranch,
  ClipboardCheck,
  SearchCheck,
  Award,
  Workflow,
  Layers,
  Cpu,
  BarChart3,
  Gauge,
  Factory,
  ShieldCheck,
  Wrench,
  BrainCircuit,
  LineChart,
  Target,
  PackageCheck,
  Sliders,
  Compass,
  FileSpreadsheet,
  Timer,
  Activity,
  CheckSquare,
} as const;

export type IconKey = keyof typeof ICON_REGISTRY;

export const AVAILABLE_ICONS: { key: IconKey; label: string }[] = [
  { key: 'Grid', label: 'مصفوفة' },
  { key: 'GitBranch', label: 'تدفق القيمة' },
  { key: 'ClipboardCheck', label: 'تدقيق 5S' },
  { key: 'SearchCheck', label: 'فحص الهدر' },
  { key: 'Award', label: 'شهادة / حزام' },
  { key: 'Workflow', label: 'سير العمليات' },
  { key: 'Layers', label: 'السوبر ماركت' },
  { key: 'Cpu', label: 'ذكاء اصطناعي' },
  { key: 'Factory', label: 'خط إنتاج' },
  { key: 'Gauge', label: 'قياس الأداء' },
  { key: 'BarChart3', label: 'إحصائيات' },
  { key: 'LineChart', label: 'تحليل اتجاه' },
  { key: 'Target', label: 'أهداف KPI' },
  { key: 'Timer', label: 'زمن الدورة' },
  { key: 'PackageCheck', label: 'جودة المنتج' },
  { key: 'ShieldCheck', label: 'معايير السلامة' },
  { key: 'Wrench', label: 'صيانة TPM' },
  { key: 'FileSpreadsheet', label: 'جداول هندسية' },
];

const ACCENT_STYLES: Record<AccentColor, string> = {
  red: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60',
  blue: 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  slate: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
};

interface AppIconProps {
  iconType: IconType;
  iconName: string;
  iconUrl: string;
  accentColor: AccentColor;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AppIcon: React.FC<AppIconProps> = ({
  iconType,
  iconName,
  iconUrl,
  accentColor,
  alt,
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);

  const boxSize =
    size === 'sm' ? 'h-10 w-10 rounded-xl' : size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-12 w-12 rounded-xl';
  const glyphSize = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-7 w-7' : 'h-6 w-6';

  const IconComponent = ICON_REGISTRY[iconName as IconKey] || Layers;
  const colorClasses = ACCENT_STYLES[accentColor] || ACCENT_STYLES.red;

  if (iconType === 'image' && iconUrl && !imgError) {
    return (
      <div className={`${boxSize} shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center`}>
        <img
          src={iconUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`${boxSize} shrink-0 border flex items-center justify-center ${colorClasses}`}>
      <IconComponent className={glyphSize} strokeWidth={1.8} />
    </div>
  );
};
