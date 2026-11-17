import type { Timestamp } from 'firebase/firestore';

export type AppCategory = 'lean' | 'quality' | 'production' | 'training' | 'ai' | 'other';
export type IconType = 'lucide' | 'image';
export type AccentColor = 'red' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate';
export type UserRole = 'user' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type NotificationType = 'announcement' | 'new_app' | 'update' | 'urgent';
export type ActivityAction =
  | 'launch'
  | 'embedded_launch'
  | 'copy_link'
  | 'profile_update'
  | 'notification_read'
  | 'biometric_unlock';
export type SessionStatus = 'active' | 'completed' | 'instant';
export type NotificationTargetMode = 'all' | 'targeted';
export type ProductionShift = 'الوردية الصباحية' | 'الوردية المسائية' | 'الوردية الليلية';

export interface ProductionLineOption {
  id: string;
  name: string;
  shortName: string;
  defaultTarget: number;
  color: string;
}

export const PRODUCTION_LINE_CATALOG: readonly ProductionLineOption[] = [
  {
    id: 'desert-cooler-1',
    name: 'خط المبرد الصحراوي 1',
    shortName: 'مبرد صحراوي 1',
    defaultTarget: 420,
    color: '#DC2626',
  },
  {
    id: 'desert-cooler-2',
    name: 'خط المبرد الصحراوي 2',
    shortName: 'مبرد صحراوي 2',
    defaultTarget: 380,
    color: '#EA580C',
  },
  {
    id: 'microwave-1',
    name: 'خط الميكروويف 1',
    shortName: 'ميكروويف 1',
    defaultTarget: 520,
    color: '#2563EB',
  },
  {
    id: 'microwave-2',
    name: 'خط الميكروويف 2',
    shortName: 'ميكروويف 2',
    defaultTarget: 460,
    color: '#0D9488',
  },
  {
    id: 'sub-assembly',
    name: 'خط التجميع الفرعي',
    shortName: 'التجميع الفرعي',
    defaultTarget: 650,
    color: '#7C3AED',
  },
] as const;

export const DEFAULT_PRODUCTION_LINES = [
  'خط المبرد الصحراوي',
  'خط الميكروويف',
  'الجودة',
  'الصيانة',
  'الهندسة الصناعية',
  'المخازن واللوجستيات',
] as const;

export const DEFAULT_SHIFTS = [
  'الوردية الصباحية',
  'الوردية المسائية',
  'الوردية الليلية',
] as const;

export const SCHEMA_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  URL_REGEX: /^https?:\/\/.+/,
  DATE_REGEX: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
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
  ADMIN_NOTES_MAX: 1000,
  CUSTOM_FIELDS_MAX: 25,
  CUSTOM_KEY_MAX: 60,
  CUSTOM_VALUE_MAX: 200,
  ACTIVITY_DETAILS_MAX: 300,
  MAX_SESSION_SECONDS: 28800,
  NOTIF_TITLE_MAX: 120,
  NOTIF_BODY_MAX: 1000,
  TARGET_ITEMS_MAX: 10,
  METRIC_ID_MAX: 64,
  METRIC_LINE_NAME_MAX: 100,
  METRIC_NOTES_MAX: 300,
  METRIC_UNITS_MAX: 100000,
  METRIC_MINUTES_MAX: 1440,
  METRIC_OPERATORS_MAX: 500,
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
  totalDurationSeconds?: number;
  adminNotes?: string;
  customFields?: Record<string, string>;
  biometricEnabled?: boolean;
  lastActiveAt?: Timestamp | null;
  createdAt?: Timestamp | null;
}

export interface InvitedUser {
  id: string;
  email: string;
  displayName: string;
  employeeCode: string;
  phone: string;
  jobTitle: string;
  company: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  adminNotes: string;
  customFields: Record<string, string>;
  createdBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  targetAppUrl: string;
  targetAppTitle: string;
  senderName: string;
  targetMode?: NotificationTargetMode;
  targetLines?: string[];
  targetShifts?: string[];
  isActive: boolean;
  createdAt?: Timestamp | null;
}

export interface NotificationReadReceipt {
  userId: string;
  notificationId: string;
  readAt?: Timestamp | null;
}

export interface BiometricDevice {
  id: string;
  credentialId: string;
  deviceName: string;
  platformInfo: string;
  enabled: boolean;
  createdAt?: Timestamp | null;
  lastUsedAt?: Timestamp | null;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  appId: string;
  appTitle: string;
  deviceType: string;
  action?: ActivityAction;
  details?: string;
  durationSeconds?: number;
  sessionStatus?: SessionStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
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

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  launch: 'تشغيل الأداة (نافذة خارجية)',
  embedded_launch: 'تشغيل الأداة (داخل المنصة)',
  copy_link: 'نسخ رابط الأداة',
  profile_update: 'تحديث بيانات الحساب',
  notification_read: 'قراءة توجيه إداري',
  biometric_unlock: 'دخول بيومتري بالبصمة / الوجه',
};

export interface ProductionMetric {
  id: string;
  date: string;
  lineId: string;
  lineName: string;
  shift: ProductionShift;
  targetUnits: number;
  actualUnits: number;
  defectUnits: number;
  downtimeMinutes: number;
  plannedMinutes: number;
  operatorsCount: number;
  notes: string;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}
