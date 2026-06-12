import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import WorkerModal from './components/WorkerModal';
import DashboardView from './components/DashboardView';
import WorkersView from './components/WorkersView';
import AttendanceView from './components/AttendanceView';
import ReportsView from './components/ReportsView';
import { Worker, MonthlyWorkerAttendance, ActiveTab, AttendanceStatus } from './types';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  backupToFirestore,
  restoreFromFirestore,
  testConnection,
} from './utils/firebaseSync';

// Let's seed pre-populated demo workers if none exist in LocalStorage
const DEMO_WORKERS: Worker[] = [];

// Let's seed some dummy attendance records so the dashboard looks instantly gorgeous and responsive!
const DEMO_ATTENDANCE: Record<string, MonthlyWorkerAttendance> = {};

export default function App() {
  // Fetch initial states from localStorage
  const [workers, setWorkers] = useState<Worker[]>(() => {
    const saved = localStorage.getItem('hazari_workers');
    if (saved) {
      const parsed = JSON.parse(saved) as Worker[];
      // Permanently filter out the previous demo/example workers
      return parsed.filter((w) => {
        const isDemo =
          w.id === 'worker-1' ||
          w.id === 'worker-2' ||
          w.id === 'worker-3' ||
          w.name === 'હસમુખભાઈ' ||
          w.name === 'રમેશભાઈ' ||
          w.name === 'મુકેશભાઈ' ||
          w.name === 'હસમુખ' ||
          w.name === 'રમેશ' ||
          w.name === 'મુકેશ' ||
          w.name === 'Hasmukhbhai' ||
          w.name === 'Rameshbhai' ||
          w.name === 'Mukeshbhai';
        return !isDemo;
      });
    }
    return [];
  });

  const [attendanceDB, setAttendanceDB] = useState<Record<string, MonthlyWorkerAttendance>>(() => {
    const saved = localStorage.getItem('hazari_attendance_db');
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, MonthlyWorkerAttendance>;
      const filtered: Record<string, MonthlyWorkerAttendance> = {};
      Object.keys(parsed).forEach((key) => {
        if (!key.startsWith('worker-1_') && !key.startsWith('worker-2_') && !key.startsWith('worker-3_')) {
          filtered[key] = parsed[key];
        }
      });
      return filtered;
    }
    return {};
  });

  // Default to June (6) and Year (2026) based on metadata timestamp
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = localStorage.getItem('hazari_selected_month');
    return saved ? Number(saved) : 6;
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('hazari_selected_year');
    return saved ? Number(saved) : 2026;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // Darkmode theme preference state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hazari_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Worker Modal trigger state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

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
  const ignoreNextChangeRef = useRef(false);

  // Initialize Auth handler and connection testing on load
  useEffect(() => {
    testConnection();
    
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
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

  // Detect local state changes to mark as dirty/pending sync (always active at root)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (ignoreNextChangeRef.current) {
      ignoreNextChangeRef.current = false;
      return;
    }
    setHasLocalChanges(true);
  }, [workers, attendanceDB]);

  // Check if user has cloud data on login
  useEffect(() => {
    const checkCloudData = async () => {
      if (!user) return;
      try {
        const data = await restoreFromFirestore(user.uid);
        if (data && (data.workers.length > 0 || Object.keys(data.attendanceDB).length > 0)) {
          // Only show prompt if local changes are false
          if (!hasLocalChanges) {
            setStatusMessage({
              text: 'તમારો અગાઉ સેવ કરેલો હિસાબ ગૂગલ ક્લાઉડ પર ઉપલબ્ધ છે. જો તમારે જૂનો હિસાબ આ ફોનમાં પાછો લાવવો હોય તો નીચે "ક્લાઉડ માંથી હિસાબ રીસ્ટોર કરો" બટન દબાવો.',
              type: 'info',
            });
          }
        }
      } catch (err) {
        console.error('Error checking cloud data:', err);
      }
    };

    checkCloudData();
  }, [user]);

  // Automatic backup trigger (Debounced)
  useEffect(() => {
    if (!user || !hasLocalChanges) return;

    const delayDebounceFn = setTimeout(async () => {
      setIsBackingUp(true);
      setStatusMessage(null);
      try {
        await backupToFirestore(user.uid, workers, attendanceDB);
        setHasLocalChanges(false);
        setStatusMessage({
          text: 'નવા સુધારા આપોઆપ ક્લાઉડ ડેટાબેઝ પર સુરક્ષિત રીતે સેવ થઈ ગયા છે ✓',
          type: 'success',
        });
      } catch (err: any) {
        console.error('Auto-backup failed:', err);
        setStatusMessage({
          text: `ઓટો-સેવ નિષ્ફળ: ${err.message || 'અજ્ઞાત ક્ષતિ'}`,
          type: 'error',
        });
      } finally {
        setIsBackingUp(false);
      }
    }, 2500); // 2.5s debounce

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
      console.error(err);
      if (err.message?.includes('popup-closed-by-user')) {
        setStatusMessage({
          text: 'સિંક કરવા માટે કનેક્શન વિન્ડો અકાળે બંધ થઈ હતી. "Open in New Tab" માં ચલાવો જેથી પોપઅપ બ્લોક ન થાય.',
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

  const handleRestore = async () => {
    if (!user) return;
    
    const confirmRestore = window.confirm(
      'સાવધાની: શું તમે ખરેખર ગૂગલ ક્લાઉડ પરથી જૂનો ડેટા આ ફોનમાં લેવા (Restore) માંગો છો? આનાથી તમારા ચાલુ ફોનનો ડેટા સંપૂર્ણ બદલાઈ જશે!'
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const data = await restoreFromFirestore(user.uid);
      if (data) {
        ignoreNextChangeRef.current = true;
        setWorkers(data.workers);
        setAttendanceDB(data.attendanceDB);
        setHasLocalChanges(false);
        setStatusMessage({
          text: 'ક્લાઉડ ડેટાબેઝ પરથી સફળતાપૂર્વક હિસાબ પાછો મેળવી લીધો છે!',
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: 'તમારી આ ગૂગલ ખાતા પર ક્લાઉડ ડેટાબેઝમાં હજી કોઈ સેવ ડેટા મળ્યો નથી.',
          type: 'info',
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `રીસ્ટોર નિષ્ફળ: ${err.message || 'અજ્ઞાત ક્ષતિ'}`,
        type: 'error',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Manage Workers Actions
  const handleAddNewWorker = (data: { name: string; village: string; dailyWage: number; mobile?: string }) => {
    const newWorker: Worker = {
      id: `worker-${Date.now()}`,
      name: data.name,
      village: data.village,
      dailyWage: data.dailyWage,
      mobile: data.mobile || '',
    };
    setWorkers((prev) => [...prev, newWorker]);
  };

  const handleEditWorker = (data: { name: string; village: string; dailyWage: number; mobile?: string }) => {
    if (!editingWorker) return;
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === editingWorker.id
          ? { ...w, name: data.name, village: data.village, dailyWage: data.dailyWage, mobile: data.mobile || '' }
          : w
      )
    );
    setEditingWorker(null);
  };

  const handleDeleteWorker = (id: string) => {
    const confirmDelete = window.confirm('શું તમે ખરેખર આ કારીગરને રદ કરવા માંગો છો? આનાથી તેમની હાજરીનો રેકોર્ડ પણ નીકળી જશે.');
    if (confirmDelete) {
      setWorkers((prev) => prev.filter((w) => w.id !== id));
      if (selectedWorkerId === id) {
        setSelectedWorkerId(null);
      }
      
      // Clean up attendance records for this worker in db keys
      setAttendanceDB((prev) => {
        const copy = { ...prev };
        Object.keys(copy).forEach((key) => {
          if (key.startsWith(`${id}_`)) {
            delete copy[key];
          }
        });
        return copy;
      });
    }
  };

  // Manage Attendance inline modification
  const handleUpdateAttendance = (
    workerId: string,
    day: number,
    field: 'status' | 'upad' | 'note',
    value: any
  ) => {
    const key = `${workerId}_${selectedYear}_${selectedMonth}`;
    setAttendanceDB((prev) => {
      const currentWorkerMonth = prev[key] || {};
      const dayRecord = currentWorkerMonth[day] || { status: '', upad: 0, note: '' };

      const updatedDayRecord = {
        ...dayRecord,
        [field]: value,
      };

      return {
        ...prev,
        [key]: {
          ...currentWorkerMonth,
          [day]: updatedDayRecord,
        },
      };
    });
  };

  const handleViewWorkerAttendance = (workerId: string) => {
    setSelectedWorkerId(workerId);
    setActiveTab('attendance');
  };

  const handleSaveModal = (data: { name: string; village: string; dailyWage: number; mobile?: string }) => {
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-12 transition-colors duration-200 dark:bg-slate-950">
      {/* Premium Top Navigation header */}
      <Navbar
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />

      {/* Main Responsive Grid Layout Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          
          {/* Left Navigation Rails Sidebar */}
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

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
                onOpenAddModal={() => {
                  setEditingWorker(null);
                  setIsModalOpen(true);
                }}
                onOpenEditModal={(w) => {
                  setEditingWorker(w);
                  setIsModalOpen(true);
                }}
                onDeleteWorker={handleDeleteWorker}
                onViewWorkerAttendance={handleViewWorkerAttendance}
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
          </section>
        </div>
      </main>

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
      />
    </div>
  );
}
