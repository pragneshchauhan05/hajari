import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Worker } from '../types';
import { isWorkerActiveInMonth, getWorkerWageForMonth, isWorkerScopedToSpecificMonth, isWorkerAssignedToMonth } from '../utils/attendanceUtils';
import { useLanguage } from '../context/LanguageContext';

interface WorkersViewProps {
  workers: Worker[];
  selectedMonth: number;
  selectedYear: number;
  onOpenAddModal: () => void;
  onOpenEditModal: (worker: Worker) => void;
  onRequestDeleteWorker: (worker: Worker) => void;
  onReactivateWorker: (workerId: string, month: number, year: number) => void;
  onRestoreDeletedWorker?: (workerId: string) => void;
  onViewWorkerAttendance: (id: string) => void;
  user?: User | null;
  onRestore?: () => void;
  onOpenQuickEntry?: () => void;
}

export default function WorkersView({
  workers,
  selectedMonth,
  selectedYear,
  onOpenAddModal,
  onOpenEditModal,
  onRequestDeleteWorker,
  onReactivateWorker,
  onRestoreDeletedWorker,
  onViewWorkerAttendance,
  user: _user,
  onRestore,
  onOpenQuickEntry,
}: WorkersViewProps) {
  const { language, t, months } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactiveList, setShowInactiveList] = useState(false);
  const [showDeletedList, setShowDeletedList] = useState(false);

  const monthLabel = months.find((m) => m.value === selectedMonth)?.label || '';

  // Workers created exclusively for a specific past month should only ever exist/appear for that specific month
  const isWorkerVisibleInSelectedMonth = (w: Worker) => {
    if (isWorkerScopedToSpecificMonth(w) && !isWorkerAssignedToMonth(w, selectedMonth, selectedYear)) {
      return false;
    }
    return true;
  };

  // Separate active workers vs inactive workers for the currently selected month (excluding deleted workers and workers belonging to other months)
  const activeWorkers = workers.filter((w) => !w.isDeleted && isWorkerVisibleInSelectedMonth(w) && isWorkerActiveInMonth(w, selectedMonth, selectedYear));
  const inactiveWorkers = workers.filter((w) => !w.isDeleted && isWorkerVisibleInSelectedMonth(w) && !isWorkerActiveInMonth(w, selectedMonth, selectedYear));
  const deletedWorkers = workers.filter((w) => w.isDeleted === true && isWorkerVisibleInSelectedMonth(w));

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

  // Local filter for deleted workers
  const filteredDeletedWorkers = deletedWorkers.filter((w) => {
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
            placeholder={t('searchWorkersPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-add-new-worker"
            onClick={onOpenAddModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-100 transition-all hover:bg-teal-600 select-none whitespace-nowrap dark:shadow-none cursor-pointer"
          >
            <i className="fa-solid fa-user-plus"></i>
            {t('addNewWorker')}
          </button>
        </div>
      </div>

      {/* Workers Grid for Active Workers in Selected Month */}
      {filteredActiveWorkers.length === 0 ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-3.5 text-2xl dark:bg-slate-800 dark:text-teal-400">
              <i className="fa-solid fa-users"></i>
            </div>
            
            <h4 className="text-base sm:text-lg font-black text-gray-900 font-sans dark:text-slate-100">
              {searchQuery
                ? `${monthLabel} ${selectedYear}: ${t('noWorkersFound')}`
                : t('noWorkersTitle')}
            </h4>

            <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-lg mx-auto px-4 dark:text-slate-400 leading-relaxed">
              {searchQuery
                ? (language === 'en' ? 'Please adjust search query or check spelling.' : 'કૃપા કરીને શોધ ક્વેરી બદલો અથવા સાચું નામ ટાઈપ કરો.')
                : t('noWorkersDesc')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={onOpenAddModal}
                className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-md shadow-teal-200 transition-all cursor-pointer dark:shadow-none"
              >
                <i className="fa-solid fa-user-plus"></i>
                <span>{t('addNewWorker')}</span>
              </button>
            </div>
          </div>
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
                  {isWorkerScopedToSpecificMonth(worker) && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                      <i className="fa-solid fa-clock-rotate-left text-[9px]"></i>
                      {monthLabel} {selectedYear} નો હિસાબ
                    </span>
                  )}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold dark:bg-slate-800 dark:text-slate-300">
                        🏗️ {language === 'en' ? 'Site' : 'સાઇટ'}: {worker.village}
                      </span>
                    </p>
                    {worker.mobile && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold dark:bg-teal-950/40 dark:text-teal-400">
                          📞 {language === 'en' ? 'Mo' : 'મો'}: {worker.mobile}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Daily Wage Display */}
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest dark:text-slate-500">
                    {t('dailyWage')}
                  </p>
                  {(() => {
                    const currentWage = getWorkerWageForMonth(worker, selectedYear, selectedMonth);
                    const prevMonthDate = new Date(selectedYear, selectedMonth - 2, 1);
                    const prevWage = getWorkerWageForMonth(worker, prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1);
                    const hasWageDiff = prevWage > 0 && currentWage !== prevWage;
                    return (
                      <>
                        <p className="text-lg font-black text-teal-600 font-sans dark:text-teal-400">
                          ₹{currentWage}
                        </p>
                        {hasWageDiff && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                            {currentWage > prevWage ? `+₹${currentWage - prevWage} વધારો` : `₹${currentWage}`} (અગાઉ: ₹{prevWage})
                          </span>
                        )}
                      </>
                    );
                  })()}
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
                  {t('viewAttendance')}
                </button>

                {/* Edit Button */}
                <button
                  id={`btn-edit-worker-${worker.id}`}
                  onClick={() => onOpenEditModal(worker)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 dark:hover:border-amber-900/40 cursor-pointer"
                  title={t('editWorker')}
                >
                  <i className="fa-solid fa-pen text-xs"></i>
                </button>

                {/* Delete Button */}
                <button
                  id={`btn-delete-worker-${worker.id}`}
                  onClick={() => onRequestDeleteWorker(worker)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 dark:hover:border-rose-900/40 cursor-pointer"
                  title={t('deleteWorker')}
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
                  {monthLabel} {selectedYear} - {t('inactiveWorkersHeader')}
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400/80">
                  {language === 'en'
                    ? 'Deactivated for this month only; historical records remain preserved!'
                    : 'આ કારીગરો આ મહિનાના હાજરીપત્રકમાંથી દૂર કરેલ છે, પરંતુ જૂનો તમામ હિસાબ સુરક્ષિત છે!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <span>{showInactiveList ? (language === 'en' ? 'Hide' : 'બંધ કરો') : (language === 'en' ? 'Show' : 'બતાવો')}</span>
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
                      🏗️ {worker.village} · ₹{getWorkerWageForMonth(worker, selectedYear, selectedMonth)}/{language === 'en' ? 'day' : 'દિવસ'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onReactivateWorker(worker.id, selectedMonth, selectedYear)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-extrabold text-white transition-all active:scale-95 cursor-pointer dark:bg-emerald-500"
                      title={t('reactivateForMonth')}
                    >
                      <i className="fa-solid fa-plus-circle"></i>
                      <span>{t('reactivateForMonth')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRequestDeleteWorker(worker)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-rose-600 transition-colors dark:border-slate-800 cursor-pointer"
                      title={t('deleteWorker')}
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

      {/* Deleted / Archived Workers Section */}
      {deletedWorkers.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => setShowDeletedList((prev) => !prev)}
            className="flex w-full items-center justify-between text-left cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-200 text-gray-700 font-black text-xs dark:bg-slate-800 dark:text-slate-300">
                {deletedWorkers.length}
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-gray-800 dark:text-slate-200 font-sans">
                  {t('archivedWorkersHeader')}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  {language === 'en'
                    ? 'Removed from active roster, but all past attendance & financial records are fully preserved.'
                    : 'આ કારીગરો ચાલુ લિસ્ટમાંથી દૂર છે, પરંતુ તેમનો અગાઉનો તમામ જૂનો હાજરી અને ઉપાડનો હિસાબ સુરક્ષિત છે.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-slate-400">
              <span>{showDeletedList ? (language === 'en' ? 'Hide' : 'બંધ કરો') : (language === 'en' ? 'Show' : 'બતાવો')}</span>
              <i className={`fa-solid ${showDeletedList ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            </div>
          </button>

          {showDeletedList && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200/80 pt-4 dark:border-slate-800">
              {filteredDeletedWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between rounded-xl bg-white p-3.5 border border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-800"
                >
                  <div>
                    <h5 className="font-bold text-gray-700 text-sm dark:text-slate-200">
                      👤 {worker.name}
                    </h5>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      🏗️ {worker.village} · ₹{getWorkerWageForMonth(worker, selectedYear, selectedMonth)}/{language === 'en' ? 'day' : 'દિવસ'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onViewWorkerAttendance(worker.id)}
                      className="flex items-center gap-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 px-2.5 py-1.5 text-xs font-bold transition-all dark:bg-teal-950/40 dark:text-teal-400 cursor-pointer"
                      title={t('viewAttendance')}
                    >
                      <i className="fa-solid fa-calendar-days text-xs"></i>
                      <span>{t('viewAttendance')}</span>
                    </button>

                    {onRestoreDeletedWorker && (
                      <button
                        type="button"
                        onClick={() => onRestoreDeletedWorker(worker.id)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        title={t('restorePermanentlyDeleted')}
                      >
                        <i className="fa-solid fa-rotate-left text-xs"></i>
                        <span>{t('restorePermanentlyDeleted')}</span>
                      </button>
                    )}
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
