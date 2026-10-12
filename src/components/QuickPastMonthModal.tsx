import React, { useState, useEffect } from 'react';
import { Worker, MonthlyWorkerAttendance } from '../types';
import { getDaysInMonth, YEARS, getWorkerWageForMonth } from '../utils/attendanceUtils';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/translations';

interface QuickPastMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: Worker[];
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
  onSaveMonthlyRecord: (data: {
    workerId: string;
    isNewWorker?: boolean;
    workerData?: { name: string; village: string; dailyWage: number; mobile?: string };
    year: number;
    month: number;
    presentDays: number;
    absentDays: number;
    dailyWage: number;
    totalUpad: number;
    note?: string;
  }) => void;
  onViewWorkerAttendance?: (workerId: string) => void;
  initialMonth: number;
  initialYear: number;
}

export default function QuickPastMonthModal({
  isOpen,
  onClose,
  workers,
  attendanceDB,
  onSaveMonthlyRecord,
  onViewWorkerAttendance,
  initialMonth,
  initialYear,
}: QuickPastMonthModalProps) {
  const { t, months, language } = useLanguage();

  // Mode: 'existing' worker or 'new' worker
  const [workerMode, setWorkerMode] = useState<'existing' | 'new'>('existing');
  
  // Selected existing worker
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  
  // New worker details
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerVillage, setNewWorkerVillage] = useState('');
  const [newWorkerWage, setNewWorkerWage] = useState<number | ''>('');
  const [newWorkerMobile, setNewWorkerMobile] = useState('');

  // Period: Month & Year
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Default to previous month if available, else current
  const defaultPastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const defaultPastYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const [targetYear, setTargetYear] = useState<number>(initialYear || defaultPastYear);
  const [targetMonth, setTargetMonth] = useState<number>(initialMonth || defaultPastMonth);

  // Attendance & Wage numbers
  const [presentDays, setPresentDays] = useState<number | ''>('');
  const [absentDays, setAbsentDays] = useState<number | ''>('');
  const [dailyWage, setDailyWage] = useState<number | ''>('');
  const [totalUpad, setTotalUpad] = useState<number | ''>(0);
  const [note, setNote] = useState('');

  // Status & Saved Feedback
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedWorkerId, setSavedWorkerId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');

  // Total days in selected target month
  const totalDaysInTargetMonth = getDaysInMonth(targetYear, targetMonth);

  // Active non-deleted workers
  const activeWorkers = workers.filter((w) => !w.isDeleted);

  // Initialize selected worker and wage when opening
  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      setErrorMessage('');
      if (activeWorkers.length > 0 && !selectedWorkerId) {
        setSelectedWorkerId(activeWorkers[0].id);
        const wWage = getWorkerWageForMonth(activeWorkers[0], targetYear, targetMonth);
        setDailyWage(wWage || 500);
      }
    }
  }, [isOpen, activeWorkers, selectedWorkerId, targetYear, targetMonth]);

  // When changing existing worker, update the wage rate
  const handleSelectWorker = (wId: string) => {
    setSelectedWorkerId(wId);
    const found = workers.find((w) => w.id === wId);
    if (found) {
      setDailyWage(getWorkerWageForMonth(found, targetYear, targetMonth));
    }
  };

  // When changing workerMode to 'existing', pick first worker if none selected
  const handleSetWorkerMode = (mode: 'existing' | 'new') => {
    setWorkerMode(mode);
    setErrorMessage('');
    if (mode === 'existing' && activeWorkers.length > 0) {
      const activeWorker = workers.find((w) => w.id === selectedWorkerId) || activeWorkers[0];
      setSelectedWorkerId(activeWorker.id);
      setDailyWage(getWorkerWageForMonth(activeWorker, targetYear, targetMonth));
    } else if (mode === 'new') {
      if (typeof newWorkerWage === 'number' && newWorkerWage > 0) {
        setDailyWage(newWorkerWage);
      } else {
        setDailyWage(500);
      }
    }
  };

  // Automatically sync absent days when present days change
  const handlePresentDaysChange = (valStr: string) => {
    if (valStr === '') {
      setPresentDays('');
      setAbsentDays('');
      return;
    }
    const num = parseFloat(valStr);
    if (!isNaN(num) && num >= 0) {
      const clamped = Math.min(num, totalDaysInTargetMonth);
      setPresentDays(clamped);
      const remaining = Math.max(0, totalDaysInTargetMonth - clamped);
      setAbsentDays(remaining);
    }
  };

  // Preset: Full month worked
  const handlePresetFullMonth = () => {
    setPresentDays(totalDaysInTargetMonth);
    setAbsentDays(0);
  };

  // Quick preset: Select Last Month
  const handleSelectLastMonth = () => {
    const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
    setTargetMonth(prevM);
    setTargetYear(prevY);
  };

  // Quick preset: Select Current Month
  const handleSelectCurrentMonth = () => {
    setTargetMonth(currentMonth);
    setTargetYear(currentYear);
  };

  // Financial calculations
  const numericPresent = typeof presentDays === 'number' ? presentDays : 0;
  const numericWage = typeof dailyWage === 'number' ? dailyWage : 0;
  const numericUpad = typeof totalUpad === 'number' ? totalUpad : 0;

  const totalEarnedSalary = Math.round(numericPresent * numericWage);
  const netPayable = totalEarnedSalary - numericUpad;

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (numericPresent <= 0 && numericUpad <= 0) {
      setErrorMessage(
        language === 'en'
          ? 'Please enter present days or advance amount.'
          : 'કૃપા કરીને હાજર દિવસો અથવા ઉપાડની રકમ દાખલ કરો.'
      );
      return;
    }

    if (workerMode === 'new') {
      if (!newWorkerName.trim()) {
        setErrorMessage(
          language === 'en' ? 'Please enter worker name.' : 'કૃપા કરીને કારીગરનું નામ લખો.'
        );
        return;
      }
      if (!newWorkerVillage.trim()) {
        setErrorMessage(
          language === 'en' ? 'Please enter site or village.' : 'કૃપા કરીને સાઇટ અથવા ગામનું નામ લખો.'
        );
        return;
      }
      if (numericWage <= 0) {
        setErrorMessage(
          language === 'en' ? 'Please enter a valid daily wage.' : 'કૃપા કરીને રોજનો પગાર દર દાખલ કરો.'
        );
        return;
      }

      const newId = `w_${Date.now()}`;
      onSaveMonthlyRecord({
        workerId: newId,
        isNewWorker: true,
        workerData: {
          name: newWorkerName.trim(),
          village: newWorkerVillage.trim(),
          dailyWage: numericWage,
          mobile: newWorkerMobile.trim(),
        },
        year: targetYear,
        month: targetMonth,
        presentDays: numericPresent,
        absentDays: typeof absentDays === 'number' ? absentDays : totalDaysInTargetMonth - numericPresent,
        dailyWage: numericWage,
        totalUpad: numericUpad,
        note: note.trim(),
      });

      setSavedWorkerId(newId);
      setSavedSuccess(true);
    } else {
      if (!selectedWorkerId) {
        setErrorMessage(
          language === 'en' ? 'Please select a worker.' : 'કૃપા કરીને કારીગર પસંદ કરો.'
        );
        return;
      }
      if (numericWage <= 0) {
        setErrorMessage(
          language === 'en' ? 'Please enter a valid daily wage.' : 'કૃપા કરીને રોજનો પગાર દર દાખલ કરો.'
        );
        return;
      }

      onSaveMonthlyRecord({
        workerId: selectedWorkerId,
        year: targetYear,
        month: targetMonth,
        presentDays: numericPresent,
        absentDays: typeof absentDays === 'number' ? absentDays : totalDaysInTargetMonth - numericPresent,
        dailyWage: numericWage,
        totalUpad: numericUpad,
        note: note.trim(),
      });

      setSavedWorkerId(selectedWorkerId);
      setSavedSuccess(true);
    }
  };

  // Reset to add another record
  const handleAddAnother = () => {
    setSavedSuccess(false);
    setPresentDays('');
    setAbsentDays('');
    setTotalUpad(0);
    setNote('');
    setNewWorkerName('');
    setNewWorkerVillage('');
    setNewWorkerMobile('');
    setErrorMessage('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl transition-all duration-200 dark:bg-slate-900 border border-teal-100 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-teal-100/70 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 px-4 py-3 sm:px-6 sm:py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold backdrop-blur-xs">
              ⚡
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {t('quickPastEntryTitle')}
              </h3>
              <p className="text-[11px] sm:text-xs text-teal-100 font-medium">
                {t('quickEntrySubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {savedSuccess ? (
            /* Success Feedback View */
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl dark:bg-emerald-950/60 dark:text-emerald-400 animate-bounce">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {language === 'en' ? 'Monthly Record Saved!' : 'માસિક હિસાબ સફળતાપૂર્વક સેવ થયો!'}
                </h4>
                <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
                  {months.find((m) => m.value === targetMonth)?.label} {targetYear} - {numericPresent} {t('daysWord')}
                  {numericWage > 0 && ` | ${formatIndianCurrency(totalEarnedSalary)}`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-3">
                <button
                  type="button"
                  onClick={handleAddAnother}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  {t('addAnotherWorkerBtn')}
                </button>
                {onViewWorkerAttendance && savedWorkerId && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewWorkerAttendance(savedWorkerId);
                      onClose();
                    }}
                    className="px-5 py-2.5 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 text-xs sm:text-sm font-bold shadow-xs transition-all dark:text-teal-300 dark:bg-slate-800 cursor-pointer"
                  >
                    {t('viewAttendanceBtn')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-bold transition-all dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  {language === 'en' ? 'Close' : 'બંધ કરો'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Banner */}
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation text-rose-500 shrink-0"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: MONTH & YEAR PICKER */}
              <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-3 sm:p-3.5 dark:border-slate-800 dark:bg-slate-950/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-teal-950 dark:text-teal-300 flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-days text-teal-600 dark:text-teal-400"></i>
                    <span>{language === 'en' ? 'Select Month & Year' : 'મહિનો અને વર્ષ પસંદ કરો'}</span>
                  </label>
                  
                  {/* Quick Month Chips */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectLastMonth}
                      className="px-2 py-0.5 rounded-lg border border-teal-200 bg-white text-[10px] font-bold text-teal-800 hover:bg-teal-100/70 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-teal-300 cursor-pointer"
                    >
                      {t('lastMonthChip')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectCurrentMonth}
                      className="px-2 py-0.5 rounded-lg border border-teal-200 bg-white text-[10px] font-bold text-teal-800 hover:bg-teal-100/70 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-teal-300 cursor-pointer"
                    >
                      {t('thisMonthChip')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      {t('monthLabel')}
                    </label>
                    <select
                      id="quick-month-select"
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(Number(e.target.value))}
                      className="w-full rounded-xl border border-teal-200/80 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-teal-950 outline-none transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-teal-100"
                    >
                      {months.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      {t('yearLabel')}
                    </label>
                    <select
                      id="quick-year-select"
                      value={targetYear}
                      onChange={(e) => setTargetYear(Number(e.target.value))}
                      className="w-full rounded-xl border border-teal-200/80 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-teal-950 outline-none transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-teal-100"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] font-medium text-teal-800 dark:text-teal-400 flex items-center justify-between pt-0.5">
                  <span>
                    {t('totalDaysBadge')} <strong className="font-extrabold text-teal-950 dark:text-white">{totalDaysInTargetMonth}</strong> {t('daysWord')}
                  </span>
                </div>
              </div>

              {/* STEP 2: WORKER SELECTION (Existing vs New) */}
              <div className="space-y-2">
                {/* Segmented Switch */}
                <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSetWorkerMode('existing')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      workerMode === 'existing'
                        ? 'bg-white text-teal-950 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
                    }`}
                  >
                    👥 {t('existingWorkerTab')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetWorkerMode('new')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      workerMode === 'new'
                        ? 'bg-white text-teal-950 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
                    }`}
                  >
                    + {t('newWorkerTab')}
                  </button>
                </div>

                {workerMode === 'existing' ? (
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1" htmlFor="quick-worker-select">
                      {t('tableWorkerName')} *
                    </label>
                    {activeWorkers.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                        {t('noWorkersDesc')}
                      </div>
                    ) : (
                      <select
                        id="quick-worker-select"
                        value={selectedWorkerId}
                        onChange={(e) => handleSelectWorker(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-bold text-gray-900 outline-none transition-colors focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {activeWorkers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.village ? `(${w.village})` : ''} - ₹{getWorkerWageForMonth(w, targetYear, targetMonth)}/દિવસ
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  /* New Worker Form Fields */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">
                        {t('workerNameInputLabel')}
                      </label>
                      <input
                        type="text"
                        value={newWorkerName}
                        onChange={(e) => setNewWorkerName(e.target.value)}
                        placeholder={t('workerNameInputPlaceholder')}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">
                        {t('siteInputLabel')}
                      </label>
                      <input
                        type="text"
                        value={newWorkerVillage}
                        onChange={(e) => setNewWorkerVillage(e.target.value)}
                        placeholder={t('siteInputPlaceholder')}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">
                        {t('mobileInputLabel')}
                      </label>
                      <input
                        type="tel"
                        value={newWorkerMobile}
                        onChange={(e) => setNewWorkerMobile(e.target.value)}
                        placeholder="૯૮૭૬૫..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: ATTENDANCE & WAGE INPUTS */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Present Days */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300" htmlFor="quick-present-days">
                        {t('presentDaysLabel')}
                      </label>
                    </div>
                    <input
                      id="quick-present-days"
                      type="number"
                      step="0.5"
                      min="0"
                      max={totalDaysInTargetMonth}
                      value={presentDays}
                      onChange={(e) => handlePresentDaysChange(e.target.value)}
                      placeholder="દા.ત. 26"
                      className="w-full rounded-xl border-2 border-emerald-500/40 bg-white px-3 py-2 text-sm sm:text-base font-black text-emerald-700 outline-none focus:border-emerald-600 dark:bg-slate-800 dark:text-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={handlePresetFullMonth}
                      className="mt-1 text-[10px] font-bold text-emerald-700 hover:underline dark:text-emerald-400 block cursor-pointer"
                    >
                      ⚡ {t('fullMonthChip')} ({totalDaysInTargetMonth})
                    </button>
                  </div>

                  {/* Absent Days */}
                  <div>
                    <label className="text-xs font-bold text-rose-700 dark:text-rose-400 block mb-1" htmlFor="quick-absent-days">
                      {t('absentDaysLabel')}
                    </label>
                    <input
                      id="quick-absent-days"
                      type="number"
                      step="0.5"
                      min="0"
                      max={totalDaysInTargetMonth}
                      value={absentDays}
                      onChange={(e) => setAbsentDays(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-rose-300/60 bg-white px-3 py-2 text-sm sm:text-base font-black text-rose-600 outline-none focus:border-rose-500 dark:bg-slate-800 dark:text-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Daily Wage Rate */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1" htmlFor="quick-wage-rate">
                      {t('tableDailyWage')} (₹) *
                    </label>
                    <input
                      id="quick-wage-rate"
                      type="number"
                      min="0"
                      value={dailyWage}
                      onChange={(e) => setDailyWage(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="દા.ત. 600"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Advance / Upad */}
                  <div>
                    <label className="text-xs font-bold text-amber-700 dark:text-amber-400 block mb-1" htmlFor="quick-total-upad">
                      {t('advanceLabel')}
                    </label>
                    <input
                      id="quick-total-upad"
                      type="number"
                      min="0"
                      value={totalUpad}
                      onChange={(e) => setTotalUpad(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-amber-300/60 bg-white px-3 py-2 text-sm font-bold text-amber-700 outline-none focus:border-amber-500 dark:bg-slate-800 dark:text-amber-400"
                    />
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={language === 'en' ? 'Optional note (e.g. Diwali bonus, site A)...' : 'નોંધ (દા.ત. સાઇટ A, દિવાળી બોનસ)...'}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* STEP 4: LIVE SALARY CALCULATION SUMMARY CARD */}
              <div className="rounded-2xl border-2 border-teal-500/40 bg-gradient-to-br from-teal-50/80 to-emerald-50/50 p-3.5 dark:border-teal-800/40 dark:bg-slate-950/80 space-y-2">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <span>💰</span>
                  <span>{t('salaryCalculationTitle')}</span>
                </h5>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-gray-600 dark:text-slate-300">
                    <span>
                      {t('tablePresentDays')}: {numericPresent} × {formatIndianCurrency(numericWage)}
                    </span>
                    <span className="font-extrabold text-gray-900 dark:text-white">
                      {formatIndianCurrency(totalEarnedSalary)}
                    </span>
                  </div>

                  {numericUpad > 0 && (
                    <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                      <span>- {t('advanceDeductionLabel')}</span>
                      <span className="font-extrabold">- {formatIndianCurrency(numericUpad)}</span>
                    </div>
                  )}

                  <div className="border-t border-teal-200/70 pt-2 flex justify-between items-center text-sm font-black dark:border-teal-800/60">
                    <span className="text-teal-950 dark:text-white">
                      {t('netPayableLabel')}
                    </span>
                    <span className={`text-base font-black ${netPayable >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-rose-600'}`}>
                      {formatIndianCurrency(netPayable)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-save-quick-month-record"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-extrabold shadow-md shadow-teal-200/50 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-sm"></i>
                  <span>{t('saveMonthlyRecordBtn')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
