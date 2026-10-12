import React, { useState, useEffect } from 'react';
import { Worker } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getWorkerWageForMonth } from '../utils/attendanceUtils';

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    village: string;
    dailyWage: number;
    mobile?: string;
    wageScope?: 'from_current_month' | 'all_months';
    effectiveYear?: number;
    effectiveMonth?: number;
  }) => void;
  initialData?: Worker | null;
  workers: Worker[];
  selectedMonth: number;
  selectedYear: number;
}

export default function WorkerModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  workers,
  selectedMonth,
  selectedYear,
}: WorkerModalProps) {
  const { language, t, months } = useLanguage();
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [mobile, setMobile] = useState('');
  const [dailyWage, setDailyWage] = useState<number | ''>('');
  const [originalWage, setOriginalWage] = useState<number>(0);
  const [wageScope, setWageScope] = useState<'from_current_month' | 'all_months'>('from_current_month');
  const [error, setError] = useState('');

  const currentMonthLabel = months.find((m) => m.value === selectedMonth)?.label || '';

  // Sync with initialData for editing
  useEffect(() => {
    if (initialData) {
      const currentEffWage = getWorkerWageForMonth(initialData, selectedYear, selectedMonth);
      setName(initialData.name);
      setVillage(initialData.village);
      setMobile(initialData.mobile || '');
      setDailyWage(currentEffWage);
      setOriginalWage(currentEffWage);
      setWageScope('from_current_month');
    } else {
      setName('');
      setVillage('');
      setMobile('');
      setDailyWage('');
      setOriginalWage(0);
      setWageScope('from_current_month');
    }
    setError('');
  }, [initialData, isOpen, selectedMonth, selectedYear]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('errNameReq'));
      return;
    }

    // Check duplicate name
    const isDuplicate = workers.some((w) => {
      if (initialData && w.id === initialData.id) {
        return false;
      }
      return w.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });

    if (isDuplicate) {
      setError(t('errDuplicate'));
      return;
    }

    if (!village.trim()) {
      setError(t('errSiteReq'));
      return;
    }
    if (!mobile.trim()) {
      setError(t('errMobileReq'));
      return;
    }
    if (mobile.trim().length !== 10) {
      setError(t('errMobileDigits'));
      return;
    }
    if (!dailyWage || Number(dailyWage) <= 0) {
      setError(t('errWageReq'));
      return;
    }

    onSave({
      name: trimmedName,
      village: village.trim(),
      mobile: mobile.trim(),
      dailyWage: Number(dailyWage),
      wageScope,
      effectiveYear: selectedYear,
      effectiveMonth: selectedMonth,
    });
    onClose();
  };

  const hasWageChanged = initialData && Number(dailyWage) > 0 && Number(dailyWage) !== originalWage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all duration-300 md:p-8 dark:bg-slate-900 dark:border dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-slate-800">
          <h3 className="text-xl font-bold text-teal-950 font-sans flex items-center gap-2 dark:text-teal-400">
            <i className={`fa-solid ${initialData ? 'fa-user-pen text-amber-500' : 'fa-user-plus text-teal-600'}`}></i>
            {initialData ? t('editWorkerHeading') : t('addWorkerHeading')}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          
          {/* Validation Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 flex items-center gap-2 dark:border-rose-950 dark:bg-rose-900/20 dark:text-rose-400">
              <i className="fa-solid fa-circle-exclamation text-rose-500 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 dark:text-slate-300" htmlFor="worker-name">
              👤 {t('workerNameInputLabel')}
            </label>
            <input
              id="worker-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workerNameInputPlaceholder')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-950/40 dark:focus:bg-slate-900"
            />
          </div>

          {/* Mobile Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 dark:text-slate-300" htmlFor="worker-mobile">
              📞 {t('mobileInputLabel')}
            </label>
            <input
              id="worker-mobile"
              type="tel"
              value={mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setMobile(val);
              }}
              placeholder={t('mobileInputPlaceholder')}
              maxLength={10}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-950/40 dark:focus:bg-slate-900"
            />
          </div>

          {/* Village / Site Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 dark:text-slate-300" htmlFor="worker-village">
              🏗️ {t('siteInputLabel')}
            </label>
            <input
              id="worker-village"
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder={t('siteInputPlaceholder')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-950/40 dark:focus:bg-slate-900"
            />
          </div>

          {/* Wage Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300" htmlFor="worker-wage">
                💰 {t('wageInputLabel')}
              </label>
              {initialData && originalWage > 0 && (
                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                  {language === 'en' ? `Current: ₹${originalWage}` : `ચાલુ રોજ: ₹${originalWage}`}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm dark:text-slate-400">
                ₹
              </span>
              <input
                id="worker-wage"
                type="number"
                value={dailyWage}
                onChange={(e) => setDailyWage(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t('wageInputPlaceholder')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-3 text-sm text-gray-950 font-medium outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-950/40 dark:focus:bg-slate-900"
              />
            </div>
          </div>

          {/* Wage Scope Options: Shown when editing an existing worker and wage has changed */}
          {hasWageChanged && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 space-y-2.5 dark:border-teal-900/50 dark:bg-teal-950/20">
              <div className="flex items-center gap-2">
                <span className="text-base">📅</span>
                <p className="text-xs font-bold text-teal-900 dark:text-teal-300">
                  {language === 'en'
                    ? 'Apply Wage Change From:'
                    : 'પગાર વધારો / ફેરફાર ક્યારથી લાગુ કરવો?'}
                </p>
              </div>

              <div className="space-y-2 pt-0.5">
                <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  wageScope === 'from_current_month'
                    ? 'bg-white border-teal-500 shadow-sm dark:bg-slate-900 dark:border-teal-500'
                    : 'bg-white/50 border-teal-100 dark:bg-slate-900/40 dark:border-slate-800 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="wageScope"
                    value="from_current_month"
                    checked={wageScope === 'from_current_month'}
                    onChange={() => setWageScope('from_current_month')}
                    className="mt-0.5 text-teal-600 focus:ring-teal-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900 dark:text-slate-100 block">
                      {language === 'en'
                        ? `From ${currentMonthLabel} ${selectedYear} onwards (Recommended)`
                        : `ચાલુ મહિના (${currentMonthLabel} ${selectedYear}) થી લાગુ કરો (ભલામણ કરેલ) ✓`}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400 block mt-0.5 leading-relaxed">
                      {language === 'en'
                        ? 'Previous months\' wages and accounts remain completely unchanged.'
                        : 'અગાઉના જૂના મહિનાઓનો દૈનિક રોજ અને હિસાબ બદલાશે નહીં (સુરક્ષિત રહેશે).'}
                    </span>
                    <span className="text-[11px] text-teal-700 dark:text-teal-300 font-bold block mt-1.5 bg-teal-100/70 dark:bg-teal-900/40 px-2 py-1 rounded-md">
                      {language === 'en'
                        ? `✓ Past months retain ₹${originalWage}/day. New ₹${dailyWage}/day starts strictly from ${currentMonthLabel} ${selectedYear}.`
                        : `✓ પાછલા તમામ મહિનાઓનો રોજ ₹${originalWage} યથાવત રહેશે. નવો રોજ ₹${dailyWage} માત્ર ${currentMonthLabel} ${selectedYear} થી લાગુ થશે.`}
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  wageScope === 'all_months'
                    ? 'bg-white border-teal-500 shadow-sm dark:bg-slate-900 dark:border-teal-500'
                    : 'bg-white/50 border-gray-200 dark:bg-slate-900/40 dark:border-slate-800 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="wageScope"
                    value="all_months"
                    checked={wageScope === 'all_months'}
                    onChange={() => setWageScope('all_months')}
                    className="mt-0.5 text-teal-600 focus:ring-teal-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-gray-800 dark:text-slate-200 block">
                      {language === 'en'
                        ? 'Apply to ALL months (from the beginning)'
                        : 'શરૂઆતથી તમામ મહિના માટે બદલો'}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400 block mt-0.5 leading-relaxed">
                      {language === 'en'
                        ? 'Updates the wage rate for all historical and past months as well.'
                        : 'પાછલા તમામ જૂના મહિનાઓમાં પણ આ નવો રોજ લાગુ થશે.'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Buttons Footer */}
          <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-5 mt-6 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 shadow-md shadow-teal-100 transition-all flex items-center gap-1.5 dark:shadow-none cursor-pointer"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              {t('saveWorkerBtn')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
