import React from 'react';
import { GUJARATI_MONTHS, YEARS } from '../utils/attendanceUtils';

interface NavbarProps {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Navbar({
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  isDarkMode,
  onToggleDarkMode,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-teal-100 bg-white/95 backdrop-blur-md shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and App Title */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-md shadow-teal-100 transition-transform hover:scale-105 dark:shadow-none">
            <i className="fa-solid fa-calendar-check text-base sm:text-xl"></i>
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-teal-950 font-sans flex items-center gap-1.5 dark:text-teal-400">
              હાજરી
            </h1>
          </div>
        </div>

        {/* Month and Year Selectors + Dark mode Toggle */}
        <div className="flex items-center space-x-1 sm:space-x-4">
          {/* Month Selector */}
          <div className="flex items-center space-x-1">
            <label className="hidden text-xs font-medium text-gray-500 md:block dark:text-gray-400" htmlFor="month-select">
              <i className="fa-solid fa-calendar-days text-teal-600 dark:text-teal-400 mr-1"></i> મહિનો:
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="rounded-lg border border-teal-100 bg-teal-50/50 px-1.5 py-1 text-xs font-bold text-teal-950 shadow-sm outline-none transition-colors focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 sm:px-3 sm:py-1.5 sm:text-sm sm:font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-teal-100 dark:focus:border-teal-500"
            >
              {GUJARATI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center space-x-1">
            <label className="hidden text-xs font-medium text-gray-500 md:block dark:text-gray-400" htmlFor="year-select">
              <i className="fa-solid fa-clock text-teal-600 dark:text-teal-400 mr-1"></i> વર્ષ:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="rounded-lg border border-teal-100 bg-teal-50/50 px-1.5 py-1 text-xs font-bold text-teal-950 shadow-sm outline-none transition-colors focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 sm:px-3 sm:py-1.5 sm:text-sm sm:font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-teal-100 dark:focus:border-teal-500"
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
              onClick={() => { if (isDarkMode) onToggleDarkMode(); }}
              className={`flex items-center gap-1 px-1.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                !isDarkMode
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-teal-700 hover:text-teal-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="લાઈટ મોડ સેટ કરો"
            >
              <i className="fa-solid fa-sun text-xs sm:text-sm text-yellow-500 dark:text-amber-400"></i>
              <span className="hidden sm:inline">લાઈટ મોડ</span>
            </button>
            
            {/* Dark Mode Segment Button */}
            <button
              id="theme-dark-btn"
              onClick={() => { if (!isDarkMode) onToggleDarkMode(); }}
              className={`flex items-center gap-1 px-1.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                isDarkMode
                  ? 'bg-teal-500 text-white shadow-sm dark:bg-teal-600'
                  : 'text-teal-700 hover:text-teal-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="ડાર્ક મોડ સેટ કરો"
            >
              <i className="fa-solid fa-moon text-xs sm:text-sm text-indigo-500 dark:text-indigo-400"></i>
              <span className="hidden sm:inline">ડાર્ક મોડ</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
