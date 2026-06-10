import React, { useState } from 'react';
import { Worker } from '../types';

interface WorkersViewProps {
  workers: Worker[];
  onOpenAddModal: () => void;
  onOpenEditModal: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  onViewWorkerAttendance: (id: string) => void;
}

export default function WorkersView({
  workers,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteWorker,
  onViewWorkerAttendance,
}: WorkersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Local filter
  const filteredWorkers = workers.filter((w) => {
    const query = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(query) ||
      w.village.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top action block with Search and add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-505">
            <i className="fa-solid fa-magnifying-glass"></i>
          </span>
          <input
            id="worker-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="કારીગર અથવા ગામનું નામ શોધો..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
          />
        </div>

        <button
          id="btn-add-new-worker"
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-100 transition-all hover:bg-teal-600 select-none whitespace-nowrap dark:shadow-none"
        >
          <i className="fa-solid fa-user-plus"></i>
          નવો કારીગર ઉમેરો
        </button>
      </div>

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-500 mb-4 animate-pulse dark:bg-slate-800 dark:text-teal-400">
            <i className="fa-solid fa-users-slash text-2xl"></i>
          </div>
          <h4 className="text-lg font-bold text-gray-900 font-sans dark:text-slate-100">હજુ સુધી કોઈ કારીગરો મળ્યા નથી!</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto px-4 dark:text-slate-400">
            {searchQuery 
              ? 'કૃપા કરીને શોધ ક્વેરી બદલો અથવા સાચું નામ ટાઈપ કરો.' 
              : 'કારીગરો ઉમેરવા માટે ઉપર આપેલા "નવો કારીગર ઉમેરો" બટન પર ક્લિક કરો.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredWorkers.map((worker) => (
            <div
              key={worker.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Decorative top strip */}
              <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-teal-400 to-emerald-400"></div>

              {/* Card Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 font-sans group-hover:text-teal-605 transition-colors dark:text-slate-150 dark:group-hover:text-teal-400">
                    👤 {worker.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium dark:bg-slate-800 dark:text-slate-300">
                      📍 {worker.village}
                    </span>
                  </p>
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
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 px-3 py-2 text-xs font-bold text-teal-700 transition-colors dark:bg-teal-950/40 dark:text-teal-400 dark:hover:bg-teal-900/40"
                >
                  <i className="fa-solid fa-calendar-days text-sm"></i>
                  હાજરીપત્રક જુઓ
                </button>

                {/* Edit Button */}
                <button
                  id={`btn-edit-worker-${worker.id}`}
                  onClick={() => onOpenEditModal(worker)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 dark:hover:border-amber-900/40"
                  title="વિગતો બદલાવો"
                >
                  <i className="fa-solid fa-pen text-xs"></i>
                </button>

                {/* Delete Button */}
                <button
                  id={`btn-delete-worker-${worker.id}`}
                  onClick={() => onDeleteWorker(worker.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-450 dark:hover:border-rose-900/40"
                  title="કારીગર રદ કરો"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
