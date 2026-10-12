import React from 'react';
import { ActiveTab } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { User } from 'firebase/auth';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
  isLoggingIn?: boolean;
  onRestore?: () => void;
  isRestoring?: boolean;
  onOpenQuickEntry?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  onRestore,
  isRestoring,
  onOpenQuickEntry,
}: SidebarProps) {
  const { language, t } = useLanguage();

  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: t('dashboard'), icon: 'fa-house', color: 'from-blue-500 to-indigo-600' },
    { id: 'workers' as ActiveTab, label: t('workers'), icon: 'fa-users-gear', color: 'from-amber-400 to-orange-500' },
    { id: 'attendance' as ActiveTab, label: t('attendance'), icon: 'fa-calendar-check', color: 'from-teal-400 to-emerald-600' },
    { id: 'reports' as ActiveTab, label: t('reports'), icon: 'fa-chart-pie', color: 'from-rose-500 to-pink-600' },
    { id: 'admin' as ActiveTab, label: t('adminPanel'), icon: 'fa-shield-halved', color: 'from-purple-500 to-indigo-600' },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 transition-colors duration-200 min-w-0 flex flex-col gap-3">
      {/* Container with shadow and rounded corners */}
      <div className="rounded-2xl border border-gray-100 bg-white p-2.5 sm:p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 w-full min-w-0">
        
        {/* Menu title for desktop only */}
        <div className="mb-4 hidden px-2 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t('mainMenu')}
          </p>
        </div>

        {/* Navigation list */}
        <nav className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-3 md:grid-cols-5 lg:flex lg:flex-col lg:space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full min-w-0 items-center justify-start gap-2 rounded-xl px-2.5 py-2 sm:px-4 sm:py-3 text-[11px] xs:text-xs sm:text-sm font-medium transition-all duration-200 select-none cursor-pointer ${
                  isActive
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-100 dark:shadow-none'
                    : 'text-gray-600 hover:bg-teal-50/50 hover:text-teal-600 dark:text-slate-350 dark:hover:bg-slate-800 dark:hover:text-teal-400'
                }`}
              >
                {/* Decorative Pill/Icon */}
                <div
                  className={`flex h-7 w-7 xs:h-8 xs:w-8 shrink-0 items-center justify-center rounded-lg transition-transform ${
                    isActive
                      ? 'bg-white/20 scale-105'
                      : 'bg-teal-50 text-teal-600 dark:bg-slate-800 dark:text-teal-400'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-xs xs:text-sm`}></i>
                </div>
                
                {/* Label */}
                <span className="truncate sm:whitespace-nowrap font-bold tracking-wide leading-tight text-[11px] xs:text-xs sm:text-sm">
                  {item.label}
                </span>

                {/* Desktop selection indicator arrow */}
                {isActive && (
                  <i className="fa-solid fa-chevron-right ml-auto hidden text-xs opacity-70 lg:block"></i>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Past Month Direct Entry Button in Sidebar */}
        {onOpenQuickEntry && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onOpenQuickEntry}
              className="flex w-full items-center justify-start gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 transition-all cursor-pointer active:scale-98 shadow-xs"
              title={language === 'en' ? 'Quick Past Month Data Entry' : 'જૂના મહિનાનો હિસાબ એન્ટર કરો'}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
                <i className="fa-solid fa-bolt-lightning text-amber-300 text-xs"></i>
              </div>
              <div className="text-left">
                <p className="font-extrabold leading-tight">{language === 'en' ? 'Past Data Entry' : 'જૂના ડેટા એન્ટર કરો'}</p>
                <p className="text-[10px] text-emerald-600/90 dark:text-emerald-400 font-medium">{language === 'en' ? 'Past Month Records' : 'પાછલા મહિનાનો હિસાબ'}</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Account Info / Login in Sidebar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-8 w-8 rounded-full border border-teal-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                  <i className="fa-solid fa-user"></i>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title={language === 'en' ? 'Sign out' : 'લૉગ આઉટ'}
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
              </button>
            )}
          </div>
        ) : onLogin ? (
          <button
            type="button"
            onClick={onLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 text-xs font-bold transition-all cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-teal-300"
          >
            <i className="fa-brands fa-google text-teal-600 dark:text-teal-400"></i>
            <span>
              {isLoggingIn
                ? (language === 'en' ? 'Signing in...' : 'કનેક્ટિંગ...')
                : (language === 'en' ? 'Google Account Login' : 'ગૂગલ એકાઉન્ટ લૉગ-ઇન')}
            </span>
          </button>
        ) : null}
        {onRestore && (
          <button
            type="button"
            onClick={onRestore}
            disabled={isRestoring}
            className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title={language === 'en' ? 'Restore Data from Cloud' : 'ક્લાઉડ માંથી ડેટા રીસ્ટોર કરો'}
          >
            <i className={`fa-solid ${isRestoring ? 'fa-spinner animate-spin' : 'fa-cloud-arrow-down'}`}></i>
            <span>
              {isRestoring
                ? (language === 'en' ? 'Restoring...' : 'રીસ્ટોર થઈ રહ્યું છે...')
                : (language === 'en' ? 'Restore from Cloud' : 'ક્લાઉડ માંથી ડેટા રીસ્ટોર કરો')}
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
