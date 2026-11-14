import React, { useMemo, useState } from 'react';
import {
  ArrowUpLeft,
  Check,
  Copy,
  Factory,
  Layers,
  Mail,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { OWNER_INFO } from '../data/defaultApps';
import heroFactoryImg from '../assets/images/hero_fresh_factory_1794650867727.jpg';
import operationsEmblemImg from '../assets/images/factory_operations_emblem_1794650867881.jpg';
import { usePlatform } from '../context/PlatformContext';
import { CATEGORY_LABELS, type AppCategory, type AppItem } from '../types/platform';
import { AppIcon } from './AppIcon';
import { FreshLogo } from './FreshLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface AppsCatalogViewProps {
  onOpenAuth: () => void;
}

const FILTER_OPTIONS: { value: 'all' | AppCategory; label: string }[] = [
  { value: 'all', label: 'كل الأدوات' },
  { value: 'lean', label: 'اللين وتدفق القيمة' },
  { value: 'quality', label: 'الجودة 5S' },
  { value: 'production', label: 'الإنتاج والخطوط' },
  { value: 'training', label: 'المهارات والتدريب' },
  { value: 'ai', label: 'الذكاء الاصطناعي' },
];

export const AppsCatalogView: React.FC<AppsCatalogViewProps> = ({ onOpenAuth }) => {
  const { apps, appsLoading, isVerified, isAdmin, userProfile, trackAppLaunch } = usePlatform();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AppCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  const [emblemImgError, setEmblemImgError] = useState(false);

  const visibleApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return apps
      .filter((a) => isAdmin || a.isActive)
      .filter((a) => categoryFilter === 'all' || a.category === categoryFilter)
      .filter((a) => {
        if (!q) return true;
        return (
          a.title.toLowerCase().includes(q) ||
          a.titleAr.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
        );
      });
  }, [apps, isAdmin, categoryFilter, searchQuery]);

  const activeCount = useMemo(() => apps.filter((a) => a.isActive).length, [apps]);
  const categoriesCount = useMemo(
    () => new Set(apps.filter((a) => isAdmin || a.isActive).map((a) => a.category)).size,
    [apps, isAdmin]
  );

  const handleCopyUrl = async (app: AppItem) => {
    try {
      await navigator.clipboard.writeText(app.url);
      setCopiedId(app.id);
      setTimeout(() => setCopiedId((prev) => (prev === app.id ? null : prev)), 2000);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Executive Fresh Electric Red & Charcoal Command Hero */}
      <section className="rounded-2xl border border-red-900/30 dark:border-red-900/50 bg-gradient-to-br from-red-700 via-red-800 to-zinc-950 text-white overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <FreshLogo size="md" className="border-white/20 shadow-sm" />
                <div className="text-xs text-red-100/90 leading-relaxed">
                  <p className="font-bold text-white">{OWNER_INFO.companyAr}</p>
                  <p className="text-red-100/80">مصنع المبرد الصحراوي والميكروويف · إدارة العمليات</p>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
                منظومة إدارة العمليات والتصنيع الرشيق بالمصنع
              </h1>

              <p className="text-sm sm:text-base text-red-50/90 leading-relaxed max-w-2xl">
                {OWNER_INFO.specialtyAr} — بقيادة{' '}
                <strong className="font-bold text-white">{OWNER_INFO.nameAr}</strong>،{' '}
                {OWNER_INFO.roleAr}. بوابة موحدة لتشغيل أدوات التوازن والتدقيق ومراقبة الأداء عبر الكمبيوتر والتابلت والموبايل.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {!isVerified ? (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>تسجيل الدخول لفريق المصنع</span>
                </button>
              ) : (
                <a
                  href="#apps-grid"
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <Layers className="h-4 w-4" />
                  <span>استعراض أدوات العمليات</span>
                </a>
              )}

              <PWAInstallButton variant="hero" />

              <a
                href={OWNER_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle className="h-4 w-4" />
                <span>تواصل مباشر</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full bg-zinc-950 border-t lg:border-t-0 lg:border-r border-white/15 overflow-hidden">
            {!heroImgError ? (
              <img
                src={heroFactoryImg}
                alt="خطوط إنتاج مصنع المبرد الصحراوي والميكروويف — شركة فريش إليكتريك"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgError(true)}
                className="w-full h-full object-cover lg:h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-red-900 via-zinc-900 to-zinc-950 text-white">
                <Factory className="h-10 w-10 text-red-300 mb-3" />
                <p className="font-bold text-base">مصنع المبرد الصحراوي والميكروويف</p>
                <p className="mt-1 text-xs text-red-200">{OWNER_INFO.companyAr}</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/25 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between gap-3 text-xs text-white">
              <span className="font-semibold">خطوط المبرد الصحراوي والميكروويف</span>
              <span className="font-mono-nums font-bold text-red-200">
                {activeCount} أدوات نشطة
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column Operations Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">تطبيقات العمليات</p>
          <p className="mt-1 text-2xl font-extrabold font-mono-nums text-red-600 dark:text-red-400">
            {activeCount}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">المسارات التشغيلية</p>
          <p className="mt-1 text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
            {categoriesCount}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isVerified ? 'عمليات التشغيل المسجلة' : 'حالة الحساب'}
          </p>
          <p className="mt-1 text-lg sm:text-xl font-bold font-mono-nums text-zinc-900 dark:text-white truncate">
            {isVerified ? userProfile?.totalLaunches ?? 0 : 'وصول سريع'}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">التوافق التشغيلي</p>
          <p className="mt-1 text-sm sm:text-base font-bold font-latin text-zinc-900 dark:text-white truncate">
            Windows · Android · iOS
          </p>
        </div>
      </section>

      {/* Search & Category Filter Workspace */}
      <section id="apps-grid" className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">
              منظومة التطبيقات والأدوات التشغيلية
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              اختر الأداة المطلوبة للعمل على خطوط المبرد الصحراوي والميكروويف مباشرة
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="h-4 w-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الأداة أو الوصف..."
              className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pr-10 pl-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>

        {/* Segmented Filter Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            {FILTER_OPTIONS.map((opt) => {
              const active = categoryFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategoryFilter(opt.value)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Applications Grid */}
        {appsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-56 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 animate-pulse flex flex-col justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 w-4/5 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
                <div className="h-11 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : visibleApps.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
            <p className="text-base font-bold text-zinc-900 dark:text-white">
              لا توجد أدوات مطابقة لنتيجة البحث
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              جرب مسح نص البحث أو اختيار تصنيف «كل الأدوات».
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              className="mt-4 min-h-[42px] px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
            >
              إعادة ضبط الفلترة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleApps.map((app, index) => (
              <article
                key={app.id}
                className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between gap-5 transition-colors hover:border-red-400 dark:hover:border-red-700"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <AppIcon
                        iconType={app.iconType}
                        iconName={app.iconName}
                        iconUrl={app.iconUrl}
                        accentColor={app.accentColor}
                        alt={app.title}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono-nums font-bold text-red-600 dark:text-red-400">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{CATEGORY_LABELS[app.category]}</span>
                          {!app.isActive && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">مخفي</span>
                            </>
                          )}
                        </div>
                        <h3 className="mt-0.5 text-base font-bold text-zinc-900 dark:text-white leading-snug truncate font-latin">
                          {app.title}
                        </h3>
                        <p className="text-xs font-semibold text-red-700 dark:text-red-400 truncate">
                          {app.titleAr}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                    {app.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackAppLaunch(app)}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 dark:hover:bg-red-500 transition-colors whitespace-nowrap"
                  >
                    <span>فتح الأداة</span>
                    <ArrowUpLeft className="h-4 w-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => void handleCopyUrl(app)}
                    title="نسخ رابط الأداة"
                    aria-label={`نسخ رابط ${app.title}`}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedId === app.id ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Factory Leadership & Operations Contact Band */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {!emblemImgError ? (
              <img
                src={operationsEmblemImg}
                alt={OWNER_INFO.nameAr}
                referrerPolicy="no-referrer"
                onError={() => setEmblemImgError(true)}
                className="h-16 w-16 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
              />
            ) : (
              <FreshLogo size="lg" />
            )}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400">
                <span>{OWNER_INFO.companyAr}</span>
                <span aria-hidden="true">·</span>
                <span>{OWNER_INFO.roleAr}</span>
              </div>
              <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                {OWNER_INFO.nameAr} —{' '}
                <span className="font-latin font-semibold text-zinc-600 dark:text-zinc-300">
                  {OWNER_INFO.nameEn}
                </span>
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
                إدارة وتطوير الأداء التشغيلي بمصنع المبرد الصحراوي والميكروويف — كفاءة أعلى، جودة مستدامة، وتنفيذ منضبط في كل خط إنتاج.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={`tel:${OWNER_INFO.phone}`}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-white hover:border-red-300 transition-colors whitespace-nowrap"
            >
              <Phone className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="font-mono-nums" dir="ltr">{OWNER_INFO.phone}</span>
            </a>

            <a
              href={OWNER_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <MessageCircle className="h-4 w-4" />
              <span>واتساب مباشر</span>
            </a>

            <a
              href={`mailto:${OWNER_INFO.email}`}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              <Mail className="h-4 w-4 text-zinc-500" />
              <span className="font-latin text-xs">{OWNER_INFO.email}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
