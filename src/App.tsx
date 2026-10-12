import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import WorkerModal from './components/WorkerModal';
import DeleteWorkerModal from './components/DeleteWorkerModal';
import QuickPastMonthModal from './components/QuickPastMonthModal';
import DashboardView from './components/DashboardView';
import WorkersView from './components/WorkersView';
import AttendanceView from './components/AttendanceView';
import ReportsView from './components/ReportsView';
import AdminPanelView from './components/AdminPanelView';
import { Worker, MonthlyWorkerAttendance, ActiveTab, AttendanceStatus } from './types';
import { getDaysInMonth, getWorkerWageForMonth } from './utils/attendanceUtils';
import { exportBackupToFile, importBackupFromFile } from './utils/backupExportImport';
import { User } from 'firebase/auth';
import {
  auth,
  initAuth,
  googleSignIn,
  logout,
  backupToFirestore,
  restoreFromFirestore,
  subscribeToUserData,
  deleteWorkerFromFirestore,
  cacheLastUploaded,
  isQuotaExhaustedError,
  isQuotaExhausted,
  markQuotaExhausted,
  clearQuotaExhausted,
} from './utils/firebaseSync';
import { mergeAttendanceDB, mergeWorkers } from './utils/syncMerge';
import { useLanguage } from './context/LanguageContext';

// Let's seed pre-populated demo workers if none exist in LocalStorage
const DEMO_WORKERS: Worker[] = [];

// Let's seed some dummy attendance records so the dashboard looks instantly gorgeous and responsive!
const DEMO_ATTENDANCE: Record<string, MonthlyWorkerAttendance> = {};

export default function App() {
  const { language, months } = useLanguage();
  // Fetch initial states from localStorage
  const [workers, setWorkers] = useState<Worker[]>(() => {
    const saved = localStorage.getItem('hazari_workers') || localStorage.getItem('hazari_workers_pragnesh');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Worker[];
        // Only exclude initial mock demo IDs and explicit foreign account email
        return parsed.filter((w) => {
          if (w.id === 'demo-worker-1' || w.id === 'demo-worker-2') return false;
          const wEmail = (w.userEmail || '').trim().toLowerCase();
          if (wEmail.includes('bharatchauhan103')) return false;
          return true;
        });
      } catch (e) {
        console.error('Error parsing local workers:', e);
        return [];
      }
    }
    return [];
  });

  const [attendanceDB, setAttendanceDB] = useState<Record<string, MonthlyWorkerAttendance>>(() => {
    const saved = localStorage.getItem('hazari_attendance_db');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, MonthlyWorkerAttendance>;
        const filtered: Record<string, MonthlyWorkerAttendance> = {};
        Object.keys(parsed).forEach((key) => {
          if (!key.startsWith('demo-worker-1_') && !key.startsWith('demo-worker-2_')) {
            filtered[key] = parsed[key];
          }
        });
        return filtered;
      } catch (e) {
        console.error('Error parsing local attendance DB:', e);
        return {};
      }
    }
    return {};
  });

  // Helper to get current actual real-time month and year
  const getTodayMonthYear = () => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  };

  // Automatically default to current month & year, or switch when a new month starts
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const { month, year } = getTodayMonthYear();
    const savedMonth = localStorage.getItem('hazari_selected_month');
    const lastActivePeriod = localStorage.getItem('hazari_active_period'); // e.g. "2026-8"
    const currentPeriod = `${year}-${month}`;

    // If a new month has started, or no active period was tracked yet: auto switch to current month!
    if (!lastActivePeriod || lastActivePeriod !== currentPeriod) {
      localStorage.setItem('hazari_active_period', currentPeriod);
      localStorage.setItem('hazari_selected_month', month.toString());
      localStorage.setItem('hazari_selected_year', year.toString());
      return month;
    }

    return savedMonth ? Number(savedMonth) : month;
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const { month, year } = getTodayMonthYear();
    const savedYear = localStorage.getItem('hazari_selected_year');
    const lastActivePeriod = localStorage.getItem('hazari_active_period');
    const currentPeriod = `${year}-${month}`;

    if (!lastActivePeriod || lastActivePeriod !== currentPeriod) {
      return year;
    }

    return savedYear ? Number(savedYear) : year;
  });

  // Automatically update selected month & year if a new calendar month starts while app is running / opened
  useEffect(() => {
    const checkAndAutoSwitchMonth = () => {
      const { month, year } = getTodayMonthYear();
      const currentPeriod = `${year}-${month}`;
      const lastActivePeriod = localStorage.getItem('hazari_active_period');

      if (!lastActivePeriod || lastActivePeriod !== currentPeriod) {
        setSelectedMonth(month);
        setSelectedYear(year);
        localStorage.setItem('hazari_active_period', currentPeriod);
        localStorage.setItem('hazari_selected_month', month.toString());
        localStorage.setItem('hazari_selected_year', year.toString());
      }
    };

    checkAndAutoSwitchMonth();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndAutoSwitchMonth();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkAndAutoSwitchMonth);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkAndAutoSwitchMonth);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // Initialize the base history state so that we can always navigate back to the initial dashboard state
  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ tab: 'dashboard', workerId: null }, '');
    }
  }, []);

  // Synchronize activeTab and selectedWorkerId with history to support browser/mobile back buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const { tab, workerId } = event.state;
        setActiveTab(tab || 'dashboard');
        setSelectedWorkerId(workerId || null);
      } else {
        // If no state, fall back to dashboard
        setActiveTab('dashboard');
        setSelectedWorkerId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Update history state whenever navigation/selected worker changes
  useEffect(() => {
    const currentState = window.history.state;
    const tabInState = currentState?.tab;
    const workerIdInState = currentState?.workerId;

    // Only push if the state is actually different to avoid bloating history
    if (tabInState !== activeTab || workerIdInState !== selectedWorkerId) {
      if (activeTab === 'dashboard' && selectedWorkerId === null) {
        window.history.replaceState({ tab: 'dashboard', workerId: null }, '');
      } else {
        window.history.pushState({ tab: activeTab, workerId: selectedWorkerId }, '');
      }
    }
  }, [activeTab, selectedWorkerId]);

  // Darkmode theme preference state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hazari_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Worker Modal trigger state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('hazari_workers', JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    localStorage.setItem('hazari_attendance_db', JSON.stringify(attendanceDB));
  }, [attendanceDB]);

  useEffect(() => {
    localStorage.setItem('hazari_selected_month', selectedMonth.toString());
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('hazari_selected_year', selectedYear.toString());
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('hazari_dark_mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Integrated Global Firebase Cloud Sync States
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [hasLocalChanges, setHasLocalChanges] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const isFirstRender = useRef(true);
  const isApplyingCloudUpdateRef = useRef(false);

  // Initialize Auth handler on load & purge any foreign data
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          const curEmail = currentUser.email?.trim().toLowerCase() || '';

          // Strict filter to ensure no worker from another account ever leaks in
          const isForeign = (w: Worker) => {
            const wEmail = (w.userEmail || '').trim().toLowerCase();
            if (curEmail && wEmail && wEmail !== curEmail) return true;
            if (w.userId && w.userId !== currentUser.uid) return true;
            if (wEmail.includes('bharatchauhan103') && !curEmail.includes('bharatchauhan')) {
              return true;
            }
            return false;
          };

          // Check if there is user-scoped localStorage data
          const scopedWorkersKey = `hazari_workers_${currentUser.uid}`;
          const scopedAttKey = `hazari_attendance_db_${currentUser.uid}`;
          const scopedWorkersJson = localStorage.getItem(scopedWorkersKey);
          const scopedAttJson = localStorage.getItem(scopedAttKey);

          let baseWorkers: Worker[] | null = null;
          if (scopedWorkersJson) {
            try {
              const parsed = JSON.parse(scopedWorkersJson) as Worker[];
              baseWorkers = parsed.filter((w) => !isForeign(w));
            } catch (e) {}
          }

          let baseAtt: Record<string, MonthlyWorkerAttendance> | null = null;
          if (scopedAttJson) {
            try {
              baseAtt = JSON.parse(scopedAttJson);
            } catch (e) {}
          }

          setWorkers((prev) => {
            const source = baseWorkers || prev;
            const clean = source.filter((w) => !isForeign(w));
            const cleanIds = new Set(clean.map((w) => w.id));

            setAttendanceDB((prevAtt) => {
              const attSource = baseAtt || prevAtt;
              const cleanAtt: Record<string, MonthlyWorkerAttendance> = {};
              Object.keys(attSource).forEach((k) => {
                const wId = k.split('_')[0];
                if (cleanIds.has(wId)) {
                  cleanAtt[k] = attSource[k];
                }
              });
              try {
                localStorage.setItem(scopedAttKey, JSON.stringify(cleanAtt));
                localStorage.setItem('hazari_attendance_db', JSON.stringify(cleanAtt));
              } catch (e) {}
              return cleanAtt;
            });

            try {
              localStorage.setItem(scopedWorkersKey, JSON.stringify(clean));
              localStorage.setItem('hazari_workers', JSON.stringify(clean));
            } catch (e) {}
            return clean;
          });
        }
      },
      () => {
        setUser(null);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Keep ref to latest known synced cloud state to avoid infinite sync loops
  const lastSyncedJsonRef = useRef({
    workers: JSON.stringify(workers),
    attendance: JSON.stringify(attendanceDB),
  });

  const hasLocalChangesRef = useRef(false);
  hasLocalChangesRef.current = hasLocalChanges;
  const lastLocalEditTimeRef = useRef(0);

  // Detect genuine local user edits vs incoming cloud data
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // CRITICAL: If this state update was triggered by incoming cloud sync, DO NOT mark local changes!
    if (isApplyingCloudUpdateRef.current) {
      isApplyingCloudUpdateRef.current = false;
      hasLocalChangesRef.current = false;
      setHasLocalChanges(false);
      return;
    }

    const currentWorkersJson = JSON.stringify(workers);
    const currentAttendanceJson = JSON.stringify(attendanceDB);

    // If data matches what is already on cloud, do NOT mark dirty!
    if (
      currentWorkersJson === lastSyncedJsonRef.current.workers &&
      currentAttendanceJson === lastSyncedJsonRef.current.attendance
    ) {
      hasLocalChangesRef.current = false;
      setHasLocalChanges(false);
      return;
    }

    lastLocalEditTimeRef.current = Date.now();
    hasLocalChangesRef.current = true;
    setHasLocalChanges(true);
  }, [workers, attendanceDB]);

  // Keep ref to latest local state so real-time subscription callback can compare accurately
  const latestLocalStateRef = useRef({ workers, attendanceDB });
  latestLocalStateRef.current = { workers, attendanceDB };
  const hasInitializedCloudRef = useRef(false);

  // Real-time bidirectional Cloud Synchronization (Mobile <-> Laptop live sync within 2 seconds)
  useEffect(() => {
    let isSubscribed = true;

    const unsubscribe = subscribeToUserData(
      user?.uid,
      (cloudData) => {
        if (!isSubscribed) return;

        const cur = latestLocalStateRef.current;
        const hasCloudData = cloudData.workers.length > 0 || Object.keys(cloudData.attendanceDB).length > 0;

        if (hasCloudData) {
          // If user is actively typing on this device right this moment, don't interrupt active keystrokes
          const isUserActivelyEditing =
            hasLocalChangesRef.current || (Date.now() - lastLocalEditTimeRef.current < 1200);
          if (isUserActivelyEditing) {
            return;
          }

          // Intelligent merge without data loss, strictly scoped to this user
          const { merged: safeWorkers } = mergeWorkers(
            cur.workers,
            cloudData.workers,
            user?.uid,
            user?.email
          );
          const safeWorkerIds = new Set(safeWorkers.map((w) => w.id));
          const { merged: safeAttendance } = mergeAttendanceDB(
            cur.attendanceDB,
            cloudData.attendanceDB,
            safeWorkerIds
          );

          const currentWorkersJson = JSON.stringify(cur.workers);
          const safeWorkersJson = JSON.stringify(safeWorkers);
          const currentAttendanceJson = JSON.stringify(cur.attendanceDB);
          const safeAttendanceJson = JSON.stringify(safeAttendance);

          if (currentWorkersJson !== safeWorkersJson || currentAttendanceJson !== safeAttendanceJson) {
            // Signal to local change detector that this is incoming cloud data so it doesn't trigger a write back
            isApplyingCloudUpdateRef.current = true;
            lastSyncedJsonRef.current = {
              workers: safeWorkersJson,
              attendance: safeAttendanceJson,
            };

            setWorkers(safeWorkers);
            setAttendanceDB(safeAttendance);
            try {
              localStorage.setItem('hazari_workers', safeWorkersJson);
              localStorage.setItem('hazari_attendance_db', safeAttendanceJson);
              if (user?.uid) {
                localStorage.setItem(`hazari_workers_${user.uid}`, safeWorkersJson);
                localStorage.setItem(`hazari_attendance_db_${user.uid}`, safeAttendanceJson);
              }
            } catch (e) {}
          }

          hasInitializedCloudRef.current = true;
          hasLocalChangesRef.current = false;
          setHasLocalChanges(false);
        } else if (user?.uid && cur.workers.length > 0 && !hasInitializedCloudRef.current) {
          // Initial migration: cloud is empty, back up existing local data if owned by this user
          hasInitializedCloudRef.current = true;
          const curEmail = user.email?.trim().toLowerCase() || '';
          const ownCleanWorkers = cur.workers.filter((w) => {
            const wEmail = w.userEmail?.trim().toLowerCase() || '';
            if (wEmail.includes('bharatchauhan103') && !curEmail.includes('bharatchauhan')) {
              return false;
            }
            if (w.userId && w.userId !== user.uid) return false;
            if (curEmail && wEmail && wEmail !== curEmail) return false;
            return true;
          });
          if (ownCleanWorkers.length > 0 && !isQuotaExhausted()) {
            backupToFirestore(user.uid, ownCleanWorkers, cur.attendanceDB, user.email).catch(() => {});
          }
        }
      },
      (error) => {
        if (isQuotaExhaustedError(error)) {
          markQuotaExhausted();
        } else {
          console.warn('Real-time sync subscription error:', error);
        }
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [user]);

  // Automatic live backup trigger (1000ms debounce ensures laptop changes reflect on mobile within < 2 seconds)
  useEffect(() => {
    if (!user || !hasLocalChanges || isQuotaExhausted()) return;

    const delayDebounceFn = setTimeout(async () => {
      setIsBackingUp(true);
      try {
        await backupToFirestore(user.uid, workers, attendanceDB, user.email);
        lastSyncedJsonRef.current = {
          workers: JSON.stringify(workers),
          attendance: JSON.stringify(attendanceDB),
        };
        hasLocalChangesRef.current = false;
        setHasLocalChanges(false);
      } catch (err: any) {
        if (err?.message === 'QUOTA_EXHAUSTED' || isQuotaExhaustedError(err)) {
          markQuotaExhausted(err?.message);
          hasLocalChangesRef.current = false;
          setHasLocalChanges(false);
        } else {
          console.warn('Auto-backup notice:', err);
        }
      } finally {
        setIsBackingUp(false);
      }
    }, 1000); // 1.0s debounce: Fast enough to sync in < 2 seconds, while batches edits to conserve quota

    return () => clearTimeout(delayDebounceFn);
  }, [workers, attendanceDB, user, hasLocalChanges]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const currentUser = await googleSignIn();
      if (currentUser) {
        setUser(currentUser);
        setStatusMessage({
          text: 'ગૂગલ એકાઉન્ટ સાથે લોગિન સફળ થયું! હવે તમારો બધો ચોપડો ઓટોમેટીક સુરક્ષિત રીતે સેવ થશે.',
          type: 'success',
        });
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        setStatusMessage({
          text: 'લૉગ-ઈન વિન્ડો બંધ કરવામાં આવી હતી.',
          type: 'info',
        });
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        setStatusMessage({
          text: 'નેટવર્ક ક્ષતિ: પોપ-અપ કે નેટવર્ક કનેક્શન ચકાસો. અથવા "Open in New Tab" માં ચલાવો જેથી પોપઅપ બ્લોક ન થાય.',
          type: 'info',
        });
      } else {
        setStatusMessage({
          text: `લૉગ-ઈન અસફળ: ${err.message || 'અજ્ઞાત ક્ષતિ'}`,
          type: 'error',
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setStatusMessage(null);
    try {
      await logout();
      setUser(null);
      setHasLocalChanges(false);
      setStatusMessage({
        text: 'ગૂગલ ક્લાઉડ સિંકિંગ બંધ કરવામાં આવ્યું છે.',
        type: 'info',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackup = async () => {
    if (!user) return;
    setIsBackingUp(true);
    setStatusMessage(null);
    try {
      await backupToFirestore(user.uid, workers, attendanceDB, user.email);
      setStatusMessage({
        text: 'તમારો તમામ હિસાબ ગૂગલ ક્લાઉડ પર સફળતાપૂર્વક સાચવી લેવાયો છે! ✓',
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `ક્લાઉડ સેવ કરવામાં ક્ષતિ: ${err.message || 'અજ્ઞાત'}`,
        type: 'error',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    let activeUser = user || auth.currentUser;
    if (!activeUser) {
      try {
        setIsLoggingIn(true);
        setStatusMessage({
          text: 'ક્લાઉડ માંથી હિસાબ રીસ્ટોર કરવા માટે ગૂગલ લોગિન શરૂ થઈ રહ્યું છે...',
          type: 'info',
        });
        activeUser = await googleSignIn();
        if (activeUser) {
          setUser(activeUser);
        } else {
          return;
        }
      } catch (err: any) {
        setIsLoggingIn(false);
        setStatusMessage({
          text: `ગૂગલ લોગિન અસફળ: ${err.message || 'અજ્ઞાત ક્ષતિ'}`,
          type: 'error',
        });
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    setIsRestoring(true);
    setStatusMessage({
      text: `${activeUser.email || 'ગૂગલ એકાઉન્ટ'} માંથી ડેટા લાવી લોકલ સ્ટોરેજમાં રીસ્ટોર થઈ રહ્યો છે...`,
      type: 'info',
    });
    try {
      const data = await restoreFromFirestore(activeUser.uid, activeUser.email);
      if (data && (data.workers.length > 0 || Object.keys(data.attendanceDB).length > 0)) {
        isApplyingCloudUpdateRef.current = true;
        setWorkers(data.workers);
        setAttendanceDB(data.attendanceDB);

        // Crucial: Update ALL localStorage keys so local storage is 100% restored
        const workersJson = JSON.stringify(data.workers);
        const attendanceJson = JSON.stringify(data.attendanceDB);

        localStorage.setItem('hazari_workers', workersJson);
        localStorage.setItem('hazari_attendance_db', attendanceJson);
        localStorage.setItem(`hazari_workers_${activeUser.uid}`, workersJson);
        localStorage.setItem(`hazari_attendance_db_${activeUser.uid}`, attendanceJson);
        if (activeUser.email?.toLowerCase().includes('pragnesh')) {
          localStorage.setItem('hazari_workers_pragnesh', workersJson);
          localStorage.setItem('hazari_attendance_db_pragnesh', attendanceJson);
        }

        hasLocalChangesRef.current = false;
        setHasLocalChanges(false);
        lastSyncedJsonRef.current = { workers: workersJson, attendance: attendanceJson };
        cacheLastUploaded(data.workers, data.attendanceDB);

        setStatusMessage({
          text: `તમારા ગૂગલ એકાઉન્ટ (${activeUser.email || ''}) નો તમામ ડેટા ક્લાઉડ માંથી સફળતાપૂર્વક રીસ્ટોર થઈ ગયો છે! (${data.workers.length} કારીગરો અને ${Object.keys(data.attendanceDB).length} મહિનાનો હિસાબ સેવ થયો) ✓`,
          type: 'success',
        });
      } else {
        // Fallback: check if local storage had backup in scoped keys
        const scopedWorkers =
          localStorage.getItem(`hazari_workers_${activeUser.uid}`) ||
          localStorage.getItem('hazari_workers_pragnesh') ||
          localStorage.getItem('hazari_workers');
        const scopedAtt =
          localStorage.getItem(`hazari_attendance_db_${activeUser.uid}`) ||
          localStorage.getItem('hazari_attendance_db_pragnesh') ||
          localStorage.getItem('hazari_attendance_db');
        if (scopedWorkers && scopedWorkers !== '[]') {
          try {
            const parsedW = JSON.parse(scopedWorkers);
            const parsedA = scopedAtt ? JSON.parse(scopedAtt) : {};
            if (parsedW.length > 0) {
              isApplyingCloudUpdateRef.current = true;
              setWorkers(parsedW);
              setAttendanceDB(parsedA);
              localStorage.setItem('hazari_workers', scopedWorkers);
              if (scopedAtt) localStorage.setItem('hazari_attendance_db', scopedAtt);
              setStatusMessage({
                text: `સ્થાનિક બેકઅપમાંથી સફળતાપૂર્વક ડેટા લોકલ સ્ટોરેજમાં રીસ્ટોર થયો! (${parsedW.length} કારીગરો લોડ થયા) ✓`,
                type: 'success',
              });
              return;
            }
          } catch (e) {}
        }
        setStatusMessage({
          text: `ગૂગલ એકાઉન્ટ (${activeUser.email || ''}) પર ક્લાઉડ ડેટાબેઝમાં હજી કોઈ સેવ કરેલ હિસાબ મળ્યો નથી.`,
          type: 'info',
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `રીસ્ટોર કરવામાં ક્ષતિ: ${err.message || 'અજ્ઞાત ક્ષતિ'}`,
        type: 'error',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportBackup = () => {
    try {
      exportBackupToFile(workers, attendanceDB);
      setStatusMessage({
        text: 'બેકઅપ ફાઈલ (.json) સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ છે! આ ફાઈલ WhatsApp દ્વારા લેપટોપમાં મોકલી શકો છો.',
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: `બેકઅપ ડાઉનલોડ કરવામાં ક્ષતિ: ${err.message}`,
        type: 'error',
      });
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const imported = await importBackupFromFile(file);

      const { merged: mergedWorkers } = mergeWorkers(workers, imported.workers, user?.uid, user?.email);
      const importedWorkerIds = new Set(mergedWorkers.map((w) => w.id));
      const { merged: mergedAttendance } = mergeAttendanceDB(attendanceDB, imported.attendanceDB, importedWorkerIds);

      setWorkers(mergedWorkers);
      setAttendanceDB(mergedAttendance);

      localStorage.setItem('hazari_workers', JSON.stringify(mergedWorkers));
      localStorage.setItem('hazari_attendance_db', JSON.stringify(mergedAttendance));

      // Trigger cloud sync
      if (!isQuotaExhausted()) {
        backupToFirestore(user?.uid, mergedWorkers, mergedAttendance, user?.email).catch(() => {});
      }

      setStatusMessage({
        text: `બેકઅપ ફાઈલ સફળતાપૂર્વક અપલોડ થઈ ગઈ છે! (${imported.count} કારીગરો લોડ થયા) ✓`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: `બેકઅપ અપલોડ નિષ્ફળ: ${err.message}`,
        type: 'error',
      });
    }
  };

  // Manage Workers Actions
  const handleAddNewWorker = (data: { name: string; village: string; dailyWage: number; mobile?: string }) => {
    lastLocalEditTimeRef.current = Date.now();
    hasLocalChangesRef.current = true;
    setHasLocalChanges(true);
    const startKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const now = Date.now();
    const newWorker: Worker = {
      id: `worker-${now}`,
      name: data.name,
      village: data.village,
      dailyWage: data.dailyWage,
      wageHistory: {
        '2020-01': data.dailyWage,
        [startKey]: data.dailyWage,
      },
      mobile: data.mobile || '',
      updatedAt: now,
      userId: user?.uid,
      userEmail: user?.email || '',
    };
    setWorkers((prev) => {
      const nextWorkers = [...prev, newWorker];
      try {
        localStorage.setItem('hazari_workers', JSON.stringify(nextWorkers));
        if (user?.uid) {
          localStorage.setItem(`hazari_workers_${user.uid}`, JSON.stringify(nextWorkers));
        }
      } catch (e) {}
      return nextWorkers;
    });
  };

  const handleEditWorker = (data: {
    name: string;
    village: string;
    dailyWage: number;
    mobile?: string;
    wageScope?: 'from_current_month' | 'all_months';
    effectiveYear?: number;
    effectiveMonth?: number;
  }) => {
    if (!editingWorker) return;
    lastLocalEditTimeRef.current = Date.now();
    hasLocalChangesRef.current = true;
    setHasLocalChanges(true);

    const effYear = data.effectiveYear || selectedYear;
    const effMonth = data.effectiveMonth || selectedMonth;
    const effKey = `${effYear}-${String(effMonth).padStart(2, '0')}`;
    const newWage = Number(data.dailyWage);

    setWorkers((prev) => {
      const nextWorkers = prev.map((w) => {
        if (w.id !== editingWorker.id) return w;

        let updatedHistory: Record<string, number> = { ...(w.wageHistory || {}) };
        
        // Calculate the effective wage for the immediately prior month
        const prevMonthDate = new Date(effYear, effMonth - 2, 1);
        const prevYear = prevMonthDate.getFullYear();
        const prevMonth = prevMonthDate.getMonth() + 1;
        const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        const priorWage = getWorkerWageForMonth(w, prevYear, prevMonth) || Number(w.dailyWage) || newWage;

        if (data.wageScope === 'all_months') {
          // Reset all wage history to the new wage from the beginning
          updatedHistory = { '2020-01': newWage, [effKey]: newWage };
        } else {
          // 1. Ensure baseline ancient history is locked to prior wage
          if (typeof updatedHistory['2020-01'] !== 'number') {
            updatedHistory['2020-01'] = priorWage;
          }
          // 2. Lock in previous month wage if prior to effKey so earlier months remain untouched
          if (prevKey < effKey && typeof updatedHistory[prevKey] !== 'number') {
            updatedHistory[prevKey] = priorWage;
          }
          // 3. Set new wage starting strictly from this month onwards
          updatedHistory[effKey] = newWage;
        }

        const sortedKeys = Object.keys(updatedHistory).sort();
        const latestWage = sortedKeys.length > 0 ? updatedHistory[sortedKeys[sortedKeys.length - 1]] : newWage;

        return {
          ...w,
          name: data.name,
          village: data.village,
          dailyWage: latestWage,
          wageHistory: updatedHistory,
          mobile: data.mobile || '',
          updatedAt: Date.now(),
        };
      });

      try {
        localStorage.setItem('hazari_workers', JSON.stringify(nextWorkers));
      } catch (e) {}
      return nextWorkers;
    });

    setEditingWorker(null);
    const effMonthLabel = months.find((m) => m.value === effMonth)?.label || '';
    setStatusMessage({
      text: data.wageScope === 'all_months'
        ? `કારીગરની માહિતી અને પગાર સફળતાપૂર્વક અપડેટ થયા છે.`
        : `કારીગરનો નવો રોજ ₹${newWage} ${effMonthLabel} ${effYear} થી લાગુ થયો છે (પાછલા મહિનાનો જૂનો હિસાબ અને રોજ યથાવત સુરક્ષિત રહેશે) ✓`,
      type: 'success',
    });
  };

  const handleDeactivateWorkerForMonth = (workerId: string, month: number, year: number) => {
    const now = Date.now();
    lastLocalEditTimeRef.current = now;
    hasLocalChangesRef.current = true;
    setHasLocalChanges(true);
    const periodKey1 = `${year}-${month}`;
    const periodKey2 = `${year}-${String(month).padStart(2, '0')}`;
    let deactivatedName = '';
    setWorkers((prev) => {
      const nextWorkers = prev.map((w) => {
        if (w.id === workerId) {
          deactivatedName = w.name;
          const existing = w.inactiveMonths || [];
          const updated = [...existing];
          if (!updated.includes(periodKey1)) updated.push(periodKey1);
          if (!updated.includes(periodKey2)) updated.push(periodKey2);
          return { ...w, inactiveMonths: updated, updatedAt: now };
        }
        return w;
      });
      try {
        localStorage.setItem('hazari_workers', JSON.stringify(nextWorkers));
      } catch (e) {}
      return nextWorkers;
    });
    if (selectedWorkerId === workerId) {
      setSelectedWorkerId(null);
    }
    const mLabel = months.find((m) => m.value === month)?.label || '';
    setStatusMessage({
      text: `${deactivatedName || 'કારીગર'} ને ${mLabel} ${year} ના હાજરીપત્રકમાંથી સફળતાપૂર્વક રદ કર્યો છે (જૂનો તમામ હિસાબ ૧૦૦% સુરક્ષિત સચવાયેલ છે) ✓`,
      type: 'success',
    });
  };

  const handleReactivateWorkerForMonth = (workerId: string, month: number, year: number) => {
    const now = Date.now();
    lastLocalEditTimeRef.current = now;
    hasLocalChangesRef.current = true;
    setHasLocalChanges(true);
    const keysToRemove = [
      `${year}-${month}`,
      `${year}_${month}`,
      `${year}-${String(month).padStart(2, '0')}`,
      `${year}_${String(month).padStart(2, '0')}`,
    ];
    let reactivatedName = '';
    setWorkers((prev) => {
      const nextWorkers = prev.map((w) => {
        if (w.id === workerId) {
          reactivatedName = w.name;
          const existing = w.inactiveMonths || [];
          return {
            ...w,
            inactiveMonths: existing.filter((k) => !keysToRemove.includes(k)),
            updatedAt: now,
          };
        }
        return w;
      });
      try {
        localStorage.setItem('hazari_workers', JSON.stringify(nextWorkers));
      } catch (e) {}
      return nextWorkers;
    });
    const mLabel = months.find((m) => m.value === month)?.label || '';
    setStatusMessage({
      text: `${reactivatedName || 'કારીગર'} ${mLabel} ${year} માં પુનઃ સક્રિય કરાયો છે ✓`,
      type: 'success',
    });
  };

  const handleDeleteWorkerPermanently = async (id: string) => {
    const now = Date.now();
    lastLocalEditTimeRef.current = now;
    hasLocalChangesRef.current = true;
    setHasLocalChanges(true);

    // Completely remove worker from state & local storage
    setWorkers((prev) => {
      const nextWorkers = prev.filter((w) => w.id !== id);
      try {
        localStorage.setItem('hazari_workers', JSON.stringify(nextWorkers));
        if (user?.uid) {
          localStorage.setItem(`hazari_workers_${user.uid}`, JSON.stringify(nextWorkers));
        }
      } catch (e) {}
      return nextWorkers;
    });

    setAttendanceDB((prev) => {
      const nextAtt = { ...prev };
      Object.keys(nextAtt).forEach((k) => {
        if (k.startsWith(`${id}_`)) {
          delete nextAtt[k];
        }
      });
      try {
        localStorage.setItem('hazari_attendance_db', JSON.stringify(nextAtt));
        if (user?.uid) {
          localStorage.setItem(`hazari_attendance_db_${user.uid}`, JSON.stringify(nextAtt));
        }
      } catch (e) {}
      return nextAtt;
    });

    if (selectedWorkerId === id) {
      setSelectedWorkerId(null);
    }

    // Delete directly from Firestore
    if (user?.uid) {
      try {
        await deleteWorkerFromFirestore(id);
      } catch (e) {}
    }

    setStatusMessage({
      text: 'કારીગર અને તેમનો તમામ હિસાબ સફળતાપૂર્વક ડિલીટ કરાયા છે. ✓',
      type: 'success',
    });
  };

  const handleRestoreDeletedWorker = (id: string) => {
    const now = Date.now();
    lastLocalEditTimeRef.current = now;
    hasLocalChangesRef.current = true;
    setHasLocalChanges(true);
    setWorkers((prev) => {
      const nextWorkers = prev.map((w) => (w.id === id ? { ...w, isDeleted: false, updatedAt: now } : w));
      try {
        localStorage.setItem('hazari_workers', JSON.stringify(nextWorkers));
      } catch (e) {}
      return nextWorkers;
    });
    setStatusMessage({
      text: 'કારીગર સફળતાપૂર્વક ચાલુ લિસ્ટમાં પુનઃ સક્રિય કરાયો છે.',
      type: 'success',
    });
  };

  // Manage Attendance inline modification
  const handleUpdateAttendance = (
    workerId: string,
    day: number,
    field: 'status' | 'upad' | 'note',
    value: any
  ) => {
    lastLocalEditTimeRef.current = Date.now();
    hasLocalChangesRef.current = true;
    setHasLocalChanges(true);
    const key = `${workerId}_${selectedYear}_${selectedMonth}`;
    setAttendanceDB((prev) => {
      const currentWorkerMonth = prev[key] || {};
      const dayRecord = currentWorkerMonth[day] || { status: '', upad: 0, note: '' };

      const updatedDayRecord = {
        ...dayRecord,
        [field]: value,
      };

      const nextDB = {
        ...prev,
        [key]: {
          ...currentWorkerMonth,
          [day]: updatedDayRecord,
        },
      };

      try {
        localStorage.setItem('hazari_attendance_db', JSON.stringify(nextDB));
      } catch (e) {
        console.error('Error saving attendance to localStorage:', e);
      }

      return nextDB;
    });
  };

  const handleViewWorkerAttendance = (workerId: string) => {
    setSelectedWorkerId(workerId);
    setActiveTab('attendance');
  };

  const handleSaveModal = (data: {
    name: string;
    village: string;
    dailyWage: number;
    mobile?: string;
    wageScope?: 'from_current_month' | 'all_months';
    effectiveYear?: number;
    effectiveMonth?: number;
  }) => {
    if (editingWorker) {
      handleEditWorker(data);
    } else {
      handleAddNewWorker(data);
    }
  };

  const handleRestoreSuccess = (
    restoredWorkers: Worker[],
    restoredAttendanceDB: Record<string, MonthlyWorkerAttendance>
  ) => {
    setWorkers(restoredWorkers);
    setAttendanceDB(restoredAttendanceDB);
  };

  const handleSaveQuickMonthlyRecord = (data: {
    workerId: string;
    isNewWorker?: boolean;
    workerData?: { name: string; village: string; dailyWage: number; mobile?: string };
    year: number;
    month: number;
    presentDays: number;
    absentDays: number;
    dailyWage: number;
    totalUpad: number;
    note?: string;
  }) => {
    const now = Date.now();
    lastLocalEditTimeRef.current = now;
    hasLocalChangesRef.current = true;
    setHasLocalChanges(true);

    const finalWorkerId = data.workerId;
    const targetKey = `${data.year}-${String(data.month).padStart(2, '0')}`;
    let updatedWorkersList: Worker[] = [];

    if (data.isNewWorker && data.workerData) {
      const newWorker: Worker = {
        id: finalWorkerId,
        name: data.workerData.name,
        village: data.workerData.village,
        dailyWage: data.workerData.dailyWage,
        wageHistory: {
          '2020-01': data.workerData.dailyWage,
          [targetKey]: data.workerData.dailyWage,
        },
        mobile: data.workerData.mobile || '',
        updatedAt: now,
      };
      setWorkers((prev) => {
        const nextWorkers = [...prev, newWorker];
        updatedWorkersList = nextWorkers;
        try {
          localStorage.setItem('hazari_workers', JSON.stringify(nextWorkers));
          if (user?.uid) {
            localStorage.setItem(`hazari_workers_${user.uid}`, JSON.stringify(nextWorkers));
          }
        } catch (e) {}
        return nextWorkers;
      });
    } else {
      setWorkers((prev) => {
        const nextWorkers = prev.map((w) => {
          if (w.id !== data.workerId) return w;
          const currentHist = { ...(w.wageHistory || {}) };
          
          // Calculate prior wage
          const prevMonthDate = new Date(data.year, data.month - 2, 1);
          const prevYear = prevMonthDate.getFullYear();
          const prevMonth = prevMonthDate.getMonth() + 1;
          const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
          const priorWage = getWorkerWageForMonth(w, prevYear, prevMonth) || Number(w.dailyWage) || data.dailyWage;

          if (typeof currentHist['2020-01'] !== 'number') {
            currentHist['2020-01'] = priorWage;
          }
          if (prevKey < targetKey && typeof currentHist[prevKey] !== 'number') {
            currentHist[prevKey] = priorWage;
          }
          currentHist[targetKey] = data.dailyWage;
          const sortedKeys = Object.keys(currentHist).sort();
          const latestWage = sortedKeys.length > 0 ? currentHist[sortedKeys[sortedKeys.length - 1]] : data.dailyWage;

          // Clear inactive marks for this specific month so worker is active
          const k1 = `${data.year}-${data.month}`;
          const k2 = `${data.year}_${data.month}`;
          const k3 = `${data.year}-${String(data.month).padStart(2, '0')}`;
          const existingInactive = w.inactiveMonths || [];
          const cleanInactive = existingInactive.filter((p) => p !== k1 && p !== k2 && p !== k3);

          return {
            ...w,
            dailyWage: latestWage,
            wageHistory: currentHist,
            inactiveMonths: cleanInactive,
            updatedAt: now,
          };
        });
        updatedWorkersList = nextWorkers;
        try {
          localStorage.setItem('hazari_workers', JSON.stringify(nextWorkers));
          if (user?.uid) {
            localStorage.setItem(`hazari_workers_${user.uid}`, JSON.stringify(nextWorkers));
          }
        } catch (e) {}
        return nextWorkers;
      });
    }

    const totalDays = getDaysInMonth(data.year, data.month);
    const key = `${finalWorkerId}_${data.year}_${data.month}`;

    setAttendanceDB((prev) => {
      const existingRecord = prev[key] || {};
      const monthAttendance: MonthlyWorkerAttendance = { ...existingRecord };
      const fullPresent = Math.floor(data.presentDays);
      const hasHalf = data.presentDays % 1 !== 0;

      for (let day = 1; day <= totalDays; day++) {
        const prevDay = existingRecord[day] || { status: '', upad: 0, note: '' };
        if (day <= fullPresent) {
          monthAttendance[day] = {
            ...prevDay,
            status: 'P',
            upad: day === 1 && data.totalUpad > 0 ? data.totalUpad : (prevDay.upad || 0),
            note: day === 1 && data.note ? data.note : (prevDay.note || ''),
          };
        } else if (hasHalf && day === fullPresent + 1) {
          monthAttendance[day] = {
            ...prevDay,
            status: 'H',
            upad: prevDay.upad || 0,
            note: prevDay.note || '',
          };
        } else {
          monthAttendance[day] = {
            ...prevDay,
            status: 'A',
            upad: prevDay.upad || 0,
            note: prevDay.note || '',
          };
        }
      }

      if (data.presentDays === 0 && data.totalUpad > 0) {
        monthAttendance[1] = {
          ...(existingRecord[1] || {}),
          status: existingRecord[1]?.status || 'A',
          upad: data.totalUpad,
          note: data.note || existingRecord[1]?.note || '',
        };
      }

      const nextDB = {
        ...prev,
        [key]: monthAttendance,
      };

      try {
        localStorage.setItem('hazari_attendance_db', JSON.stringify(nextDB));
        if (user?.uid) {
          localStorage.setItem(`hazari_attendance_db_${user.uid}`, JSON.stringify(nextDB));
        }
      } catch (e) {
        console.error('Error saving attendance db:', e);
      }

      if (user?.uid) {
        backupToFirestore(
          user.uid,
          updatedWorkersList.length > 0 ? updatedWorkersList : workers,
          nextDB,
          user.email
        ).catch(() => {});
      }

      return nextDB;
    });

    const targetMonthLabel = months.find((m) => m.value === data.month)?.label || '';
    setStatusMessage({
      text: `${targetMonthLabel} ${data.year} નો હિસાબ સુરક્ષિત સેવ થયો છે! (${data.presentDays} હાજર, ₹${Math.round(data.presentDays * data.dailyWage)} કમાણી) ✓`,
      type: 'success',
    });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-gray-50 pb-12 transition-colors duration-200 dark:bg-slate-950">
      {/* Premium Top Navigation header */}
      <Navbar
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        user={user}
        isLoggingIn={isLoggingIn}
        onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
      />

      {/* Main Responsive Grid Layout Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          
          {/* Left Navigation Rails Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            isLoggingIn={isLoggingIn}
            onRestore={handleRestore}
            isRestoring={isRestoring}
            onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
          />

          {/* Right Main Content Stage section */}
          <section className="flex-1 min-w-0" id="main-content-stage">
            {activeTab === 'dashboard' && (
              <DashboardView
                workers={workers}
                attendanceDB={attendanceDB}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onRestoreSuccess={handleRestoreSuccess}
                user={user}
                isLoggingIn={isLoggingIn}
                isBackingUp={isBackingUp}
                isRestoring={isRestoring}
                hasLocalChanges={hasLocalChanges}
                statusMessage={statusMessage}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onRestore={handleRestore}
                onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
                onNavigateToTab={(tab) => {
                  setActiveTab(tab);
                  if (tab === 'workers') {
                    // Reset selected worker to prevent straight lock on single user
                    setSelectedWorkerId(null);
                  }
                }}
              />
            )}

            {activeTab === 'workers' && (
              <WorkersView
                workers={workers}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onOpenAddModal={() => {
                  setEditingWorker(null);
                  setIsModalOpen(true);
                }}
                onOpenEditModal={(w) => {
                  setEditingWorker(w);
                  setIsModalOpen(true);
                }}
                onRequestDeleteWorker={(w) => setDeletingWorker(w)}
                onReactivateWorker={handleReactivateWorkerForMonth}
                onRestoreDeletedWorker={handleRestoreDeletedWorker}
                onViewWorkerAttendance={handleViewWorkerAttendance}
                user={user}
                onRestore={handleRestore}
                onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceView
                workers={workers}
                selectedWorkerId={selectedWorkerId}
                onSelectWorker={setSelectedWorkerId}
                attendanceDB={attendanceDB}
                onUpdateAttendance={handleUpdateAttendance}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                onEditWorkerWage={(w) => {
                  setEditingWorker(w);
                  setIsModalOpen(true);
                }}
                onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                workers={workers}
                attendanceDB={attendanceDB}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onViewWorkerAttendance={handleViewWorkerAttendance}
              />
            )}

            {activeTab === 'admin' && (
              <AdminPanelView
                workers={workers}
                attendanceDB={attendanceDB}
                user={user}
                isLoggingIn={isLoggingIn}
                isBackingUp={isBackingUp}
                isRestoring={isRestoring}
                statusMessage={statusMessage}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onBackup={handleBackup}
                onRestore={handleRestore}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
              />
            )}
          </section>
        </div>
      </main>

      {/* Footer with Cloud Restore Action & Developer Branding */}
      <footer className="w-full py-5 mt-auto border-t border-gray-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <button
              type="button"
              id="footer-cloud-restore-btn"
              onClick={handleRestore}
              disabled={isRestoring}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-teal-200 dark:shadow-none transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="ક્લાઉડ માંથી ડેટા રીસ્ટોર કરો"
            >
              <i className={`fa-solid ${isRestoring ? 'fa-spinner animate-spin' : 'fa-cloud-arrow-down'} text-sm`}></i>
              <span>
                {isRestoring ? 'ક્લાઉડ માંથી રીસ્ટોર થઈ રહ્યું છે...' : 'ક્લાઉડ માંથી ડેટા રીસ્ટોર કરો'}
              </span>
            </button>
            {user ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300 bg-teal-50 dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 px-3 py-1.5 rounded-xl">
                <i className="fa-brands fa-google text-teal-600 dark:text-teal-400"></i>
                <span className="truncate max-w-[220px] sm:max-w-none">{user.email}</span>
              </span>
            ) : null}
          </div>

          <p className="text-[11px] sm:text-xs font-black text-gray-400 dark:text-slate-500 font-sans tracking-wide select-none">
            developed by Pragnesh Chauhan
          </p>
        </div>
      </footer>

      {/* Floating Worker Form Dialog modal */}
      <WorkerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWorker(null);
        }}
        onSave={handleSaveModal}
        initialData={editingWorker}
        workers={workers}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      {/* Worker Deactivation / Deletion Selection Modal */}
      <DeleteWorkerModal
        isOpen={Boolean(deletingWorker)}
        worker={deletingWorker}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onClose={() => setDeletingWorker(null)}
        onDeactivateForMonth={handleDeactivateWorkerForMonth}
        onDeletePermanently={handleDeleteWorkerPermanently}
      />

      {/* Quick Past Month Direct Entry Modal */}
      <QuickPastMonthModal
        isOpen={isQuickEntryOpen}
        onClose={() => setIsQuickEntryOpen(false)}
        workers={workers}
        attendanceDB={attendanceDB}
        onSaveMonthlyRecord={handleSaveQuickMonthlyRecord}
        onViewWorkerAttendance={(workerId) => {
          setSelectedWorkerId(workerId);
          setActiveTab('attendance');
        }}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
      />
    </div>
  );
}
