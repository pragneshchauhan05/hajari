import React, { useState } from 'react';
import { Worker, MonthlyWorkerAttendance, AttendanceStatus } from '../types';
import { getDaysInMonth, calculateWorkerTotals, isWorkerActiveInMonth, getWorkerWageForMonth, isWorkerScopedToSpecificMonth, isWorkerAssignedToMonth } from '../utils/attendanceUtils';
import { useLanguage } from '../context/LanguageContext';

interface AttendanceViewProps {
  workers: Worker[];
  selectedWorkerId: string | null;
  onSelectWorker: (id: string | null) => void;
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
  onUpdateAttendance: (
    workerId: string,
    day: number,
    field: 'status' | 'upad' | 'note',
    value: any
  ) => void;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onEditWorkerWage?: (worker: Worker) => void;
  onOpenQuickEntry?: () => void;
}

export default function AttendanceView({
  workers,
  selectedWorkerId,
  onSelectWorker,
  attendanceDB,
  onUpdateAttendance,
  selectedMonth,
  selectedYear,
  onEditWorkerWage,
  onOpenQuickEntry,
}: AttendanceViewProps) {
  const { language, t, months } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  // Segmented inner tab inside worker's card: 'daily' | 'summary' | 'yearly'
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'summary' | 'yearly'>('daily');
  // Daily attendance view mode: 'grid' (no-scroll month grid) vs 'list' (detailed table)
  const [dailyViewMode, setDailyViewMode] = useState<'grid' | 'list'>('grid');

  // Order of cycling: Unmarked ('') -> Present ('P') -> Half ('H') -> Absent ('A') -> Overtime ('O') -> Double ('D') -> Unmarked ('')
  const getNextStatus = (current: AttendanceStatus): AttendanceStatus => {
    if (current === '') return 'P';
    if (current === 'P') return 'H';
    if (current === 'H') return 'A';
    if (current === 'A') return 'O';
    if (current === 'O') return 'D';
    if (current === 'D') return '';
    return '';
  };

  // Convert database codes to Guj/English label
  const getShortStatusLabel = (status: AttendanceStatus) => {
    if (status === 'P') return 'P';
    if (status === 'A') return 'x';
    if (status === 'H') return 'o||';
    if (status === 'O') return 'P ||';
    if (status === 'D') return 'P P';
    return '—';
  };

  // Status-specific color styles
  const getStatusStyle = (status: AttendanceStatus) => {
    if (status === 'P') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70';
    }
    if (status === 'A') {
      return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70';
    }
    if (status === 'H') {
      return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70';
    }
    if (status === 'O') {
      return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/70';
    }
    if (status === 'D') {
      return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/70';
    }
    return 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200/70';
  };

  const daysCount = getDaysInMonth(selectedYear, selectedMonth);
  const activeMonthLabel = months.find((m) => m.value === selectedMonth)?.label || '';
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  // Check visibility for month-scoped past workers
  const isWorkerVisibleInSelectedMonth = (w: Worker) => {
    if (isWorkerScopedToSpecificMonth(w) && !isWorkerAssignedToMonth(w, selectedMonth, selectedYear)) {
      return false;
    }
    return true;
  };

  // Filter workers based on search query and month active status
  // If worker is marked as deleted, show them if they have attendance/upad records for this month
  const filteredWorkers = workers.filter((w) => {
    if (!isWorkerVisibleInSelectedMonth(w)) {
      return false;
    }

    const key = `${w.id}_${selectedYear}_${selectedMonth}`;
    const monthlyData = attendanceDB[key];
    const hasData = monthlyData && Object.values(monthlyData).some((r) => Boolean(r.status) || (r.upad && r.upad > 0));

    if (w.isDeleted) {
      if (!hasData) return false;
    } else {
      if (!isWorkerActiveInMonth(w, selectedMonth, selectedYear)) return false;
    }

    const query = searchQuery.toLowerCase().trim();
    return (
      w.name.toLowerCase().includes(query) ||
      w.village.toLowerCase().includes(query) ||
      (w.mobile && w.mobile.toLowerCase().includes(query))
    );
  });

  // Check if we are viewing a specific selected worker who is visible for this month
  const selectedWorker = workers.find((w) => w.id === selectedWorkerId && isWorkerVisibleInSelectedMonth(w));

  // ------------------------------------------------------------------------
  // SELECTED WORKER MODE: "HAJARI CARD SYSTEM" VIEW
  // ------------------------------------------------------------------------
  if (selectedWorker) {
    const dbKey = `${selectedWorker.id}_${selectedYear}_${selectedMonth}`;
    const currentAttendance = attendanceDB[dbKey] || {};
    const effectiveWage = getWorkerWageForMonth(selectedWorker, selectedYear, selectedMonth);
    const totals = calculateWorkerTotals(currentAttendance, effectiveWage, daysCount);

    return (
      <div className="space-y-6 max-w-2xl mx-auto" id={`print-card-${selectedWorker.id}`}>
        {/* Worker Info Sub-panel section in standard theme */}
        <div className="rounded-3xl bg-teal-50/50 dark:bg-teal-950/10 p-5 border border-teal-100/30 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl shadow-sm">
              🧑‍🔧
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 tracking-tight hover:opacity-90 font-sans transition-all">
                {selectedWorker.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-bold">
                {selectedWorker.village} · {activeMonthLabel} {selectedYear}
              </p>
            </div>
          </div>

          {/* Current Month Wage & Quick Edit Button */}
          <div className="flex items-center gap-2 sm:gap-3 print:hidden">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold block uppercase tracking-wider">
                {activeMonthLabel} નો રોજ
              </span>
              <span className="text-lg font-black text-teal-600 font-sans dark:text-teal-400">
                ₹{effectiveWage}
              </span>
            </div>
            {onEditWorkerWage && (
              <button
                type="button"
                onClick={() => onEditWorkerWage(selectedWorker)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                title={`${activeMonthLabel} નો રોજ બદલો / વધારો`}
              >
                <i className="fa-solid fa-pen-to-square text-xs"></i>
                <span>{language === 'en' ? 'Change Wage' : 'રોજ બદલો'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Toolbar Buttons Row: Back, All Summaries, Print */}
        <div className="grid grid-cols-3 gap-2.5 print:hidden select-none">
          <button
            type="button"
            onClick={() => onSelectWorker(null)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 py-3 text-xs sm:text-sm font-black shadow-sm active:scale-95 transition-all cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
          >
            ← {language === 'en' ? 'Back' : 'પાછળ'}
          </button>

          <button
            type="button"
            onClick={() => onSelectWorker(null)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white border border-teal-600 text-teal-600 hover:bg-teal-50/20 py-3 text-xs sm:text-sm font-black shadow-sm active:scale-95 transition-all cursor-pointer dark:bg-slate-900 dark:text-teal-400"
          >
            📊 {language === 'en' ? 'All Summaries' : 'બધા સારાંશ'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#0a66c2] text-white hover:bg-[#084e96] py-3 text-xs sm:text-sm font-black shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            🖨️ {language === 'en' ? 'Print' : 'પ્રિન્ટ'}
          </button>
        </div>

        {/* Sub-tabs segment switcher with teal border */}
        <div className="rounded-2xl border border-teal-600/30 p-1 flex items-center bg-white dark:bg-slate-900 print:hidden select-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('daily')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'daily'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            📋 {language === 'en' ? 'Daily Attendance' : 'દૈનિક નોંધ'}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('summary')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'summary'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            💰 {language === 'en' ? 'Monthly Summary' : 'સારાંશ'}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('yearly')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'yearly'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            📅 {language === 'en' ? 'Yearly Overview' : 'વાર્ષિક'}
          </button>
        </div>

        {/* Active view layout content screen */}
        <div className="rounded-3xl border border-teal-100/60 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          
          {/* TAB 1: DAILY ATTENDANCE ENTRIES */}
          {activeSubTab === 'daily' && (
            <div className="space-y-3.5">
              <div className="border-b border-gray-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 dark:border-slate-800">
                <h4 className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 font-sans flex items-center gap-1.5">
                  <span className="text-teal-500 text-sm">🔴</span> {language === 'en' ? 'Daily Attendance' : 'દૈનિક નોંધ'} — {activeMonthLabel} {selectedYear}
                </h4>

                {/* View Switcher: No-Scroll Grid vs List View */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setDailyViewMode('grid')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      dailyViewMode === 'grid'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-300 hover:text-teal-600'
                    }`}
                    title="1 થી 31 દિવસ વગર સ્ક્રોલ એ એક જ સ્ક્રીન પર જુઓ"
                  >
                    <i className="fa-solid fa-table-cells"></i>
                    <span>{language === 'en' ? 'No-Scroll Grid' : '⚡ વગર સ્ક્રોલ ગ્રીડ (1-31)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      dailyViewMode === 'list'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-300 hover:text-teal-600'
                    }`}
                  >
                    <i className="fa-solid fa-list"></i>
                    <span>{language === 'en' ? 'List View' : '📋 યાદી લિસ્ટ'}</span>
                  </button>
                </div>
              </div>

              {/* Responsive Click Legends instruction */}
              <div className="rounded-xl bg-teal-50/20 dark:bg-teal-950/20 p-2.5 border border-teal-100/20 text-[11px] sm:text-xs font-bold leading-relaxed text-gray-700 dark:text-slate-300 select-none flex flex-wrap items-center gap-1.5">
                <span className="text-teal-600 dark:text-teal-400 font-semibold">{language === 'en' ? 'Click to toggle:' : 'ક્લિક કરો:'}</span>
                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800">{language === 'en' ? 'P = Present (1.0)' : 'P = હાજર'}</span>
                <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 dark:bg-amber-950/40 dark:border-amber-800">{language === 'en' ? 'o|| = Half Day (0.5)' : 'o|| = અડધો દિવસ'}</span>
                <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 dark:bg-rose-950/40 dark:border-rose-800">{language === 'en' ? 'x = Absent' : 'x = રજા'}</span>
                <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 dark:bg-blue-950/40 dark:border-blue-800">{language === 'en' ? 'P || = Overtime (1.5)' : 'P || = ઓ.ટી.'}</span>
                <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 dark:bg-purple-950/40 dark:border-purple-800">{language === 'en' ? 'P P = Double (2.0)' : 'P P = ડબલ'}</span>
              </div>

              {/* MODE 1: COMPACT NO-SCROLL MONTH GRID (All 31 days fit on one screen) */}
              {dailyViewMode === 'grid' && (
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
                  {daysArray.map((day) => {
                    const record = currentAttendance[day] || { status: '', upad: 0, note: '' };
                    const d = new Date(selectedYear, selectedMonth - 1, day);
                    const isSunday = d.getDay() === 0;

                    return (
                      <div
                        key={day}
                        className={`p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-all ${
                          isSunday
                            ? 'bg-rose-50/30 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30'
                            : 'bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between leading-none mb-1">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                              isSunday
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {day}
                          </span>
                          {record.note ? (
                            <span
                              className="text-[10px] text-teal-600 cursor-help"
                              title={record.note}
                            >
                              💬
                            </span>
                          ) : null}
                        </div>

                        {/* Interactive Status Cycle Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextStat = getNextStatus(record.status);
                            onUpdateAttendance(selectedWorker.id, day, 'status', nextStat);
                          }}
                          className={`w-full py-1 rounded-lg text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer text-center ${getStatusStyle(
                            record.status
                          )}`}
                          title={`દિવસ ${day}: સ્ટેટસ બદલવા ક્લિક કરો`}
                        >
                          {getShortStatusLabel(record.status)}
                        </button>

                        {/* Quick Upad Amount Field */}
                        <div className="mt-1 flex items-center justify-center bg-gray-50/80 dark:bg-slate-800/80 rounded-md px-1 py-0.5 border border-transparent focus-within:border-teal-500">
                          <span className="text-[9px] text-gray-400 font-bold mr-0.5">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={record.upad || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              onUpdateAttendance(selectedWorker.id, day, 'upad', val);
                            }}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full text-center text-[10px] font-bold text-gray-900 dark:text-slate-100 outline-none bg-transparent"
                            title={`દિવસ ${day} નો ઉપાડ`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MODE 2: CLASSIC DETAILED TABLE LIST */}
              {dailyViewMode === 'list' && (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800">
                  <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-slate-400">
                    <thead className="bg-teal-600 text-white text-xs font-black uppercase border-b border-teal-700 select-none">
                      <tr>
                        <th scope="col" className="px-1.5 py-3 text-center font-bold w-10">
                          {language === 'en' ? 'Day' : 'દિ.'}
                        </th>
                        <th scope="col" className="px-1.5 py-3 text-center w-[80px] sm:w-28">
                          {language === 'en' ? 'Status' : 'હાજરી'}
                        </th>
                        <th scope="col" className="px-1.5 py-3 text-center w-[70px] sm:w-28">
                          {language === 'en' ? 'Advance (₹)' : 'ઉપાડ'}
                        </th>
                        <th scope="col" className="px-1.5 py-3 text-left">
                          {language === 'en' ? 'Note' : 'નોંધ'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                      {daysArray.map((day) => {
                        const record = currentAttendance[day] || { status: '', upad: 0, note: '' };

                        return (
                          <tr key={day} className="hover:bg-teal-50/5 transition-colors">
                            {/* Day Number */}
                            <td className="px-1.5 py-2 text-center">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black font-sans bg-gray-100 text-gray-950 dark:bg-slate-800 dark:text-slate-200">
                                {day}
                              </span>
                            </td>

                            {/* Interactive Toggle button */}
                            <td className="px-1.5 py-2 text-center select-none">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStat = getNextStatus(record.status);
                                  onUpdateAttendance(selectedWorker.id, day, 'status', nextStat);
                                }}
                                className={`w-full max-w-[70px] sm:max-w-[90px] mx-auto rounded-lg border py-1 text-xs font-black shadow-sm transition-all duration-150 active:scale-95 cursor-pointer text-center ${getStatusStyle(
                                  record.status
                                )}`}
                              >
                                {getShortStatusLabel(record.status)}
                              </button>
                            </td>

                            {/* Upad Amount */}
                            <td className="px-1.5 py-2">
                              <input
                                type="number"
                                min="0"
                                value={record.upad || ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  onUpdateAttendance(selectedWorker.id, day, 'upad', val);
                                }}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                className="w-full text-center rounded-lg border border-gray-200 bg-gray-50/40 py-1 text-xs font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-300 focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                              />
                            </td>

                            {/* Note input */}
                            <td className="px-1.5 py-2">
                              <input
                                type="text"
                                value={record.note || ''}
                                onChange={(e) => {
                                  onUpdateAttendance(selectedWorker.id, day, 'note', e.target.value);
                                }}
                                placeholder={language === 'en' ? 'Note...' : 'નોંધ...'}
                                className="w-full text-left rounded-lg border border-gray-200 bg-gray-50/40 px-2 py-1 text-xs text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETAILED MONTHLY SUMMARY OUTCOMES */}
          {activeSubTab === 'summary' && (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3 dark:border-slate-800">
                <h4 className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 font-sans flex items-center gap-1.5">
                  💰 {language === 'en' ? 'Complete Monthly Account Summary' : 'આ માસનો સંપૂર્ણ હિસાબ સારાંશ'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-gray-50 p-4 space-y-3 dark:bg-slate-800/50">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {language === 'en' ? 'Attendance Details' : 'હાજરી હાજરીપત્રક વિગતો'}
                  </h5>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{language === 'en' ? 'Total Days in Month' : 'કુલ દિવસો'}</span>
                    <span className="font-bold text-gray-800 dark:text-slate-200">{daysCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-emerald-600 font-bold">{language === 'en' ? 'Present Days' : 'કુલ હાજર દિવસ'}</span>
                    <span className="font-black text-emerald-600">{totals.presentDays}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-rose-600 font-bold">{language === 'en' ? 'Absent Days' : 'કુલ ગેરહાજર દિવસ'}</span>
                    <span className="font-black text-rose-600">{totals.absentDays}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 space-y-3 dark:bg-slate-800/50">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {language === 'en' ? 'Wage & Financials' : 'પગાર અને લેવડદેવડ નાણાં'}
                  </h5>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{language === 'en' ? 'Daily Wage Rate' : 'દૈનિક રોજ પગાર'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-teal-600 dark:text-teal-400">₹{effectiveWage}</span>
                      {onEditWorkerWage && (
                        <button
                          type="button"
                          onClick={() => onEditWorkerWage(selectedWorker)}
                          className="text-xs text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 underline font-bold cursor-pointer"
                        >
                          ({language === 'en' ? 'Change' : 'બદલો'})
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-800 font-bold dark:text-slate-100">{language === 'en' ? 'Total Earnings' : 'કુલ જમા રકમ (Earnings)'}</span>
                    <span className="font-black text-emerald-600">₹{totals.totalEarnings.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-700 font-bold dark:text-amber-400">{language === 'en' ? 'Total Advance (Upad)' : 'કુલ ઉપાડ રકમ (Upad)'}</span>
                    <span className="font-black text-rose-600">₹{totals.totalUpad.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-teal-100/30 p-5 border border-teal-200/20 text-center space-y-2 dark:bg-teal-950/20 dark:border-teal-900/40">
                <p className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-widest">
                  {language === 'en' ? 'Net Balance Payable' : 'બાકી ચૂકવવાની રકમ (Payable Balance)'}
                </p>
                <h3 className={`text-3xl font-black ${totals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{totals.balance.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  {totals.balance >= 0 
                    ? (language === 'en' ? '* Amount due to be paid to the worker by employer.' : '* કંપની દ્વારા કારીગરને આપવાના બાકી નીકળતા રૂપિયા છે.')
                    : (language === 'en' ? '* Worker has taken advance exceeding earned wages.' : '* કારીગરે લીધેલી વધારાની ઉપાડ રકમ દર્શાવે છે.')}
                </p>
              </div>

              {/* Print Only Footer Details */}
              <div className="hidden print:block border-t border-dashed border-gray-300 pt-8 mt-12 text-sm text-center">
                <p className="font-bold">{selectedWorker.name} · {language === 'en' ? 'Signature:' : 'સ્વાક્ષર:'} _____________________</p>
              </div>
            </div>
          )}

          {/* TAB 3: YEARLY GRAPH SHEET OVERVIEW */}
          {activeSubTab === 'yearly' && (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3 dark:border-slate-800">
                <h4 className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 font-sans flex items-center gap-1.5">
                  📅 {language === 'en' ? `Yearly Master Sheet - ${selectedYear}` : `વર્ષિવાર ખાતું (Yearly Master Sheet - ${selectedYear})`}
                </h4>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800">
                <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-slate-400">
                  <thead className="bg-teal-600 text-white text-xs font-black">
                    <tr>
                      <th className="px-4 py-3">{language === 'en' ? 'Month' : 'મહિનો'}</th>
                      <th className="px-4 py-3 text-center">{language === 'en' ? 'Present' : 'હાજર'}</th>
                      <th className="px-4 py-3 text-right">{language === 'en' ? 'Earnings (₹)' : 'બનેલ કમાણી (₹)'}</th>
                      <th className="px-4 py-3 text-right">{language === 'en' ? 'Advance (₹)' : 'લીધેલ ઉપાડ (₹)'}</th>
                      <th className="px-4 py-3 text-right">{language === 'en' ? 'Balance (₹)' : 'બાકી લેણાં (₹)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {months.map((m) => {
                      const mKey = `${selectedWorker.id}_${selectedYear}_${m.value}`;
                      const monthlyAttendance = attendanceDB[mKey] || {};
                      const mDays = getDaysInMonth(selectedYear, m.value);
                      const mWage = getWorkerWageForMonth(selectedWorker, selectedYear, m.value);
                      const mTotals = calculateWorkerTotals(monthlyAttendance, mWage, mDays);

                      return (
                        <tr key={m.value} className="hover:bg-teal-50/5">
                          <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-slate-200">
                            {m.label}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-teal-600 dark:text-teal-400">
                            {mTotals.presentDays}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-700 dark:text-slate-350">
                            ₹{mTotals.totalEarnings.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-2.5 text-right text-rose-600 font-medium">
                            ₹{mTotals.totalUpad.toLocaleString('en-IN')}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-black ${mTotals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{mTotals.balance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // DEFAULT MODE: WORKERS GENERAL DIRECTORY SELECTION SHEET
  // ------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Search Filter Panel */}
      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gray-900 font-sans flex items-center gap-2 dark:text-slate-100">
              <span className="text-xl">📇</span> {language === 'en' ? 'Worker Attendance Directory' : 'કારીગર હાજરીપત્રક પસંદગી પત્રક'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
              {language === 'en' 
                ? 'Click "View Attendance Card" on any worker to record daily attendance, advances, or notes.'
                : 'જે કારીગરનું દૈનિક હાજરીપત્રક અથવા ઉપાડ નોંધવો હોય, તેમના કાર્ડ પર રહેલું "હાજરી કાર્ડ જુઓ" બટન દબાવો.'}
            </p>
          </div>
        </div>

        {/* Local Fast SEARCH box */}
        <div className="relative mt-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-slate-500">
            <i className="fa-solid fa-magnifying-glass text-sm"></i>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'en' ? 'Search worker name or site...' : 'કારીગરનું નામ અથવા સાઇટ શોધો...'}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredWorkers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-4 dark:bg-slate-800 dark:text-teal-400">
            🔍
          </div>
          <h4 className="text-lg font-bold text-gray-900 font-sans dark:text-slate-100">
            {t('noWorkersFound')}
          </h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto px-4 dark:text-slate-400">
            {language === 'en'
              ? 'Please adjust search query or add a worker from the Workers section.'
              : 'કૃપા કરીને સાચું નામ લખો અથવા કારીગરો સેક્શનમાં જઈને નવો કારીગર ઉમેરો.'}
          </p>
        </div>
      ) : (
        /* Workers Grid List selector cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWorkers.map((worker) => {
            const dbKey = `${worker.id}_${selectedYear}_${selectedMonth}`;
            const currentAttendance = attendanceDB[dbKey] || {};
            const workerWage = getWorkerWageForMonth(worker, selectedYear, selectedMonth);
            const totals = calculateWorkerTotals(currentAttendance, workerWage, daysCount);

            return (
              <div
                key={worker.id}
                className="rounded-3xl border border-teal-100/25 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 font-black text-teal-600 dark:bg-slate-800 dark:text-teal-400">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-teal-600 text-base font-sans dark:text-teal-400">
                        👷 {worker.name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5 font-bold dark:text-slate-400">
                        🏗️ {language === 'en' ? 'Site' : 'સાઇટ'}: {worker.village}
                      </p>
                    </div>
                  </div>

                  {/* Wage Info */}
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs dark:border-slate-800">
                    <span className="text-gray-400">{language === 'en' ? 'Daily Wage:' : 'દૈનિક રોજ પગાર :'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-teal-600 dark:text-teal-400">₹{workerWage}</span>
                      {onEditWorkerWage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditWorkerWage(worker);
                          }}
                          className="text-[11px] font-bold text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 underline cursor-pointer"
                        >
                          ({language === 'en' ? 'Change' : 'બદલો'})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats Badges list */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <div className="bg-emerald-50/50 p-2 rounded-xl text-center border border-emerald-100/20 dark:bg-emerald-950/20">
                      <p className="text-[10px] text-emerald-600 font-bold">{language === 'en' ? 'Present' : 'હાજર'}</p>
                      <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{totals.presentDays}</p>
                    </div>
                    <div className="bg-rose-50/50 p-2 rounded-xl text-center border border-rose-100/20 dark:bg-rose-950/20">
                      <p className="text-[10px] text-rose-600 font-bold">{language === 'en' ? 'Advance' : 'ઉપાડ'}</p>
                      <p className="text-sm font-black text-rose-700 dark:text-rose-400">₹{totals.totalUpad.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-purple-50/50 p-2 rounded-xl text-center border border-purple-100/20 dark:bg-purple-950/20">
                      <p className="text-[10px] text-purple-600 font-bold">{language === 'en' ? 'Balance' : 'બાકી'}</p>
                      <p className="text-sm font-black text-purple-700 dark:text-purple-400">₹{totals.balance.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Primary Button Trigger */}
                <button
                  type="button"
                  onClick={() => onSelectWorker(worker.id)}
                  className="w-full rounded-2xl bg-teal-600 text-white hover:bg-teal-700 py-3 text-xs sm:text-sm font-black shadow-md cursor-pointer text-center select-none active:scale-98 transition-all flex items-center justify-center gap-2 dark:bg-teal-500 dark:hover:bg-teal-600"
                >
                  📋 {language === 'en' ? 'View Attendance Card' : 'હાજરી કાર્ડ જુઓ'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
