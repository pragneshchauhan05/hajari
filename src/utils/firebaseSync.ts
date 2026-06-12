import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, collection, writeBatch, getDocs, query, where, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Worker, MonthlyWorkerAttendance } from '../types';

// Initialize Firebase App, Auth and Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test helper as required by the Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test-connection-doc', 'test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Track ready/auth states
export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
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
    return result.user;
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  }
};

// Log out
export const logout = async () => {
  await auth.signOut();
};

/**
 * Saves all user workers AND attendance records to Firebase Firestore.
 * Using batching to ensure transactional security.
 * Also cleans up any deleted workers or attendance records on the cloud.
 */
export const backupToFirestore = async (
  userId: string,
  workers: Worker[],
  attendanceDB: Record<string, MonthlyWorkerAttendance>
): Promise<void> => {
  try {
    const batch = writeBatch(db);

    const activeWorkerIds = new Set(workers.map(w => w.id));
    const activeAttendanceKeys = new Set(Object.keys(attendanceDB));

    // Get existing workers on Firestore to detect and process deletions
    const workersQuery = query(collection(db, 'workers'), where('userId', '==', userId));
    const workersSnapshot = await getDocs(workersQuery);
    workersSnapshot.forEach((docSnap) => {
      if (!activeWorkerIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Get existing attendance on Firestore to detect and process deletions
    const attendanceQuery = query(collection(db, 'attendance'), where('userId', '==', userId));
    const attendanceSnapshot = await getDocs(attendanceQuery);
    attendanceSnapshot.forEach((docSnap) => {
      if (!activeAttendanceKeys.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Save/Update workers
    for (const worker of workers) {
      const workerRef = doc(db, 'workers', worker.id);
      batch.set(workerRef, {
        id: worker.id,
        name: worker.name,
        village: worker.village,
        dailyWage: worker.dailyWage,
        mobile: worker.mobile || '',
        userId: userId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // Save/Update attendance records
    // Key format: "workerId_year_month"
    for (const [key, monthlyData] of Object.entries(attendanceDB)) {
      const parts = key.split('_');
      if (parts.length < 3) continue;
      const workerId = parts[0];
      const year = parseInt(parts[1]);
      const month = parseInt(parts[2]);

      const attendanceRef = doc(db, 'attendance', key);
      batch.set(attendanceRef, {
        id: key,
        workerId,
        year,
        month,
        records: monthlyData,
        userId: userId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'workers & attendance batches');
  }
};

/**
 * Fetches backing workers and attendance records from Firestore for the given user.
 */
export const restoreFromFirestore = async (
  userId: string
): Promise<{ workers: Worker[]; attendanceDB: Record<string, MonthlyWorkerAttendance> } | null> => {
  try {
    // 1. Fetch Workers matching userId
    const workersQuery = query(collection(db, 'workers'), where('userId', '==', userId));
    const workersSnapshot = await getDocs(workersQuery);
    
    const workersList: Worker[] = [];
    workersSnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const isDemo =
        d.id === 'worker-1' ||
        d.id === 'worker-2' ||
        d.id === 'worker-3' ||
        d.name === 'હસમુખભાઈ' ||
        d.name === 'રમેશભાઈ' ||
        d.name === 'મુકેશભાઈ' ||
        d.name === 'હસમુખ' ||
        d.name === 'રમેશ' ||
        d.name === 'મુકેશ' ||
        d.name === 'Hasmukhbhai' ||
        d.name === 'Rameshbhai' ||
        d.name === 'Mukeshbhai';
      
      if (!isDemo) {
        workersList.push({
          id: d.id,
          name: d.name,
          village: d.village,
          dailyWage: d.dailyWage,
          mobile: d.mobile || '',
        });
      }
    });

    // 2. Fetch Attendance matching userId
    const attendanceQuery = query(collection(db, 'attendance'), where('userId', '==', userId));
    const attendanceSnapshot = await getDocs(attendanceQuery);

    const retrievedDB: Record<string, MonthlyWorkerAttendance> = {};
    attendanceSnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.id && d.records) {
        const parts = d.id.split('_');
        const workerId = parts[0];
        const isDemo =
          workerId === 'worker-1' ||
          workerId === 'worker-2' ||
          workerId === 'worker-3';
        
        if (!isDemo) {
          retrievedDB[d.id] = d.records;
        }
      }
    });

    // If there is no data at all in either collection on Firestore, return null
    if (workersList.length === 0 && Object.keys(retrievedDB).length === 0) {
      return null;
    }

    return {
      workers: workersList,
      attendanceDB: retrievedDB
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'workers & attendance lists');
    return null;
  }
};
