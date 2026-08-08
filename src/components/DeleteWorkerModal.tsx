import React, { useState } from 'react';
import { Worker } from '../types';
import { GUJARATI_MONTHS } from '../utils/attendanceUtils';

interface DeleteWorkerModalProps {
  isOpen: boolean;
  worker: Worker | null;
  selectedMonth: number;
  selectedYear: number;
  onClose: () => void;
  onDeactivateForMonth: (workerId: string, month: number, year: number) => void;
  onDeletePermanently: (workerId: string) => void;
}

export default function DeleteWorkerModal({
  isOpen,
  worker,
  selectedMonth,
  selectedYear,
  onClose,
  onDeactivateForMonth,
  onDeletePermanently,
}: DeleteWorkerModalProps) {
  const [deleteOption, setDeleteOption] = useState<'month' | 'permanent'>('month');

  if (!isOpen || !worker) return null;

  const monthLabel = GUJARATI_MONTHS.find((m) => m.value === selectedMonth)?.label || '';

  const handleConfirm = () => {
    if (deleteOption === 'month') {
      onDeactivateForMonth(worker.id, selectedMonth, selectedYear);
    } else {
      onDeletePermanently(worker.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all md:p-7 dark:bg-slate-900 dark:border dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <i className="fa-solid fa-user-minus text-lg"></i>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-slate-100 font-sans">
                કારીગર રદ કરવાની રીત
              </h3>
              <p className="text-xs text-teal-600 font-bold dark:text-teal-400">
                👤 {worker.name} ({worker.village})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-slate-800 dark:text-slate-400"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Options selection */}
        <div className="mt-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            તમે <span className="font-extrabold text-gray-900 dark:text-slate-200">{worker.name}</span> માટે શું કરવા માંગો છો?
          </p>

          {/* Option 1: Current Month Only (RECOMMENDED) */}
          <label 
            onClick={() => setDeleteOption('month')}
            className={`group relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
              deleteOption === 'month'
                ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20 dark:border-teal-500 dark:bg-teal-950/30'
                : 'border-gray-200 bg-white hover:border-teal-200 dark:border-slate-800 dark:bg-slate-800/40'
            }`}
          >
            <input
              type="radio"
              name="deleteOption"
              value="month"
              checked={deleteOption === 'month'}
              onChange={() => setDeleteOption('month')}
              className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-teal-950 dark:text-teal-300">
                  માત્ર આ મહિના પૂરતા રદ કરો ({monthLabel} {selectedYear})
                </span>
                <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                  સુરક્ષિત (ઉત્તમ)
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                આ મહિનાની હાજરીમાંથી નીકળી જશે, પરંતુ <strong className="text-teal-700 dark:text-teal-400">જૂના અને આવનારા તમામ મહિનાઓનો હિસાબ સુરક્ષિત રહેશે</strong>.
              </p>
            </div>
          </label>

          {/* Option 2: Delete Permanently */}
          <label 
            onClick={() => setDeleteOption('permanent')}
            className={`group relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
              deleteOption === 'permanent'
                ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20 dark:border-rose-500 dark:bg-rose-950/30'
                : 'border-gray-200 bg-white hover:border-rose-200 dark:border-slate-800 dark:bg-slate-800/40'
            }`}
          >
            <input
              type="radio"
              name="deleteOption"
              value="permanent"
              checked={deleteOption === 'permanent'}
              onChange={() => setDeleteOption('permanent')}
              className="mt-0.5 h-4 w-4 text-rose-600 focus:ring-rose-500"
            />
            <div className="flex-1">
              <span className="text-sm font-extrabold text-rose-950 dark:text-rose-300">
                સંપૂર્ણ કાયમી માટે ડિલીટ કરો (બધા મહિનામાંથી)
              </span>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                આ કારીગર અને તેમનો <strong className="text-rose-600 dark:text-rose-400">તમામ જૂનો હિસાબ કાયમ માટે ડિલીટ</strong> થશે.
              </p>
            </div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
          >
            રદ કરો (Cancel)
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition-all active:scale-95 ${
              deleteOption === 'month'
                ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-100 dark:shadow-none'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100 dark:shadow-none'
            }`}
          >
            <i className={`fa-solid ${deleteOption === 'month' ? 'fa-calendar-xmark' : 'fa-trash-can'}`}></i>
            {deleteOption === 'month' ? `આ મહિનામાં રદ કરો (${monthLabel})` : 'કાયમી ડિલીટ કરો'}
          </button>
        </div>
      </div>
    </div>
  );
}
