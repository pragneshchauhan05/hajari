import React from 'react';
import { Worker, MonthlyWorkerAttendance, ActiveTab } from '../types';
import { calculateGlobalSummary } from '../utils/attendanceUtils';
import { User } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/translations';

interface DashboardViewProps {
  workers: Worker[];
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
  selectedMonth: number;
  selectedYear: number;
  onNavigateToTab: (tab: ActiveTab) => void;
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
  onOpenQuickEntry?: () => void;
}

export default function DashboardView({
  workers,
  attendanceDB,
  selectedMonth,
  selectedYear,
  onNavigateToTab,
  onRestoreSuccess: _onRestoreSuccess,
  user,
  isLoggingIn: _isLoggingIn,
  isBackingUp: _isBackingUp,
  isRestoring,
  hasLocalChanges: _hasLocalChanges,
  statusMessage: _statusMessage,
  onLogin: _onLogin,
  onLogout: _onLogout,
  onRestore,
  onOpenQuickEntry,
}: DashboardViewProps) {
  const { language, t } = useLanguage();

  // Calculate stats for current selection
  const stats = calculateGlobalSummary(workers, attendanceDB, selectedYear, selectedMonth);

  // Format currency
  const formatCurrency = (val: number) => {
    return formatIndianCurrency(val);
  };

  return (
    <div className="space-y-6">
      {/* When no active workers are registered yet */}
      {workers.filter((w) => !w.isDeleted).length === 0 && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5 dark:border-teal-900/40 dark:bg-teal-950/20 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 text-xl font-bold dark:bg-teal-900/40 dark:text-teal-300">
            👥
          </div>
          <h4 className="text-base font-extrabold text-teal-950 dark:text-teal-200">
            {t('noWorkersTitle')}
          </h4>
          <p className="text-xs text-gray-600 dark:text-slate-400 max-w-md mx-auto">
            {t('noWorkersDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigateToTab('workers')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              {t('addNewWorkerBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Quick Past Month Direct Entry Hero Banner */}
      {onOpenQuickEntry && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-green-50/90 p-4 sm:p-5 dark:border-emerald-800/50 dark:bg-slate-900/90 shadow-sm transition-all hover:border-emerald-500/60">
          <div className="flex items-start sm:items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xl shadow-md shadow-emerald-500/25">
              <i className="fa-solid fa-calendar-plus"></i>
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-slate-100 font-sans">
                  {language === 'en' ? 'Enter Past / Old Data' : 'જૂનો હિસાબ / ડેટા એન્ટર કરો'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  {language === 'en' ? 'Quick Entry' : 'ઝડપી એન્ટ્રી'}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                {language === 'en'
                  ? 'Directly enter past monthly attendance, total present days, advances (ઉપાડ), and wage rates without losing dates or existing records.'
                  : 'ગયા મહિના કે પાછલા વર્ષોનો આખો હિસાબ, હાજરીના દિવસો, ઉપાડ અને રોજ સીધા એકસાથે એન્ટર કરો - જૂનો તમામ ડેટા અને તારીખો સુરક્ષિત રહેશે.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-dashboard-quick-past-entry"
            onClick={onOpenQuickEntry}
            className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <i className="fa-solid fa-bolt-lightning text-amber-300"></i>
            <span>{language === 'en' ? 'Enter Past Data' : 'જૂનો હિસાબ એન્ટર કરો'}</span>
          </button>
        </div>
      )}

      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Total Workers Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500 dark:bg-cyan-950/40 dark:text-cyan-400">
            <i className="fa-solid fa-users text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">
              {t('totalWorkers')}
            </p>
            <h4 className="text-xl sm:text-2xl font-black text-gray-950 font-sans mt-0.5 dark:text-slate-100">{stats.totalWorkers}</h4>
          </div>
        </div>

        {/* Total Present Days Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400">
            <i className="fa-solid fa-circle-check text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">
              {t('totalPresentDays')}
            </p>
            <h4 className="text-xl sm:text-2xl font-black text-emerald-600 font-sans mt-0.5 dark:text-emerald-400">{stats.totalPresent}</h4>
          </div>
        </div>

        {/* Total Absent Days Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400">
            <i className="fa-solid fa-circle-xmark text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">
              {t('totalAbsentDays')}
            </p>
            <h4 className="text-xl sm:text-2xl font-black text-rose-600 font-sans mt-0.5 dark:text-rose-400">{stats.totalAbsent}</h4>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
            <i className="fa-solid fa-wallet text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">
              {t('totalEarnings')}
            </p>
            <h4 className="text-lg sm:text-2xl font-black text-teal-700 font-sans mt-0.5 dark:text-teal-400">{formatCurrency(stats.totalEarnings)}</h4>
          </div>
        </div>

        {/* Total Advances Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/30 dark:text-amber-400">
            <i className="fa-solid fa-hand-holding-dollar text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">
              {t('totalAdvance')}
            </p>
            <h4 className="text-lg sm:text-2xl font-black text-amber-700 font-sans mt-0.5 dark:text-amber-400">{formatCurrency(stats.totalUpad)}</h4>
          </div>
        </div>

        {/* Remaining Dues/Balance Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 col-span-2 lg:col-span-1 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
            <i className="fa-solid fa-scale-balanced text-lg sm:text-xl"></i>
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400 truncate">
              {t('netPayable')}
            </p>
            <h4 className="text-lg sm:text-2xl font-black text-purple-700 font-sans mt-0.5 dark:text-purple-400">{formatCurrency(stats.totalBalance)}</h4>
          </div>
        </div>
      </div>

      {/* Quick navigation and workflow */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2 mb-4 dark:text-slate-100">
          <i className="fa-solid fa-bolt text-teal-500"></i>
          {t('quickActionsTitle')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => onNavigateToTab('workers')}
            className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border border-gray-100 hover:border-teal-200 bg-gray-50 hover:bg-teal-50/20 text-center transition-all duration-200 group dark:border-slate-800 dark:bg-slate-950 dark:hover:border-teal-500 dark:hover:bg-slate-800 cursor-pointer"
          >
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-orange-100 text-orange-500 mb-2.5 group-hover:scale-110 duration-200 transition-transform dark:bg-amber-950/40 dark:text-orange-400">
              <i className="fa-solid fa-user-plus text-base sm:text-lg"></i>
            </div>
            <h4 className="font-bold text-gray-900 text-xs sm:text-sm dark:text-white">
              {t('actionAddWorkerTitle')}
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5 dark:text-slate-400 hidden xs:block">
              {t('actionAddWorkerDesc')}
            </p>
          </button>

          <button
            onClick={() => onNavigateToTab('attendance')}
            className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border border-gray-100 hover:border-teal-200 bg-gray-50 hover:bg-teal-50/20 text-center transition-all duration-200 group dark:border-slate-800 dark:bg-slate-950 dark:hover:border-teal-500 dark:hover:bg-slate-800 cursor-pointer"
          >
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-teal-100 text-teal-500 mb-2.5 group-hover:scale-110 duration-200 transition-transform dark:bg-teal-950/40 dark:text-teal-400">
              <i className="fa-solid fa-check-double text-base sm:text-lg"></i>
            </div>
            <h4 className="font-bold text-gray-900 text-xs sm:text-sm dark:text-white">
              {t('actionAttendanceTitle')}
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5 dark:text-slate-400 hidden xs:block">
              {t('actionAttendanceDesc')}
            </p>
          </button>

          <button
            onClick={() => onNavigateToTab('reports')}
            className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border border-gray-100 hover:border-teal-200 bg-gray-50 hover:bg-teal-50/20 text-center transition-all duration-200 group dark:border-slate-800 dark:bg-slate-950 dark:hover:border-teal-500 dark:hover:bg-slate-800 cursor-pointer"
          >
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-2.5 group-hover:scale-110 duration-200 transition-transform dark:bg-purple-950/40 dark:text-purple-400">
              <i className="fa-solid fa-file-invoice-dollar text-base sm:text-lg"></i>
            </div>
            <h4 className="font-bold text-gray-900 text-xs sm:text-sm dark:text-white">
              {t('actionReportsTitle')}
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5 dark:text-slate-400 hidden xs:block">
              {t('actionReportsDesc')}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
