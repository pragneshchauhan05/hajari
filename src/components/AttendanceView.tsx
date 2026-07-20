import React, { useState } from 'react';
import { Worker, MonthlyWorkerAttendance, AttendanceStatus } from '../types';
import { getDaysInMonth, calculateWorkerTotals, GUJARATI_MONTHS, YEARS } from '../utils/attendanceUtils';

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
}

export default function AttendanceView({
  workers,
  selectedWorkerId,
  onSelectWorker,
  attendanceDB,
  onUpdateAttendance,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: AttendanceViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // Segmented inner tab inside worker's card: 'daily' | 'summary' | 'yearly'
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'summary' | 'yearly'>('daily');

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

  // Convert database codes to Guj/English label shown in screenshot
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

  const getStatusGujarati = (status: AttendanceStatus) => {
    if (status === 'P') return 'P - હાજર (1.0)';
    if (status === 'A') return 'x - રજા';
    if (status === 'H') return 'o|| - અડધો દિવસ (0.5)';
    if (status === 'O') return 'P || - આખો + અડધો ઓવર ટાઈમ (1.5)';
    if (status === 'D') return 'P P - ડબલ હાજરી (2.0)';
    return '-';
  };

  const daysCount = getDaysInMonth(selectedYear, selectedMonth);
  const activeMonthLabel = GUJARATI_MONTHS.find((m) => m.value === selectedMonth)?.label || '';
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  // Filter workers based on search query
  const filteredWorkers = workers.filter((w) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      w.name.toLowerCase().includes(query) ||
      w.village.toLowerCase().includes(query) ||
      (w.mobile && w.mobile.toLowerCase().includes(query))
    );
  });

  // Check if we are viewing a specific selected worker
  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);

  // ------------------------------------------------------------------------
  // SELECTED WORKER MODE: "HAJARI CARD SYSTEM" (હાજરી કાર્ડ સિસ્ટમ) VIEW
  // ------------------------------------------------------------------------
  if (selectedWorker) {
    const dbKey = `${selectedWorker.id}_${selectedYear}_${selectedMonth}`;
    const currentAttendance = attendanceDB[dbKey] || {};
    const totals = calculateWorkerTotals(currentAttendance, selectedWorker.dailyWage, daysCount);

    return (
      <div className="space-y-6 max-w-2xl mx-auto" id={`print-card-${selectedWorker.id}`}>
        {/* Worker Info Sub-panel section in standard theme */}
        <div className="rounded-3xl bg-teal-50/50 dark:bg-teal-950/10 p-5 border border-teal-100/30 flex items-center justify-between shadow-sm">
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
        </div>

        {/* Toolbar Buttons Row: Back, All Summaries, Print */}
        <div className="grid grid-cols-3 gap-2.5 print:hidden select-none">
          <button
            type="button"
            onClick={() => onSelectWorker(null)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 py-3 text-xs sm:text-sm font-black shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            ← પાછળ
          </button>

          <button
            type="button"
            onClick={() => onSelectWorker(null)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white border border-teal-600 text-teal-600 hover:bg-teal-50/20 py-3 text-xs sm:text-sm font-black shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            📊 બધા સારાંશ
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#0a66c2] text-white hover:bg-[#084e96] py-3 text-xs sm:text-sm font-black shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            🖨️ પ્રિન્ટ
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
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📋 દૈનિક નોંધ
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('summary')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'summary'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            💰 સારાંશ
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('yearly')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'yearly'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📅 વાર્ષિક
          </button>
        </div>

        {/* Active view layout content screen */}
        <div className="rounded-3xl border border-teal-100/60 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          
          {/* TAB 1: DAILY ATTENDANCE ENTRIES */}
          {activeSubTab === 'daily' && (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <h4 className="text-base sm:text-lg font-black text-teal-600 font-sans flex items-center gap-1.5">
                  <span className="text-teal-500 text-sm">🔴</span> દૈનિક નોંધ — {activeMonthLabel} {selectedYear}
                </h4>
              </div>

              {/* Responsive Click Legends instruction */}
              <div className="rounded-xl bg-teal-50/20 dark:bg-teal-950/5 p-3 border border-teal-100/20 text-[11px] sm:text-xs font-bold leading-relaxed text-gray-700 dark:text-slate-350 select-none">
                <span className="text-teal-600 font-semibold">ક્લિક કરો:</span>{' '}
                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">P = હાજર</span>{' '}
                <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">o|| = અડધો દિવસ</span>{' '}
                <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">x = રજા</span>{' '}
                <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">P || = આખો + અડધો (ઓ.ટી.)</span>{' '}
                <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">P P = ડબલ</span>
              </div>

              {/* Main Table List */}
              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800">
                <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-slate-400">
                  <thead className="bg-teal-600 text-white text-xs font-black uppercase border-b border-teal-700 select-none">
                    <tr>
                      <th scope="col" className="px-1.5 py-3 text-center font-bold w-10">
                        દિ.
                      </th>
                      <th scope="col" className="px-1.5 py-3 text-center w-[80px] sm:w-28">
                        હાજરી
                      </th>
                      <th scope="col" className="px-1.5 py-3 text-center w-[70px] sm:w-28">
                        ઉપાડ
                      </th>
                      <th scope="col" className="px-1.5 py-3 text-left">
                        નોંધ
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
                              className={`w-full max-w-[70px] sm:max-w-[90px] mx-auto rounded-lg border py-1 text-xs font-black shadow-sm transition-all duration-150 active:scale-95 cursor-pointer text-center ${getStatusStyle(record.status)}`}
                            >
                              {getShortStatusLabel(record.status)}
                            </button>
                          </td>

                          {/* Upad Amount with teal focus border */}
                          <td className="px-1.5 py-2">
                            <input
                              type="number"
                              min="0"
                              value={record.upad || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                onUpdateAttendance(selectedWorker.id, day, 'upad', val);
                              }}
                              placeholder="0"
                              className="w-full text-center rounded-lg border border-gray-200 bg-gray-50/40 py-1 text-xs font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-300 focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                            />
                          </td>

                          {/* Note input with teal focus border */}
                          <td className="px-1.5 py-2">
                            <input
                              type="text"
                              value={record.note || ''}
                              onChange={(e) => {
                                onUpdateAttendance(selectedWorker.id, day, 'note', e.target.value);
                              }}
                              placeholder="નોંધ..."
                              className="w-full text-left rounded-lg border border-gray-200 bg-gray-50/40 px-2 py-1 text-xs text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED MONTHLY SUMMARY OUTCOMES */}
          {activeSubTab === 'summary' && (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="text-base sm:text-lg font-black text-teal-600 font-sans flex items-center gap-1.5">
                  💰 આ માસનો સંપૂર્ણ હિસાબ સારાંશ
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-gray-50 p-4 space-y-3 dark:bg-slate-800/50">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">હાજરી હાજરીપત્રક વિગતો</h5>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">કુલ દિવસો</span>
                    <span className="font-bold text-gray-800 dark:text-slate-200">{daysCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-emerald-600 font-bold">કુલ હાજર દિવસ</span>
                    <span className="font-black text-emerald-600">{totals.presentDays}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-rose-600 font-bold">કુલ ગેરહાજર દિવસ</span>
                    <span className="font-black text-rose-600">{totals.absentDays}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 space-y-3 dark:bg-slate-800/50">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">પગાર અને લેવડદેવડ નાણાં</h5>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">દૈનિક રોજ પગાર</span>
                    <span className="font-extrabold text-teal-600">₹{selectedWorker.dailyWage}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-800 font-bold dark:text-slate-100">કુલ જમા રકમ (Earnings)</span>
                    <span className="font-black text-emerald-600">₹{totals.totalEarnings.toLocaleString('gu-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-700 font-bold">કુલ ઉપાડ રકમ (Upad)</span>
                    <span className="font-black text-rose-600">₹{totals.totalUpad.toLocaleString('gu-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-teal-100/30 p-5 border border-teal-200/20 text-center space-y-2">
                <p className="text-xs font-black uppercase text-teal-600 tracking-widest">
                  બાકી ચૂકવવાની રકમ (Payable Balance)
                </p>
                <h3 className={`text-3xl font-black ${totals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{totals.balance.toLocaleString('gu-IN')}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {totals.balance >= 0 
                    ? '* કંપની દ્વારા કારીગરને આપવાના બાકી નીકળતા રૂપિયા છે.'
                    : '* કારીગરે લીધેલી વધારાની ઉપાડ રકમ દર્શાવે છે.'}
                </p>
              </div>

              {/* Print Only Footer Details */}
              <div className="hidden print:block border-t border-dashed border-gray-300 pt-8 mt-12 text-sm text-center">
                <p className="font-bold">ભરતભાઈ ચૌહાણ (હાજરી કાર્ડ સિસ્ટમ) · સ્વાક્ષર: _____________________</p>
              </div>
            </div>
          )}

          {/* TAB 3: YEARLY GRAPH SHEET OVERVIEW */}
          {activeSubTab === 'yearly' && (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="text-base sm:text-lg font-black text-teal-600 font-sans flex items-center gap-1.5">
                  📅 વર્ષિવાર ખાતું (Yearly Master Sheet - {selectedYear})
                </h4>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800">
                <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-slate-400">
                  <thead className="bg-teal-600 text-white text-xs font-black">
                    <tr>
                      <th className="px-4 py-3">મહિનો</th>
                      <th className="px-4 py-3 text-center">હાજર</th>
                      <th className="px-4 py-3 text-right">બનેલ કમાણી (₹)</th>
                      <th className="px-4 py-3 text-right">લીધેલ ઉપાડ (₹)</th>
                      <th className="px-4 py-3 text-right">બાકી લેણાં (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {GUJARATI_MONTHS.map((m) => {
                      const mKey = `${selectedWorker.id}_${selectedYear}_${m.value}`;
                      const monthlyAttendance = attendanceDB[mKey] || {};
                      const mDays = getDaysInMonth(selectedYear, m.value);
                      const mTotals = calculateWorkerTotals(monthlyAttendance, selectedWorker.dailyWage, mDays);

                      return (
                        <tr key={m.value} className="hover:bg-teal-50/5">
                          <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-slate-200">
                            {m.label}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-teal-600">
                            {mTotals.presentDays}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-700 dark:text-slate-350">
                            ₹{mTotals.totalEarnings.toLocaleString('gu-IN')}
                          </td>
                          <td className="px-4 py-2.5 text-right text-rose-600 font-medium">
                            ₹{mTotals.totalUpad.toLocaleString('gu-IN')}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-black ${mTotals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{mTotals.balance.toLocaleString('gu-IN')}
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
        <h3 className="text-lg font-black text-gray-900 font-sans flex items-center gap-2 dark:text-slate-100">
          <span className="text-xl">📇</span> કારીગર હાજરીપત્રક પસંદગી પત્રક
        </h3>
        <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
          જે કારીગરનું દૈનિક હાજરીપત્રક અથવા ઉપાડ નોંધવો હોય, તેમના કાર્ડ પર રહેલું{' '}
          <strong className="text-teal-600">"હાજરી કાર્ડ જુઓ"</strong> બટન દબાવો.
        </p>

        {/* Local Fast SEARCH box */}
        <div className="relative mt-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-slate-500">
            <i className="fa-solid fa-magnifying-glass text-sm"></i>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="કારીગરનું નામ અથવા સાઇટ શોધો..."
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
          <h4 className="text-lg font-bold text-gray-900 font-sans dark:text-slate-100">કોઈ મળેલ કારીગર નથી</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto px-4 dark:text-slate-400">
            કૃપા કરીને સાચું નામ લખો અથવા કારીગરો સેક્શનમાં જઈને નવો કારીગર ઉમેરો.
          </p>
        </div>
      ) : (
        /* Workers Grid List selector cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWorkers.map((worker) => {
            const dbKey = `${worker.id}_${selectedYear}_${selectedMonth}`;
            const currentAttendance = attendanceDB[dbKey] || {};
            const totals = calculateWorkerTotals(currentAttendance, worker.dailyWage, daysCount);

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
                      <p className="text-xs text-gray-400 mt-0.5 font-bold">
                        🏗️ સાઇટ: {worker.village}
                      </p>
                    </div>
                  </div>

                  {/* Wage Info */}
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs dark:border-slate-800">
                    <span className="text-gray-400">દૈનિક રોજ પગાર :</span>
                    <span className="font-black text-teal-600">₹{worker.dailyWage}</span>
                  </div>

                  {/* Stats Badges list */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <div className="bg-emerald-50/50 p-2 rounded-xl text-center border border-emerald-100/20 dark:bg-emerald-950/20">
                      <p className="text-[10px] text-emerald-600 font-bold">હાજર</p>
                      <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{totals.presentDays}</p>
                    </div>
                    <div className="bg-rose-50/50 p-2 rounded-xl text-center border border-rose-100/20 dark:bg-rose-950/20">
                      <p className="text-[10px] text-rose-600 font-bold">ઉપાડ</p>
                      <p className="text-sm font-black text-rose-750 dark:text-rose-400">₹{totals.totalUpad.toLocaleString('gu-IN')}</p>
                    </div>
                    <div className="bg-purple-50/50 p-2 rounded-xl text-center border border-purple-100/20 dark:bg-purple-950/20">
                      <p className="text-[10px] text-purple-600 font-bold">બાકી</p>
                      <p className="text-sm font-black text-purple-700 dark:text-purple-400">₹{totals.balance.toLocaleString('gu-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Primary Button Trigger */}
                <button
                  type="button"
                  onClick={() => onSelectWorker(worker.id)}
                  className="w-full rounded-2xl bg-teal-600 text-white hover:bg-teal-700 py-3 text-xs sm:text-sm font-black shadow-md cursor-pointer text-center select-none active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  📋 હાજરી કાર્ડ જુઓ
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
