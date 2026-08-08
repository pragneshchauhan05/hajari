import React, { useState } from 'react';
import { Worker } from '../types';
import { isWorkerActiveInMonth, GUJARATI_MONTHS } from '../utils/attendanceUtils';

interface WorkersViewProps {
  workers: Worker[];
  selectedMonth: number;
  selectedYear: number;
  onOpenAddModal: () => void;
  onOpenEditModal: (worker: Worker) => void;
  onRequestDeleteWorker: (worker: Worker) => void;
  onReactivateWorker: (workerId: string, month: number, year: number) => void;
  onViewWorkerAttendance: (id: string) => void;
}

export default function WorkersView({
  workers,
  selectedMonth,
  selectedYear,
  onOpenAddModal,
  onOpenEditModal,
  onRequestDeleteWorker,
  onReactivateWorker,
  onViewWorkerAttendance,
}: WorkersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactiveList, setShowInactiveList] = useState(false);

  const monthLabel = GUJARATI_MONTHS.find((m) => m.value === selectedMonth)?.label || '';

  // Separate active workers vs inactive workers for the currently selected month
  const activeWorkers = workers.filter((w) => isWorkerActiveInMonth(w, selectedMonth, selectedYear));
  const inactiveWorkers = workers.filter((w) => !isWorkerActiveInMonth(w, selectedMonth, selectedYear));

  // Local filter for active workers
  const filteredActiveWorkers = activeWorkers.filter((w) => {
    const query = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(query) ||
      w.village.toLowerCase().includes(query) ||
      (w.mobile && w.mobile.toLowerCase().includes(query))
    );
  });

  // Local filter for inactive workers
  const filteredInactiveWorkers = inactiveWorkers.filter((w) => {
    const query = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(query) ||
      w.village.toLowerCase().includes(query) ||
      (w.mobile && w.mobile.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top action block with Search and add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <i className="fa-solid fa-magnifying-glass"></i>
          </span>
          <input
            id="worker-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="કારીગર, સાઇટ અથવા મોબાઇલ નંબર શોધો..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
          />
        </div>

        <button
          id="btn-add-new-worker"
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-100 transition-all hover:bg-teal-600 select-none whitespace-nowrap dark:shadow-none cursor-pointer"
        >
          <i className="fa-solid fa-user-plus"></i>
          નવો કારીગર ઉમેરો
        </button>
      </div>

      {/* Workers Grid for Active Workers in Selected Month */}
      {filteredActiveWorkers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-500 mb-4 animate-pulse dark:bg-slate-800 dark:text-teal-400">
            <i className="fa-solid fa-users-slash text-2xl"></i>
          </div>
          <h4 className="text-lg font-bold text-gray-900 font-sans dark:text-slate-100">
            {monthLabel} {selectedYear} માં કોઈ ચાલુ કારીગરો મળ્યા નથી!
          </h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto px-4 dark:text-slate-400">
            {searchQuery 
              ? 'કૃપા કરીને શોધ ક્વેરી બદલો અથવા સાચું નામ ટાઈપ કરો.' 
              : 'કારીગરો ઉમેરવા માટે ઉપર આપેલા "નવો કારીગર ઉમેરો" બટન પર ક્લિક કરો.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredActiveWorkers.map((worker) => (
            <div
              key={worker.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Decorative top strip */}
              <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-teal-400 to-emerald-400"></div>

              {/* Card Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 font-sans group-hover:text-teal-600 transition-colors dark:text-slate-100 dark:group-hover:text-teal-400">
                    👤 {worker.name}
                  </h4>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold dark:bg-slate-800 dark:text-slate-300">
                        🏗️ સાઇટ: {worker.village}
                      </span>
                    </p>
                    {worker.mobile && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold dark:bg-teal-950/40 dark:text-teal-400">
                          📞 મો: {worker.mobile}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Daily Wage Display */}
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest dark:text-slate-500">રોજનો પગાર</p>
                  <p className="text-lg font-black text-teal-600 font-sans dark:text-teal-400">
                    ₹{worker.dailyWage}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-slate-800">
                {/* View Attendance details button */}
                <button
                  id={`btn-view-attendance-${worker.id}`}
                  onClick={() => onViewWorkerAttendance(worker.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 px-3 py-2 text-xs font-bold text-teal-700 transition-colors dark:bg-teal-950/40 dark:text-teal-400 dark:hover:bg-teal-900/40 cursor-pointer"
                >
                  <i className="fa-solid fa-calendar-days text-sm"></i>
                  હાજરીપત્રક જુઓ
                </button>

                {/* Edit Button */}
                <button
                  id={`btn-edit-worker-${worker.id}`}
                  onClick={() => onOpenEditModal(worker)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 dark:hover:border-amber-900/40 cursor-pointer"
                  title="વિગતો બદલાવો"
                >
                  <i className="fa-solid fa-pen text-xs"></i>
                </button>

                {/* Delete Button */}
                <button
                  id={`btn-delete-worker-${worker.id}`}
                  onClick={() => onRequestDeleteWorker(worker)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 dark:hover:border-rose-900/40 cursor-pointer"
                  title="કારીગર રદ કરો (ઓન્લી આ મંથ કે કાયમી)"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inactive Workers for Current Month Collapsible Section */}
      {inactiveWorkers.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <button
            type="button"
            onClick={() => setShowInactiveList((prev) => !prev)}
            className="flex w-full items-center justify-between text-left cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-black text-xs dark:bg-amber-900/50 dark:text-amber-300">
                {inactiveWorkers.length}
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-300 font-sans">
                  {monthLabel} {selectedYear} માં રદ / નિષ્ક્રિય કરેલ કારીગરો
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400/80">
                  આ કારીગરો આ મહિનાના હાજરીપત્રકમાંથી દૂર કરેલ છે, પરંતુ જૂનો તમામ હિસાબ સુરક્ષિત છે!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <span>{showInactiveList ? 'બંધ કરો' : 'બતાવો'}</span>
              <i className={`fa-solid ${showInactiveList ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            </div>
          </button>

          {showInactiveList && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-amber-200/60 pt-4 dark:border-amber-900/40">
              {filteredInactiveWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between rounded-xl bg-white p-3.5 border border-amber-100 shadow-sm dark:bg-slate-900 dark:border-slate-800"
                >
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm dark:text-slate-100">
                      👤 {worker.name}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      🏗️ {worker.village} · ₹{worker.dailyWage}/દિવસ
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onReactivateWorker(worker.id, selectedMonth, selectedYear)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-extrabold text-white transition-all active:scale-95 cursor-pointer dark:bg-emerald-500"
                      title="આ મહિનાના હાજરીપત્રકમાં પાછા ઉમેરો"
                    >
                      <i className="fa-solid fa-plus-circle"></i>
                      <span>આ મહિનામાં પાછા ઉમેરો</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRequestDeleteWorker(worker)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-rose-600 transition-colors dark:border-slate-800"
                      title="કાયમી ડિલીટ કરો"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

