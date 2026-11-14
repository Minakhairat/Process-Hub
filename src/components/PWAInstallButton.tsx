import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  variant?: 'default' | 'hero';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  variant = 'default',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    const btnClasses =
      variant === 'hero'
        ? 'bg-white/10 text-white border border-white/25 hover:bg-white/20'
        : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-red-600 dark:hover:bg-red-500';

    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${btnClasses} ${
          compact ? 'min-h-[40px] px-3.5 py-1.5 text-xs font-semibold' : 'min-h-[44px] px-4 py-2 text-sm font-semibold'
        }`}
      >
        <Download className="h-4 w-4" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  if (isIOS) {
    const iosBtnClasses =
      variant === 'hero'
        ? 'border border-white/25 bg-white/10 text-white hover:bg-white/20'
        : 'border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800';

    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 min-h-[42px] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${iosBtnClasses}`}
        >
          <Smartphone className={`h-4 w-4 ${variant === 'hero' ? 'text-red-200' : 'text-red-600 dark:text-red-400'}`} />
          <span>تثبيت على iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  تثبيت المنصة على iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="إغلاق"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-nums font-bold text-red-600 dark:text-red-400">1.</span>
                  <span>
                    اضغط على زر المشاركة <Share className="inline h-4 w-4 mx-1 text-red-600 dark:text-red-400" /> في شريط متصفح Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-nums font-bold text-red-600 dark:text-red-400">2.</span>
                  <span>مرر للأسفل واختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-nums font-bold text-red-600 dark:text-red-400">3.</span>
                  <span>اضغط «إضافة» لتشغيل منصة عمليات فريش إليكتريك كتطبيق مستقل.</span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors cursor-pointer"
              >
                فهمت
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
