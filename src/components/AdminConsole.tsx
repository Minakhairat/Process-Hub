import React, { useState } from 'react';
import {
  Activity,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { usePlatform, type AppFormInput } from '../context/PlatformContext';
import { OWNER_INFO } from '../data/defaultApps';
import {
  APPROVAL_STATUS_LABELS,
  CATEGORY_LABELS,
  NOTIFICATION_TYPE_LABELS,
  SCHEMA_LIMITS,
  type AccentColor,
  type AppCategory,
  type AppItem,
  type ApprovalStatus,
  type NotificationType,
} from '../types/platform';
import { AppIcon, AVAILABLE_ICONS, ICON_REGISTRY, type IconKey } from './AppIcon';

type AdminTab = 'apps' | 'broadcast' | 'users';

const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: 'red', label: 'أحمر فريش' },
  { value: 'rose', label: 'قرمزي' },
  { value: 'slate', label: 'رمادي صناعي' },
  { value: 'emerald', label: 'أخضر جودة' },
  { value: 'amber', label: 'كهرماني' },
  { value: 'blue', label: 'أزرق هندسي' },
  { value: 'indigo', label: 'نيلي' },
];

const EMPTY_FORM: AppFormInput = {
  title: '',
  titleAr: '',
  description: '',
  url: 'https://',
  category: 'lean',
  iconType: 'lucide',
  iconName: 'Layers',
  iconUrl: '',
  accentColor: 'red',
  order: 9,
  isActive: true,
  featured: false,
};

export const AdminConsole: React.FC = () => {
  const {
    isAdmin,
    apps,
    appsFromFirestore,
    allUsers,
    pendingUsersCount,
    activityLogs,
    notifications,
    saveApp,
    removeApp,
    seedDefaultApps,
    sendBroadcastNotification,
    toggleNotificationActive,
    removeNotification,
    updateUserApproval,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<AdminTab>('apps');
  const [form, setForm] = useState<AppFormInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingApp, setSavingApp] = useState(false);
  const [appStatusMsg, setAppStatusMsg] = useState('');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  // Broadcast notification state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifType, setNotifType] = useState<NotificationType>('announcement');
  const [notifAppId, setNotifAppId] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSentMsg, setNotifSentMsg] = useState('');

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center max-w-lg mx-auto my-8">
        <p className="text-base font-bold text-zinc-900 dark:text-white">
          هذه المنطقة مخصصة لمدير إدارة العمليات فقط
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          تسجيل الدخول بحساب {OWNER_INFO.nameAr} مطلوب للوصول إلى إدارة أدوات المصنع وسجل النشاط.
        </p>
      </div>
    );
  }

  const handleEditApp = (app: AppItem) => {
    setEditingId(app.id);
    setForm({
      id: app.id,
      title: app.title,
      titleAr: app.titleAr,
      description: app.description,
      url: app.url,
      category: app.category,
      iconType: app.iconType,
      iconName: app.iconName,
      iconUrl: app.iconUrl || '',
      accentColor: app.accentColor,
      order: app.order,
      isActive: app.isActive,
      featured: app.featured,
    });
    setAppStatusMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.titleAr.trim() || !form.description.trim() || !SCHEMA_LIMITS.URL_REGEX.test(form.url.trim())) {
      setAppStatusMsg('يرجى التأكد من ملء اسم التطبيق والوصف ورابط صحيح يبدأ بـ https://');
      return;
    }
    setSavingApp(true);
    setAppStatusMsg('');
    await saveApp({
      ...form,
      id: editingId || undefined,
    });
    setSavingApp(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM, order: apps.length + 1 });
    setAppStatusMsg('تم حفظ الأداة وتحديث قاعدة بيانات المصنع بنجاح.');
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setSendingNotif(true);
    setNotifSentMsg('');
    const linkedApp = apps.find((a) => a.id === notifAppId);
    await sendBroadcastNotification({
      title: notifTitle,
      body: notifBody,
      type: notifType,
      targetAppUrl: linkedApp?.url || '',
      targetAppTitle: linkedApp?.title || '',
    });
    setSendingNotif(false);
    setNotifTitle('');
    setNotifBody('');
    setNotifAppId('');
    setNotifSentMsg('تم بث التوجيه لجميع فريق المصنع بنجاح.');
  };

  const pendingUsers = allUsers.filter(
    (u) => u.role !== 'admin' && u.approvalStatus === 'pending'
  );

  const handleApprovalChange = async (uid: string, status: ApprovalStatus) => {
    setUpdatingUid(uid);
    try {
      await updateUserApproval(uid, status);
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Summary Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            غرفة إدارة العمليات — {OWNER_INFO.nameAr}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {OWNER_INFO.roleAr} · {OWNER_INFO.companyAr}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('apps')}
            className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'apps'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>الأدوات ({apps.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('broadcast')}
            className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>بث توجيه</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>
              الفريق ({allUsers.length})
              {pendingUsersCount > 0 ? ` · ${pendingUsersCount} طلب` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Pending Approvals Callout when on another tab */}
      {pendingUsersCount > 0 && activeTab !== 'users' && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                يوجد <span className="font-mono-nums">{pendingUsersCount}</span> حساب بانتظار موافقتك للدخول
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                راجع بيانات الأعضاء الجدد وقم بتفعيل أو رفض الحسابات من تبويب الفريق.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            مراجعة طلبات القبول
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">طلبات بانتظار الموافقة</p>
          <p className="mt-1 text-2xl font-extrabold font-mono-nums text-amber-600 dark:text-amber-400">
            {pendingUsersCount}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">الأدوات المسجلة</p>
          <p className="mt-1 text-2xl font-extrabold font-mono-nums text-red-600 dark:text-red-400">
            {apps.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">فريق العمل المسجل</p>
          <p className="mt-1 text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
            {allUsers.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">عمليات التشغيل المسجلة</p>
          <p className="mt-1 text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
            {activityLogs.length}
          </p>
        </div>
      </div>

      {/* TAB 1: MANAGE APPS */}
      {activeTab === 'apps' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add / Edit App Form */}
          <form
            onSubmit={(e) => void handleSaveApp(e)}
            className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {editingId ? 'تعديل بيانات الأداة' : 'إضافة أداة تشغيلية جديدة'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  اسم الأداة (English)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  maxLength={SCHEMA_LIMITS.APP_TITLE_MAX}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Kaizen Tracker"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  الاسم بالعربية
                </label>
                <input
                  type="text"
                  required
                  maxLength={SCHEMA_LIMITS.APP_TITLE_AR_MAX}
                  value={form.titleAr}
                  onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                  placeholder="مثال: متابعة خطوط المبرد"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                رابط التطبيق (URL)
              </label>
              <input
                type="url"
                dir="ltr"
                required
                maxLength={SCHEMA_LIMITS.APP_URL_MAX}
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
                className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                شرح مبسط للأداة
              </label>
              <textarea
                rows={3}
                required
                maxLength={SCHEMA_LIMITS.APP_DESC_MAX}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="اشرح باختصار دور الأداة في عمليات المصنع..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 p-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  التصنيف
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as AppCategory })}
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  الترتيب
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            {/* Icon Configuration */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  أيقونة الأداة
                </span>
                <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, iconType: 'lucide' })}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      form.iconType === 'lucide'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500'
                    }`}
                  >
                    أيقونة جاهزة
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, iconType: 'image' })}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      form.iconType === 'image'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500'
                    }`}
                  >
                    رابط صورة
                  </button>
                </div>
              </div>

              {form.iconType === 'lucide' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-6 gap-1.5">
                    {AVAILABLE_ICONS.map(({ key, label }) => {
                      const IconComp = ICON_REGISTRY[key as IconKey];
                      const selected = form.iconName === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          title={label}
                          onClick={() => setForm({ ...form, iconName: key })}
                          className={`min-h-[40px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                            selected
                              ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <IconComp className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      لون الأيقونة
                    </label>
                    <select
                      value={form.accentColor}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value as AccentColor })}
                      className="w-full min-h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
                    >
                      {ACCENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    رابط صورة الأيقونة (PNG / SVG / JPG)
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    maxLength={SCHEMA_LIMITS.ICON_URL_MAX}
                    value={form.iconUrl}
                    onChange={(e) => setForm({ ...form, iconUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <AppIcon
                  iconType={form.iconType}
                  iconName={form.iconName}
                  iconUrl={form.iconUrl}
                  accentColor={form.accentColor}
                  alt={form.title || 'معاينة'}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate font-latin">
                    {form.title || 'معاينة الأيقونة'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{form.titleAr || 'العنوان بالعربية'}</p>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 accent-red-600 rounded"
              />
              <span>ظاهر للجميع في المنصة</span>
            </label>

            {appStatusMsg && (
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {appStatusMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={savingApp}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              <span>{savingApp ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة الأداة للمنصة'}</span>
            </button>
          </form>

          {/* Existing Apps Table / List */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                الأدوات الحالية ({apps.length})
              </h2>

              <button
                type="button"
                onClick={() => void seedDefaultApps()}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{appsFromFirestore ? 'مزامنة الأدوات الأساسية (8)' : 'حفظ الأدوات الأساسية في Firebase'}</span>
              </button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {apps.map((app) => (
                <div key={app.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AppIcon
                      iconType={app.iconType}
                      iconName={app.iconName}
                      iconUrl={app.iconUrl}
                      accentColor={app.accentColor}
                      alt={app.title}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-mono-nums">#{app.order}</span>
                        <span aria-hidden="true">·</span>
                        <span>{app.isActive ? 'نشط' : 'مخفي'}</span>
                      </div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate font-latin">
                        {app.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {app.titleAr}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditApp(app)}
                      className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>تعديل</span>
                    </button>

                    {confirmDeleteId === app.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            void removeApp(app.id);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(app.id)}
                        aria-label={`حذف ${app.title}`}
                        className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl border border-red-200 dark:border-red-800/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BROADCAST NOTIFICATIONS */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={(e) => void handleSendNotification(e)}
            className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              بث إشعار فوري لفريق المصنع
            </h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                نوع الإشعار
              </label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value as NotificationType)}
                className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
              >
                {Object.entries(NOTIFICATION_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                عنوان الإشعار
              </label>
              <input
                type="text"
                required
                maxLength={SCHEMA_LIMITS.NOTIF_TITLE_MAX}
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="مثال: تعليمات تشغيل الوردية الصباحية لخط الميكروويف"
                className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                نص التوجيه أو الإعلان
              </label>
              <textarea
                rows={4}
                required
                maxLength={SCHEMA_LIMITS.NOTIF_BODY_MAX}
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder="اكتب تفاصيل التوجيه الذي سيصل لجميع مهندسي ومشرفي المصنع..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 p-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                ربط بأداة تشغيلية (اختياري)
              </label>
              <select
                value={notifAppId}
                onChange={(e) => setNotifAppId(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
              >
                <option value="">بدون رابط أداة</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.titleAr})
                  </option>
                ))}
              </select>
            </div>

            {notifSentMsg && (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{notifSentMsg}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={sendingNotif}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              <span>{sendingNotif ? 'جاري الإرسال...' : 'إرسال التوجيه للجميع'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              سجل الإشعارات المرسلة ({notifications.length})
            </h2>

            {notifications.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
                لم يتم إرسال أي إشعارات بعد.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {notifications.map((n) => (
                  <div key={n.id} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {NOTIFICATION_TYPE_LABELS[n.type]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{n.isActive ? 'ظاهر للفريق' : 'مؤرشف'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{n.title}</h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{n.body}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void toggleNotificationActive(n)}
                        title={n.isActive ? 'أرشفة' : 'تفعيل'}
                        className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        {n.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeNotification(n.id)}
                        title="حذف الإشعار"
                        className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl border border-red-200 dark:border-red-800/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRIVACY-PROTECTED USERS, APPROVALS & ACTIVITY */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Pending Approvals Queue */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  طلبات الانضمام بانتظار موافقتك ({pendingUsers.length})
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  لن يتمكن أي مستخدم جديد من فتح أو رؤية التطبيقات حتى تقوم بقبول حسابه من هنا.
                </p>
              </div>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                لا توجد طلبات معلقة حالياً.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pendingUsers.map((u) => {
                  const busyUser = updatingUid === u.uid;
                  return (
                    <div
                      key={u.uid}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            بانتظار الموافقة
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {u.profileCompleted ? 'مكتمل البيانات' : 'لم يستكمل بياناته بعد'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-nums">{u.platformInfo || 'Web'}</span>
                        </div>

                        <p className="text-base font-bold text-zinc-900 dark:text-white">
                          {u.displayName}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                          <span className="font-mono-nums font-bold text-red-700 dark:text-red-400" dir="ltr">
                            كود: {u.employeeCode || '—'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-latin" dir="ltr">{u.email}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-nums" dir="ltr">{u.phone || 'بدون هاتف'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{u.jobTitle || 'بدون مسمى'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{u.company || 'بدون قسم'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busyUser}
                          onClick={() => void handleApprovalChange(u.uid, 'approved')}
                          className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <Check className="h-4 w-4" />
                          <span>قبول وتفعيل</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyUser}
                          onClick={() => void handleApprovalChange(u.uid, 'rejected')}
                          className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-800/70 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <X className="h-4 w-4" />
                          <span>رفض</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Users Directory */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  قائمة فريق المصنع المسجلين (مرئية لمدير العمليات فقط)
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  تخضع لسياسة حماية الخصوصية — يمكنك تفعيل أو إيقاف أي حساب في أي وقت
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-stone-50 dark:bg-zinc-950 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">الاسم</th>
                    <th className="py-3 px-4 font-semibold">الكود الوظيفي</th>
                    <th className="py-3 px-4 font-semibold">البريد الإلكتروني</th>
                    <th className="py-3 px-4 font-semibold">الهاتف</th>
                    <th className="py-3 px-4 font-semibold">الوظيفة / القسم</th>
                    <th className="py-3 px-4 font-semibold">حالة الحساب</th>
                    <th className="py-3 px-4 font-semibold">مرات الفتح</th>
                    <th className="py-3 px-4 font-semibold text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {allUsers.map((u) => {
                    const isMainAdmin = u.role === 'admin';
                    const busyUser = updatingUid === u.uid;
                    return (
                      <tr key={u.uid} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40">
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                          {u.displayName}
                        </td>
                        <td className="py-3 px-4 font-mono-nums text-xs font-bold text-red-700 dark:text-red-400 whitespace-nowrap" dir="ltr">
                          {u.employeeCode || '—'}
                        </td>
                        <td className="py-3 px-4 font-latin text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap" dir="ltr">
                          {u.email}
                        </td>
                        <td className="py-3 px-4 font-mono-nums text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap" dir="ltr">
                          {u.phone || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                          {[u.jobTitle, u.company].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          {isMainAdmin ? (
                            <span className="font-semibold text-red-700 dark:text-red-400">
                              الحساب الرئيسي
                            </span>
                          ) : (
                            <span
                              className={`font-semibold ${
                                u.approvalStatus === 'approved'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : u.approvalStatus === 'rejected'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {APPROVAL_STATUS_LABELS[u.approvalStatus || 'pending']}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono-nums font-bold text-zinc-900 dark:text-white">
                          {u.totalLaunches}
                        </td>
                        <td className="py-3 px-4 text-left whitespace-nowrap">
                          {isMainAdmin ? (
                            <span className="text-xs text-zinc-400">—</span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              {u.approvalStatus !== 'approved' && (
                                <button
                                  type="button"
                                  disabled={busyUser}
                                  onClick={() => void handleApprovalChange(u.uid, 'approved')}
                                  className="min-h-[34px] px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-60"
                                >
                                  قبول
                                </button>
                              )}
                              {u.approvalStatus !== 'rejected' && (
                                <button
                                  type="button"
                                  disabled={busyUser}
                                  onClick={() => void handleApprovalChange(u.uid, 'rejected')}
                                  className="min-h-[34px] px-3 py-1 rounded-lg border border-red-200 dark:border-red-800/70 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer disabled:opacity-60"
                                >
                                  {u.approvalStatus === 'approved' ? 'إيقاف' : 'رفض'}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {allUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-sm text-zinc-500">
                        لا يوجد مستخدمون مسجلون بعد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-600 dark:text-red-400" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                أحدث عمليات استخدام الأدوات
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-stone-50 dark:bg-zinc-950 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">المستخدم</th>
                    <th className="py-3 px-4 font-semibold">الأداة</th>
                    <th className="py-3 px-4 font-semibold">الجهاز</th>
                    <th className="py-3 px-4 font-semibold text-left">التوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {activityLogs.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40">
                      <td className="py-2.5 px-4 text-xs">
                        <span className="font-semibold text-zinc-900 dark:text-white">{log.userName}</span>{' '}
                        <span className="font-latin text-zinc-500">({log.userEmail})</span>
                      </td>
                      <td className="py-2.5 px-4 font-latin text-xs font-semibold text-red-700 dark:text-red-400 whitespace-nowrap">
                        {log.appTitle}
                      </td>
                      <td className="py-2.5 px-4 font-mono-nums text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {log.deviceType}
                      </td>
                      <td className="py-2.5 px-4 font-mono-nums text-xs text-zinc-500 text-left whitespace-nowrap">
                        {log.createdAt?.toDate
                          ? log.createdAt.toDate().toLocaleString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'الآن'}
                      </td>
                    </tr>
                  ))}
                  {activityLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                        سيظهر هنا سجل فتح الأدوات فور قيام فريق المصنع المسجلين بتشغيلها.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
