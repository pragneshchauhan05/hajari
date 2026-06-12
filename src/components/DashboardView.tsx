import React from 'react';
import { Worker, MonthlyWorkerAttendance } from '../types';
import { calculateGlobalSummary, GUJARATI_MONTHS } from '../utils/attendanceUtils';
import FirebaseSyncPanel from './FirebaseSyncPanel';
import { User } from 'firebase/auth';

interface DashboardViewProps {
  workers: Worker[];
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
  selectedMonth: number;
  selectedYear: number;
  onNavigateToTab: (tab: 'dashboard' | 'workers' | 'attendance' | 'reports') => void;
  onRestoreSuccess: (
    workers: Worker[],
    attendanceDB: Record<string, MonthlyWorkerAttendance>
  ) => void;
  user: User | null;
  isLoggingIn: boolean;
  isBackingUp: boolean;
  isRestoring: boolean;
  hasLocalChanges: boolean;
  statusMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  onLogin: () => void;
  onLogout: () => void;
  onRestore: () => void;
}

export default function DashboardView({
  workers,
  attendanceDB,
  selectedMonth,
  selectedYear,
  onNavigateToTab,
  onRestoreSuccess,
  user,
  isLoggingIn,
  isBackingUp,
  isRestoring,
  hasLocalChanges,
  statusMessage,
  onLogin,
  onLogout,
  onRestore,
}: DashboardViewProps) {
  // Calculate stats for current selection
  const stats = calculateGlobalSummary(workers, attendanceDB, selectedYear, selectedMonth);
  const activeMonthLabel = GUJARATI_MONTHS.find((m) => m.value === selectedMonth)?.label || '';

  // Format currency
  const formatCurrency = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('gu-IN');
  };

  return (
    <div className="space-y-6">
      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Total Workers Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500 dark:bg-cyan-950/40 dark:text-cyan-455">
            <i className="fa-solid fa-users text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">કુલ કારીગરો</p>
            <h4 className="text-xl sm:text-2xl font-black text-gray-950 font-sans mt-0.5 dark:text-slate-100">{stats.totalWorkers}</h4>
          </div>
        </div>

        {/* Total Present Days Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400">
            <i className="fa-solid fa-circle-check text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">કુલ હાજર દિવસ</p>
            <h4 className="text-xl sm:text-2xl font-black text-emerald-600 font-sans mt-0.5 dark:text-emerald-400">{stats.totalPresent}</h4>
          </div>
        </div>

        {/* Total Absent Days Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400">
            <i className="fa-solid fa-circle-xmark text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">કુલ ગેરહાજર દિવસ</p>
            <h4 className="text-xl sm:text-2xl font-black text-rose-600 font-sans mt-0.5 dark:text-rose-400">{stats.totalAbsent}</h4>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
            <i className="fa-solid fa-wallet text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">કુલ કમાણી (જમા)</p>
            <h4 className="text-lg sm:text-2xl font-black text-teal-700 font-sans mt-0.5 dark:text-teal-400">{formatCurrency(stats.totalEarnings)}</h4>
          </div>
        </div>

        {/* Total Advances Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/30 dark:text-amber-400">
            <i className="fa-solid fa-hand-holding-dollar text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">કુલ ઉપાડ</p>
            <h4 className="text-lg sm:text-2xl font-black text-amber-700 font-sans mt-0.5 dark:text-amber-400">{formatCurrency(stats.totalUpad)}</h4>
          </div>
        </div>

        {/* Remaining Dues/Balance Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 col-span-2 lg:col-span-1 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
            <i className="fa-solid fa-scale-balanced text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">બાકી ચૂકવણી</p>
            <h4 className="text-lg sm:text-2xl font-black text-purple-700 font-sans mt-0.5 dark:text-purple-400">{formatCurrency(stats.totalBalance)}</h4>
          </div>
        </div>
      </div>

      {/* Quick navigation and workflow */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2 mb-4 dark:text-slate-100">
          <i className="fa-solid fa-bolt text-teal-500"></i>
          ઝડપી નેવિગેશન શોર્ટકટ (Quick Actions)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigateToTab('workers')}
            className="flex flex-col items-center justify-center p-5 rounded-2xl border border-gray-100 hover:border-teal-200 bg-gray-50 hover:bg-teal-50/20 text-center transition-all duration-200 group dark:border-slate-800 dark:bg-slate-950 dark:hover:border-teal-500 dark:hover:bg-slate-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-500 mb-3 group-hover:scale-110 duration-200 transition-transform dark:bg-amber-950/40 dark:text-orange-400">
              <i className="fa-solid fa-user-plus text-lg"></i>
            </div>
            <h4 className="font-bold text-gray-900 text-sm dark:text-white">નવો કારીગર ઉમેરો</h4>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-300">નવા કારીગરના ગામ અને પગાર સાથે નોધણી કરો.</p>
          </button>

          <button
            onClick={() => onNavigateToTab('attendance')}
            className="flex flex-col items-center justify-center p-5 rounded-2xl border border-gray-100 hover:border-teal-200 bg-gray-50 hover:bg-teal-50/20 text-center transition-all duration-200 group dark:border-slate-800 dark:bg-slate-950 dark:hover:border-teal-500 dark:hover:bg-slate-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-500 mb-3 group-hover:scale-110 duration-200 transition-transform dark:bg-teal-950/40 dark:text-teal-400">
              <i className="fa-solid fa-check-double text-lg"></i>
            </div>
            <h4 className="font-bold text-gray-900 text-sm dark:text-white">હાજરી પૂરો</h4>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-300">કારીગરોની હાજરી, રોજનો ઉપાડ અને વિશેષ નોંધ પાડો.</p>
          </button>

          <button
            onClick={() => onNavigateToTab('reports')}
            className="flex flex-col items-center justify-center p-5 rounded-2xl border border-gray-100 hover:border-teal-200 bg-gray-50 hover:bg-teal-50/20 text-center transition-all duration-200 group dark:border-slate-800 dark:bg-slate-950 dark:hover:border-teal-500 dark:hover:bg-slate-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-3 group-hover:scale-110 duration-200 transition-transform dark:bg-purple-950/40 dark:text-purple-400">
              <i className="fa-solid fa-file-invoice-dollar text-lg"></i>
            </div>
            <h4 className="font-bold text-gray-900 text-sm dark:text-white">માસિક અહેવાલ જુઓ</h4>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-300">આખા મહિનાની બાકી રકમ અને કુલ ચૂકવણી હિસાબ પત્રક.</p>
          </button>
        </div>
      </div>

      {/* Google Cloud Database Sync Panel */}
      <FirebaseSyncPanel
        workers={workers}
        attendanceDB={attendanceDB}
        onRestoreSuccess={onRestoreSuccess}
        user={user}
        isLoggingIn={isLoggingIn}
        isBackingUp={isBackingUp}
        isRestoring={isRestoring}
        hasLocalChanges={hasLocalChanges}
        statusMessage={statusMessage}
        onLogin={onLogin}
        onLogout={onLogout}
        onRestore={onRestore}
      />
    </div>
  );
}
