import React, { useEffect, useState } from 'react';
import { Bell, Grid, Moon, Shield, Sun, User, X } from 'lucide-react';
import { AccessGateView } from './components/AccessGateView';
import { AdminConsole } from './components/AdminConsole';
import { AppsCatalogView } from './components/AppsCatalogView';
import { AuthModal } from './components/AuthModal';
import { BiometricLockView } from './components/BiometricLockView';
import { FreshLogo } from './components/FreshLogo';
import { NotificationsView } from './components/NotificationsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProfileView } from './components/ProfileView';
import { ToolWorkspaceModal } from './components/ToolWorkspaceModal';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { OWNER_INFO } from './data/defaultApps';

type ActiveSection = 'apps' | 'notifications' | 'profile' | 'admin';

const PlatformShell: React.FC = () => {
  const {
    authReady,
    profileLoading,
    isAdmin,
    isVerified,
    isApproved,
    biometricLocked,
    pendingUsersCount,
    userProfile,
    user,
    unreadCount,
    latestToast,
    dismissLatestToast,
    markNotificationRead,
    openToolByRef,
  } = usePlatform();

  const [section, setSection] = useState<ActiveSection>('apps');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('fresh-ops-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('fresh-ops-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (section === 'admin' && !isAdmin) {
      setSection('apps');
    }
  }, [isAdmin, section]);

  if (!authReady || (user && isVerified && profileLoading && !isAdmin)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 p-6 gap-4">
        <FreshLogo size="lg" />
        <div className="h-7 w-7 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          جاري التحقق من حالة الحساب...
        </p>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <>
        <AccessGateView theme={theme} onToggleTheme={toggleTheme} />
        <OfflineIndicator />
      </>
    );
  }

  if (biometricLocked) {
    return (
      <>
        <BiometricLockView theme={theme} onToggleTheme={toggleTheme} />
        <OfflineIndicator />
      </>
    );
  }

  const navItems: { id: ActiveSection; label: string; badge?: number; icon: React.ReactNode }[] = [
    { id: 'apps', label: 'التطبيقات', icon: <Grid className="h-5 w-5" /> },
    { id: 'notifications', label: 'الإشعارات', badge: unreadCount, icon: <Bell className="h-5 w-5" /> },
    { id: 'profile', label: 'حسابي', icon: <User className="h-5 w-5" /> },
    ...(isAdmin
      ? [{ id: 'admin' as const, label: 'الإدارة', badge: pendingUsersCount, icon: <Shield className="h-5 w-5" /> }]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Desktop Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="hidden md:block sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Fresh Electric Logo + Single-line Wordmark */}
          <button
            type="button"
            onClick={() => setSection('apps')}
            className="flex items-center gap-3 text-base font-extrabold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FreshLogo size="md" />
            <span>عمليات فريش إليكتريك</span>
          </button>

          {/* Zone 2: Clean Single-Line Text Navigation Links */}
          <nav className="flex items-center gap-7 text-sm font-semibold">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="mr-1.5 font-mono-nums text-xs font-bold text-red-600 dark:text-red-400">
                      ({item.badge})
                    </span>
                  ) : null}
                  {active && (
                    <span className="absolute right-0 left-0 -bottom-[19px] h-0.5 bg-red-600 dark:bg-red-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            {isVerified ? (
              <button
                type="button"
                onClick={() => setSection('profile')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 max-w-[200px] truncate cursor-pointer"
              >
                {userProfile?.displayName || user?.displayName || 'حسابي'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Compact Top Header (48px) */}
      <header className="md:hidden sticky top-0 z-30 h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setSection('apps')}
          className="flex items-center gap-2 text-sm font-extrabold text-zinc-900 dark:text-white whitespace-nowrap shrink-0"
        >
          <FreshLogo size="sm" />
          <span>عمليات فريش</span>
        </button>

        {!isVerified ? (
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            دخول
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="تبديل المظهر"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-24 md:pb-12">
        {section === 'apps' && <AppsCatalogView onOpenAuth={() => setAuthModalOpen(true)} />}
        {section === 'notifications' && <NotificationsView onOpenAuth={() => setAuthModalOpen(true)} />}
        {section === 'profile' && (
          <ProfileView
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
        {section === 'admin' && <AdminConsole />}
      </main>

      {/* Quiet Desktop Footer */}
      <footer className="hidden md:block border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{OWNER_INFO.companyAr}</span>
            <span aria-hidden="true">·</span>
            <span>{OWNER_INFO.roleAr}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-red-700 dark:text-red-400">{OWNER_INFO.nameAr}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-nums" dir="ltr">{OWNER_INFO.phone}</span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar (64px) */}
      <nav
        aria-label="التنقل السفلي"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 grid ${
          isAdmin ? 'grid-cols-4' : 'grid-cols-3'
        } items-center`}
      >
        {navItems.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`relative h-full flex flex-col items-center justify-center gap-1 transition-colors ${
                active
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -left-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-mono-nums font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] font-semibold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Live In-App Toast for New Broadcast Notification */}
      {latestToast && (
        <div className="fixed top-16 md:top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-zinc-900 p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <Bell className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                  تنبيه عمليات من {latestToast.senderName}
                </p>
                <h4 className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                  {latestToast.title}
                </h4>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                  {latestToast.body}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(latestToast.targetAppUrl || latestToast.targetAppTitle) && (
                    <button
                      type="button"
                      onClick={() => {
                        void markNotificationRead(latestToast.id);
                        openToolByRef(latestToast.targetAppUrl, latestToast.targetAppTitle);
                        dismissLatestToast();
                      }}
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer whitespace-nowrap"
                    >
                      تشغيل الأداة
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void markNotificationRead(latestToast.id);
                      setSection('notifications');
                      dismissLatestToast();
                    }}
                    className="min-h-[34px] px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer whitespace-nowrap"
                  >
                    عرض التفاصيل
                  </button>
                  <button
                    type="button"
                    onClick={dismissLatestToast}
                    className="min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  >
                    تجاهل
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissLatestToast}
              aria-label="إغلاق"
              className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ToolWorkspaceModal />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <OfflineIndicator />
    </div>
  );
};

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950 p-6 text-center">
          <div className="max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
              حدث خطأ غير متوقع في تحميل البيانات
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              يرجى إعادة تحميل الصفحة للمتابعة.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 cursor-pointer"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <PlatformProvider>
        <PlatformShell />
      </PlatformProvider>
    </AppErrorBoundary>
  );
}
