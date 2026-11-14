import React, { useState } from 'react';
import { ArrowUpLeft, Bell, BellRing, CheckCheck, ShieldAlert } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { OWNER_INFO } from '../data/defaultApps';
import { NOTIFICATION_TYPE_LABELS } from '../types/platform';
import { canUseBrowserNotifications, requestNotificationPermission } from '../utils/device';

interface NotificationsViewProps {
  onOpenAuth: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onOpenAuth }) => {
  const {
    isVerified,
    notifications,
    readNotificationIds,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    userProfile,
    updateOwnProfile,
  } = usePlatform();

  const [permState, setPermState] = useState<string>(
    canUseBrowserNotifications() ? Notification.permission : 'unsupported'
  );

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    setPermState(res);
    if (res === 'granted' && userProfile) {
      await updateOwnProfile({
        displayName: userProfile.displayName,
        phone: userProfile.phone,
        jobTitle: userProfile.jobTitle,
        company: userProfile.company,
        notificationsEnabled: true,
      });
    }
  };

  if (!isVerified) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-12 text-center max-w-xl mx-auto my-8">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
          <Bell className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-white">
          سجّل دخولك لاستقبال توجيهات وإشعارات المصنع
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          عند تسجيل الدخول ببريدك الإلكتروني، ستصلك تنبيهات فورية من {OWNER_INFO.nameAr} ({OWNER_INFO.roleAr}) عند نشر تعليمات تشغيلية أو تحديثات جديدة.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="mt-6 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
        >
          <span>تسجيل الدخول الآن</span>
        </button>
      </div>
    );
  }

  const activeNotifications = notifications.filter((n) => n.isActive);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header & Mark All Read */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            مركز إشعارات وتوجيهات العمليات
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            التعليمات والتحديثات الموجهة لفريق مصنع المبرد الصحراوي والميكروويف — غير مقروء:{' '}
            <span className="font-mono-nums font-bold text-red-600 dark:text-red-400">{unreadCount}</span>
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllNotificationsRead()}
            className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <CheckCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>تحديد الكل كمقروء</span>
          </button>
        )}
      </div>

      {/* Device Push Notification Permission Banner */}
      {permState !== 'granted' && permState !== 'unsupported' && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <BellRing className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                تفعيل تنبيهات الجهاز الفورية (Windows / Android / iOS)
              </h3>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {permState === 'denied'
                  ? 'تم حظر الإشعارات من إعدادات المتصفح. يمكنك إعادة تفعيلها من أيقونة القفل بجانب رابط الموقع.'
                  : `اسمح للمتصفح بعرض الإشعارات ليصلك تنبيه مباشر فور صدور توجيه جديد من ${OWNER_INFO.nameAr}.`}
              </p>
            </div>
          </div>
          {permState !== 'denied' && (
            <button
              type="button"
              onClick={() => void handleEnablePush()}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              تفعيل الإشعارات
            </button>
          )}
        </div>
      )}

      {/* Notifications List */}
      {activeNotifications.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <Bell className="h-8 w-8 text-zinc-400 mx-auto" />
          <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-white">
            لا توجد إشعارات حالياً
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            ستظهر هنا جميع التوجيهات التشغيلية وإطلاقات الأدوات فور نشرها من إدارة العمليات.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeNotifications.map((notif) => {
            const isRead = readNotificationIds.has(notif.id);
            const dateLabel = notif.createdAt?.toDate
              ? notif.createdAt.toDate().toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'الآن';

            return (
              <article
                key={notif.id}
                onClick={() => void markNotificationRead(notif.id)}
                className={`rounded-2xl border p-5 transition-colors cursor-pointer ${
                  isRead
                    ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                    : 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-red-700 dark:text-red-400">
                        {NOTIFICATION_TYPE_LABELS[notif.type]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{notif.senderName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums">{dateLabel}</span>
                      {!isRead && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-red-600 dark:text-red-400">جديد</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      {notif.type === 'urgent' && (
                        <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                      )}
                      <span>{notif.title}</span>
                    </h3>

                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                      {notif.body}
                    </p>
                  </div>

                  {notif.targetAppUrl && (
                    <a
                      href={notif.targetAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        void markNotificationRead(notif.id);
                      }}
                      className="min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-600 dark:hover:bg-red-500 transition-colors whitespace-nowrap shrink-0 self-start"
                    >
                      <span>{notif.targetAppTitle || 'فتح الأداة'}</span>
                      <ArrowUpLeft className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
