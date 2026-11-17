import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  Maximize2,
  Minimize2,
  RotateCw,
  X,
  ZoomIn,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { formatDurationAr } from '../utils/device';
import { AppIcon } from './AppIcon';

const ZOOM_OPTIONS = [1, 0.9, 0.8] as const;

export const ToolWorkspaceModal: React.FC = () => {
  const {
    activeEmbeddedApp,
    activeToolSession,
    closeToolInPlatform,
  } = usePlatform();

  const [elapsedSec, setElapsedSec] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [barCollapsed, setBarCollapsed] = useState(false);
  const [zoomScale, setZoomScale] = useState<(typeof ZOOM_OPTIONS)[number]>(1);
  const [frameKey, setFrameKey] = useState(0);
  const [frameLoading, setFrameLoading] = useState(true);

  useEffect(() => {
    if (!activeEmbeddedApp) {
      setElapsedSec(0);
      setFrameLoading(true);
      setBarCollapsed(false);
      setZoomScale(1);
      return;
    }
    setFrameLoading(true);
    setBarCollapsed(false);
    setZoomScale(1);
    setFrameKey((k) => k + 1);
  }, [activeEmbeddedApp]);

  useEffect(() => {
    if (!activeEmbeddedApp || !activeToolSession) {
      setElapsedSec(0);
      return;
    }
    const updateElapsed = () => {
      setElapsedSec(Math.max(0, Math.round((Date.now() - activeToolSession.startedAt) / 1000)));
    };
    updateElapsed();
    const id = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(id);
  }, [activeEmbeddedApp, activeToolSession]);

  useEffect(() => {
    if (!activeEmbeddedApp) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const hasModifier = e.ctrlKey || e.metaKey;

      if (
        e.key === 'F12' ||
        (hasModifier && key === 'u') ||
        (hasModifier && key === 's') ||
        (hasModifier && e.shiftKey && (key === 'i' || key === 'j' || key === 'c'))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeEmbeddedApp]);

  if (!activeEmbeddedApp) return null;

  const cycleZoom = () => {
    const idx = ZOOM_OPTIONS.indexOf(zoomScale);
    const next = ZOOM_OPTIONS[(idx + 1) % ZOOM_OPTIONS.length];
    setZoomScale(next);
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={`fixed inset-0 h-[100dvh] w-full z-50 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center ${
        isFullscreen
          ? 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]'
          : 'p-2 sm:p-4'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={activeEmbeddedApp.titleAr}
    >
      <div
        className={`w-full h-full min-h-0 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col ${
          isFullscreen
            ? 'rounded-none border-0'
            : 'max-w-7xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl'
        }`}
      >
        {/* Workspace Control Bar (Compact, single-row, collapsible for full-height tool access) */}
        {!barCollapsed && (
          <header className="shrink-0 px-3 sm:px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 flex items-center justify-between gap-2 sm:gap-3 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <AppIcon
                iconType={activeEmbeddedApp.iconType}
                iconName={activeEmbeddedApp.iconName}
                iconUrl={activeEmbeddedApp.iconUrl}
                accentColor={activeEmbeddedApp.accentColor}
                alt={activeEmbeddedApp.title}
                size="sm"
              />
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {activeEmbeddedApp.titleAr}
                  <span className="hidden sm:inline font-latin text-xs text-zinc-500 dark:text-zinc-400">
                    {' '}
                    · {activeEmbeddedApp.title}
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 font-mono-nums whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    <span>{formatDurationAr(elapsedSec)}</span>
                  </span>
                  <span className="hidden md:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                    <Lock className="h-3 w-3 text-red-600 dark:text-red-400" />
                    <span>تشغيل آمن داخل المنصة</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={cycleZoom}
                title="تغيير مقياس عرض الأداة لإظهار كافة الأزرار والصفوف"
                className="min-h-[36px] inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold font-mono-nums text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                <span>{Math.round(zoomScale * 100)}%</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFrameLoading(true);
                  setFrameKey((k) => k + 1);
                }}
                title="إعادة تحميل الأداة داخل المنصة"
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">تحديث</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                title={isFullscreen ? 'تصغير الإطار' : 'ملء الشاشة'}
                className="hidden sm:inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
                <span className="hidden lg:inline">
                  {isFullscreen ? 'إطار مضغوط' : 'ملء الشاشة'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBarCollapsed(true)}
                title="إخفاء الشريط العلوي لتوسيع مساحة الأداة"
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">إخفاء الشريط</span>
              </button>

              <button
                type="button"
                onClick={() => void closeToolInPlatform()}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">إنهاء والعودة</span>
                <span className="sm:hidden">إغلاق</span>
              </button>
            </div>
          </header>
        )}

        {/* Locked In-Platform Sandbox Container (min-h-0 guarantees exact viewport height without clipping top/bottom) */}
        <div
          dir="ltr"
          className="flex-1 min-h-0 w-full bg-white dark:bg-zinc-950 relative overflow-hidden"
        >
          {barCollapsed && (
            <div
              dir="rtl"
              className="absolute top-2 left-2 z-20 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-1 shadow-lg"
            >
              <button
                type="button"
                onClick={() => setBarCollapsed(false)}
                className="min-h-[32px] inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span>إظهار الشريط</span>
              </button>
              <button
                type="button"
                onClick={() => void closeToolInPlatform()}
                className="min-h-[32px] inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer whitespace-nowrap"
              >
                <X className="h-3.5 w-3.5" />
                <span>إنهاء</span>
              </button>
            </div>
          )}

          {frameLoading && (
            <div
              dir="rtl"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-stone-50/90 dark:bg-zinc-950/90 pointer-events-none"
            >
              <div className="h-8 w-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                جاري تشغيل {activeEmbeddedApp.titleAr} داخل المنصة...
              </p>
            </div>
          )}

          <iframe
            key={`${activeEmbeddedApp.id}-${frameKey}`}
            src={activeEmbeddedApp.url}
            title={activeEmbeddedApp.titleAr}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups"
            allow="fullscreen"
            onLoad={() => setFrameLoading(false)}
            style={
              zoomScale === 1
                ? undefined
                : {
                    width: `${100 / zoomScale}%`,
                    height: `${100 / zoomScale}%`,
                    transform: `scale(${zoomScale})`,
                    transformOrigin: '0 0',
                  }
            }
            className={`absolute inset-0 border-0 block ${
              zoomScale === 1 ? 'w-full h-full' : ''
            }`}
          />
        </div>
      </div>
    </div>
  );
};
