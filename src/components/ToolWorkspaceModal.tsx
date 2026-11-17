import React, { useEffect, useState } from 'react';
import {
  Clock,
  Lock,
  Maximize2,
  Minimize2,
  RotateCw,
  X,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { formatDurationAr } from '../utils/device';
import { AppIcon } from './AppIcon';

export const ToolWorkspaceModal: React.FC = () => {
  const {
    activeEmbeddedApp,
    activeToolSession,
    closeToolInPlatform,
  } = usePlatform();

  const [elapsedSec, setElapsedSec] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [frameKey, setFrameKey] = useState(0);
  const [frameLoading, setFrameLoading] = useState(true);

  useEffect(() => {
    if (!activeEmbeddedApp) {
      setElapsedSec(0);
      setFrameLoading(true);
      return;
    }
    setFrameLoading(true);
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

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={`fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={activeEmbeddedApp.titleAr}
    >
      <div
        className={`w-full h-full bg-white dark:bg-zinc-900 overflow-hidden flex flex-col ${
          isFullscreen
            ? 'rounded-none border-0'
            : 'max-w-7xl max-h-[94vh] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl'
        }`}
      >
        {/* Workspace Control Bar */}
        <header className="px-3 sm:px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 flex flex-wrap items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <AppIcon
              iconType={activeEmbeddedApp.iconType}
              iconName={activeEmbeddedApp.iconName}
              iconUrl={activeEmbeddedApp.iconUrl}
              accentColor={activeEmbeddedApp.accentColor}
              alt={activeEmbeddedApp.title}
              size="sm"
            />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                {activeEmbeddedApp.titleAr} ·{' '}
                <span className="font-latin text-xs text-zinc-500 dark:text-zinc-400">
                  {activeEmbeddedApp.title}
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 font-mono-nums">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDurationAr(elapsedSec)}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                  <Lock className="h-3 w-3 text-red-600 dark:text-red-400" />
                  <span>تشغيل حصري داخل المنصة</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setFrameLoading(true);
                setFrameKey((k) => k + 1);
              }}
              title="إعادة تحميل الأداة داخل المنصة"
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              title={isFullscreen ? 'تصغير الإطار' : 'ملء الشاشة'}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isFullscreen ? 'إطار مضغوط' : 'ملء الشاشة'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void closeToolInPlatform()}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>إنهاء الجلسة والعودة</span>
            </button>
          </div>
        </header>

        {/* Locked In-Platform Sandbox Container */}
        <div className="flex-1 bg-white dark:bg-zinc-950 relative">
          {frameLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-stone-50/90 dark:bg-zinc-950/90 pointer-events-none">
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
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals"
            allow="fullscreen"
            onLoad={() => setFrameLoading(false)}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
