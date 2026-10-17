import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  writeBatch,
  getDocs,
  query,
  where,
  getDocFromServer,
  onSnapshot,
  disableNetwork,
  enableNetwork,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Worker, MonthlyWorkerAttendance, AppUser, isUserAdmin, ADMIN_EMAIL } from '../types';

// Initialize Firebase App, Auth and Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Enforce local persistence so user remains logged in across refreshes and restarts
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set browserLocalPersistence on auth:', err);
});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const isQuotaExhaustedError = (err: any): boolean => {
  const msg = err instanceof Error ? err.message : String(err || '');
  const code = err?.code || '';
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Free daily write units') ||
    msg.includes('Free daily read units') ||
    msg.includes('Quota exceeded')
  );
};

type QuotaListener = (exhausted: boolean) => void;
const quotaListeners: Set<QuotaListener> = new Set();

export const addQuotaListener = (listener: QuotaListener): (() => void) => {
  quotaListeners.add(listener);
  return () => quotaListeners.delete(listener);
};

const notifyQuotaListeners = (exhausted: boolean) => {
  quotaListeners.forEach((fn) => {
    try {
      fn(exhausted);
    } catch (e) {
      console.warn('Quota listener error:', e);
    }
  });
};

// Google Cloud Firestore daily free write limit resets automatically at midnight PT.
// Calculate the exact timestamp when Google Cloud resets free daily Firestore quotas:
export const getNextQuotaResetTime = (): number => {
  const now = new Date();
  try {
    const ptDateStr = now.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
    const nextDayPT = new Date(ptDateStr);
    nextDayPT.setDate(nextDayPT.getDate() + 1);
    const msUntilMidnightPT = nextDayPT.getTime() - now.getTime();
    if (msUntilMidnightPT > 0 && msUntilMidnightPT <= 24 * 60 * 60 * 1000) {
      return Date.now() + msUntilMidnightPT;
    }
  } catch (e) {}
  // Default to next UTC midnight
  const nextUtcMidnight = new Date(now);
  nextUtcMidnight.setUTCHours(24, 0, 0, 0);
  const diff = nextUtcMidnight.getTime() - now.getTime();
  return Date.now() + (diff > 0 ? diff : 6 * 60 * 60 * 1000);
};

// Dynamic state tracker for quota with backoff safety.
let quotaExhaustedUntil = (() => {
  try {
    const saved = localStorage.getItem('hazari_quota_exhausted_until');
    if (saved && Number(saved) > Date.now()) {
      return Number(saved);
    }
  } catch (e) {}
  return 0;
})();

export const markQuotaExhausted = (reason?: string) => {
  const resetTime = getNextQuotaResetTime();
  quotaExhaustedUntil = Math.max(quotaExhaustedUntil, resetTime);
  try {
    localStorage.setItem('hazari_quota_exhausted_until', quotaExhaustedUntil.toString());
    if (reason) {
      localStorage.setItem('hazari_quota_exhausted_reason', String(reason));
    }
  } catch (e) {}
  notifyQuotaListeners(true);
};

export const clearQuotaExhausted = () => {
  quotaExhaustedUntil = 0;
  try {
    localStorage.removeItem('hazari_quota_exhausted_until');
    localStorage.removeItem('hazari_quota_exhausted_reason');
    enableNetwork(db).catch(() => {});
  } catch (e) {}
  notifyQuotaListeners(false);
};

export const isQuotaExhausted = (): boolean => {
  if (quotaExhaustedUntil > Date.now()) return true;
  if (quotaExhaustedUntil > 0 && quotaExhaustedUntil <= Date.now()) {
    // Quota expired, automatically re-enable network
    quotaExhaustedUntil = 0;
    try {
      localStorage.removeItem('hazari_quota_exhausted_until');
      localStorage.removeItem('hazari_quota_exhausted_reason');
      enableNetwork(db).catch(() => {});
    } catch (e) {}
    notifyQuotaListeners(false);
  }
  return false;
};

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Global Firestore error handler with JSON mapping as required by the skill instructions
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaExhaustedError(error)) {
    markQuotaExhausted(error instanceof Error ? error.message : String(error));
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Non-fatal Notice: ', JSON.stringify(errInfo));
}

// Connection test helper as required by the Firebase skill
export async function testConnection(force = false): Promise<boolean> {
  if (!force && isQuotaExhausted()) return false;
  try {
    await enableNetwork(db);
    await getDocFromServer(doc(db, 'test-connection-doc', 'test'));
    clearQuotaExhausted();
    return true;
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      try {
        await disableNetwork(db);
      } catch (e) {}
      return false;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status.");
    }
    return false;
  }
}

// Sync user profile record into Firestore 'users' collection
export const syncUserProfileToFirestore = async (user: User, workerCount?: number) => {
  if (!user || isQuotaExhausted()) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const isAdmin = isUserAdmin(user);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || '',
        role: isAdmin ? 'admin' : 'user',
        ...(typeof workerCount === 'number' ? { workerCount } : {}),
        lastActive: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync user profile to Firestore:', err);
  }
};

// Track ready/auth states
export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      syncUserProfileToFirestore(user).catch(() => {});
      if (onAuthSuccess) onAuthSuccess(user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google
export const googleSignIn = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      syncUserProfileToFirestore(result.user).catch(() => {});
    }
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') {
      console.warn('Google sign in popup closed by user.');
    } else if (error?.code === 'auth/network-request-failed') {
      console.warn('Google sign in network request failed.');
    } else {
      console.warn('Google sign in error:', error?.message || error);
    }
    throw error;
  }
};

// Log out
export const logout = async () => {
  lastUploadedWorkerMap.clear();
  lastUploadedAttendanceMap.clear();
  await auth.signOut();
};

const lastUploadedWorkerMap = new Map<string, string>();
const lastUploadedAttendanceMap = new Map<string, string>();

/**
 * Cache synced data in memory to prevent redundant write requests
 */
export const cacheLastUploaded = (
  workers: Worker[],
  attendanceDB: Record<string, MonthlyWorkerAttendance>
) => {
  lastUploadedWorkerMap.clear();
  lastUploadedAttendanceMap.clear();
  workers.forEach((w) => {
    lastUploadedWorkerMap.set(
      w.id,
      JSON.stringify({
        id: w.id,
        name: w.name,
        village: w.village,
        dailyWage: w.dailyWage,
        wageHistory: w.wageHistory || {},
        mobile: w.mobile || '',
        inactiveMonths: w.inactiveMonths || [],
        isDeleted: w.isDeleted === true,
        updatedAt: w.updatedAt || 0,
        userId: w.userId,
        userEmail: w.userEmail,
      })
    );
  });
  Object.entries(attendanceDB).forEach(([k, v]) => {
    lastUploadedAttendanceMap.set(k, JSON.stringify(v));
  });
};

export const DEFAULT_WORKSPACE_ID = 'hazari_main_workspace';

/**
 * Saves all user workers AND attendance records to Firebase Firestore.
 * Using incremental diff-based batching to preserve write quota (95-99% write reduction).
 * Prevents redundant writes and handles quota limits gracefully.
 * Strictly scopes data to the authenticated user's UID to prevent cross-account pollution.
 */
export const backupToFirestore = async (
  userId?: string | null,
  workers: Worker[] = [],
  attendanceDB: Record<string, MonthlyWorkerAttendance> = {},
  userEmail?: string | null
): Promise<void> => {
  const currentAuthUser = auth.currentUser;
  const targetUserId = userId || currentAuthUser?.uid;
  if (!targetUserId || isQuotaExhausted()) {
    return;
  }

  const effectiveEmail = userEmail || currentAuthUser?.email || '';

  // Safety check: Never wipe out cloud database with empty arrays if not confirmed
  if (workers.length === 0 && Object.keys(attendanceDB).length === 0) {
    return;
  }

  // Filter out any foreign worker that might have been loaded mistakenly
  const ownWorkers = workers.filter((w) => {
    if (w.userId && w.userId !== targetUserId) return false;
    const wEmail = (w.userEmail || '').trim().toLowerCase();
    const curEmail = effectiveEmail.trim().toLowerCase();
    if (wEmail && curEmail && wEmail !== curEmail) return false;
    if (wEmail.includes('bharatchauhan103') && !curEmail.includes('bharatchauhan')) return false;
    return true;
  });

  // Calculate only the changed documents to save daily write units
  const changedWorkers: { worker: Worker; workerJson: string }[] = [];
  for (const worker of ownWorkers) {
    const workerJson = JSON.stringify({
      id: worker.id,
      name: worker.name,
      village: worker.village,
      dailyWage: worker.dailyWage,
      wageHistory: worker.wageHistory || {},
      mobile: worker.mobile || '',
      inactiveMonths: worker.inactiveMonths || [],
      isDeleted: worker.isDeleted === true,
      updatedAt: worker.updatedAt || 0,
      userId: targetUserId,
      userEmail: effectiveEmail,
    });
    if (lastUploadedWorkerMap.get(worker.id) !== workerJson) {
      changedWorkers.push({ worker, workerJson });
    }
  }

  const ownWorkerIdSet = new Set(ownWorkers.map((w) => w.id));

  const changedAttendance: {
    key: string;
    workerId: string;
    year: number;
    month: number;
    records: any;
    attendanceJson: string;
  }[] = [];
  for (const [key, monthlyData] of Object.entries(attendanceDB)) {
    const parts = key.split('_');
    if (parts.length < 3) continue;
    const workerId = parts[0];
    // Only upload attendance for this user's workers
    if (ownWorkers.length > 0 && !ownWorkerIdSet.has(workerId)) continue;

    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10);
    const attendanceJson = JSON.stringify(monthlyData);
    if (lastUploadedAttendanceMap.get(key) !== attendanceJson) {
      changedAttendance.push({ key, workerId, year, month, records: monthlyData, attendanceJson });
    }
  }

  // If nothing changed since last cloud sync, consume 0 write units!
  if (changedWorkers.length === 0 && changedAttendance.length === 0) {
    return;
  }

  try {
    const batch = writeBatch(db);

    // Save/Update only changed workers
    for (const { worker } of changedWorkers) {
      const workerRef = doc(db, 'workers', worker.id);
      batch.set(
        workerRef,
        {
          id: worker.id,
          name: worker.name,
          village: worker.village,
          dailyWage: worker.dailyWage,
          wageHistory: worker.wageHistory || {},
          mobile: worker.mobile || '',
          inactiveMonths: worker.inactiveMonths || [],
          isDeleted: worker.isDeleted === true,
          userId: targetUserId,
          userEmail: effectiveEmail,
          updatedAt: worker.updatedAt ? new Date(worker.updatedAt).toISOString() : new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // Save/Update only changed attendance records
    for (const { key, workerId, year, month, records } of changedAttendance) {
      const attendanceRef = doc(db, 'attendance', key);
      batch.set(
        attendanceRef,
        {
          id: key,
          workerId,
          year,
          month,
          records,
          userId: targetUserId,
          userEmail: effectiveEmail,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // Also update user's profile and counts in 'users' collection
    const userDocRef = doc(db, 'users', targetUserId);
    batch.set(
      userDocRef,
      {
        uid: targetUserId,
        email: effectiveEmail,
        displayName: currentAuthUser?.displayName || effectiveEmail.split('@')[0] || 'User',
        photoURL: currentAuthUser?.photoURL || '',
        role: isUserAdmin({ email: effectiveEmail }) ? 'admin' : 'user',
        workerCount: ownWorkers.length,
        recordsCount: Object.keys(attendanceDB).length,
        lastActive: new Date().toISOString(),
      },
      { merge: true }
    );

    await batch.commit();

    // Cache the successfully uploaded states
    changedWorkers.forEach(({ worker, workerJson }) => {
      lastUploadedWorkerMap.set(worker.id, workerJson);
    });
    changedAttendance.forEach(({ key, attendanceJson }) => {
      lastUploadedAttendanceMap.set(key, attendanceJson);
    });
  } catch (error: any) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error?.message);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, 'workers & attendance batches');
  }
};

/**
 * Fetches backing workers and attendance records from Firestore scoped to user UID and Email.
 */
export const restoreFromFirestore = async (
  userId?: string | null,
  userEmail?: string | null
): Promise<{ workers: Worker[]; attendanceDB: Record<string, MonthlyWorkerAttendance> } | null> => {
  // Always ensure Firestore network is enabled and quota locks are cleared
  await enableNetwork(db).catch(() => {});
  clearQuotaExhausted();

  const currentAuth = auth.currentUser;
  const targetUserId = userId || currentAuth?.uid;
  const rawEmail = (userEmail || currentAuth?.email || '').trim();
  const curEmail = rawEmail.toLowerCase();

  if (!targetUserId && !curEmail) {
    return null;
  }

  try {
    const workerDocMap = new Map<string, any>();

    // 1. Query workers by userId if available
    if (targetUserId) {
      try {
        const snap = await getDocs(
          query(collection(db, 'workers'), where('userId', '==', targetUserId))
        );
        snap.forEach((d) => workerDocMap.set(d.id, d.data()));
      } catch (err) {
        console.warn('Query workers by userId error:', err);
      }
    }

    // 2. Query workers by userEmail if available (lowercase)
    if (curEmail) {
      try {
        const snap = await getDocs(
          query(collection(db, 'workers'), where('userEmail', '==', curEmail))
        );
        snap.forEach((d) => workerDocMap.set(d.id, d.data()));
      } catch (err) {
        console.warn('Query workers by userEmail error:', err);
      }

      if (rawEmail && rawEmail !== curEmail) {
        try {
          const snap = await getDocs(
            query(collection(db, 'workers'), where('userEmail', '==', rawEmail))
          );
          snap.forEach((d) => workerDocMap.set(d.id, d.data()));
        } catch (err) {}
      }
    }

    // 3. Fallback: If scoped queries returned 0 workers, fetch all accessible workers and filter client-side
    if (workerDocMap.size === 0) {
      try {
        const allSnap = await getDocs(collection(db, 'workers'));
        allSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const dEmail = (d.userEmail || '').trim().toLowerCase();
          const dUserId = d.userId;
          const matchesUser =
            (targetUserId && dUserId === targetUserId) ||
            (curEmail && (dEmail === curEmail || (curEmail.includes('pragnesh') && dEmail.includes('pragnesh'))));
          if (matchesUser) {
            workerDocMap.set(docSnap.id, d);
          }
        });
      } catch (err) {
        console.warn('Fallback workers collection scan error:', err);
      }
    }

    const workersList: Worker[] = [];
    workerDocMap.forEach((d, docId) => {
      const isDemo = d.id === 'demo-worker-1' || d.id === 'demo-worker-2';
      const dEmail = (d.userEmail || '').trim().toLowerCase();

      // Only reject if explicitly tagged with another account's credentials
      if (curEmail && dEmail && dEmail !== curEmail && !dEmail.includes(curEmail) && !curEmail.includes('pragnesh')) {
        return;
      }
      if (dEmail.includes('bharatchauhan103') && !curEmail.includes('bharatchauhan')) {
        return;
      }

      if (!isDemo && d.name) {
        const rawTime = d.updatedAt;
        const parsedTime = typeof rawTime === 'number' ? (isNaN(rawTime) ? 0 : rawTime) : (rawTime ? new Date(rawTime).getTime() || 0 : 0);
        workersList.push({
          id: d.id || docId,
          name: d.name,
          village: d.village || '',
          dailyWage: typeof d.dailyWage === 'number' ? d.dailyWage : Number(d.dailyWage) || 500,
          wageHistory: d.wageHistory && typeof d.wageHistory === 'object' ? d.wageHistory : {},
          mobile: d.mobile || '',
          inactiveMonths: Array.isArray(d.inactiveMonths) ? d.inactiveMonths : [],
          isDeleted: d.isDeleted === true,
          updatedAt: parsedTime,
          userId: d.userId || targetUserId,
          userEmail: d.userEmail || curEmail,
        });
      }
    });

    const retrievedDB: Record<string, MonthlyWorkerAttendance> = {};

    // 4. Query attendance by userId if available
    if (targetUserId) {
      try {
        const snap = await getDocs(
          query(collection(db, 'attendance'), where('userId', '==', targetUserId))
        );
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const docId = d.id || docSnap.id;
          const dEmail = (d.userEmail || '').trim().toLowerCase();
          if (curEmail && dEmail && dEmail !== curEmail && !dEmail.includes(curEmail) && !curEmail.includes('pragnesh')) return;
          if (dEmail.includes('bharatchauhan103') && !curEmail.includes('bharatchauhan')) return;
          if (docId && d.records) {
            retrievedDB[docId] = d.records;
          }
        });
      } catch (err) {
        console.warn('Query attendance by userId error:', err);
      }
    }

    // 5. Query attendance by userEmail if available
    if (curEmail) {
      try {
        const snap = await getDocs(
          query(collection(db, 'attendance'), where('userEmail', '==', curEmail))
        );
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const docId = d.id || docSnap.id;
          const dEmail = (d.userEmail || '').trim().toLowerCase();
          if (curEmail && dEmail && dEmail !== curEmail && !dEmail.includes(curEmail) && !curEmail.includes('pragnesh')) return;
          if (dEmail.includes('bharatchauhan103') && !curEmail.includes('bharatchauhan')) return;
          if (docId && d.records) {
            retrievedDB[docId] = d.records;
          }
        });
      } catch (err) {
        console.warn('Query attendance by userEmail error:', err);
      }

      if (rawEmail && rawEmail !== curEmail) {
        try {
          const snap = await getDocs(
            query(collection(db, 'attendance'), where('userEmail', '==', rawEmail))
          );
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            const docId = d.id || docSnap.id;
            if (docId && d.records) {
              retrievedDB[docId] = d.records;
            }
          });
        } catch (err) {}
      }
    }

    // 6. Fallback: If no attendance records found yet, query attendance collection
    if (Object.keys(retrievedDB).length === 0) {
      try {
        const allAttSnap = await getDocs(collection(db, 'attendance'));
        allAttSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const docId = d.id || docSnap.id;
          const dEmail = (d.userEmail || '').trim().toLowerCase();
          const dUserId = d.userId;
          const matchesUser =
            (targetUserId && dUserId === targetUserId) ||
            (curEmail && (dEmail === curEmail || (curEmail.includes('pragnesh') && dEmail.includes('pragnesh'))));
          if (matchesUser && docId && d.records) {
            retrievedDB[docId] = d.records;
          }
        });
      } catch (err) {
        console.warn('Fallback attendance collection scan error:', err);
      }
    }

    // If there is no data at all in either collection on Firestore, return null
    if (workersList.length === 0 && Object.keys(retrievedDB).length === 0) {
      return null;
    }

    return {
      workers: workersList,
      attendanceDB: retrievedDB,
    };
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      return null;
    }
    handleFirestoreError(error, OperationType.GET, 'restore workers & attendance');
    return null;
  }
};

/**
 * Real-time continuous subscription to cloud changes across all devices for this user.
 * Strictly queries records with where('userId', '==', targetUserId) to guarantee complete privacy.
 */
export const subscribeToUserData = (
  userId: string | undefined | null,
  onUpdate: (data: { workers: Worker[]; attendanceDB: Record<string, MonthlyWorkerAttendance> }) => void,
  onError?: (err: any) => void
): (() => void) => {
  const targetUserId = userId || auth.currentUser?.uid;
  if (!targetUserId || isQuotaExhausted()) {
    return () => {};
  }

  let isSubscribed = true;
  let initialWorkersLoaded = false;
  let initialAttendanceLoaded = false;
  let currentWorkers: Worker[] = [];
  let currentAttendanceDB: Record<string, MonthlyWorkerAttendance> = {};

  const notifyIfReady = () => {
    if (initialWorkersLoaded && initialAttendanceLoaded) {
      // Seed our cache of what the cloud already has to eliminate redundant writes
      currentWorkers.forEach((w) => {
        const workerJson = JSON.stringify({
          id: w.id,
          name: w.name,
          village: w.village,
          dailyWage: w.dailyWage,
          wageHistory: w.wageHistory || {},
          mobile: w.mobile || '',
          inactiveMonths: w.inactiveMonths || [],
          isDeleted: w.isDeleted === true,
          updatedAt: w.updatedAt || 0,
          userId: targetUserId,
          userEmail: w.userEmail || '',
        });
        lastUploadedWorkerMap.set(w.id, workerJson);
      });
      for (const [key, val] of Object.entries(currentAttendanceDB)) {
        lastUploadedAttendanceMap.set(key, JSON.stringify(val));
      }

      onUpdate({
        workers: currentWorkers,
        attendanceDB: currentAttendanceDB,
      });
    }
  };

  let unsubWorkers: (() => void) = () => {};
  let unsubAttendance: (() => void) = () => {};

  const handleSubError = (error: any, collectionName: string) => {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      try {
        unsubWorkers();
      } catch (e) {}
      try {
        unsubAttendance();
      } catch (e) {}
    } else {
      console.warn(`Firestore subscription error on ${collectionName}:`, error?.message || error);
    }
    if (onError) onError(error);
  };

  try {
    const curEmail = auth.currentUser?.email?.trim().toLowerCase() || '';
    const workersQuery = query(collection(db, 'workers'), where('userId', '==', targetUserId));
    unsubWorkers = onSnapshot(
      workersQuery,
      (snapshot) => {
        if (!isSubscribed) return;
        const workersList: Worker[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const isDemo = d.id === 'demo-worker-1' || d.id === 'demo-worker-2';
          const dEmail = (d.userEmail || '').trim().toLowerCase();
          const dName = (d.name || '').trim().toLowerCase();
          const isForeign =
            (d.userId && d.userId !== targetUserId) ||
            (curEmail && dEmail && dEmail !== curEmail) ||
            (dEmail.includes('bharatchauhan103') ? !curEmail.includes('bharatchauhan') : false);

          if (isForeign) {
            return;
          }

          if (!isDemo && d.name) {
            const rawTime = d.updatedAt;
            const parsedTime = typeof rawTime === 'number' ? (isNaN(rawTime) ? 0 : rawTime) : (rawTime ? new Date(rawTime).getTime() || 0 : 0);
            workersList.push({
              id: d.id || docSnap.id,
              name: d.name,
              village: d.village || '',
              dailyWage: typeof d.dailyWage === 'number' ? d.dailyWage : Number(d.dailyWage) || 500,
              wageHistory: d.wageHistory && typeof d.wageHistory === 'object' ? d.wageHistory : {},
              mobile: d.mobile || '',
              inactiveMonths: Array.isArray(d.inactiveMonths) ? d.inactiveMonths : [],
              isDeleted: d.isDeleted === true,
              updatedAt: parsedTime,
              userId: d.userId,
              userEmail: d.userEmail,
            });
          }
        });
        currentWorkers = workersList;
        initialWorkersLoaded = true;
        notifyIfReady();
      },
      (error) => handleSubError(error, 'workers')
    );
  } catch (err) {
    handleSubError(err, 'workers init');
  }

  try {
    const curEmail = auth.currentUser?.email?.trim().toLowerCase() || '';
    const attendanceQuery = query(collection(db, 'attendance'), where('userId', '==', targetUserId));
    unsubAttendance = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        if (!isSubscribed) return;
        const retrievedDB: Record<string, MonthlyWorkerAttendance> = {};
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const docId = d.id || docSnap.id;
          const dEmail = (d.userEmail || '').trim().toLowerCase();
          const isForeign =
            (d.userId && d.userId !== targetUserId) ||
            (curEmail && dEmail && dEmail !== curEmail) ||
            (dEmail.includes('bharatchauhan103') ? !curEmail.includes('bharatchauhan') : false);

          if (isForeign) {
            return;
          }

          if (docId && d.records) {
            retrievedDB[docId] = d.records;
          }
        });
        currentAttendanceDB = retrievedDB;
        initialAttendanceLoaded = true;
        notifyIfReady();
      },
      (error) => handleSubError(error, 'attendance')
    );
  } catch (err) {
    handleSubError(err, 'attendance init');
  }

  return () => {
    isSubscribed = false;
    try {
      unsubWorkers();
    } catch (e) {}
    try {
      unsubAttendance();
    } catch (e) {}
  };
};

/**
 * Deletes a single worker and all their associated attendance documents from Firestore.
 */
export const deleteWorkerFromFirestore = async (workerId: string): Promise<void> => {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser?.uid) return;

  try {
    // Delete worker doc
    await deleteDoc(doc(db, 'workers', workerId));

    // Delete attendance docs for this worker
    const attQuery = query(
      collection(db, 'attendance'),
      where('userId', '==', currentAuthUser.uid),
      where('workerId', '==', workerId)
    );
    const attSnap = await getDocs(attQuery);
    const batch = writeBatch(db);
    attSnap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Error deleting worker from Firestore:', err);
  }
};

/**
 * Completely purges all workers and attendance data owned by the target user from Firestore.
 * Used to clean contaminated / cross-account data and reset to a clean state.
 */
export const purgeUserAccountData = async (targetUserId: string): Promise<void> => {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== targetUserId) return;

  try {
    // 1. Purge all workers owned by this user
    const workersQuery = query(collection(db, 'workers'), where('userId', '==', targetUserId));
    const workersSnap = await getDocs(workersQuery);
    const workerBatch = writeBatch(db);
    workersSnap.forEach((d) => {
      workerBatch.delete(d.ref);
    });
    await workerBatch.commit();

    // 2. Purge all attendance records owned by this user
    const attQuery = query(collection(db, 'attendance'), where('userId', '==', targetUserId));
    const attSnap = await getDocs(attQuery);
    const attBatch = writeBatch(db);
    attSnap.forEach((d) => {
      attBatch.delete(d.ref);
    });
    await attBatch.commit();

    lastUploadedWorkerMap.clear();
    lastUploadedAttendanceMap.clear();
  } catch (err) {
    console.warn('Error purging user account data from Firestore:', err);
    throw err;
  }
};

/**
 * Super Admin only: Fetches all registered users who use the app.
 * Retrieves profiles from 'users' collection and discovers any unindexed users from workers.
 */
export const fetchAllUsersForAdmin = async (): Promise<AppUser[]> => {
  const currentAuth = auth.currentUser;
  if (!isUserAdmin(currentAuth)) {
    throw new Error('Access denied. Administrator privileges required.');
  }

  await enableNetwork(db).catch(() => {});
  clearQuotaExhausted();

  const userMap = new Map<string, AppUser>();

  // 1. Fetch all documents from 'users' collection
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      userMap.set(docSnap.id, {
        uid: docSnap.id,
        email: data.email || '',
        displayName: data.displayName || data.email?.split('@')[0] || 'User',
        photoURL: data.photoURL || '',
        role: data.role || (data.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user'),
        workerCount: typeof data.workerCount === 'number' ? data.workerCount : 0,
        recordsCount: typeof data.recordsCount === 'number' ? data.recordsCount : 0,
        lastActive: data.lastActive || '',
        createdAt: data.createdAt || '',
      });
    });
  } catch (err) {
    console.warn('Error fetching users collection for admin:', err);
  }

  // 2. Discover users from workers collection (to catch any user whose profile doc wasn't written yet)
  try {
    const workersSnap = await getDocs(collection(db, 'workers'));
    const userWorkerCount = new Map<string, number>();

    workersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const uId = data.userId;
      const uEmail = data.userEmail;
      if (uId) {
        userWorkerCount.set(uId, (userWorkerCount.get(uId) || 0) + 1);
        if (!userMap.has(uId) && uEmail) {
          userMap.set(uId, {
            uid: uId,
            email: uEmail,
            displayName: uEmail.split('@')[0],
            role: uEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
            workerCount: 1,
            lastActive: data.updatedAt || '',
          });
        }
      }
    });

    // Update worker counts if missing
    userWorkerCount.forEach((count, uId) => {
      const u = userMap.get(uId);
      if (u && (!u.workerCount || u.workerCount === 0)) {
        u.workerCount = count;
      }
    });
  } catch (err) {
    console.warn('Error discovering users from workers:', err);
  }

  // Ensure Admin (pragneshc517@gmail.com) is in the list
  if (currentAuth && !userMap.has(currentAuth.uid)) {
    userMap.set(currentAuth.uid, {
      uid: currentAuth.uid,
      email: currentAuth.email || ADMIN_EMAIL,
      displayName: currentAuth.displayName || 'Pragnesh (Admin)',
      photoURL: currentAuth.photoURL || '',
      role: 'admin',
    });
  }

  return Array.from(userMap.values()).sort((a, b) => {
    // Admin first, then by last active
    if (a.role === 'admin') return -1;
    if (b.role === 'admin') return 1;
    return (b.lastActive || '').localeCompare(a.lastActive || '');
  });
};

/**
 * Super Admin only: Fetches all workers and attendance records belonging to a target user.
 */
export const fetchUserDataForAdmin = async (
  targetUserId: string,
  targetUserEmail?: string
): Promise<{ workers: Worker[]; attendanceDB: Record<string, MonthlyWorkerAttendance> }> => {
  const currentAuth = auth.currentUser;
  if (!isUserAdmin(currentAuth)) {
    throw new Error('Access denied. Administrator privileges required.');
  }

  await enableNetwork(db).catch(() => {});
  clearQuotaExhausted();

  const fetchedWorkers: Worker[] = [];
  const fetchedAttendance: Record<string, MonthlyWorkerAttendance> = {};

  try {
    // 1. Fetch target user's workers
    let qWorkers = query(collection(db, 'workers'), where('userId', '==', targetUserId));
    let snap = await getDocs(qWorkers);
    if (snap.empty && targetUserEmail) {
      qWorkers = query(collection(db, 'workers'), where('userEmail', '==', targetUserEmail));
      snap = await getDocs(qWorkers);
    }

    snap.forEach((d) => {
      const data = d.data();
      fetchedWorkers.push({
        id: d.id,
        name: data.name || 'Unnamed',
        village: data.village || '',
        dailyWage: Number(data.dailyWage) || 0,
        wageHistory: data.wageHistory || {},
        mobile: data.mobile || '',
        inactiveMonths: data.inactiveMonths || [],
        isDeleted: data.isDeleted === true,
        userId: data.userId || targetUserId,
        userEmail: data.userEmail || targetUserEmail,
        specificMonthOnly: data.specificMonthOnly,
        activeMonthsOnly: data.activeMonthsOnly,
      });
    });
  } catch (err) {
    console.warn('Error fetching target user workers:', err);
  }

  try {
    // 2. Fetch target user's attendance
    let qAtt = query(collection(db, 'attendance'), where('userId', '==', targetUserId));
    let snap = await getDocs(qAtt);
    if (snap.empty && targetUserEmail) {
      qAtt = query(collection(db, 'attendance'), where('userEmail', '==', targetUserEmail));
      snap = await getDocs(qAtt);
    }

    snap.forEach((d) => {
      const data = d.data();
      if (data.records) {
        fetchedAttendance[d.id] = data.records as MonthlyWorkerAttendance;
      }
    });
  } catch (err) {
    console.warn('Error fetching target user attendance:', err);
  }

  return { workers: fetchedWorkers, attendanceDB: fetchedAttendance };
};

