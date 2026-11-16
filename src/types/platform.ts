import type { Timestamp } from 'firebase/firestore';

export type AppCategory = 'lean' | 'quality' | 'production' | 'training' | 'ai' | 'other';
export type IconType = 'lucide' | 'image';
export type AccentColor = 'red' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate';
export type UserRole = 'user' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type NotificationType = 'announcement' | 'new_app' | 'update' | 'urgent';

export const SCHEMA_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  URL_REGEX: /^https?:\/\/.+/,
  APP_ID_MAX: 64,
  APP_TITLE_MAX: 100,
  APP_TITLE_AR_MAX: 120,
  APP_DESC_MAX: 400,
  APP_URL_MAX: 500,
  ICON_NAME_MAX: 60,
  ICON_URL_MAX: 1000,
  USER_NAME_MIN: 2,
  USER_NAME_MAX: 100,
  USER_EMPLOYEE_CODE_MIN: 1,
  USER_EMPLOYEE_CODE_MAX: 30,
  USER_PHONE_MIN: 8,
  USER_PHONE_MAX: 30,
  USER_JOB_MIN: 2,
  USER_JOB_MAX: 100,
  USER_COMPANY_MIN: 2,
  USER_COMPANY_MAX: 100,
  NOTIF_TITLE_MAX: 120,
  NOTIF_BODY_MAX: 1000,
} as const;

export interface AppItem {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  url: string;
  category: AppCategory;
  iconType: IconType;
  iconName: string;
  iconUrl: string;
  accentColor: AccentColor;
  order: number;
  isActive: boolean;
  featured: boolean;
  createdBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  employeeCode: string;
  phone: string;
  jobTitle: string;
  company: string;
  photoURL: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  profileCompleted: boolean;
  notificationsEnabled: boolean;
  platformInfo: string;
  totalLaunches: number;
  lastActiveAt?: Timestamp | null;
  createdAt?: Timestamp | null;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  targetAppUrl: string;
  targetAppTitle: string;
  senderName: string;
  isActive: boolean;
  createdAt?: Timestamp | null;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  appId: string;
  appTitle: string;
  deviceType: string;
  createdAt?: Timestamp | null;
}

export const CATEGORY_LABELS: Record<AppCategory, string> = {
  lean: 'أدوات اللين وتدفق القيمة',
  quality: 'الجودة والتدقيق 5S',
  production: 'تشغيل وموازنة الإنتاج',
  training: 'التدريب والمهارات',
  ai: 'حلول الذكاء الاصطناعي',
  other: 'أدوات هندسية أخرى',
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  announcement: 'إعلان عام',
  new_app: 'إضافة تطبيق جديد',
  update: 'تحديث أداة',
  urgent: 'تنبيه هام',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'بانتظار الموافقة',
  approved: 'مقبول ومفعل',
  rejected: 'مرفوض',
};
