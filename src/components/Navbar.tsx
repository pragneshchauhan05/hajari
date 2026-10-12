import React from 'react';
import { User } from 'firebase/auth';
import { YEARS } from '../utils/attendanceUtils';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  user?: User | null;
  isLoggingIn?: boolean;
  onOpenQuickEntry?: () => void;
}

export default function Navbar({
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  isDarkMode,
  onToggleDarkMode,
  user,
  isLoggingIn,
  onOpenQuickEntry,
}: NavbarProps) {
  const { language, t, months } = useLanguage();

  const now = new Date();
  const currentActualMonth = now.getMonth() + 1;
  const currentActualYear = now.getFullYear();
  const isCurrentMonthSelected = selectedMonth === currentActualMonth && selectedYear === currentActualYear;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-teal-100 bg-white/95 backdrop-blur-md shadow-xs transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-2 sm:px-6 lg:px-8">
        
        {/* Logo and App Title */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-md shadow-teal-100 transition-transform hover:scale-105 dark:shadow-none">
            <i className="fa-solid fa-calendar-check text-sm sm:text-xl"></i>
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base sm:text-2xl font-black tracking-tight text-teal-950 font-sans flex items-center gap-1.5 dark:text-teal-400">
              {t('appName')}
            </h1>
            {isCurrentMonthSelected ? (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {t('currentMonthBadge')}
              </span>
            ) : null}
          </div>
        </div>

        {/* Month, Year Selectors + Quick Past Entry + Dark Mode Toggle */}
        <div className="flex items-center space-x-1 sm:space-x-2.5">
          {onOpenQuickEntry && (
            <button
              type="button"
              onClick={onOpenQuickEntry}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
              title={language === 'en' ? 'Quick Past Month Data Entry' : 'જૂના મહિનાનો હિસાબ એન્ટર કરો'}
            >
              <i className="fa-solid fa-bolt-lightning text-amber-300 text-[10px] sm:text-xs"></i>
              <span>{language === 'en' ? 'Past Entry' : 'જૂનો હિસાબ'}</span>
            </button>
          )}

          {/* Quick Return to Current Month Button if an older/future month is picked */}
          {!isCurrentMonthSelected && (
            <button
              type="button"
              onClick={() => {
                onMonthChange(currentActualMonth);
                onYearChange(currentActualYear);
              }}
              className="flex items-center gap-1 rounded-lg bg-teal-600 px-2 py-1 text-[11px] sm:text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition-all active:scale-95 cursor-pointer dark:bg-teal-500 dark:hover:bg-teal-400"
              title={t('backToCurrentMonth')}
            >
              <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
              <span className="hidden xs:inline">{t('backToCurrentMonth')}</span>
            </button>
          )}

          {/* Month Selector */}
          <div className="flex items-center space-x-1">
            <label className="hidden text-xs font-medium text-gray-500 md:block dark:text-gray-400" htmlFor="month-select">
              <i className="fa-solid fa-calendar-days text-teal-600 dark:text-teal-400 mr-1"></i> {t('monthLabel')}
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="rounded-lg border border-teal-100 bg-teal-50/50 px-1.5 py-1 text-xs font-bold text-teal-950 shadow-xs outline-none transition-colors focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 sm:px-3 sm:py-1.5 sm:text-sm sm:font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-teal-100 dark:focus:border-teal-500"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center space-x-1">
            <label className="hidden text-xs font-medium text-gray-500 md:block dark:text-gray-400" htmlFor="year-select">
              <i className="fa-solid fa-clock text-teal-600 dark:text-teal-400 mr-1"></i> {t('yearLabel')}
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="rounded-lg border border-teal-100 bg-teal-50/50 px-1.5 py-1 text-xs font-bold text-teal-950 shadow-xs outline-none transition-colors focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 sm:px-3 sm:py-1.5 sm:text-sm sm:font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-teal-100 dark:focus:border-teal-500"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Single Segmented Theme Switcher Widget */}
          <div className="flex items-center rounded-xl border border-teal-100 bg-teal-50/40 p-0.5 sm:p-1 dark:border-slate-800 dark:bg-slate-900 select-none">
            {/* Light Mode Segment Button */}
            <button
              id="theme-light-btn"
              type="button"
              onClick={() => { if (isDarkMode) onToggleDarkMode(); }}
              className={`flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !isDarkMode
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'text-teal-700 hover:text-teal-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={t('lightMode')}
            >
              <i className="fa-solid fa-sun text-xs sm:text-sm text-yellow-500 dark:text-amber-400"></i>
              <span className="hidden md:inline">{t('lightMode')}</span>
            </button>
            
            {/* Dark Mode Segment Button */}
            <button
              id="theme-dark-btn"
              type="button"
              onClick={() => { if (!isDarkMode) onToggleDarkMode(); }}
              className={`flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-teal-500 text-white shadow-xs dark:bg-teal-600'
                  : 'text-teal-700 hover:text-teal-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={t('darkMode')}
            >
              <i className="fa-solid fa-moon text-xs sm:text-sm text-indigo-500 dark:text-indigo-400"></i>
              <span className="hidden md:inline">{t('darkMode')}</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
