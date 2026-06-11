import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import WorkerModal from './components/WorkerModal';
import DashboardView from './components/DashboardView';
import WorkersView from './components/WorkersView';
import AttendanceView from './components/AttendanceView';
import ReportsView from './components/ReportsView';
import { Worker, MonthlyWorkerAttendance, ActiveTab, AttendanceStatus } from './types';

// Let's seed pre-populated demo workers if none exist in LocalStorage
const DEMO_WORKERS: Worker[] = [
  { id: 'worker-1', name: 'રમેશભાઈ વી. પટેલ', village: 'વરાછા, સુરત', dailyWage: 450 },
  { id: 'worker-2', name: 'હસમુખભાઈ ચૌહાણ', village: 'નવસારી', dailyWage: 500 },
  { id: 'worker-3', name: 'મુકેશભાઈ ગોહેલ', village: 'કાપોદ્રા, સુરત', dailyWage: 400 },
];

// Let's seed some dummy attendance records so the dashboard looks instantly gorgeous and responsive!
const DEMO_ATTENDANCE: Record<string, MonthlyWorkerAttendance> = {
  // worker 1 June 2026 dummy data
  'worker-1_2026_6': {
    1: { status: 'P', upad: 0, note: 'કામે આવ્યા' },
    2: { status: 'P', upad: 100, note: 'સાંજે ૧૦૦ લીધા' },
    3: { status: 'P', upad: 0, note: '' },
    4: { status: 'A', upad: 0, note: 'બીમાર હતા' },
    5: { status: 'P', upad: 0, note: '' },
    6: { status: 'P', upad: 200, note: 'ઘરખર્ચ માટે ઉપાડ' },
    7: { status: 'P', upad: 0, note: '' },
    8: { status: 'P', upad: 0, note: '' },
    9: { status: 'P', upad: 0, note: '' },
    10: { status: 'P', upad: 0, note: '' },
  },
  // worker 2 June 2026 dummy data
  'worker-2_2026_6': {
    1: { status: 'P', upad: 0, note: '' },
    2: { status: 'P', upad: 0, note: '' },
    3: { status: 'A', upad: 0, note: 'ગામ ગયા હતા' },
    4: { status: 'P', upad: 0, note: '' },
    5: { status: 'P', upad: 150, note: 'ઉપાડ લીધો' },
    6: { status: 'P', upad: 0, note: '' },
    7: { status: 'P', upad: 0, note: '' },
    8: { status: 'P', upad: 0, note: '' },
    9: { status: 'P', upad: 0, note: '' },
    10: { status: 'P', upad: 100, note: 'પુંજા ખર્ચ' },
  }
};

export default function App() {
  // Fetch initial states from localStorage
  const [workers, setWorkers] = useState<Worker[]>(() => {
    const saved = localStorage.getItem('hazari_workers');
    return saved ? JSON.parse(saved) : DEMO_WORKERS;
  });

  const [attendanceDB, setAttendanceDB] = useState<Record<string, MonthlyWorkerAttendance>>(() => {
    const saved = localStorage.getItem('hazari_attendance_db');
    return saved ? JSON.parse(saved) : DEMO_ATTENDANCE;
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

  // Sync to database
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

  // Manage Workers Actions
  const handleAddNewWorker = (data: { name: string; village: string; dailyWage: number }) => {
    const newWorker: Worker = {
      id: `worker-${Date.now()}`,
      name: data.name,
      village: data.village,
      dailyWage: data.dailyWage,
    };
    setWorkers((prev) => [...prev, newWorker]);
  };

  const handleEditWorker = (data: { name: string; village: string; dailyWage: number }) => {
    if (!editingWorker) return;
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === editingWorker.id
          ? { ...w, name: data.name, village: data.village, dailyWage: data.dailyWage }
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

  const handleSaveModal = (data: { name: string; village: string; dailyWage: number }) => {
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
      />
    </div>
  );
}
