import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ADMIN_EMAIL, DEFAULT_APPS, OWNER_INFO } from '../data/defaultApps';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  PRODUCTION_LINE_CATALOG,
  SCHEMA_LIMITS,
  type AccentColor,
  type ActivityAction,
  type ActivityLog,
  type AppCategory,
  type AppItem,
  type ApprovalStatus,
  type BiometricDevice,
  type BroadcastNotification,
  type IconType,
  type InvitedUser,
  type NotificationReadReceipt,
  type NotificationTargetMode,
  type NotificationType,
  type ProductionMetric,
  type ProductionShift,
  type UserProfile,
  type UserRole,
} from '../types/platform';
import {
  getLocalBiometricBinding,
  isPlatformBiometricAvailable,
  isWebAuthnSupported,
  markBiometricSessionUnlocked,
  registerDeviceBiometricPasskey,
  saveLocalBiometricBinding,
  setBiometricLockState,
  shouldRequireBiometricUnlock,
  verifyDeviceBiometricPasskey,
  type LocalBiometricBinding,
} from '../utils/biometric';
import {
  detectPlatformInfo,
  dispatchDeviceNotification,
  sanitizeCustomFields,
  sanitizeEmailKey,
  sanitizeSlug,
} from '../utils/device';
import { doesUserMatchNotification } from '../utils/notifications';

export interface AppFormInput {
  id?: string;
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
}

export interface NotificationFormInput {
  title: string;
  body: string;
  type: NotificationType;
  targetAppUrl: string;
  targetAppTitle: string;
  targetMode: NotificationTargetMode;
  targetLines: string[];
  targetShifts: string[];
}

export interface ProfileUpdateInput {
  displayName: string;
  employeeCode: string;
  phone: string;
  jobTitle: string;
  company: string;
  notificationsEnabled: boolean;
}

export interface AdminUserEditInput {
  displayName: string;
  employeeCode: string;
  phone: string;
  jobTitle: string;
  company: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  adminNotes: string;
  customFields: Record<string, string>;
}

export interface InvitedUserInput extends AdminUserEditInput {
  email: string;
}

export interface ProductionMetricInput {
  id?: string;
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
  isActive?: boolean;
}

export interface ActiveToolSession {
  logId: string;
  uid: string;
  appId: string;
  appTitle: string;
  appTitleAr: string;
  startedAt: number;
  mode: 'launch' | 'embedded_launch';
  committedSeconds: number;
}

interface PlatformContextValue {
  authReady: boolean;
  profileLoading: boolean;
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isVerified: boolean;
  isProfileComplete: boolean;
  isApproved: boolean;
  pendingUsersCount: number;
  apps: AppItem[];
  appsFromFirestore: boolean;
  appsLoading: boolean;
  notifications: BroadcastNotification[];
  visibleNotifications: BroadcastNotification[];
  readNotificationIds: Set<string>;
  adminReadReceipts: NotificationReadReceipt[];
  unreadCount: number;
  latestToast: BroadcastNotification | null;
  dismissLatestToast: () => void;
  allUsers: UserProfile[];
  invitedUsers: InvitedUser[];
  activityLogs: ActivityLog[];
  activeToolSession: ActiveToolSession | null;
  activeEmbeddedApp: AppItem | null;
  openToolInPlatform: (app: AppItem) => void;
  openToolByRef: (url?: string, title?: string) => boolean;
  closeToolInPlatform: () => Promise<void>;
  biometricSupported: boolean;
  biometricAvailable: boolean;
  biometricDevices: BiometricDevice[];
  localBiometricBinding: LocalBiometricBinding | null;
  biometricLocked: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithBiometricPrompt: () => Promise<{ ok: boolean; error?: string }>;
  registerBiometricOnThisDevice: (deviceName?: string) => Promise<{ ok: boolean; error?: string }>;
  toggleBiometricLockOnStart: (enabled: boolean) => void;
  lockWithBiometrics: () => void;
  unlockWithBiometrics: () => Promise<{ ok: boolean; error?: string }>;
  removeBiometricDevice: (deviceId: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; needsVerification?: boolean }>;
  resendVerification: () => Promise<boolean>;
  refreshAuthUser: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  updateOwnProfile: (input: ProfileUpdateInput) => Promise<void>;
  updateUserApproval: (targetUid: string, status: ApprovalStatus) => Promise<void>;
  saveUserByAdmin: (targetUid: string, input: AdminUserEditInput) => Promise<void>;
  addOrUpdateInvitedUser: (input: InvitedUserInput) => Promise<'updated_existing' | 'saved_invited'>;
  removeInvitedUser: (emailKey: string) => Promise<void>;
  trackAppLaunch: (app: AppItem, mode?: 'launch' | 'embedded_launch') => void;
  finishActiveToolSession: () => Promise<void>;
  logInstantAction: (
    appId: string,
    appTitle: string,
    action: Extract<
      ActivityAction,
      'copy_link' | 'profile_update' | 'notification_read' | 'biometric_unlock'
    >,
    details: string
  ) => void;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  saveApp: (input: AppFormInput) => Promise<void>;
  removeApp: (appId: string) => Promise<void>;
  seedDefaultApps: () => Promise<void>;
  sendBroadcastNotification: (input: NotificationFormInput) => Promise<void>;
  toggleNotificationActive: (notification: BroadcastNotification) => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
  productionMetrics: ProductionMetric[];
  productionMetricsLoading: boolean;
  saveProductionMetric: (input: ProductionMetricInput) => Promise<void>;
  removeProductionMetric: (metricId: string) => Promise<void>;
  seedSampleProductionMetrics: () => Promise<number>;
}

const SESSION_STORAGE_KEY = 'fresh_ops_active_session_v1';

const PlatformContext = createContext<PlatformContextValue | null>(null);

function hasCompleteProfileFields(fields: {
  displayName?: string;
  employeeCode?: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
}): boolean {
  return (
    (fields.displayName || '').trim().length >= SCHEMA_LIMITS.USER_NAME_MIN &&
    (fields.employeeCode || '').trim().length >= SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MIN &&
    (fields.phone || '').trim().length >= SCHEMA_LIMITS.USER_PHONE_MIN &&
    (fields.jobTitle || '').trim().length >= SCHEMA_LIMITS.USER_JOB_MIN &&
    (fields.company || '').trim().length >= SCHEMA_LIMITS.USER_COMPANY_MIN
  );
}

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [firestoreApps, setFirestoreApps] = useState<AppItem[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [adminAppsReady, setAdminAppsReady] = useState(false);
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [adminReadReceipts, setAdminReadReceipts] = useState<NotificationReadReceipt[]>([]);
  const [latestToast, setLatestToast] = useState<BroadcastNotification | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [productionMetrics, setProductionMetrics] = useState<ProductionMetric[]>([]);
  const [productionMetricsLoading, setProductionMetricsLoading] = useState(false);
  const [activeToolSession, setActiveToolSession] = useState<ActiveToolSession | null>(null);
  const [activeEmbeddedApp, setActiveEmbeddedApp] = useState<AppItem | null>(null);
  const [biometricSupported] = useState(() => isWebAuthnSupported());
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricDevices, setBiometricDevices] = useState<BiometricDevice[]>([]);
  const [localBiometricBinding, setLocalBiometricBinding] = useState<LocalBiometricBinding | null>(
    () => getLocalBiometricBinding()
  );
  const [biometricLocked, setBiometricLocked] = useState(false);

  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const initialNotifLoadRef = useRef(true);
  const seededOnceRef = useRef(false);
  const activeSessionRef = useRef<ActiveToolSession | null>(null);
  const wentAwayRef = useRef(false);
  const userProfileRef = useRef<UserProfile | null>(null);

  const isVerified = Boolean(user && user.emailVerified);
  const isAdmin = Boolean(
    isVerified && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  const isProfileComplete = useMemo(() => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return Boolean(userProfile.profileCompleted) && hasCompleteProfileFields(userProfile);
  }, [isAdmin, userProfile]);

  const isApproved = useMemo(() => {
    if (isAdmin) return true;
    return Boolean(
      isVerified &&
        isProfileComplete &&
        userProfile?.approvalStatus === 'approved'
    );
  }, [isAdmin, isVerified, isProfileComplete, userProfile]);

  const persistSessionState = useCallback((session: ActiveToolSession | null) => {
    activeSessionRef.current = session;
    setActiveToolSession(session);
    try {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures in private frames
    }
  }, []);

  const commitSessionDuration = useCallback(
    async (session: ActiveToolSession, finalize: boolean) => {
      if (!user || session.uid !== user.uid) return;
      const totalElapsed = Math.max(
        1,
        Math.min(
          SCHEMA_LIMITS.MAX_SESSION_SECONDS,
          Math.round((Date.now() - session.startedAt) / 1000)
        )
      );
      const delta = Math.max(0, totalElapsed - session.committedSeconds);

      try {
        await updateDoc(doc(db, 'activityLogs', session.logId), {
          durationSeconds: totalElapsed,
          sessionStatus: finalize ? 'completed' : 'active',
          updatedAt: serverTimestamp(),
        });

        if (delta > 0) {
          await updateDoc(doc(db, 'users', user.uid), {
            totalDurationSeconds: increment(delta),
            platformInfo: detectPlatformInfo().slice(0, 100),
            lastActiveAt: serverTimestamp(),
          });
        }

        if (!finalize && activeSessionRef.current?.logId === session.logId) {
          persistSessionState({
            ...session,
            committedSeconds: totalElapsed,
          });
        }
      } catch {
        // Non-blocking telemetry update if user switched quickly or offline
      }
    },
    [persistSessionState, user]
  );

  const finishActiveToolSession = useCallback(async () => {
    const current = activeSessionRef.current;
    if (!current) return;
    wentAwayRef.current = false;
    persistSessionState(null);
    await commitSessionDuration(current, true);
  }, [commitSessionDuration, persistSessionState]);

  // Check device biometric hardware availability on mount
  useEffect(() => {
    let active = true;
    void isPlatformBiometricAvailable().then((available) => {
      if (active) setBiometricAvailable(available);
    });
    return () => {
      active = false;
    };
  }, []);

  // 1. Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        setBiometricLocked(shouldRequireBiometricUnlock(firebaseUser.uid));
      } else {
        setBiometricLocked(false);
        setUserProfile(null);
        userProfileRef.current = null;
        setProfileLoading(false);
        setFirestoreApps([]);
        setNotifications([]);
        setReadNotificationIds(new Set());
        setAdminReadReceipts([]);
        setBiometricDevices([]);
        setAllUsers([]);
        setInvitedUsers([]);
        setActivityLogs([]);
        setProductionMetrics([]);
        setProductionMetricsLoading(false);
        persistSessionState(null);
        initialNotifLoadRef.current = true;
        seenNotifIdsRef.current.clear();
      }
    });
    return () => unsub();
  }, [persistSessionState]);

  // Recover unfinished session if user closed/reloaded tab after returning
  useEffect(() => {
    if (!authReady || !user || !isVerified || !isApproved) return;
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ActiveToolSession;
      if (parsed && parsed.uid === user.uid && parsed.logId && parsed.startedAt) {
        const ageSec = Math.round((Date.now() - parsed.startedAt) / 1000);
        if (ageSec >= 2 && ageSec <= SCHEMA_LIMITS.MAX_SESSION_SECONDS) {
          void commitSessionDuration(parsed, true);
        }
      }
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore corrupt storage
    }
  }, [authReady, user, isVerified, isApproved, commitSessionDuration]);

  // Track external-tab return & embedded periodic checkpoints
  useEffect(() => {
    if (!activeToolSession) return;

    if (activeToolSession.mode === 'launch') {
      const handleLeave = () => {
        if (document.visibilityState === 'hidden' || !document.hasFocus()) {
          wentAwayRef.current = true;
        }
      };
      const handleReturn = () => {
        const current = activeSessionRef.current;
        if (!current || current.mode !== 'launch') return;
        const elapsed = Math.round((Date.now() - current.startedAt) / 1000);
        if (wentAwayRef.current && elapsed >= 3 && document.visibilityState === 'visible') {
          void finishActiveToolSession();
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') handleLeave();
        else handleReturn();
      };

      window.addEventListener('blur', handleLeave);
      window.addEventListener('focus', handleReturn);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('blur', handleLeave);
        window.removeEventListener('focus', handleReturn);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    const timer = window.setInterval(() => {
      const current = activeSessionRef.current;
      if (current && current.mode === 'embedded_launch') {
        void commitSessionDuration(current, false);
      }
    }, 30000);

    return () => window.clearInterval(timer);
  }, [activeToolSession, commitSessionDuration, finishActiveToolSession]);

  // 2. Sync Own User Profile Document (/users/{uid})
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    const platformInfo = detectPlatformInfo().slice(0, 100);
    const isAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const ensureUserProfile = async () => {
      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          let invitedData: Partial<InvitedUser> | null = null;
          if (!isAdminEmail && user.email) {
            try {
              const emailKey = sanitizeEmailKey(user.email);
              const invitedSnap = await getDoc(doc(db, 'invitedUsers', emailKey));
              if (invitedSnap.exists()) {
                invitedData = invitedSnap.data() as Partial<InvitedUser>;
              }
            } catch {
              // Ignore if no invited record exists
            }
          }

          const displayName = (
            invitedData?.displayName ||
            user.displayName ||
            (isAdminEmail ? OWNER_INFO.nameAr : user.email?.split('@')[0]) ||
            'مستخدم'
          ).slice(0, SCHEMA_LIMITS.USER_NAME_MAX);
          const employeeCode = (
            invitedData?.employeeCode ?? (isAdminEmail ? 'ADMIN-01' : '')
          ).slice(0, SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MAX);
          const phone = (
            invitedData?.phone ?? (isAdminEmail ? OWNER_INFO.phone : '')
          ).slice(0, SCHEMA_LIMITS.USER_PHONE_MAX);
          const jobTitle = (
            invitedData?.jobTitle ?? (isAdminEmail ? OWNER_INFO.roleAr : '')
          ).slice(0, SCHEMA_LIMITS.USER_JOB_MAX);
          const company = (
            invitedData?.company ?? (isAdminEmail ? OWNER_INFO.companyAr : '')
          ).slice(0, SCHEMA_LIMITS.USER_COMPANY_MAX);

          const complete = isAdminEmail
            ? true
            : hasCompleteProfileFields({
                displayName,
                employeeCode,
                phone,
                jobTitle,
                company,
              });

          const newProfile = {
            uid: user.uid,
            email: (user.email || '').slice(0, 150),
            displayName,
            employeeCode,
            phone,
            jobTitle,
            company,
            photoURL: (user.photoURL || '').slice(0, 500),
            role: isAdminEmail ? 'admin' : invitedData?.role === 'admin' ? 'admin' : 'user',
            approvalStatus: isAdminEmail
              ? 'approved'
              : invitedData?.approvalStatus || 'pending',
            profileCompleted: complete,
            notificationsEnabled:
              typeof Notification !== 'undefined' && Notification.permission === 'granted',
            platformInfo,
            totalLaunches: 0,
            totalDurationSeconds: 0,
            adminNotes: (invitedData?.adminNotes || '').slice(0, SCHEMA_LIMITS.ADMIN_NOTES_MAX),
            customFields: sanitizeCustomFields(invitedData?.customFields),
            lastActiveAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newProfile);
        } else {
          const existingData = snap.data() as Partial<UserProfile>;
          if (isAdminEmail) {
            if (
              existingData.role !== 'admin' ||
              existingData.approvalStatus !== 'approved' ||
              !existingData.profileCompleted ||
              typeof existingData.employeeCode !== 'string'
            ) {
              await updateDoc(userDocRef, {
                role: 'admin',
                approvalStatus: 'approved',
                profileCompleted: true,
                employeeCode: existingData.employeeCode?.trim()
                  ? existingData.employeeCode
                  : 'ADMIN-01',
                phone: existingData.phone?.trim() ? existingData.phone : OWNER_INFO.phone,
                jobTitle: existingData.jobTitle?.trim()
                  ? existingData.jobTitle
                  : OWNER_INFO.roleAr,
                company: existingData.company?.trim()
                  ? existingData.company
                  : OWNER_INFO.companyAr,
                platformInfo,
                lastActiveAt: serverTimestamp(),
              });
            } else {
              await updateDoc(userDocRef, {
                platformInfo,
                lastActiveAt: serverTimestamp(),
              });
            }
          } else if (
            !existingData.approvalStatus ||
            typeof existingData.profileCompleted !== 'boolean' ||
            typeof existingData.employeeCode !== 'string'
          ) {
            const existingCode = (existingData.employeeCode || '').trim();
            const hasCompleteFields = hasCompleteProfileFields({
              displayName: existingData.displayName,
              employeeCode: existingCode,
              phone: existingData.phone,
              jobTitle: existingData.jobTitle,
              company: existingData.company,
            });

            await updateDoc(userDocRef, {
              employeeCode: existingCode,
              approvalStatus: existingData.approvalStatus || 'pending',
              profileCompleted: hasCompleteFields,
              platformInfo,
              lastActiveAt: serverTimestamp(),
            });
          } else {
            await updateDoc(userDocRef, {
              platformInfo,
              lastActiveAt: serverTimestamp(),
            });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    };

    void ensureUserProfile();

    const unsubProfile = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as Partial<UserProfile>;
          const profileObj: UserProfile = {
            uid: raw.uid || user.uid,
            email: raw.email || user.email || '',
            displayName: raw.displayName || user.displayName || 'مستخدم',
            employeeCode: raw.employeeCode || '',
            phone: raw.phone || '',
            jobTitle: raw.jobTitle || '',
            company: raw.company || '',
            photoURL: raw.photoURL || '',
            role: raw.role === 'admin' ? 'admin' : 'user',
            approvalStatus: raw.approvalStatus || (isAdminEmail ? 'approved' : 'pending'),
            profileCompleted: Boolean(raw.profileCompleted),
            notificationsEnabled: Boolean(raw.notificationsEnabled),
            platformInfo: raw.platformInfo || platformInfo,
            totalLaunches: raw.totalLaunches ?? 0,
            totalDurationSeconds: raw.totalDurationSeconds ?? 0,
            adminNotes: raw.adminNotes || '',
            customFields: raw.customFields || {},
            biometricEnabled: Boolean(raw.biometricEnabled),
            lastActiveAt: raw.lastActiveAt ?? null,
            createdAt: raw.createdAt ?? null,
          };
          userProfileRef.current = profileObj;
          setUserProfile(profileObj);
          setProfileLoading(false);
        }
      },
      (error) => {
        setProfileLoading(false);
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    );

    return () => unsubProfile();
  }, [authReady, user, isVerified]);

  // 3. Apps Catalog Listener (STRICTLY LOCKED: Only runs for Admin or Admin-Approved Users)
  useEffect(() => {
    if (!authReady || !user || !isVerified || !isApproved) {
      setFirestoreApps([]);
      setAppsLoading(false);
      setAdminAppsReady(false);
      return;
    }

    setAppsLoading(true);
    setAdminAppsReady(false);
    const appsCol = collection(db, 'apps');
    const appsQuery = isAdmin ? query(appsCol) : query(appsCol, where('isActive', '==', true));

    const unsubApps = onSnapshot(
      appsQuery,
      (snapshot) => {
        const items: AppItem[] = snapshot.docs.map((d) => d.data() as AppItem);
        items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        setFirestoreApps(items);
        setAppsLoading(false);
        if (isAdmin) {
          setAdminAppsReady(true);
        }
      },
      (error) => {
        setAppsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'apps');
      }
    );

    return () => unsubApps();
  }, [authReady, user, isVerified, isApproved, isAdmin]);

  // 3b. Production Line Performance Metrics Listener (Firestore: /productionMetrics)
  useEffect(() => {
    if (!authReady || !user || !isVerified || !isApproved) {
      setProductionMetrics([]);
      setProductionMetricsLoading(false);
      return;
    }

    setProductionMetricsLoading(true);
    const metricsCol = collection(db, 'productionMetrics');
    const metricsQuery = isAdmin ? query(metricsCol) : query(metricsCol, where('isActive', '==', true));

    const unsubMetrics = onSnapshot(
      metricsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as ProductionMetric);
        list.sort((a, b) => {
          const dateDiff = b.date.localeCompare(a.date);
          if (dateDiff !== 0) return dateDiff;
          const ta = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
          const tb = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setProductionMetrics(list);
        setProductionMetricsLoading(false);
      },
      (error) => {
        setProductionMetricsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'productionMetrics');
      }
    );

    return () => unsubMetrics();
  }, [authReady, user, isVerified, isApproved, isAdmin]);

  // 4. Auto-seed Default Apps into Firestore on First Admin Login if Empty
  useEffect(() => {
    if (!isAdmin || !adminAppsReady || appsLoading || firestoreApps.length > 0 || seededOnceRef.current)
      return;
    seededOnceRef.current = true;
    void seedDefaultAppsInternal();
  }, [isAdmin, adminAppsReady, appsLoading, firestoreApps.length]);

  const seedDefaultAppsInternal = async () => {
    if (!user || !isAdmin) return;
    for (const appItem of DEFAULT_APPS) {
      const ref = doc(db, 'apps', appItem.id);
      try {
        const existingSnap = await getDoc(ref);
        if (existingSnap.exists()) {
          await updateDoc(ref, {
            title: appItem.title,
            titleAr: appItem.titleAr,
            description: appItem.description,
            url: appItem.url,
            category: appItem.category,
            iconType: appItem.iconType,
            iconName: appItem.iconName,
            iconUrl: appItem.iconUrl,
            accentColor: appItem.accentColor,
            order: appItem.order,
            isActive: appItem.isActive,
            featured: appItem.featured,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...appItem,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `apps/${appItem.id}`);
      }
    }
  };

  // 5. Broadcast Notifications Listener (STRICTLY LOCKED: Approved Users or Admin Only)
  useEffect(() => {
    if (!authReady || !user || !isVerified || !isApproved) {
      setNotifications([]);
      return;
    }

    const notifCol = collection(db, 'notifications');
    const notifQuery = isAdmin ? query(notifCol) : query(notifCol, where('isActive', '==', true));

    const unsubNotifs = onSnapshot(
      notifQuery,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as BroadcastNotification);
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? Date.now();
          const tb = b.createdAt?.toMillis?.() ?? Date.now();
          return tb - ta;
        });

        if (initialNotifLoadRef.current) {
          list.forEach((n) => seenNotifIdsRef.current.add(n.id));
          initialNotifLoadRef.current = false;
        } else {
          for (const n of list) {
            if (n.isActive && !seenNotifIdsRef.current.has(n.id)) {
              seenNotifIdsRef.current.add(n.id);
              if (doesUserMatchNotification(userProfileRef.current, n, isAdmin)) {
                setLatestToast(n);
                void dispatchDeviceNotification(n.title, n.body);
              }
              break;
            }
          }
        }

        setNotifications(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    return () => unsubNotifs();
  }, [authReady, user, isVerified, isApproved, isAdmin]);

  // 5b. Read Receipts Listener (Only after userProfile exists and is approved)
  useEffect(() => {
    if (!authReady || !user || !isVerified || !isApproved || !userProfile) {
      setReadNotificationIds(new Set());
      return;
    }

    const readCol = collection(db, 'users', user.uid, 'readNotifications');
    const unsubRead = onSnapshot(
      readCol,
      (snapshot) => {
        const ids = new Set<string>();
        snapshot.docs.forEach((d) => ids.add(d.id));
        setReadNotificationIds(ids);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/readNotifications`);
      }
    );

    return () => unsubRead();
  }, [authReady, user, isVerified, isApproved, userProfile]);

  // 5c. User's Registered Biometric Devices Listener
  useEffect(() => {
    if (!authReady || !user || !isVerified || !isApproved || !userProfile) {
      setBiometricDevices([]);
      return;
    }

    const bioCol = collection(db, 'users', user.uid, 'biometricDevices');
    const unsubBio = onSnapshot(
      bioCol,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as BiometricDevice);
        list.sort((a, b) => {
          const ta = a.lastUsedAt?.toMillis?.() ?? 0;
          const tb = b.lastUsedAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setBiometricDevices(list);

        const local = getLocalBiometricBinding();
        if (local && local.uid === user.uid && !list.some((d) => d.id === local.deviceId)) {
          saveLocalBiometricBinding(null);
          setLocalBiometricBinding(null);
          setBiometricLocked(false);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/biometricDevices`);
      }
    );

    return () => unsubBio();
  }, [authReady, user, isVerified, isApproved, userProfile]);

  // 6. Admin-Only Listeners: All Users, Invited Users, Activity Logs & All Read Receipts
  useEffect(() => {
    if (!isAdmin) {
      setAllUsers([]);
      setInvitedUsers([]);
      setActivityLogs([]);
      setAdminReadReceipts([]);
      return;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersList = snapshot.docs.map((d) => {
          const raw = d.data() as Partial<UserProfile>;
          return {
            uid: raw.uid || d.id,
            email: raw.email || '',
            displayName: raw.displayName || 'مستخدم',
            employeeCode: raw.employeeCode || '',
            phone: raw.phone || '',
            jobTitle: raw.jobTitle || '',
            company: raw.company || '',
            photoURL: raw.photoURL || '',
            role: raw.role === 'admin' ? 'admin' : 'user',
            approvalStatus: raw.approvalStatus || (raw.role === 'admin' ? 'approved' : 'pending'),
            profileCompleted: Boolean(raw.profileCompleted),
            notificationsEnabled: Boolean(raw.notificationsEnabled),
            platformInfo: raw.platformInfo || 'Web',
            totalLaunches: raw.totalLaunches ?? 0,
            totalDurationSeconds: raw.totalDurationSeconds ?? 0,
            adminNotes: raw.adminNotes || '',
            customFields: raw.customFields || {},
            biometricEnabled: Boolean(raw.biometricEnabled),
            lastActiveAt: raw.lastActiveAt ?? null,
            createdAt: raw.createdAt ?? null,
          } satisfies UserProfile;
        });
        usersList.sort((a, b) => {
          const ta = a.lastActiveAt?.toMillis?.() ?? 0;
          const tb = b.lastActiveAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setAllUsers(usersList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    const unsubInvited = onSnapshot(
      collection(db, 'invitedUsers'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as InvitedUser);
        list.sort((a, b) => {
          const ta = a.updatedAt?.toMillis?.() ?? 0;
          const tb = b.updatedAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setInvitedUsers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'invitedUsers');
      }
    );

    const logsQuery = query(
      collection(db, 'activityLogs'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    const unsubLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as ActivityLog) }));
        setActivityLogs(logs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'activityLogs');
      }
    );

    const unsubAllReads = onSnapshot(
      collectionGroup(db, 'readNotifications'),
      (snapshot) => {
        const receipts: NotificationReadReceipt[] = snapshot.docs.map((d) => {
          const raw = d.data() as { notificationId?: string; readAt?: NotificationReadReceipt['readAt'] };
          return {
            userId: d.ref.parent.parent?.id || '',
            notificationId: raw.notificationId || d.id,
            readAt: raw.readAt ?? null,
          };
        });
        setAdminReadReceipts(receipts);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'readNotifications');
      }
    );

    return () => {
      unsubUsers();
      unsubInvited();
      unsubLogs();
      unsubAllReads();
    };
  }, [isAdmin]);

  // Actions
  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithBiometricPrompt = async (): Promise<{ ok: boolean; error?: string }> => {
    const binding = getLocalBiometricBinding();
    if (!binding) {
      return { ok: false, error: 'لا يوجد جهاز مربوط بالبصمة على هذا المتصفح حالياً.' };
    }
    const verified = await verifyDeviceBiometricPasskey(binding.credentialId);
    if (!verified.ok) {
      return verified;
    }

    try {
      const hintedProvider = new GoogleAuthProvider();
      hintedProvider.setCustomParameters({ login_hint: binding.email });
      await signInWithPopup(auth, hintedProvider);
      markBiometricSessionUnlocked();
      setBiometricLocked(false);
      return { ok: true };
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        return { ok: false, error: 'تم التحقق من البصمة، لكن أُغلقت نافذة تأكيد Google قبل الإتمام.' };
      }
      return { ok: false, error: 'تم التحقق من البصمة، يرجى إكمال تأكيد حساب Google للدخول.' };
    }
  };

  const registerBiometricOnThisDevice = async (
    deviceName?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!user || !isVerified || !isApproved) {
      return { ok: false, error: 'يجب أن يكون الحساب مفعّلاً ومعتمداً لتسجيل البصمة.' };
    }
    const reg = await registerDeviceBiometricPasskey({
      uid: user.uid,
      email: user.email || '',
      displayName: userProfile?.displayName || user.displayName || user.email || 'عضو',
      deviceName,
    });
    if (!reg.ok) {
      return reg;
    }

    const deviceRef = doc(db, 'users', user.uid, 'biometricDevices', reg.deviceId);
    try {
      await setDoc(deviceRef, {
        id: reg.deviceId,
        credentialId: reg.credentialId,
        deviceName: reg.deviceName,
        platformInfo: reg.platformInfo,
        enabled: true,
        createdAt: serverTimestamp(),
        lastUsedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', user.uid), {
        biometricEnabled: true,
        platformInfo: reg.platformInfo,
        lastActiveAt: serverTimestamp(),
      });

      const newBinding: LocalBiometricBinding = {
        uid: user.uid,
        email: user.email || '',
        displayName: userProfile?.displayName || user.displayName || 'مستخدم',
        deviceId: reg.deviceId,
        credentialId: reg.credentialId,
        deviceName: reg.deviceName,
        platformInfo: reg.platformInfo,
        lockOnStart: true,
        registeredAt: Date.now(),
      };
      saveLocalBiometricBinding(newBinding);
      setLocalBiometricBinding(newBinding);
      markBiometricSessionUnlocked();
      setBiometricLocked(false);
      return { ok: true };
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `users/${user.uid}/biometricDevices/${reg.deviceId}`
      );
      return { ok: false, error: 'تعذر حفظ بيانات الجهاز البيومتري.' };
    }
  };

  const toggleBiometricLockOnStart = (enabled: boolean) => {
    const current = getLocalBiometricBinding();
    if (!current) return;
    const updated: LocalBiometricBinding = { ...current, lockOnStart: enabled };
    saveLocalBiometricBinding(updated);
    setLocalBiometricBinding(updated);
  };

  const lockWithBiometrics = () => {
    const current = getLocalBiometricBinding();
    if (!current || !user || current.uid !== user.uid) return;
    setActiveEmbeddedApp(null);
    setBiometricLockState(true);
    setBiometricLocked(true);
  };

  const unlockWithBiometrics = async (): Promise<{ ok: boolean; error?: string }> => {
    const current = getLocalBiometricBinding();
    if (!current || !user || current.uid !== user.uid) {
      setBiometricLocked(false);
      return { ok: true };
    }
    const res = await verifyDeviceBiometricPasskey(current.credentialId);
    if (!res.ok) {
      return res;
    }

    markBiometricSessionUnlocked();
    setBiometricLocked(false);

    try {
      await updateDoc(doc(db, 'users', user.uid, 'biometricDevices', current.deviceId), {
        platformInfo: detectPlatformInfo().slice(0, 100),
        lastUsedAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal if device doc was cleaned up
    }

    logInstantAction(
      'platform-biometric',
      current.deviceName,
      'biometric_unlock',
      `فتح الجلسة بالبصمة / الوجه عبر ${current.deviceName}`
    );
    return { ok: true };
  };

  const removeBiometricDevice = async (deviceId: string) => {
    if (!user || !isVerified) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'biometricDevices', deviceId));
      const remaining = biometricDevices.filter((d) => d.id !== deviceId);
      const local = getLocalBiometricBinding();
      if (local && local.deviceId === deviceId) {
        saveLocalBiometricBinding(null);
        setLocalBiometricBinding(null);
        setBiometricLocked(false);
      }
      if (remaining.length === 0) {
        await updateDoc(doc(db, 'users', user.uid), {
          biometricEnabled: false,
          platformInfo: detectPlatformInfo().slice(0, 100),
          lastActiveAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `users/${user.uid}/biometricDevices/${deviceId}`
      );
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { ok: true };
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        return {
          ok: false,
          error:
            'تسجيل الدخول بكلمة المرور غير مفعّل. يرجى تسجيل الدخول بحساب Google (Gmail).',
        };
      }
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
      }
      return { ok: false, error: 'تعذر تسجيل الدخول حالياً، يرجى استخدام حساب Google (Gmail).' };
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, {
          displayName: name.trim().slice(0, SCHEMA_LIMITS.USER_NAME_MAX),
        });
      }
      await sendEmailVerification(cred.user);
      return { ok: true, needsVerification: true };
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        return {
          ok: false,
          error: 'التسجيل بكلمة المرور غير مفعّل. يرجى الدخول بحساب Google (Gmail).',
        };
      }
      if (code === 'auth/email-already-in-use') {
        return {
          ok: false,
          error: 'هذا البريد الإلكتروني مسجل بالفعل، يمكنك تسجيل الدخول مباشرة.',
        };
      }
      if (code === 'auth/weak-password') {
        return { ok: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' };
      }
      return { ok: false, error: 'تعذر إنشاء الحساب، يرجى التحقق من البيانات والمحاولة مجدداً.' };
    }
  };

  const resendVerification = async () => {
    if (!auth.currentUser) return false;
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch {
      return false;
    }
  };

  const refreshAuthUser = async () => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser });
    return auth.currentUser.emailVerified;
  };

  const signOutUser = async () => {
    setActiveEmbeddedApp(null);
    await finishActiveToolSession();
    await signOut(auth);
  };

  const logInstantAction = useCallback(
    (
      appId: string,
      appTitle: string,
      action: Extract<
        ActivityAction,
        'copy_link' | 'profile_update' | 'notification_read' | 'biometric_unlock'
      >,
      details: string
    ) => {
      if (!user || !isVerified || !isApproved) return;
      const logId = `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const logRef = doc(db, 'activityLogs', logId);
      const deviceType = detectPlatformInfo().slice(0, 60);

      void setDoc(logRef, {
        userId: user.uid,
        userEmail: (user.email || '').slice(0, 150),
        userName: (
          userProfile?.displayName ||
          user.displayName ||
          user.email ||
          'User'
        ).slice(0, SCHEMA_LIMITS.USER_NAME_MAX),
        appId: sanitizeSlug(appId).slice(0, SCHEMA_LIMITS.APP_ID_MAX),
        appTitle: appTitle.slice(0, 100),
        deviceType,
        action,
        details: details.slice(0, SCHEMA_LIMITS.ACTIVITY_DETAILS_MAX),
        durationSeconds: 0,
        sessionStatus: 'instant',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        handleFirestoreError(error, OperationType.CREATE, `activityLogs/${logId}`);
      });
    },
    [isApproved, isVerified, user, userProfile?.displayName]
  );

  const updateOwnProfile = async (input: ProfileUpdateInput) => {
    if (!user || !isVerified) return;
    const ref = doc(db, 'users', user.uid);
    const cleanName = (input.displayName.trim() || 'مستخدم').slice(0, SCHEMA_LIMITS.USER_NAME_MAX);
    const cleanEmployeeCode = input.employeeCode
      .trim()
      .slice(0, SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MAX);
    const cleanPhone = input.phone.trim().slice(0, SCHEMA_LIMITS.USER_PHONE_MAX);
    const cleanJob = input.jobTitle.trim().slice(0, SCHEMA_LIMITS.USER_JOB_MAX);
    const cleanCompany = input.company.trim().slice(0, SCHEMA_LIMITS.USER_COMPANY_MAX);

    const complete = hasCompleteProfileFields({
      displayName: cleanName,
      employeeCode: cleanEmployeeCode,
      phone: cleanPhone,
      jobTitle: cleanJob,
      company: cleanCompany,
    });

    try {
      await updateDoc(ref, {
        displayName: cleanName,
        employeeCode: cleanEmployeeCode,
        phone: cleanPhone,
        jobTitle: cleanJob,
        company: cleanCompany,
        notificationsEnabled: input.notificationsEnabled,
        profileCompleted: isAdmin ? true : complete,
        ...(userProfile?.approvalStatus
          ? {}
          : { approvalStatus: isAdmin ? 'approved' : 'pending' }),
        platformInfo: detectPlatformInfo().slice(0, 100),
        lastActiveAt: serverTimestamp(),
      });
      if (isApproved) {
        logInstantAction(
          'platform-profile',
          'إدارة الحساب الشخصي',
          'profile_update',
          'تحديث البيانات الوظيفية والتنبيهات'
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateUserApproval = async (targetUid: string, status: ApprovalStatus) => {
    if (!isAdmin) return;
    const ref = doc(db, 'users', targetUid);
    try {
      const snap = await getDoc(ref);
      const raw = (snap.exists() ? snap.data() : {}) as Partial<UserProfile>;
      const cleanName =
        (raw.displayName || 'مستخدم').trim().slice(0, SCHEMA_LIMITS.USER_NAME_MAX) || 'مستخدم';
      const cleanEmployeeCode = (raw.employeeCode || '')
        .trim()
        .slice(0, SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MAX);
      const cleanPhone = (raw.phone || '').trim().slice(0, SCHEMA_LIMITS.USER_PHONE_MAX);
      const cleanJob = (raw.jobTitle || '').trim().slice(0, SCHEMA_LIMITS.USER_JOB_MAX);
      const cleanCompany = (raw.company || '').trim().slice(0, SCHEMA_LIMITS.USER_COMPANY_MAX);
      const hasCompleteFields = hasCompleteProfileFields({
        displayName: cleanName,
        employeeCode: cleanEmployeeCode,
        phone: cleanPhone,
        jobTitle: cleanJob,
        company: cleanCompany,
      });

      await updateDoc(ref, {
        displayName: cleanName,
        employeeCode: cleanEmployeeCode,
        phone: cleanPhone,
        jobTitle: cleanJob,
        company: cleanCompany,
        photoURL: (raw.photoURL || '').slice(0, 500),
        role: raw.role === 'admin' ? 'admin' : 'user',
        approvalStatus: status,
        profileCompleted: hasCompleteFields,
        notificationsEnabled: Boolean(raw.notificationsEnabled),
        platformInfo: (raw.platformInfo || 'Web').slice(0, 100),
        lastActiveAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const saveUserByAdmin = async (targetUid: string, input: AdminUserEditInput) => {
    if (!isAdmin) return;
    const ref = doc(db, 'users', targetUid);
    try {
      const snap = await getDoc(ref);
      const raw = (snap.exists() ? snap.data() : {}) as Partial<UserProfile>;
      const isPrimaryAdminAccount =
        (raw.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();

      const cleanName =
        input.displayName.trim().slice(0, SCHEMA_LIMITS.USER_NAME_MAX) || 'مستخدم';
      const cleanCode = input.employeeCode
        .trim()
        .slice(0, SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MAX);
      const cleanPhone = input.phone.trim().slice(0, SCHEMA_LIMITS.USER_PHONE_MAX);
      const cleanJob = input.jobTitle.trim().slice(0, SCHEMA_LIMITS.USER_JOB_MAX);
      const cleanCompany = input.company.trim().slice(0, SCHEMA_LIMITS.USER_COMPANY_MAX);
      const cleanNotes = input.adminNotes.trim().slice(0, SCHEMA_LIMITS.ADMIN_NOTES_MAX);
      const cleanCustomFields = sanitizeCustomFields(input.customFields);

      const complete = isPrimaryAdminAccount
        ? true
        : hasCompleteProfileFields({
            displayName: cleanName,
            employeeCode: cleanCode,
            phone: cleanPhone,
            jobTitle: cleanJob,
            company: cleanCompany,
          });

      await updateDoc(ref, {
        displayName: cleanName,
        employeeCode: cleanCode,
        phone: cleanPhone,
        jobTitle: cleanJob,
        company: cleanCompany,
        photoURL: (raw.photoURL || '').slice(0, 500),
        role: isPrimaryAdminAccount ? 'admin' : input.role,
        approvalStatus: isPrimaryAdminAccount ? 'approved' : input.approvalStatus,
        profileCompleted: complete,
        notificationsEnabled: Boolean(raw.notificationsEnabled),
        platformInfo: (raw.platformInfo || 'Web').slice(0, 100),
        adminNotes: cleanNotes,
        customFields: cleanCustomFields,
        lastActiveAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const addOrUpdateInvitedUser = async (
    input: InvitedUserInput
  ): Promise<'updated_existing' | 'saved_invited'> => {
    if (!user || !isAdmin) return 'saved_invited';
    const cleanEmail = input.email.trim().toLowerCase().slice(0, 150);
    const existingRegistered = allUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (existingRegistered) {
      await saveUserByAdmin(existingRegistered.uid, input);
      return 'updated_existing';
    }

    const emailKey = sanitizeEmailKey(cleanEmail);
    const ref = doc(db, 'invitedUsers', emailKey);
    const cleanName =
      input.displayName.trim().slice(0, SCHEMA_LIMITS.USER_NAME_MAX) || 'عضو جديد';
    const cleanCode = input.employeeCode
      .trim()
      .slice(0, SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MAX);
    const cleanPhone = input.phone.trim().slice(0, SCHEMA_LIMITS.USER_PHONE_MAX);
    const cleanJob = input.jobTitle.trim().slice(0, SCHEMA_LIMITS.USER_JOB_MAX);
    const cleanCompany = input.company.trim().slice(0, SCHEMA_LIMITS.USER_COMPANY_MAX);
    const cleanNotes = input.adminNotes.trim().slice(0, SCHEMA_LIMITS.ADMIN_NOTES_MAX);
    const cleanCustomFields = sanitizeCustomFields(input.customFields);

    try {
      const existingSnap = await getDoc(ref);
      if (existingSnap.exists()) {
        await updateDoc(ref, {
          email: cleanEmail,
          displayName: cleanName,
          employeeCode: cleanCode,
          phone: cleanPhone,
          jobTitle: cleanJob,
          company: cleanCompany,
          role: input.role,
          approvalStatus: input.approvalStatus,
          adminNotes: cleanNotes,
          customFields: cleanCustomFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: emailKey,
          email: cleanEmail,
          displayName: cleanName,
          employeeCode: cleanCode,
          phone: cleanPhone,
          jobTitle: cleanJob,
          company: cleanCompany,
          role: input.role,
          approvalStatus: input.approvalStatus,
          adminNotes: cleanNotes,
          customFields: cleanCustomFields,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return 'saved_invited';
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `invitedUsers/${emailKey}`);
    }
  };

  const removeInvitedUser = async (emailKey: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'invitedUsers', emailKey));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invitedUsers/${emailKey}`);
    }
  };

  const trackAppLaunch = (
    appItem: AppItem,
    mode: 'launch' | 'embedded_launch' = 'launch'
  ) => {
    if (!user || !isVerified || !isApproved) return;

    if (activeSessionRef.current) {
      void finishActiveToolSession();
    }

    const logId = `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const logRef = doc(db, 'activityLogs', logId);
    const userRef = doc(db, 'users', user.uid);
    const deviceType = detectPlatformInfo().slice(0, 60);

    const newSession: ActiveToolSession = {
      logId,
      uid: user.uid,
      appId: appItem.id.slice(0, SCHEMA_LIMITS.APP_ID_MAX),
      appTitle: appItem.title.slice(0, 100),
      appTitleAr: appItem.titleAr.slice(0, 120),
      startedAt: Date.now(),
      mode,
      committedSeconds: 0,
    };

    wentAwayRef.current = false;
    persistSessionState(newSession);

    void setDoc(logRef, {
      userId: user.uid,
      userEmail: (user.email || '').slice(0, 150),
      userName: (
        userProfile?.displayName ||
        user.displayName ||
        user.email ||
        'User'
      ).slice(0, SCHEMA_LIMITS.USER_NAME_MAX),
      appId: appItem.id.slice(0, SCHEMA_LIMITS.APP_ID_MAX),
      appTitle: appItem.title.slice(0, 100),
      deviceType,
      action: mode,
      details:
        mode === 'embedded_launch'
          ? `تشغيل ${appItem.titleAr} داخل المنصة`
          : `فتح ${appItem.titleAr} في تبويب جديد`,
      durationSeconds: 0,
      sessionStatus: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch((error) => {
      handleFirestoreError(error, OperationType.CREATE, `activityLogs/${logId}`);
    });

    void updateDoc(userRef, {
      totalLaunches: increment(1),
      platformInfo: detectPlatformInfo().slice(0, 100),
      lastActiveAt: serverTimestamp(),
    }).catch((error) => {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    });
  };

  const markNotificationRead = async (notificationId: string) => {
    if (!user || !isVerified || !isApproved) return;
    if (readNotificationIds.has(notificationId)) return;
    const receiptRef = doc(db, 'users', user.uid, 'readNotifications', notificationId);
    try {
      await setDoc(receiptRef, {
        notificationId,
        readAt: serverTimestamp(),
      });
      const notif = notifications.find((n) => n.id === notificationId);
      if (notif) {
        logInstantAction(
          'platform-notifications',
          notif.title.slice(0, 100),
          'notification_read',
          `تأكيد قراءة التوجيه: ${notif.title}`
        );
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `users/${user.uid}/readNotifications/${notificationId}`
      );
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user || !isVerified || !isApproved) return;
    const unread = visibleNotifications.filter((n) => !readNotificationIds.has(n.id));
    for (const n of unread) {
      await markNotificationRead(n.id);
    }
  };

  const saveApp = async (input: AppFormInput) => {
    if (!user || !isAdmin) return;
    const appId = input.id ? sanitizeSlug(input.id) : sanitizeSlug(input.title);
    const appRef = doc(db, 'apps', appId);
    const existing = firestoreApps.find((a) => a.id === appId);

    const payload = {
      id: appId,
      title: input.title.trim().slice(0, SCHEMA_LIMITS.APP_TITLE_MAX),
      titleAr: input.titleAr.trim().slice(0, SCHEMA_LIMITS.APP_TITLE_AR_MAX),
      description: input.description.trim().slice(0, SCHEMA_LIMITS.APP_DESC_MAX),
      url: input.url.trim().slice(0, SCHEMA_LIMITS.APP_URL_MAX),
      category: input.category,
      iconType: input.iconType,
      iconName: (input.iconName.trim() || 'Layers').slice(0, SCHEMA_LIMITS.ICON_NAME_MAX),
      iconUrl:
        input.iconType === 'image' ? input.iconUrl.trim().slice(0, SCHEMA_LIMITS.ICON_URL_MAX) : '',
      accentColor: input.accentColor,
      order: Math.max(0, Math.min(10000, Math.floor(Number(input.order) || 1))),
      isActive: Boolean(input.isActive),
      featured: Boolean(input.featured),
      updatedAt: serverTimestamp(),
    };

    try {
      if (existing) {
        await updateDoc(appRef, {
          title: payload.title,
          titleAr: payload.titleAr,
          description: payload.description,
          url: payload.url,
          category: payload.category,
          iconType: payload.iconType,
          iconName: payload.iconName,
          iconUrl: payload.iconUrl,
          accentColor: payload.accentColor,
          order: payload.order,
          isActive: payload.isActive,
          featured: payload.featured,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(appRef, {
          ...payload,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        existing ? OperationType.UPDATE : OperationType.CREATE,
        `apps/${appId}`
      );
    }
  };

  const removeApp = async (appId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'apps', appId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `apps/${appId}`);
    }
  };

  const seedDefaultApps = async () => {
    await seedDefaultAppsInternal();
  };

  const sendBroadcastNotification = async (input: NotificationFormInput) => {
    if (!user || !isAdmin) return;
    const notifId = `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const ref = doc(db, 'notifications', notifId);
    const cleanLines = input.targetLines
      .map((s) => s.trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, SCHEMA_LIMITS.TARGET_ITEMS_MAX);
    const cleanShifts = input.targetShifts
      .map((s) => s.trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, SCHEMA_LIMITS.TARGET_ITEMS_MAX);
    const effectiveMode: NotificationTargetMode =
      input.targetMode === 'targeted' && (cleanLines.length > 0 || cleanShifts.length > 0)
        ? 'targeted'
        : 'all';

    try {
      await setDoc(ref, {
        id: notifId,
        title: input.title.trim().slice(0, SCHEMA_LIMITS.NOTIF_TITLE_MAX),
        body: input.body.trim().slice(0, SCHEMA_LIMITS.NOTIF_BODY_MAX),
        type: input.type,
        targetAppUrl: input.targetAppUrl.trim().slice(0, SCHEMA_LIMITS.APP_URL_MAX),
        targetAppTitle: input.targetAppTitle.trim().slice(0, 100),
        senderName: `${OWNER_INFO.nameAr} — مدير إدارة العمليات`,
        targetMode: effectiveMode,
        targetLines: effectiveMode === 'targeted' ? cleanLines : [],
        targetShifts: effectiveMode === 'targeted' ? cleanShifts : [],
        isActive: true,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `notifications/${notifId}`);
    }
  };

  const toggleNotificationActive = async (notification: BroadcastNotification) => {
    if (!isAdmin) return;
    const ref = doc(db, 'notifications', notification.id);
    try {
      await updateDoc(ref, {
        isActive: !notification.isActive,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notification.id}`);
    }
  };

  const removeNotification = async (notificationId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${notificationId}`);
    }
  };

  const saveProductionMetric = async (input: ProductionMetricInput) => {
    if (!user || !isVerified || !isApproved) return;

    const cleanDate = SCHEMA_LIMITS.DATE_REGEX.test(input.date.trim())
      ? input.date.trim()
      : new Date().toISOString().slice(0, 10);
    const cleanLineId = sanitizeSlug(input.lineId || 'desert-cooler-1').slice(
      0,
      SCHEMA_LIMITS.METRIC_ID_MAX
    );
    const cleanLineName = (input.lineName.trim() || 'خط المبرد الصحراوي 1').slice(
      0,
      SCHEMA_LIMITS.METRIC_LINE_NAME_MAX
    );
    const targetUnits = Math.max(
      1,
      Math.min(SCHEMA_LIMITS.METRIC_UNITS_MAX, Math.round(Number(input.targetUnits) || 1))
    );
    const actualUnits = Math.max(
      0,
      Math.min(SCHEMA_LIMITS.METRIC_UNITS_MAX, Math.round(Number(input.actualUnits) || 0))
    );
    const defectUnits = Math.max(
      0,
      Math.min(SCHEMA_LIMITS.METRIC_UNITS_MAX, Math.round(Number(input.defectUnits) || 0))
    );
    const plannedMinutes = Math.max(
      1,
      Math.min(SCHEMA_LIMITS.METRIC_MINUTES_MAX, Math.round(Number(input.plannedMinutes) || 480))
    );
    const downtimeMinutes = Math.max(
      0,
      Math.min(SCHEMA_LIMITS.METRIC_MINUTES_MAX, Math.round(Number(input.downtimeMinutes) || 0))
    );
    const operatorsCount = Math.max(
      1,
      Math.min(SCHEMA_LIMITS.METRIC_OPERATORS_MAX, Math.round(Number(input.operatorsCount) || 1))
    );
    const notes = (input.notes || '').trim().slice(0, SCHEMA_LIMITS.METRIC_NOTES_MAX);
    const isActive = input.isActive !== undefined ? Boolean(input.isActive) : true;

    const metricId = input.id
      ? sanitizeSlug(input.id).slice(0, SCHEMA_LIMITS.METRIC_ID_MAX)
      : `pm_${cleanDate.replace(/-/g, '')}_${cleanLineId.slice(0, 20)}_${Math.random()
          .toString(36)
          .slice(2, 7)}`;

    const ref = doc(db, 'productionMetrics', metricId);
    const existing = productionMetrics.find((m) => m.id === metricId);
    const authorName = (
      userProfile?.displayName ||
      user.displayName ||
      user.email ||
      'مهندس عمليات'
    ).slice(0, SCHEMA_LIMITS.USER_NAME_MAX);

    try {
      if (existing) {
        await updateDoc(ref, {
          date: cleanDate,
          lineId: cleanLineId,
          lineName: cleanLineName,
          shift: input.shift,
          targetUnits,
          actualUnits,
          defectUnits,
          downtimeMinutes,
          plannedMinutes,
          operatorsCount,
          notes,
          isActive,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: metricId,
          date: cleanDate,
          lineId: cleanLineId,
          lineName: cleanLineName,
          shift: input.shift,
          targetUnits,
          actualUnits,
          defectUnits,
          downtimeMinutes,
          plannedMinutes,
          operatorsCount,
          notes,
          isActive,
          createdBy: user.uid,
          createdByName: authorName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        existing ? OperationType.UPDATE : OperationType.CREATE,
        `productionMetrics/${metricId}`
      );
    }
  };

  const removeProductionMetric = async (metricId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'productionMetrics', metricId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `productionMetrics/${metricId}`);
    }
  };

  const seedSampleProductionMetrics = async (): Promise<number> => {
    if (!user || !isAdmin) return 0;
    const authorName = (
      userProfile?.displayName ||
      user.displayName ||
      OWNER_INFO.nameAr
    ).slice(0, SCHEMA_LIMITS.USER_NAME_MAX);

    const shifts: ProductionShift[] = ['الوردية الصباحية', 'الوردية المسائية'];
    let count = 0;

    for (let daysAgo = 9; daysAgo >= 0; daysAgo--) {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const dateStr = d.toISOString().slice(0, 10);

      for (const line of PRODUCTION_LINE_CATALOG) {
        for (let sIdx = 0; sIdx < shifts.length; sIdx++) {
          const shift = shifts[sIdx];
          const shiftFactor = sIdx === 0 ? 1 : 0.88;
          const targetUnits = Math.round(line.defaultTarget * shiftFactor);
          const wave = Math.sin((daysAgo + 1) * 0.9 + sIdx + line.id.length) * 0.08;
          const actualUnits = Math.max(
            0,
            Math.round(targetUnits * (0.94 + wave))
          );
          const defectUnits = Math.max(
            1,
            Math.round(actualUnits * (0.015 + Math.abs(wave) * 0.12))
          );
          const downtimeMinutes = Math.max(
            5,
            Math.round(18 + ((daysAgo * 7 + line.id.length * 5 + sIdx * 11) % 35))
          );
          const metricId = `pm_${dateStr.replace(/-/g, '')}_${line.id}_s${sIdx + 1}`;
          const ref = doc(db, 'productionMetrics', metricId);

          try {
            const existingSnap = await getDoc(ref);
            if (!existingSnap.exists()) {
              await setDoc(ref, {
                id: metricId,
                date: dateStr,
                lineId: line.id,
                lineName: line.name,
                shift,
                targetUnits,
                actualUnits,
                defectUnits,
                downtimeMinutes,
                plannedMinutes: 480,
                operatorsCount: line.id.includes('sub') ? 22 : 16,
                notes:
                  downtimeMinutes > 38
                    ? 'تبديل خامات وضبط جودة بداية الوردية'
                    : 'تشغيل مستقر ضمن زمن التاكت المستهدف',
                isActive: true,
                createdBy: user.uid,
                createdByName: authorName,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              count += 1;
            }
          } catch (error) {
            handleFirestoreError(
              error,
              OperationType.WRITE,
              `productionMetrics/${metricId}`
            );
          }
        }
      }
    }
    return count;
  };

  const appsFromFirestore = isApproved && firestoreApps.length > 0;
  const effectiveApps = useMemo(() => {
    if (!isApproved) return [];
    if (firestoreApps.length > 0) return firestoreApps;
    return DEFAULT_APPS;
  }, [isApproved, firestoreApps]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter(
      (n) => n.isActive && doesUserMatchNotification(userProfile, n, isAdmin)
    );
  }, [notifications, userProfile, isAdmin]);

  const unreadCount = useMemo(() => {
    return visibleNotifications.filter((n) => !readNotificationIds.has(n.id)).length;
  }, [visibleNotifications, readNotificationIds]);

  const pendingUsersCount = useMemo(() => {
    return allUsers.filter((u) => u.role !== 'admin' && u.approvalStatus === 'pending').length;
  }, [allUsers]);

  const openToolInPlatform = useCallback(
    (appItem: AppItem) => {
      if (!isApproved || biometricLocked) return;
      if (!isAdmin && !appItem.isActive) return;
      setActiveEmbeddedApp(appItem);
      trackAppLaunch(appItem, 'embedded_launch');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isApproved, biometricLocked, isAdmin, user, isVerified, userProfile]
  );

  const openToolByRef = useCallback(
    (url?: string, title?: string): boolean => {
      if (!isApproved || biometricLocked) return false;
      const cleanUrl = (url || '').trim();
      const cleanTitle = (title || '').trim().toLowerCase();
      const matched = effectiveApps.find((a) => {
        if (!isAdmin && !a.isActive) return false;
        if (cleanUrl && a.url.trim() === cleanUrl) return true;
        if (cleanTitle && a.title.trim().toLowerCase() === cleanTitle) return true;
        return false;
      });
      if (!matched) return false;
      openToolInPlatform(matched);
      return true;
    },
    [effectiveApps, isApproved, biometricLocked, isAdmin, openToolInPlatform]
  );

  const closeToolInPlatform = useCallback(async () => {
    setActiveEmbeddedApp(null);
    await finishActiveToolSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value: PlatformContextValue = {
    authReady,
    profileLoading,
    user,
    userProfile,
    isAdmin,
    isVerified,
    isProfileComplete,
    isApproved,
    pendingUsersCount,
    apps: effectiveApps,
    appsFromFirestore,
    appsLoading,
    notifications,
    visibleNotifications,
    readNotificationIds,
    adminReadReceipts,
    unreadCount,
    latestToast,
    dismissLatestToast: () => setLatestToast(null),
    allUsers,
    invitedUsers,
    activityLogs,
    activeToolSession,
    activeEmbeddedApp,
    openToolInPlatform,
    openToolByRef,
    closeToolInPlatform,
    biometricSupported,
    biometricAvailable,
    biometricDevices,
    localBiometricBinding,
    biometricLocked,
    signInWithGoogle,
    signInWithBiometricPrompt,
    registerBiometricOnThisDevice,
    toggleBiometricLockOnStart,
    lockWithBiometrics,
    unlockWithBiometrics,
    removeBiometricDevice,
    signInWithEmail,
    registerWithEmail,
    resendVerification,
    refreshAuthUser,
    signOutUser,
    updateOwnProfile,
    updateUserApproval,
    saveUserByAdmin,
    addOrUpdateInvitedUser,
    removeInvitedUser,
    trackAppLaunch,
    finishActiveToolSession,
    logInstantAction,
    markNotificationRead,
    markAllNotificationsRead,
    saveApp,
    removeApp,
    seedDefaultApps,
    sendBroadcastNotification,
    toggleNotificationActive,
    removeNotification,
    productionMetrics,
    productionMetricsLoading,
    saveProductionMetric,
    removeProductionMetric,
    seedSampleProductionMetrics,
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
