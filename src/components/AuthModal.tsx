import React, { useState } from 'react';
import { CheckCircle2, Lock, Mail, RefreshCw, ShieldCheck, UserCheck, X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { OWNER_INFO } from '../data/defaultApps';
import { FreshLogo } from './FreshLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    isVerified,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resendVerification,
    refreshAuthUser,
  } = usePlatform();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setBusy(true);
    try {
      await signInWithGoogle();
      onClose();
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
        setErrorMsg('تعذر إتمام تسجيل الدخول عبر Google، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setBusy(true);
    if (mode === 'signin') {
      const res = await signInWithEmail(email, password);
      setBusy(false);
      if (!res.ok) {
        setErrorMsg(res.error || 'حدث خطأ أثناء تسجيل الدخول.');
        return;
      }
      onClose();
    } else {
      if (!name.trim()) {
        setBusy(false);
        setErrorMsg('يرجى إدخال الاسم الكامل.');
        return;
      }
      const res = await registerWithEmail(name, email, password);
      setBusy(false);
      if (!res.ok) {
        setErrorMsg(res.error || 'تعذر إنشاء الحساب.');
        return;
      }
      if (res.needsVerification) {
        setInfoMsg('تم إرسال رابط تأكيد البريد الإلكتروني. يرجى فتح بريدك والضغط على الرابط ثم الضغط على «تحقق من التفعيل».');
      }
    }
  };

  const handleVerifyCheck = async () => {
    setBusy(true);
    const verified = await refreshAuthUser();
    setBusy(false);
    if (verified) {
      onClose();
    } else {
      setErrorMsg('لم يتم تأكيد البريد الإلكتروني بعد. يرجى فتح رسالة التفعيل في بريدك الوارد.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <FreshLogo size="md" />
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                دخول فريق إدارة العمليات
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                مصنع المبرد الصحراوي والميكروويف — {OWNER_INFO.companyAr}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {user && !isVerified ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold">حسابك بانتظار تأكيد البريد الإلكتروني</p>
              <p className="mt-1 text-xs leading-relaxed">
                أرسلنا رسالة تفعيل إلى <span className="font-latin font-semibold">{user.email}</span>. افتح الرابط المرسل ثم اضغط على زر التحقق أدناه.
              </p>
            </div>
            {errorMsg && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">{errorMsg}</p>
            )}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleVerifyCheck()}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>تحقق من التفعيل الآن</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const sent = await resendVerification();
                  setInfoMsg(sent ? 'تم إعادة إرسال رسالة التفعيل.' : 'يرجى الانتظار قليلاً قبل إعادة الإرسال.');
                }}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>إعادة إرسال رابط التفعيل</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Primary 1-Click Google Email Login */}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleGoogleSignIn()}
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-3 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              <UserCheck className="h-4 w-4" />
              <span>الدخول السريع بحساب Google (البريد الموثق)</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              <span className="bg-white dark:bg-zinc-900 px-3 text-xs text-zinc-400 whitespace-nowrap">
                أو باستخدام البريد وكلمة المرور
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                حساب جديد
              </button>
            </div>

            <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: م. أحمد محمود"
                    className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@fresh.com.eg"
                    className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 pr-10 pl-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 pr-10 pl-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300 leading-relaxed">
                  {errorMsg}
                </p>
              )}

              {infoMsg && (
                <p className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  {infoMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[44px] rounded-xl border border-zinc-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                {busy
                  ? 'جاري المعالجة...'
                  : mode === 'signin'
                    ? 'دخول بالبريد الإلكتروني'
                    : 'إنشاء حساب جديد'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            خصوصية البيانات محمية: بياناتك لا تظهر لأي مستخدم آخر، وتقتصر صلاحية المتابعة على مدير إدارة العمليات بالمصنع ({OWNER_INFO.nameAr}) فقط.
          </p>
        </div>
      </div>
    </div>
  );
};
