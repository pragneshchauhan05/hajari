import React from 'react';
import { Worker, MonthlyWorkerAttendance, AttendanceStatus } from '../types';
import { getDaysInMonth, calculateWorkerTotals, GUJARATI_MONTHS } from '../utils/attendanceUtils';

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
}

export default function AttendanceView({
  workers,
  selectedWorkerId,
  onSelectWorker,
  attendanceDB,
  onUpdateAttendance,
  selectedMonth,
  selectedYear,
}: AttendanceViewProps) {
  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);
  const daysCount = getDaysInMonth(selectedYear, selectedMonth);
  const activeMonthLabel = GUJARATI_MONTHS.find((m) => m.value === selectedMonth)?.label || '';

  // Get active attendance data for the current worker-month-year
  const dbKey = selectedWorkerId ? `${selectedWorkerId}_${selectedYear}_${selectedMonth}` : '';
  const currentAttendance = selectedWorkerId ? (attendanceDB[dbKey] || {}) : {};

  // Calculate totals
  const totals = selectedWorker
    ? calculateWorkerTotals(currentAttendance, selectedWorker.dailyWage, daysCount)
    : { presentDays: 0, absentDays: 0, totalUpad: 0, totalEarnings: 0, balance: 0 };

  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Search/Selector Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2 dark:text-slate-100">
              <i className="fa-solid fa-calendar-check text-teal-500"></i>
              કારીગર માસિક હાજરીપત્રક
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">
              મહિનો: <span className="font-semibold text-teal-600 dark:text-teal-400">{activeMonthLabel} - {selectedYear}</span>
            </p>
          </div>

          {/* Worker Selector Dropdown */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-sm font-semibold text-gray-600 shrink-0 dark:text-slate-300" htmlFor="worker-select-picker">
              👷 કારીગર પસંદ કરો:
            </label>
            <select
              id="worker-select-picker"
              value={selectedWorkerId || ''}
              onChange={(e) => onSelectWorker(e.target.value || null)}
              className="w-full sm:w-64 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-950 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
            >
              <option value="">-- કારીગર પસંદ કરો --</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.village})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Days table and Totals */}
      {!selectedWorkerId ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-500 mb-4 animate-bounce dark:bg-slate-800 dark:text-teal-400">
            <i className="fa-solid fa-hand-point-up text-2xl"></i>
          </div>
          <h4 className="text-lg font-bold text-gray-900 font-sans dark:text-slate-100">હાજરી જોવા માટે કોઈ કારીગર પસંદ કરો</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto px-4 dark:text-slate-400">
            ઉપરના મેનુમાથી કોઈપણ કારીગર પસંદ કરશો એટલે તેમનું આખા મહિનાનું હાજરી, ઉપાડ અને નોંધ પ્રબંધન કોષ્ટક ખૂલશે.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Worker Brief Details */}
          <div className="rounded-2xl bg-teal-50/50 border border-teal-100 p-4 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4 dark:bg-slate-800/50 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm font-bold font-sans">
                {selectedWorker.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-base font-bold text-teal-950 font-sans dark:text-teal-400">
                  {selectedWorker.name}
                </h4>
                <p className="text-xs text-teal-700/80 dark:text-teal-400/80">
                  ગામ: {selectedWorker.village} | રોજનો પગાર: ₹{selectedWorker.dailyWage}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectWorker(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200 transition-all shadow-sm dark:bg-slate-800 dark:text-teal-400 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                <i className="fa-solid fa-arrow-left mr-1"></i> કારીગર યાદી
              </button>
            </div>
          </div>

          {/* Monthly Days Table / List */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            {/* Mobile Horizontal Swipe Indicator helper */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-teal-50/20 border-b border-gray-100 dark:bg-slate-800/50 dark:border-slate-800 md:hidden text-[11px] font-bold text-teal-750 dark:text-teal-400">
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-arrows-left-right text-xs text-teal-500"></i>
                આંગળીથી ડાબે-જમણે સ્ક્રૉલ કરો (Swipe Left / Right)
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">હાજરી - ઉપાડ - કોમેન્ટ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-slate-400">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600 border-b border-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-800">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 text-center font-bold w-16">
                      તારીખ
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-center w-40">
                      હાજરી
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-left w-48">
                      ચૂકવેલ રકમ / ઉપાડ (₹)
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-left">
                      કોમેન્ટ અથવા અન્ય નોંધ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {daysArray.map((day) => {
                    const record = currentAttendance[day] || { status: '', upad: 0, note: '' };
                    return (
                      <tr key={day} className="hover:bg-teal-50/10 dark:hover:bg-slate-800/20 transition-colors">
                        {/* Day Number Column */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold font-sans text-gray-900 border border-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                            {day}
                          </span>
                        </td>

                        {/* Attendance Selection Column */}
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <select
                              id={`select-status-${day}`}
                              value={record.status}
                              onChange={(e) =>
                                onUpdateAttendance(
                                  selectedWorkerId,
                                  day,
                                  'status',
                                  e.target.value as AttendanceStatus
                                )
                              }
                              className={`w-full rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm outline-none transition-colors ${
                                record.status === 'P'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                                  : record.status === 'A'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 focus:border-rose-500 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                                  : record.status === 'H'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 focus:border-amber-500 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
                                  : record.status === 'O'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-200 focus:border-cyan-500 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900'
                                  : record.status === 'D'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 focus:border-purple-500 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900'
                                  : 'bg-gray-100 text-gray-600 border-gray-200 focus:border-teal-500 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <option value="">-- પસંદ કરો --</option>
                              <option value="P">✅ હાજર (Present - ૧.૦)</option>
                              <option value="A">❌ ગેરહાજર (Absent)</option>
                              <option value="H">🌗 અડધો દિવસ (Half Day - ૦.૫)</option>
                              <option value="O">⏰ ઓવર ટાઈમ (Overtime - ૧.૫)</option>
                              <option value="D">⚡ ડબલ ઓવર ટાઈમ (Double OT - ૨.૦)</option>
                            </select>
                          </div>
                        </td>

                        {/* Advance Upad Amount Column */}
                        <td className="px-4 py-3">
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold dark:text-slate-500">
                              ₹
                            </span>
                            <input
                              id={`input-upad-${day}`}
                              type="number"
                              min="0"
                              value={record.upad || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                onUpdateAttendance(selectedWorkerId, day, 'upad', val);
                              }}
                              placeholder="0"
                              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-7 pr-3 py-1.5 text-xs font-semibold text-gray-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                            />
                          </div>
                        </td>

                        {/* Remarks/Note Column */}
                        <td className="px-4 py-3">
                          <input
                            id={`input-note-${day}`}
                            type="text"
                            value={record.note || ''}
                            onChange={(e) =>
                              onUpdateAttendance(selectedWorkerId, day, 'note', e.target.value)
                            }
                            placeholder="આજની કોઈ ખાસ વિગત અથવા નોંધો લખો..."
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1.5 text-xs text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/30 to-emerald-50/30 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-905/60">
            <h4 className="text-base font-bold text-gray-900 font-sans border-b border-teal-100/50 pb-3 flex items-center gap-2 dark:text-slate-100 dark:border-slate-800">
              <i className="fa-solid fa-calculator text-teal-600"></i>
              ચાલુ માસિક ગણતરી અને પત્રક વિગત
            </h4>

            {/* Calculations Blocks */}
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
              {/* Present days count */}
              <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block label-title dark:text-slate-400">
                  ✅ કુલ હાજર દિવસ
                </span>
                <span className="text-2xl font-black text-emerald-600 font-sans block mt-1 dark:text-emerald-400">
                  {totals.presentDays}
                </span>
              </div>

              {/* Absent days count */}
              <div className="rounded-xl border border-rose-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block label-title dark:text-slate-400">
                  ❌ કુલ ગેરહાજર દિવસ
                </span>
                <span className="text-2xl font-black text-rose-600 font-sans block mt-1 dark:text-rose-400">
                  {totals.absentDays}
                </span>
              </div>

              {/* Total earnings */}
              <div className="rounded-xl border border-teal-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block label-title dark:text-slate-400">
                  💵 કુલ બનેલ કમાણી (જમા)
                </span>
                <span className="text-xl sm:text-2xl font-black text-teal-700 font-sans block mt-1 dark:text-teal-400">
                  ₹{totals.totalEarnings.toLocaleString('gu-IN')}
                </span>
              </div>

              {/* Total advanced drawn */}
              <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block label-title dark:text-slate-400">
                  💰 કુલ ચૂકવેલ રકમ (ઉપાડ)
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-700 font-sans block mt-1 dark:text-amber-400">
                  ₹{totals.totalUpad.toLocaleString('gu-IN')}
                </span>
              </div>

              {/* Balance remaining dues */}
              <div className="rounded-xl border border-purple-100 bg-white p-3 shadow-sm col-span-2 md:col-span-1 dark:border-slate-700 dark:bg-slate-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block label-title dark:text-slate-400">
                  📉 કુલ ચૂકવવાની બાકી રકમ
                </span>
                <span
                  className={`text-xl sm:text-2xl font-black font-sans block mt-1 ${
                    totals.balance >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  ₹{totals.balance.toLocaleString('gu-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
