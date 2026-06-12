import React from 'react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'ડેશબોર્ડ', icon: 'fa-house', color: 'from-blue-500 to-indigo-600' },
    { id: 'workers' as ActiveTab, label: 'કારીગરો', icon: 'fa-users-gear', color: 'from-amber-400 to-orange-500' },
    { id: 'attendance' as ActiveTab, label: 'હાજરી કલેક્ટર', icon: 'fa-calendar-check', color: 'from-teal-400 to-emerald-600' },
    { id: 'reports' as ActiveTab, label: 'અહેવાલ', icon: 'fa-chart-pie', color: 'from-rose-500 to-pink-600' },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 transition-colors duration-200">
      {/* Container with shadow and rounded corners */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        {/* Menu title for desktop only */}
        <div className="mb-4 hidden px-2 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-505">
            મુખ્ય મેનુ
          </p>
        </div>

        {/* Navigation list */}
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-col lg:space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center justify-center gap-1.5 xs:gap-2.5 rounded-xl px-2 py-2 xs:px-3 xs:py-2.5 sm:px-4 sm:py-3 text-[11px] xs:text-xs sm:text-sm font-medium transition-all duration-200 select-none lg:w-full lg:justify-start ${
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
                <span className="whitespace-normal text-left sm:whitespace-nowrap font-bold tracking-wide leading-tight text-[11px] xs:text-xs sm:text-sm">
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
      </div>
    </aside>
  );
}
