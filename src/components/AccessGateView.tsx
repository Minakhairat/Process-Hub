import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Edit3,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserCheck,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { OWNER_INFO } from '../data/defaultApps';
import { SCHEMA_LIMITS } from '../types/platform';
import { FreshLogo } from './FreshLogo';

interface AccessGateViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const AccessGateView: React.FC<AccessGateViewProps> = ({ theme, onToggleTheme }) => {
  const {
    user,
    userProfile,
    isVerified,
    isProfileComplete,
    profileLoading,
    signInWithGoogle,
    resendVerification,
    refreshAuthUser,
    signOutUser,
    updateOwnProfile,
  } = usePlatform();

  const [busy, setBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || '');
      setEmployeeCode(userProfile.employeeCode || '');
      setPhone(userProfile.phone || '');
      setJobTitle(userProfile.jobTitle || '');
      setCompany(userProfile.company || '');
    } else if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [userProfile, user]);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setErrorMsg(
          `الدومين (${host}) غير مضاف بعد في Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('تم إغلاق نافذة تسجيل الدخول قبل الإتمام.');
      } else {
        setErrorMsg('تعذر إتمام تسجيل الدخول بحساب Google، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCheck = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setBusy(true);
    const verified = await refreshAuthUser();
    setBusy(false);
    if (!verified) {
      setErrorMsg('لم يتم تأكيد البريد الإلكتروني بعد. يرجى فتح رسالة التفعيل أو استخدام حساب Google.');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanName = displayName.trim();
    const cleanCode = employeeCode.trim();
    const cleanPhone = phone.trim();
    const cleanJob = jobTitle.trim();
    const cleanCompany = company.trim();

    if (cleanName.length < SCHEMA_LIMITS.USER_NAME_MIN) {
      setErrorMsg('يرجى إدخال الاسم الكامل (حرفين على الأقل).');
      return;
    }
    if (cleanCode.length < SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MIN) {
      setErrorMsg('يرجى إدخال الكود الوظيفي الخاص بك.');
      return;
    }
    if (cleanPhone.length < SCHEMA_LIMITS.USER_PHONE_MIN) {
      setErrorMsg('يرجى إدخال رقم هاتف صحيح (8 أرقام على الأقل).');
      return;
    }
    if (cleanJob.length < SCHEMA_LIMITS.USER_JOB_MIN) {
      setErrorMsg('يرجى إدخال المسمى الوظيفي بالكامل.');
      return;
    }
    if (cleanCompany.length < SCHEMA_LIMITS.USER_COMPANY_MIN) {
      setErrorMsg('يرجى إدخال القسم أو خط الإنتاج أو المصنع.');
      return;
    }

    setBusy(true);
    try {
      await updateOwnProfile({
        displayName: cleanName,
        employeeCode: cleanCode,
        phone: cleanPhone,
        jobTitle: cleanJob,
        company: cleanCompany,
        notificationsEnabled: userProfile?.notificationsEnabled ?? false,
      });
      setEditingProfile(false);
      setInfoMsg('تم تسجيل بياناتك بنجاح، وحسابك الآن قيد المراجعة من قبل الإدارة.');
    } catch {
      setErrorMsg('تعذر حفظ البيانات حالياً، يرجى المحاولة مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const approvalStatus = userProfile?.approvalStatus || 'pending';

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Minimal Gate Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FreshLogo size="md" />
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
              عمليات فريش إليكتريك
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="تبديل المظهر"
            className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap shrink-0"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>
        </div>
      </header>

      {/* Main Locked Gate Viewport */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 space-y-6">
          {/* STATE 1: Not Signed In */}
          {!user && (
            <>
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                    {OWNER_INFO.companyAr} · مصنع المبرد الصحراوي والميكروويف
                  </p>
                  <h1 className="mt-1 text-2xl font-extrabold text-zinc-900 dark:text-white [text-wrap:balance]">
                    البوابة مغلقة — دخول الأعضاء المعتمدين فقط
                  </h1>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    لا تظهر أدوات أو بيانات المنصة إلا بعد تسجيل الدخول بحساب Gmail الخاص بك، واستكمال بياناتك كاملة (بما فيها الكود الوظيفي)، وموافقة الحساب الرئيسي لإدارة العمليات.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border-y border-zinc-100 dark:border-zinc-800">
                <div className="py-3 flex items-baseline gap-3 text-sm">
                  <span className="font-mono-nums text-xs font-bold text-red-600 dark:text-red-400">01</span>
                  <span className="text-zinc-700 dark:text-zinc-200 font-medium">
                    تسجيل الدخول بحساب Google (Gmail) الموثق
                  </span>
                </div>
                <div className="py-3 flex items-baseline gap-3 text-sm">
                  <span className="font-mono-nums text-xs font-bold text-red-600 dark:text-red-400">02</span>
                  <span className="text-zinc-700 dark:text-zinc-200 font-medium">
                    تسجيل بياناتك كاملة (الاسم، الكود الوظيفي، الهاتف، الوظيفة، القسم)
                  </span>
                </div>
                <div className="py-3 flex items-baseline gap-3 text-sm">
                  <span className="font-mono-nums text-xs font-bold text-red-600 dark:text-red-400">03</span>
                  <span className="text-zinc-700 dark:text-zinc-200 font-medium">
                    مراجعة وقبول حسابك من {OWNER_INFO.nameAr}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <p className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300 leading-relaxed">
                  {errorMsg}
                </p>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={() => void handleGoogleSignIn()}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-3 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                <UserCheck className="h-5 w-5" />
                <span>{busy ? 'جاري فتح نافذة Google...' : 'تسجيل الدخول بحساب Google (Gmail)'}</span>
              </button>
            </>
          )}

          {/* STATE 2: Signed In but Email Not Verified */}
          {user && !isVerified && (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                  يلزم تأكيد البريد الإلكتروني أولاً
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  البريد المسجل حالياً (<span className="font-latin font-semibold" dir="ltr">{user.email}</span>) غير موثق بعد. يرجى تأكيد البريد أو تسجيل الخروج والدخول بحساب Gmail مباشرة.
                </p>
              </div>

              {errorMsg && (
                <p className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
                  {errorMsg}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleVerifyCheck()}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>تحقق من التفعيل</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const sent = await resendVerification();
                    setInfoMsg(sent ? 'تم إرسال رسالة التفعيل.' : 'يرجى الانتظار قليلاً قبل إعادة الإرسال.');
                  }}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>إعادة الإرسال</span>
                </button>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800/70 px-4 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>خروج</span>
                </button>
              </div>
              {infoMsg && (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{infoMsg}</p>
              )}
            </div>
          )}

          {/* STATE 3: Loading Profile */}
          {user && isVerified && profileLoading && (
            <div className="py-10 text-center space-y-3">
              <div className="mx-auto h-10 w-10 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                جاري التحقق من حالة العضوية والموافقة...
              </p>
            </div>
          )}

          {/* STATE 4: Complete Registration Form (Profile Incomplete or Editing while Pending) */}
          {user && isVerified && !profileLoading && (!isProfileComplete || (editingProfile && approvalStatus === 'pending')) && (
            <form onSubmit={(e) => void handleProfileSubmit(e)} className="space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                    الخطوة 2 من 3 · استكمال البيانات المطلوبة
                  </p>
                  <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                    سجّل بياناتك لإرسال طلب التفعيل
                  </h1>
                  <p className="text-xs font-latin text-zinc-500 dark:text-zinc-400 truncate" dir="ltr">
                    {user.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 shrink-0 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>تغيير الحساب</span>
                </button>
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
                    placeholder="مثال: م. أحمد محمود"
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
                    رقم الهاتف / الواتساب <span className="text-red-600">*</span>
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
                    className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3.5 text-sm font-mono-nums text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
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

              {errorMsg && (
                <p className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
                  {errorMsg}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{busy ? 'جاري الحفظ...' : 'حفظ البيانات وإرسال للموافقة'}</span>
                </button>
                {editingProfile && (
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="min-h-[46px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          )}

          {/* STATE 5: Profile Complete, Under Review by Management */}
          {user && isVerified && !profileLoading && isProfileComplete && !editingProfile && approvalStatus === 'pending' && (
            <div className="space-y-5">
              {/* Prominent Under-Review Status Header with Illustrative Icon */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30 p-5 flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock className="h-7 w-7" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <ClipboardCheck className="h-4 w-4 shrink-0" />
                    <span>حالة الحساب: قيد المراجعة من قبل الإدارة</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white leading-snug">
                    تم إتمام التسجيل — حسابك قيد المراجعة الآن
                  </h1>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    شكراً لتسجيل بياناتك الكاملة. طلبك قيد المراجعة حالياً من قبل إدارة العمليات ({OWNER_INFO.nameAr})، وسيتم فتح جميع أدوات المنصة تلقائياً فور اعتماد حسابك.
                  </p>
                </div>
              </div>

              {infoMsg && (
                <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 shrink-0" />
                  <span>{infoMsg}</span>
                </p>
              )}

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border-y border-zinc-100 dark:border-zinc-800 text-sm">
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">البريد المسجل</span>
                  <span className="font-latin text-xs font-semibold text-zinc-900 dark:text-white" dir="ltr">
                    {userProfile?.email || user.email}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">الاسم الكامل</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{userProfile?.displayName}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">الكود الوظيفي</span>
                  <span className="font-mono-nums text-xs font-bold text-red-700 dark:text-red-400" dir="ltr">
                    {userProfile?.employeeCode}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">رقم الهاتف</span>
                  <span className="font-mono-nums text-xs font-semibold text-zinc-900 dark:text-white" dir="ltr">
                    {userProfile?.phone}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">المسمى الوظيفي</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{userProfile?.jobTitle}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">القسم / خط الإنتاج</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{userProfile?.company}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>تعديل بياناتي</span>
                </button>

                <a
                  href={OWNER_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>تواصل مع {OWNER_INFO.nameAr} للتفعيل</span>
                </a>

                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800/70 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer mr-auto"
                >
                  <LogOut className="h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 6: Account Rejected */}
          {user && isVerified && !profileLoading && isProfileComplete && approvalStatus === 'rejected' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                    لم تتم الموافقة على تفعيل الحساب
                  </h1>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    حسابك (<span className="font-latin font-semibold" dir="ltr">{user.email}</span>) غير مصرح له بالدخول حالياً من إدارة العمليات. يرجى التواصل مع {OWNER_INFO.nameAr} أو تسجيل الخروج.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={OWNER_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>تواصل مع إدارة العمليات</span>
                </a>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}

          {/* Privacy Assurance Footer */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              منصة مغلقة ومؤمنة: لا يتم عرض أي أداة تشغيلية إلا بعد موافقة الحساب الرئيسي ({OWNER_INFO.email}).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
