import React from 'react';
import { Worker, MonthlyWorkerAttendance } from '../types';
import { calculateGlobalSummary, GUJARATI_MONTHS } from '../utils/attendanceUtils';

interface DashboardViewProps {
  workers: Worker[];
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
  selectedMonth: number;
  selectedYear: number;
  onNavigateToTab: (tab: 'dashboard' | 'workers' | 'attendance' | 'reports') => void;
}

export default function DashboardView({
  workers,
  attendanceDB,
  selectedMonth,
  selectedYear,
  onNavigateToTab,
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
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-500 to-emerald-500 p-6 shadow-md text-white md:p-8">
        {/* Background elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-xl"></div>
        <div className="absolute right-1/4 -bottom-12 h-32 w-32 rounded-full bg-white/10 blur-lg"></div>

        <div className="relative z-10 flex flex-col justify-between md:flex-row md:items-center">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3  py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <i className="fa-solid fa-star text-amber-300"></i> ડેશબોર્ડ મુખ્ય વિભાગ
            </span>
            <h2 className="text-2xl font-bold md:text-3xl font-sans leading-tight">
              નમસ્તે! હાજરી મેનેજરમાં તમારું સ્વાગત છે.
            </h2>
            <p className="text-teal-50 text-sm max-w-xl">
              અહીંથી તમે તમારા તમામ કારીગરોની દૈનિક હાજરીપત્રક, ઉપાડ, રોજનો પગાર અને બાકી લેણાંની ગણતરી બહુ જ સીધી અને સરળ રીતે કરી શકો છો.
            </p>
          </div>
          
          <div className="mt-4 shrink-0 rounded-2xl bg-white/15 p-4 backdrop-blur-md md:mt-0 md:text-center text-left">
            <p className="text-xs text-teal-100 uppercase tracking-widest font-semibold">ચાલુ સમયગાળો</p>
            <p className="text-lg font-bold font-sans">
              {activeMonthLabel} - {selectedYear}
            </p>
            <div className="mt-1 h-0.5 bg-white/30 rounded"></div>
            <p className="text-xs text-teal-100 mt-1">કુલ કારીગરો: {stats.totalWorkers}</p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {/* Total Workers Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500 dark:bg-cyan-950/40 dark:text-cyan-450">
            <i className="fa-solid fa-users text-xl"></i>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400">કુલ કારીગરો</p>
            <h4 className="text-2xl font-black text-gray-950 font-sans mt-0.5 dark:text-slate-100">{stats.totalWorkers}</h4>
          </div>
        </div>

        {/* Total Present Days Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400">
            <i className="fa-solid fa-circle-check text-xl"></i>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400">કુલ હાજર દિવસ</p>
            <h4 className="text-2xl font-black text-emerald-600 font-sans mt-0.5 dark:text-emerald-400">{stats.totalPresent}</h4>
          </div>
        </div>

        {/* Total Absent Days Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400">
            <i className="fa-solid fa-circle-xmark text-xl"></i>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400">કુલ ગેરહાજર દિવસ</p>
            <h4 className="text-2xl font-black text-rose-600 font-sans mt-0.5 dark:text-rose-400">{stats.totalAbsent}</h4>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
            <i className="fa-solid fa-wallet text-xl"></i>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400">કુલ કમાણી (રૂ.)</p>
            <h4 className="text-xl sm:text-2xl font-black text-teal-700 font-sans mt-0.5 dark:text-teal-400">{formatCurrency(stats.totalEarnings)}</h4>
          </div>
        </div>

        {/* Total Advances Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/30 dark:text-amber-400">
            <i className="fa-solid fa-hand-holding-dollar text-xl"></i>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400">કુલ ઉપાડ (રૂ.)</p>
            <h4 className="text-xl sm:text-2xl font-black text-amber-700 font-sans mt-0.5 dark:text-amber-400">{formatCurrency(stats.totalUpad)}</h4>
          </div>
        </div>

        {/* Remaining Dues/Balance Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 col-span-2 lg:col-span-1 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
            <i className="fa-solid fa-scale-balanced text-xl"></i>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-slate-400">કુલ બાકી રકમ</p>
            <h4 className="text-xl sm:text-2xl font-black text-purple-700 font-sans mt-0.5 dark:text-purple-400">{formatCurrency(stats.totalBalance)}</h4>
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
    </div>
  );
}
