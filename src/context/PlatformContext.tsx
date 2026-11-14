import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
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
  SCHEMA_LIMITS,
  type AccentColor,
  type ActivityLog,
  type AppCategory,
  type AppItem,
  type BroadcastNotification,
  type IconType,
  type NotificationType,
  type UserProfile,
} from '../types/platform';
import { detectPlatformInfo, dispatchDeviceNotification, sanitizeSlug } from '../utils/device';

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
}

export interface ProfileUpdateInput {
  displayName: string;
  phone: string;
  jobTitle: string;
  company: string;
  notificationsEnabled: boolean;
}

interface PlatformContextValue {
  authReady: boolean;
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isVerified: boolean;
  apps: AppItem[];
  appsFromFirestore: boolean;
  appsLoading: boolean;
  notifications: BroadcastNotification[];
  readNotificationIds: Set<string>;
  unreadCount: number;
  latestToast: BroadcastNotification | null;
  dismissLatestToast: () => void;
  allUsers: UserProfile[];
  activityLogs: ActivityLog[];
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string; needsVerification?: boolean }>;
  resendVerification: () => Promise<boolean>;
  refreshAuthUser: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  updateOwnProfile: (input: ProfileUpdateInput) => Promise<void>;
  trackAppLaunch: (app: AppItem) => void;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  saveApp: (input: AppFormInput) => Promise<void>;
  removeApp: (appId: string) => Promise<void>;
  seedDefaultApps: () => Promise<void>;
  sendBroadcastNotification: (input: NotificationFormInput) => Promise<void>;
  toggleNotificationActive: (notification: BroadcastNotification) => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [firestoreApps, setFirestoreApps] = useState<AppItem[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [adminAppsReady, setAdminAppsReady] = useState(false);
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [latestToast, setLatestToast] = useState<BroadcastNotification | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const initialNotifLoadRef = useRef(true);
  const seededOnceRef = useRef(false);

  const isVerified = Boolean(user && user.emailVerified);
  const isAdmin = Boolean(
    isVerified && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  // 1. Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setUserProfile(null);
        setNotifications([]);
        setReadNotificationIds(new Set());
        setAllUsers([]);
        setActivityLogs([]);
        initialNotifLoadRef.current = true;
        seenNotifIdsRef.current.clear();
      }
    });
    return () => unsub();
  }, []);

  // 2. Sync Own User Profile Document (/users/{uid})
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setUserProfile(null);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const platformInfo = detectPlatformInfo();

    const ensureUserProfile = async () => {
      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const newProfile = {
            uid: user.uid,
            email: (user.email || '').slice(0, 150),
            displayName: (user.displayName || user.email?.split('@')[0] || 'مستخدم').slice(0, SCHEMA_LIMITS.USER_NAME_MAX),
            phone: '',
            jobTitle: '',
            company: '',
            photoURL: (user.photoURL || '').slice(0, 500),
            role: user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
            notificationsEnabled: typeof Notification !== 'undefined' && Notification.permission === 'granted',
            platformInfo: platformInfo.slice(0, 100),
            totalLaunches: 0,
            lastActiveAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newProfile);
        } else {
          await updateDoc(userDocRef, {
            platformInfo: platformInfo.slice(0, 100),
            lastActiveAt: serverTimestamp(),
          });
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
          setUserProfile(snap.data() as UserProfile);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    );

    return () => unsubProfile();
  }, [authReady, user, isVerified]);

  // 3. Apps Catalog Listener (Active apps for all; All apps for Admin)
  useEffect(() => {
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
  }, [isAdmin]);

  // 4. Auto-seed Default Apps into Firestore on First Admin Login if Empty
  useEffect(() => {
    if (!isAdmin || !adminAppsReady || appsLoading || firestoreApps.length > 0 || seededOnceRef.current) return;
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

  // 5. Broadcast Notifications Listener (Verified Users)
  useEffect(() => {
    if (!authReady || !user || !isVerified) return;

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
              setLatestToast(n);
              void dispatchDeviceNotification(n.title, n.body, n.targetAppUrl || undefined);
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
  }, [authReady, user, isVerified, isAdmin]);

  // 5b. Read Receipts Listener (Only after userProfile exists)
  useEffect(() => {
    if (!authReady || !user || !isVerified || !userProfile) return;

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
  }, [authReady, user, isVerified, userProfile]);

  // 6. Admin-Only Listeners: All Users & Activity Logs
  useEffect(() => {
    if (!isAdmin) {
      setAllUsers([]);
      setActivityLogs([]);
      return;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersList = snapshot.docs.map((d) => d.data() as UserProfile);
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

    const logsQuery = query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(80));
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

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, [isAdmin]);

  // Actions
  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
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
            'تسجيل الدخول بكلمة المرور غير مفعّل بعد في Firebase Console (Authentication → Sign-in method → Email/Password). يمكنك تسجيل الدخول فوراً بحساب Google.',
        };
      }
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
      }
      return { ok: false, error: 'تعذر تسجيل الدخول حالياً، يرجى المحاولة مجدداً أو استخدام حساب Google.' };
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim().slice(0, SCHEMA_LIMITS.USER_NAME_MAX) });
      }
      await sendEmailVerification(cred.user);
      return { ok: true, needsVerification: true };
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        return {
          ok: false,
          error:
            'التسجيل بكلمة المرور غير مفعّل بعد في Firebase Console (Authentication → Sign-in method → Email/Password). يمكنك الدخول فوراً بحساب Google.',
        };
      }
      if (code === 'auth/email-already-in-use') {
        return { ok: false, error: 'هذا البريد الإلكتروني مسجل بالفعل، يمكنك تسجيل الدخول مباشرة.' };
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
    await signOut(auth);
  };

  const updateOwnProfile = async (input: ProfileUpdateInput) => {
    if (!user || !isVerified) return;
    const ref = doc(db, 'users', user.uid);
    try {
      await updateDoc(ref, {
        displayName: (input.displayName.trim() || 'مستخدم').slice(0, SCHEMA_LIMITS.USER_NAME_MAX),
        phone: input.phone.trim().slice(0, SCHEMA_LIMITS.USER_PHONE_MAX),
        jobTitle: input.jobTitle.trim().slice(0, SCHEMA_LIMITS.USER_JOB_MAX),
        company: input.company.trim().slice(0, SCHEMA_LIMITS.USER_COMPANY_MAX),
        notificationsEnabled: input.notificationsEnabled,
        platformInfo: detectPlatformInfo().slice(0, 100),
        lastActiveAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const trackAppLaunch = (appItem: AppItem) => {
    if (!user || !isVerified) return;
    const logId = `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const logRef = doc(db, 'activityLogs', logId);
    const userRef = doc(db, 'users', user.uid);
    const deviceType = detectPlatformInfo().slice(0, 60);

    void setDoc(logRef, {
      userId: user.uid,
      userEmail: (user.email || '').slice(0, 150),
      userName: (userProfile?.displayName || user.displayName || user.email || 'User').slice(0, SCHEMA_LIMITS.USER_NAME_MAX),
      appId: appItem.id.slice(0, SCHEMA_LIMITS.APP_ID_MAX),
      appTitle: appItem.title.slice(0, 100),
      deviceType,
      createdAt: serverTimestamp(),
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
    if (!user || !isVerified) return;
    if (readNotificationIds.has(notificationId)) return;
    const receiptRef = doc(db, 'users', user.uid, 'readNotifications', notificationId);
    try {
      await setDoc(receiptRef, {
        notificationId,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/readNotifications/${notificationId}`);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user || !isVerified) return;
    const unread = notifications.filter((n) => n.isActive && !readNotificationIds.has(n.id));
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
      iconUrl: input.iconType === 'image' ? input.iconUrl.trim().slice(0, SCHEMA_LIMITS.ICON_URL_MAX) : '',
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
      handleFirestoreError(error, existing ? OperationType.UPDATE : OperationType.CREATE, `apps/${appId}`);
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

    try {
      await setDoc(ref, {
        id: notifId,
        title: input.title.trim().slice(0, SCHEMA_LIMITS.NOTIF_TITLE_MAX),
        body: input.body.trim().slice(0, SCHEMA_LIMITS.NOTIF_BODY_MAX),
        type: input.type,
        targetAppUrl: input.targetAppUrl.trim().slice(0, SCHEMA_LIMITS.APP_URL_MAX),
        targetAppTitle: input.targetAppTitle.trim().slice(0, 100),
        senderName: `${OWNER_INFO.nameAr} — مدير إدارة العمليات`,
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

  const appsFromFirestore = firestoreApps.length > 0;
  const effectiveApps = useMemo(() => {
    if (firestoreApps.length > 0) return firestoreApps;
    return DEFAULT_APPS;
  }, [firestoreApps]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.isActive && !readNotificationIds.has(n.id)).length;
  }, [notifications, readNotificationIds]);

  const value: PlatformContextValue = {
    authReady,
    user,
    userProfile,
    isAdmin,
    isVerified,
    apps: effectiveApps,
    appsFromFirestore,
    appsLoading,
    notifications,
    readNotificationIds,
    unreadCount,
    latestToast,
    dismissLatestToast: () => setLatestToast(null),
    allUsers,
    activityLogs,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resendVerification,
    refreshAuthUser,
    signOutUser,
    updateOwnProfile,
    trackAppLaunch,
    markNotificationRead,
    markAllNotificationsRead,
    saveApp,
    removeApp,
    seedDefaultApps,
    sendBroadcastNotification,
    toggleNotificationActive,
    removeNotification,
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
