import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
} from 'lucide-react';
import { usePlatform, type AppFormInput } from '../context/PlatformContext';
import { OWNER_INFO } from '../data/defaultApps';
import {
  CATEGORY_LABELS,
  NOTIFICATION_TYPE_LABELS,
  SCHEMA_LIMITS,
  type AccentColor,
  type AppCategory,
  type AppItem,
  type NotificationTargetMode,
  type NotificationType,
} from '../types/platform';
import { formatDurationAr } from '../utils/device';
import {
  collectAvailableLines,
  collectAvailableShifts,
  computeNotificationReadAnalytics,
  describeNotificationAudience,
  doesUserMatchNotification,
} from '../utils/notifications';
import { AdminAnalyticsPanel } from './AdminAnalyticsPanel';
import { AdminUsersPanel } from './AdminUsersPanel';
import { AppIcon, AVAILABLE_ICONS, ICON_REGISTRY, type IconKey } from './AppIcon';

type AdminTab = 'analytics' | 'apps' | 'broadcast' | 'users';

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
    adminReadReceipts,
    saveApp,
    removeApp,
    seedDefaultApps,
    sendBroadcastNotification,
    toggleNotificationActive,
    removeNotification,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [form, setForm] = useState<AppFormInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingApp, setSavingApp] = useState(false);
  const [appStatusMsg, setAppStatusMsg] = useState('');

  // Broadcast notification state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifType, setNotifType] = useState<NotificationType>('announcement');
  const [notifAppId, setNotifAppId] = useState('');
  const [notifTargetMode, setNotifTargetMode] = useState<NotificationTargetMode>('all');
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [customLineInput, setCustomLineInput] = useState('');
  const [expandedNotifStatsId, setExpandedNotifStatsId] = useState<string | null>(null);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSentMsg, setNotifSentMsg] = useState('');

  const availableLines = useMemo(() => collectAvailableLines(allUsers), [allUsers]);
  const availableShifts = useMemo(() => collectAvailableShifts(allUsers), [allUsers]);

  const previewMatchedMembers = useMemo(() => {
    const approvedMembers = allUsers.filter(
      (u) => u.role !== 'admin' && u.approvalStatus === 'approved'
    );
    if (notifTargetMode !== 'targeted' || (selectedLines.length === 0 && selectedShifts.length === 0)) {
      return approvedMembers;
    }
    return approvedMembers.filter((u) =>
      doesUserMatchNotification(
        u,
        {
          id: 'preview',
          title: '',
          body: '',
          type: notifType,
          targetAppUrl: '',
          targetAppTitle: '',
          senderName: '',
          targetMode: 'targeted',
          targetLines: selectedLines,
          targetShifts: selectedShifts,
          isActive: true,
        },
        false
      )
    );
  }, [allUsers, notifTargetMode, selectedLines, selectedShifts, notifType]);

  const toggleLineSelection = (line: string) => {
    setSelectedLines((prev) =>
      prev.includes(line) ? prev.filter((item) => item !== line) : [...prev, line].slice(0, SCHEMA_LIMITS.TARGET_ITEMS_MAX)
    );
  };

  const toggleShiftSelection = (shift: string) => {
    setSelectedShifts((prev) =>
      prev.includes(shift) ? prev.filter((item) => item !== shift) : [...prev, shift].slice(0, SCHEMA_LIMITS.TARGET_ITEMS_MAX)
    );
  };

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
    const isTargeted =
      notifTargetMode === 'targeted' && (selectedLines.length > 0 || selectedShifts.length > 0);
    await sendBroadcastNotification({
      title: notifTitle,
      body: notifBody,
      type: notifType,
      targetAppUrl: linkedApp?.url || '',
      targetAppTitle: linkedApp?.title || '',
      targetMode: isTargeted ? 'targeted' : 'all',
      targetLines: isTargeted ? selectedLines : [],
      targetShifts: isTargeted ? selectedShifts : [],
    });
    setSendingNotif(false);
    setNotifTitle('');
    setNotifBody('');
    setNotifAppId('');
    setNotifTargetMode('all');
    setSelectedLines([]);
    setSelectedShifts([]);
    setNotifSentMsg(
      isTargeted
        ? 'تم إرسال التوجيه المستهدف للخطوط / الورديات المحددة بنجاح.'
        : 'تم بث التوجيه لجميع فريق المصنع بنجاح.'
    );
  };

  const totalPlatformDuration = allUsers.reduce(
    (sum, u) => sum + (u.totalDurationSeconds || 0),
    0
  );
  const totalPlatformLaunches = allUsers.reduce(
    (sum, u) => sum + (u.totalLaunches || 0),
    0
  );

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

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 self-start overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>التحليلات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>
              الحسابات ({allUsers.length})
              {pendingUsersCount > 0 ? ` · ${pendingUsersCount} طلب` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('apps')}
            className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
            className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>بث توجيه</span>
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
                راجع بيانات الأعضاء الجدد وقم بتفعيل أو رفض الحسابات من تبويب الحسابات.
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
          <p className="text-xs text-zinc-500 dark:text-zinc-400">فريق العمل المسجل</p>
          <p className="mt-1 text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
            {allUsers.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">إجمالي مرات الدخول</p>
          <p className="mt-1 text-2xl font-extrabold font-mono-nums text-red-600 dark:text-red-400">
            {totalPlatformLaunches || activityLogs.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">إجمالي وقت الاستخدام</p>
          <p className="mt-1 text-2xl font-extrabold font-mono-nums text-zinc-900 dark:text-white">
            {formatDurationAr(totalPlatformDuration)}
          </p>
        </div>
      </div>

      {/* TAB 0: OPERATIONS ANALYTICS */}
      {activeTab === 'analytics' && <AdminAnalyticsPanel />}

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

            {/* Audience Targeting (All vs Production Lines / Shifts) */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                الجمهور المستهدف
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
                <button
                  type="button"
                  onClick={() => setNotifTargetMode('all')}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    notifTargetMode === 'all'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  الجميع (كل المصنع)
                </button>
                <button
                  type="button"
                  onClick={() => setNotifTargetMode('targeted')}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    notifTargetMode === 'targeted'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  حسب الخط أو الوردية
                </button>
              </div>

              {notifTargetMode === 'targeted' && (
                <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 p-3.5">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      خطوط الإنتاج / الأقسام المستهدفة
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableLines.map((line) => {
                        const active = selectedLines.includes(line);
                        return (
                          <button
                            key={line}
                            type="button"
                            onClick={() => toggleLineSelection(line)}
                            className={`min-h-[34px] px-3 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              active
                                ? 'border-red-600 bg-red-600 text-white'
                                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-red-300'
                            }`}
                          >
                            {line}
                          </button>
                        );
                      })}
                      {selectedLines
                        .filter((l) => !availableLines.includes(l))
                        .map((customLine) => (
                          <button
                            key={customLine}
                            type="button"
                            onClick={() => toggleLineSelection(customLine)}
                            className="min-h-[34px] px-3 py-1 rounded-lg border border-red-600 bg-red-600 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {customLine} ×
                          </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customLineInput}
                        onChange={(e) => setCustomLineInput(e.target.value)}
                        placeholder="أو اكتب اسم خط / قسم آخر..."
                        className="flex-1 min-h-[36px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = customLineInput.trim();
                          if (clean && !selectedLines.includes(clean)) {
                            setSelectedLines((prev) =>
                              [...prev, clean].slice(0, SCHEMA_LIMITS.TARGET_ITEMS_MAX)
                            );
                          }
                          setCustomLineInput('');
                        }}
                        className="min-h-[36px] px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 cursor-pointer whitespace-nowrap"
                      >
                        إضافة
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      الورديات المستهدفة (اختياري)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableShifts.map((shift) => {
                        const active = selectedShifts.includes(shift);
                        return (
                          <button
                            key={shift}
                            type="button"
                            onClick={() => toggleShiftSelection(shift)}
                            className={`min-h-[34px] px-3 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              active
                                ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                            }`}
                          >
                            {shift}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 pt-1">
                    الأعضاء المطابقون حالياً:{' '}
                    <span className="font-mono-nums font-bold text-red-600 dark:text-red-400">
                      {previewMatchedMembers.length}
                    </span>{' '}
                    عضو معتمد
                  </p>
                </div>
              )}
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
              <span>
                {sendingNotif
                  ? 'جاري الإرسال...'
                  : notifTargetMode === 'targeted' && (selectedLines.length > 0 || selectedShifts.length > 0)
                    ? `إرسال للخطوط المحددة (${previewMatchedMembers.length})`
                    : 'إرسال التوجيه للجميع'}
              </span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              سجل الإشعارات ومتابعة القراءة لكل خط ({notifications.length})
            </h2>

            {notifications.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
                لم يتم إرسال أي إشعارات بعد.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {notifications.map((n) => {
                  const analytics = computeNotificationReadAnalytics(n, allUsers, adminReadReceipts);
                  const isExpanded = expandedNotifStatsId === n.id;

                  return (
                    <div key={n.id} className="py-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {NOTIFICATION_TYPE_LABELS[n.type]}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{n.isActive ? 'ظاهر للفريق' : 'مؤرشف'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-nums font-semibold text-emerald-700 dark:text-emerald-400">
                              القراءة: {analytics.totalRead}/{analytics.totalTargeted} ({analytics.overallPercentage}%)
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{n.title}</h4>
                          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                            المستهدف: {describeNotificationAudience(n)}
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{n.body}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedNotifStatsId((prev) => (prev === n.id ? null : n.id))
                            }
                            title="تتبع نسبة القراءة لكل خط"
                            className="min-h-[38px] inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
                          >
                            <span>حسب الخط</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

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

                      {isExpanded && (
                        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-900 dark:text-white">
                              تفصيل نسبة القراءة لكل خط إنتاج
                            </span>
                            <span className="font-mono-nums text-zinc-500 dark:text-zinc-400">
                              الإجمالي: {analytics.totalRead} من {analytics.totalTargeted}
                            </span>
                          </div>

                          {analytics.byLine.length === 0 ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              لا يوجد أعضاء معتمدون مطابقون لهذا النطاق حالياً.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {analytics.byLine.map((lineStat) => (
                                <div key={lineStat.lineName} className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-100">
                                      {lineStat.lineName}
                                    </span>
                                    <span className="font-mono-nums font-semibold text-zinc-700 dark:text-zinc-300">
                                      {lineStat.readCount}/{lineStat.totalTargeted} · {lineStat.percentage}%
                                    </span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-600 transition-all"
                                      style={{ width: `${lineStat.percentage}%` }}
                                    />
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    <span>
                                      قرأه:{' '}
                                      {lineStat.readers.length > 0
                                        ? lineStat.readers.map((r) => r.displayName).join('، ')
                                        : 'لا أحد بعد'}
                                    </span>
                                    {lineStat.nonReaders.length > 0 && (
                                      <span className="text-amber-700 dark:text-amber-400">
                                        لم يقرأ: {lineStat.nonReaders.map((r) => r.displayName).join('، ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FULL USERS MANAGEMENT & CUSTOM FIELDS */}
      {activeTab === 'users' && <AdminUsersPanel />}
    </div>
  );
};
