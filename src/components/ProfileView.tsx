import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Fingerprint,
  Layers,
  Laptop,
  Lock,
  LogOut,
  Moon,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { OWNER_INFO } from '../data/defaultApps';
import { SCHEMA_LIMITS } from '../types/platform';
import { detectPlatformInfo, formatDurationAr, requestNotificationPermission } from '../utils/device';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  theme,
  onToggleTheme,
  onOpenAuth,
}) => {
  const {
    user,
    userProfile,
    isVerified,
    isAdmin,
    biometricSupported,
    biometricAvailable,
    biometricDevices,
    localBiometricBinding,
    registerBiometricOnThisDevice,
    toggleBiometricLockOnStart,
    lockWithBiometrics,
    removeBiometricDevice,
    updateOwnProfile,
    signOutUser,
  } = usePlatform();

  const [displayName, setDisplayName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [bioDeviceName, setBioDeviceName] = useState(() => `جهاز ${detectPlatformInfo()}`);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMsg, setBioMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setEmployeeCode(userProfile.employeeCode || '');
      setPhone(userProfile.phone || '');
      setJobTitle(userProfile.jobTitle || '');
      setCompany(userProfile.company || '');
      setNotificationsEnabled(Boolean(userProfile.notificationsEnabled));
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedOk(false);
    if (notificationsEnabled) {
      await requestNotificationPermission();
    }
    await updateOwnProfile({
      displayName,
      employeeCode,
      phone,
      jobTitle,
      company,
      notificationsEnabled,
    });
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 3000);
  };

  if (!isVerified || !user) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 space-y-5">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            حساب فريق المصنع والإعدادات
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            سجّل دخولك بالبريد الإلكتروني لحفظ بياناتك الوظيفية داخل مصنع المبرد الصحراوي والميكروويف وتفعيل إشعارات العمليات على أجهزتك.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onOpenAuth}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
          >
            تسجيل الدخول بالبريد الإلكتروني
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-100 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>

          <PWAInstallButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            الملف الشخصي وإعدادات الجهاز
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            إدارة بياناتك الخاصة وتفضيلات التنبيهات والمظهر — {OWNER_INFO.companyAr}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void signOutUser()}
          className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800/70 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors cursor-pointer self-start"
        >
          <LogOut className="h-4 w-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>

      {/* Account Overview */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName || user.email || 'User'}
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <User className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-red-700 dark:text-red-400">
                {isAdmin ? 'مدير إدارة العمليات' : 'عضو فريق المصنع'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-nums">{detectPlatformInfo()}</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white truncate">
              {userProfile?.displayName || user.displayName || 'مستخدم'}
            </h2>
            <p className="text-xs font-latin text-zinc-500 dark:text-zinc-400 truncate" dir="ltr">
              {user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t sm:border-t-0 pt-4 sm:pt-0 border-zinc-100 dark:border-zinc-800 shrink-0">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">مرات تشغيل الأدوات</p>
            <p className="text-xl font-bold font-mono-nums text-red-600 dark:text-red-400">
              {userProfile?.totalLaunches ?? 0}
            </p>
          </div>
          <div className="border-r border-zinc-200 dark:border-zinc-800 pr-6">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">وقت الاستخدام</p>
            <p className="text-xl font-bold font-mono-nums text-zinc-900 dark:text-white">
              {formatDurationAr(userProfile?.totalDurationSeconds)}
            </p>
          </div>
        </div>
      </div>

      {/* Admin-assigned custom fields (read-only for member; adminNotes remain admin-private) */}
      {userProfile?.customFields && Object.keys(userProfile.customFields).length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <Layers className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              بيانات إضافية مسجلة من إدارة العمليات
            </h3>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {Object.entries(userProfile.customFields).map(([fieldKey, fieldValue]) => (
              <div
                key={fieldKey}
                className="flex items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/70 pb-2 text-xs"
              >
                <dt className="font-semibold text-zinc-500 dark:text-zinc-400">{fieldKey}</dt>
                <dd className="font-bold text-zinc-900 dark:text-white text-left">
                  {fieldValue || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Edit Profile Form */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            البيانات الوظيفية والتواصل
          </h3>
          <span className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" />
            <span>سرية تامة</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              الاسم الكامل <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              minLength={SCHEMA_LIMITS.USER_NAME_MIN}
              maxLength={SCHEMA_LIMITS.USER_NAME_MAX}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              الكود الوظيفي <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              required
              minLength={SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MIN}
              maxLength={SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MAX}
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="مثال: 10245"
              className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3.5 text-sm font-mono-nums text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              رقم الهاتف <span className="text-red-600">*</span>
            </label>
            <input
              type="tel"
              dir="ltr"
              required
              minLength={SCHEMA_LIMITS.USER_PHONE_MIN}
              maxLength={SCHEMA_LIMITS.USER_PHONE_MAX}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              المسمى الوظيفي <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              minLength={SCHEMA_LIMITS.USER_JOB_MIN}
              maxLength={SCHEMA_LIMITS.USER_JOB_MAX}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="مثال: مهندس إنتاج / مشرف جودة"
              className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              القسم أو خط الإنتاج <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              minLength={SCHEMA_LIMITS.USER_COMPANY_MIN}
              maxLength={SCHEMA_LIMITS.USER_COMPANY_MAX}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="مثال: خط المبرد الصحراوي / الميكروويف"
              className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 p-4 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              تفعيل إشعارات المتصفح والجهاز
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              استلام تنبيه فوري عند إضافة أدوات جديدة أو توجيهات من {OWNER_INFO.nameAr}
            </p>
          </div>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
            className="h-5 w-5 accent-red-600 rounded cursor-pointer"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
          </button>

          {savedOk && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>تم تحديث بياناتك بنجاح</span>
            </span>
          )}
        </div>
      </form>

      {/* Optional Mobile Biometric Authentication Section */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                المصادقة البيومترية من الموبايل (اختياري)
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                فعّل بصمة الإصبع أو بصمة الوجه (Touch ID / Face ID) على هاتفك للدخول السريع وقفل الجلسة بأمان، دون إجبار.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap shrink-0">
            {biometricAvailable
              ? 'مدعومة على هذا الجهاز'
              : biometricSupported
                ? 'تحقق عند الفتح من التطبيق المثبت'
                : 'غير متاحة على هذا المتصفح'}
          </span>
        </div>

        {localBiometricBinding && localBiometricBinding.uid === user.uid ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  هذا الجهاز مفعّل بالبصمة: {localBiometricBinding.deviceName}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  يمكنك استخدام زر البصمة في شاشة الدخول أو قفل التطبيق فوراً عند ترك الهاتف.
                </p>
              </div>

              <button
                type="button"
                onClick={lockWithBiometrics}
                className="min-h-[40px] inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>قفل التطبيق الآن بالبصمة</span>
              </button>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 p-4 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  طلب البصمة تلقائياً عند فتح المنصة على هذا الهاتف
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  عند إيقاف هذا الخيار تظل البصمة اختيارية عند تسجيل الخروج أو القفل اليدوي فقط.
                </p>
              </div>
              <input
                type="checkbox"
                checked={localBiometricBinding.lockOnStart}
                onChange={(e) => toggleBiometricLockOnStart(e.target.checked)}
                className="h-5 w-5 accent-red-600 rounded cursor-pointer"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                maxLength={80}
                value={bioDeviceName}
                onChange={(e) => setBioDeviceName(e.target.value)}
                placeholder="اسم الجهاز (مثال: موبايل أندرويد - خط المبرد)"
                className="flex-1 min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <button
                type="button"
                disabled={bioBusy || !biometricSupported}
                onClick={async () => {
                  setBioBusy(true);
                  setBioMsg(null);
                  const res = await registerBiometricOnThisDevice(bioDeviceName);
                  setBioBusy(false);
                  if (res.ok) {
                    setBioMsg({
                      kind: 'ok',
                      text: 'تم ربط بصمة / وجه هذا الجهاز بحسابك بنجاح.',
                    });
                  } else {
                    setBioMsg({
                      kind: 'err',
                      text: res.error || 'تعذر تفعيل المصادقة البيومترية.',
                    });
                  }
                }}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Fingerprint className="h-4 w-4" />
                <span>{bioBusy ? 'بانتظار البصمة...' : 'تفعيل البصمة / الوجه على هذا الجهاز'}</span>
              </button>
            </div>
          </div>
        )}

        {bioMsg && (
          <p
            className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
              bioMsg.kind === 'ok'
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
            }`}
          >
            {bioMsg.text}
          </p>
        )}

        {biometricDevices.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              الأجهزة المرتبطة بالبصمة ({biometricDevices.length})
            </p>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {biometricDevices.map((dev) => {
                const isCurrent = localBiometricBinding?.deviceId === dev.id;
                const lastUsedLabel = dev.lastUsedAt?.toDate
                  ? dev.lastUsedAt.toDate().toLocaleDateString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'الآن';
                return (
                  <div key={dev.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Smartphone className="h-4 w-4 text-zinc-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {dev.deviceName}
                          {isCurrent ? ' (هذا الجهاز)' : ''}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono-nums">
                          {dev.platformInfo} · آخر استخدام: {lastUsedLabel}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeBiometricDevice(dev.id)}
                      title="إلغاء ربط الجهاز"
                      className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-800/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Appearance & Cross-Device Install */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Laptop className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              المظهر وتثبيت التطبيق على جهازك
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              يدعم التشغيل كتطبيق مستقل على Windows و Android و iOS
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-zinc-600" />}
            <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>
          <PWAInstallButton compact />
        </div>
      </div>
    </div>
  );
};
