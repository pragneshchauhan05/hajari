import React, { useState } from 'react';
import { Worker, MonthlyWorkerAttendance, AttendanceStatus } from '../types';
import { getDaysInMonth, calculateWorkerTotals, GUJARATI_MONTHS } from '../utils/attendanceUtils';

interface AttendanceViewProps {
  workers: Worker[];
  selectedWorkerId: string | null;
  onSelectWorker: (id: string | null) => void;
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
  onUpdateAttendance: (
    workerId: string,
    day: number,
    field: 'status' | 'upad' | 'note',
    value: any
  ) => void;
  selectedMonth: number;
  selectedYear: number;
}

export default function AttendanceView({
  workers,
  selectedWorkerId,
  onSelectWorker,
  attendanceDB,
  onUpdateAttendance,
  selectedMonth,
  selectedYear,
}: AttendanceViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // Track if any worker card is collapsed. By default, all workers are expanded (shown).
  const [collapsedWorkers, setCollapsedWorkers] = useState<Record<string, boolean>>({});

  const [autoShareMode, setAutoShareMode] = useState<'off' | 'whatsapp' | 'sms'>(() => {
    const saved = localStorage.getItem('hazari_auto_share_mode');
    return (saved as 'off' | 'whatsapp' | 'sms') || 'off';
  });

  const handleAutoShareModeChange = (mode: 'off' | 'whatsapp' | 'sms') => {
    setAutoShareMode(mode);
    localStorage.setItem('hazari_auto_share_mode', mode);
  };

  const getStatusGujarati = (status: AttendanceStatus) => {
    if (status === 'P') return 'હાજર (1.0)';
    if (status === 'A') return 'ગેરહાજર';
    if (status === 'H') return 'અડધો દિવસ (0.5)';
    if (status === 'O') return 'ઓવર ટાઈમ (1.5)';
    if (status === 'D') return 'ડબલ હાજરી (2.0)';
    return '-';
  };

  const triggerAutoShare = (worker: Worker, day: number, status: AttendanceStatus, upad: number, note: string) => {
    if (autoShareMode === 'off') return;

    const dayStr = String(day).padStart(2, '0');
    const pMonthStr = String(selectedMonth).padStart(2, '0');
    const dateStr = `${dayStr}/${pMonthStr}/${selectedYear}`;
    const statusText = getStatusGujarati(status);
    const upadText = upad > 0 ? `₹${upad}` : '₹0';
    const noteText = note ? note : '-';

    const messageText = 
      `કારીગર હાજરી વિગત\n\n` +
      `નામ: ${worker.name}\n` +
      `તારીખ: ${dateStr}\n` +
      `હાજરી: ${statusText}\n` +
      `ઉપાડ: ${upadText}\n` +
      `નોંધ: ${noteText}\n\n` +
      `મોકલનાર : ભરતભાઈ ચૌહાણ`;

    const phoneNo = worker.mobile ? worker.mobile.trim() : '';

    if (autoShareMode === 'whatsapp') {
      const finalPhone = phoneNo.length === 10 ? `91${phoneNo}` : phoneNo;
      window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(messageText)}`, '_blank');
    } else if (autoShareMode === 'sms') {
      window.open(`sms:${phoneNo}?body=${encodeURIComponent(messageText)}`, '_blank');
    }
  };

  const daysCount = getDaysInMonth(selectedYear, selectedMonth);
  const activeMonthLabel = GUJARATI_MONTHS.find((m) => m.value === selectedMonth)?.label || '';
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  const today = new Date();
  const isCurrentYear = today.getFullYear() === selectedYear;
  const isCurrentMonth = (today.getMonth() + 1) === selectedMonth;
  const currentDay = today.getDate();

  // Filter workers based on search query
  const filteredWorkers = workers.filter((w) => {
    const query = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(query) ||
      w.village.toLowerCase().includes(query) ||
      (w.mobile && w.mobile.toLowerCase().includes(query))
    );
  });

  const toggleCollapse = (workerId: string) => {
    setCollapsedWorkers((prev) => ({
      ...prev,
      [workerId]: !prev[workerId],
    }));
  };

  const expandAll = () => {
    setCollapsedWorkers({});
  };

  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    workers.forEach((w) => {
      collapsed[w.id] = true;
    });
    setCollapsedWorkers(collapsed);
  };

  return (
    <div className="space-y-6">
      {/* Search & Controller Panel */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2 dark:text-slate-100">
              <i className="fa-solid fa-calendar-days text-teal-500"></i>
              કારીગર માસિક હાજરીપત્રક ({activeMonthLabel} - {selectedYear})
            </h3>
          </div>
        </div>

        {/* Local Fast SEARCH box */}
        <div className="relative mt-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-slate-500">
            <i className="fa-solid fa-magnifying-glass text-sm"></i>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="કારીગરનું નામ, સાઇટ અથવા મોબાઇલ નંબર શોધો..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
          />
        </div>

        {/* Instant Auto Message / Share Setting Row */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-teal-50/10 dark:bg-slate-800/20 p-3 rounded-xl border border-teal-100/10">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5 font-sans">
              <i className="fa-solid fa-bolt text-amber-500 animate-pulse"></i>
              ઇન્સ્ટન્ટ ઓટો-મેસેજ મોડ (Auto SMS / WhatsApp Send)
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              હાજરીનું ગોળ ચક્ર ફેરવતા જ મેસેજ સાથે વોટ્સએપ અથવા મોબાઈલ એસએમએસ આપોઆપ ખુલી જશે.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              id="btn-auto-share-off"
              type="button"
              onClick={() => handleAutoShareModeChange('off')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                autoShareMode === 'off'
                  ? 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-100 font-extrabold'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750'
              }`}
            >
              🔴 બંધ (મેન્યુઅલ)
            </button>
            
            <button
              id="btn-auto-share-wa"
              type="button"
              onClick={() => handleAutoShareModeChange('whatsapp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                autoShareMode === 'whatsapp'
                  ? 'bg-emerald-500 text-white shadow-sm font-extrabold dark:bg-emerald-600'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
              }`}
            >
              <i className="fa-brands fa-whatsapp text-sm"></i>
              ઓટો WhatsApp
            </button>

            <button
              id="btn-auto-share-sms"
              type="button"
              onClick={() => handleAutoShareModeChange('sms')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                autoShareMode === 'sms'
                  ? 'bg-sky-500 text-white shadow-sm font-extrabold dark:bg-sky-600'
                  : 'bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-950/20 dark:text-sky-400 dark:hover:bg-sky-950/30'
              }`}
            >
              <i className="fa-solid fa-comment-sms text-sm"></i>
              ઓટો SMS
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredWorkers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-500 mb-4 dark:bg-slate-800 dark:text-teal-400">
            <i className="fa-solid fa-user-slash text-2xl"></i>
          </div>
          <h4 className="text-lg font-bold text-gray-900 font-sans dark:text-slate-100">કોઈ મળેલ કારીગર નથી</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto px-4 dark:text-slate-400">
            તમારા સર્ચ મુજ્બ કોઈ રેકોર્ડ નથી અથવા પહેલા કારીગરો સેક્શનમાં જઈને નવો કારીગર ઉમેરો.
          </p>
        </div>
      ) : (
        /* Workers list */
        <div className="space-y-8">
          {filteredWorkers.map((worker) => {
            const isCollapsed = !!collapsedWorkers[worker.id];
            const dbKey = `${worker.id}_${selectedYear}_${selectedMonth}`;
            const currentAttendance = attendanceDB[dbKey] || {};
            const totals = calculateWorkerTotals(currentAttendance, worker.dailyWage, daysCount);

            return (
              <div
                key={worker.id}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900 transition-colors"
                id={`worker-block-${worker.id}`}
              >
                {/* Worker Header Panel with stats */}
                <div
                  onClick={() => toggleCollapse(worker.id)}
                  className="bg-teal-50/20 border-b border-gray-100 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer select-none dark:bg-slate-800/20 dark:border-slate-800 hover:bg-teal-50/30 dark:hover:bg-slate-800/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm font-bold font-sans">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-teal-950 font-sans dark:text-teal-400">
                        👷 {worker.name}
                      </h4>
                      <p className="text-xs text-teal-800/70 dark:text-teal-400/80">
                        🏗️ સાઇટ: <span className="font-semibold">{worker.village}</span>
                        {worker.mobile && <> | 📞 મો: <span className="font-semibold">{worker.mobile}</span></>}
                        {' '} | 💰 રોજનો પગાર: <span className="font-semibold text-teal-600 dark:text-teal-400">₹{worker.dailyWage}</span>
                      </p>
                    </div>
                  </div>

                  {/* Calculations statistics summary directly in header row */}
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2.5">
                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-950/20">
                      ✅ {totals.presentDays} હાજર
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold bg-rose-50 text-rose-800 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-950/20">
                      ❌ {totals.absentDays} ગેરહાજર
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold bg-teal-50 text-teal-800 border border-teal-100 dark:bg-slate-800 dark:text-teal-400 dark:border-teal-900">
                      💵 ₹{totals.totalEarnings.toLocaleString('gu-IN')} કમાણી (જમા)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-100 dark:bg-slate-800 dark:text-amber-400 dark:border-amber-900">
                      💰 ₹{totals.totalUpad.toLocaleString('gu-IN')} ઉપાડ
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold border ${
                      totals.balance >= 0
                        ? 'bg-purple-50 text-purple-800 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900'
                        : 'bg-rose-105 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400'
                    }`}>
                      📉 ₹{totals.balance.toLocaleString('gu-IN')} બાકી રૂપિયા
                    </span>

                    {/* Collapse icon status indicator */}
                    <span className="ml-1 text-gray-400 dark:text-slate-500 hover:text-teal-600">
                      {isCollapsed ? (
                        <i className="fa-solid fa-chevron-down text-sm"></i>
                      ) : (
                        <i className="fa-solid fa-chevron-up text-sm"></i>
                      )}
                    </span>
                  </div>
                </div>

                {/* Monthly Calendar Table Body (Collapsible) */}
                {!isCollapsed && (
                  <div className="p-4 md:p-5">
                    
                    {/* MOBILE-ONLY DYNAMIC DAY CARDS (No Swipe Needed, 100% visible on any screen) */}
                    <div className="space-y-3.5 md:hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-amber-50/20 border border-amber-100/10 rounded-xl text-[11px] font-bold text-amber-800 dark:text-amber-400">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-mobile-screen-button text-xs text-teal-500"></i>
                          મોબાઇલ લિસ્ટ વ્યુ (કોઈ આડું સ્ક્રૉલ કરવાની જરૂર નથી)
                        </span>
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                      </div>

                      {daysArray.map((day) => {
                        const record = currentAttendance[day] || { status: '', upad: 0, note: '' };
                        const isToday = isCurrentYear && isCurrentMonth && day === currentDay;

                        return (
                          <div
                            key={`mobile-day-${day}`}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isToday
                                ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-sm shadow-amber-100/10'
                                : 'bg-gray-50/40 dark:bg-slate-900/40 border-gray-100 dark:border-slate-800/80 hover:border-teal-100/30'
                            }`}
                          >
                            {/* Card Top Header: Day with badge, and actions */}
                            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-100/50 dark:border-slate-800/40">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black font-sans ${
                                  isToday
                                    ? 'bg-amber-500 text-white shadow-sm ring-4 ring-amber-100 dark:ring-amber-950/40'
                                    : 'bg-teal-500 text-white'
                                }`}>
                                  {day}
                                </span>
                                <div>
                                  <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block font-sans">
                                    તારીખ - {String(day).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}
                                  </span>
                                  {isToday && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-extrabold">
                                      ⭐ આજે
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Sharing Action Row */}
                              <div className="flex items-center gap-1.5 print:hidden">
                                <button
                                  type="button"
                                  title="WhatsApp પર હાજરી મોકલો"
                                  onClick={() => {
                                    const dayStr = String(day).padStart(2, '0');
                                    const pMonthStr = String(selectedMonth).padStart(2, '0');
                                    const dateStr = `${dayStr}/${pMonthStr}/${selectedYear}`;
                                    const statusText = getStatusGujarati(record.status);
                                    const upadText = record.upad > 0 ? `₹${record.upad}` : '₹0';
                                    const noteText = record.note ? record.note : '-';

                                    const waText = 
                                      `કારીગર હાજરી વિગત\n\n` +
                                      `નામ: ${worker.name}\n` +
                                      `તારીખ: ${dateStr}\n` +
                                      `હાજરી: ${statusText}\n` +
                                      `ઉપાડ: ${upadText}\n` +
                                      `નોંધ: ${noteText}\n\n` +
                                      `મોકલનાર : ભરતભાઈ ચૌહાણ`;

                                    const phoneNo = worker.mobile ? worker.mobile.trim() : '';
                                    const finalPhone = phoneNo.length === 10 ? `91${phoneNo}` : phoneNo;
                                    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(waText)}`, '_blank');
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700 transition-all active:scale-90"
                                >
                                  <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.012 2c-5.506 0-9.982 4.476-9.982 9.984 0 1.76.458 3.41 1.258 4.858l-1.334 4.87 4.986-1.31c1.408.768 3.012 1.206 4.716 1.206 5.508 0 9.982-4.476 9.982-9.984 0-5.508-4.474-9.984-9.982-9.984zm5.832 14.288c-.244.694-1.22 1.272-1.684 1.326-.464.054-.928.272-2.932-.552-2.583-1.048-4.225-3.692-4.353-3.864-.13-.172-1.042-1.386-1.042-2.642s.652-1.876.884-2.122c.23-.244.5-.31.67-.31h.478c.15 0 .356.012.518.398s.552 1.346.602 1.446c.052.1.088.21.018.338-.06.13-.102.21-.21.326-.104.116-.22.258-.314.35-.104.102-.212.214-.088.428.12.21.542.894 1.156 1.442.794.708 1.462.926 1.666 1.03.204.102.324.088.444-.052.122-.138.518-.602.656-.804.138-.204.276-.17.464-.1.188.07 1.204.568 1.41.672s.344.156.394.244c.05.088.05.512-.194 1.206z"/>
                                  </svg>
                                </button>

                                <button
                                  type="button"
                                  title="SMS પર હાજરી મોકલો"
                                  onClick={() => {
                                    const dayStr = String(day).padStart(2, '0');
                                    const pMonthStr = String(selectedMonth).padStart(2, '0');
                                    const dateStr = `${dayStr}/${pMonthStr}/${selectedYear}`;
                                    const statusText = getStatusGujarati(record.status);
                                    const upadText = record.upad > 0 ? `₹${record.upad}` : '₹0';
                                    const noteText = record.note ? record.note : '-';

                                    const smsText = 
                                      `કારીગર હાજરી વિગત\n\n` +
                                      `નામ: ${worker.name}\n` +
                                      `તારીખ: ${dateStr}\n` +
                                      `હાજરી: ${statusText}\n` +
                                      `ઉપાડ: ${upadText}\n` +
                                      `નોંધ: ${noteText}\n\n` +
                                      `મોકલનાર : ભરતભાઈ ચૌહાણ`;

                                    const phoneNo = worker.mobile ? worker.mobile.trim() : '';
                                    window.open(`sms:${phoneNo}?body=${encodeURIComponent(smsText)}`, '_blank');
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 dark:bg-slate-800 dark:text-sky-400 dark:border-slate-700 transition-all active:scale-90"
                                >
                                  <i className="fa-solid fa-comment-sms text-sm"></i>
                                </button>
                              </div>
                            </div>

                            {/* Card Entry Controls */}
                            <div className="mt-3.5 space-y-3">
                              {/* 1. Cycle Attendance Status */}
                              <div>
                                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-500 mb-1 font-sans">
                                  હાજરી સ્ટેટસ (ટેપ કરો ચક્ર ચાલશે)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    let nextStatus: AttendanceStatus = '';
                                    if (record.status === '') nextStatus = 'P';
                                    else if (record.status === 'P') nextStatus = 'A';
                                    else if (record.status === 'A') nextStatus = 'H';
                                    else if (record.status === 'H') nextStatus = 'D';
                                    else if (record.status === 'D') nextStatus = 'O';
                                    else if (record.status === 'O') nextStatus = '';

                                    onUpdateAttendance(worker.id, day, 'status', nextStatus);
                                    triggerAutoShare(worker, day, nextStatus, record.upad, record.note);
                                  }}
                                  className={`w-full rounded-xl border px-3 py-2.5 text-xs font-black shadow-sm transition-all duration-150 active:scale-98 cursor-pointer flex items-center justify-between gap-1.5 ${
                                    record.status === 'P'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                                      : record.status === 'A'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                                      : record.status === 'H'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
                                      : record.status === 'O'
                                      ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900'
                                      : record.status === 'D'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900'
                                      : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                  }`}
                                >
                                  <span className="truncate">
                                    {record.status === 'P'
                                      ? '✅ હાજર (૧.૦)'
                                      : record.status === 'A'
                                      ? '❌ ગેરહાજર'
                                      : record.status === 'H'
                                      ? '🌗 અડધો દિવસ (૦.૫)'
                                      : record.status === 'O'
                                      ? '⏰ ઓવર ટાઈમ (૧.૫)'
                                      : record.status === 'D'
                                      ? '⚡ ડબલ હાજરી (૨.૦)'
                                      : '⚪ બાકી (નોંધવી)'}
                                  </span>
                                  <span className="text-[10px] font-sans opacity-75">ટેપ કરો 🔄</span>
                                </button>
                              </div>

                              {/* 2. Upad Amount input & Note inline */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-500 mb-1 font-sans">
                                    આજ ઉપાડ (₹)
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold dark:text-slate-500">
                                      ₹
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={record.upad || ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                                        onUpdateAttendance(worker.id, day, 'upad', val);
                                      }}
                                      placeholder="0"
                                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-7 pr-3 py-2 text-xs font-semibold text-gray-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-500 mb-1 font-sans">
                                    અન્ય વિગત / નોંધ
                                  </label>
                                  <input
                                    type="text"
                                    value={record.note || ''}
                                    onChange={(e) =>
                                      onUpdateAttendance(worker.id, day, 'note', e.target.value)
                                    }
                                    placeholder="નોંધો લખો..."
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DESKTOP TABLE VIEW (Smooth & elegant on laptop screens, hidden on mobile) */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
                      <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-slate-400">
                        <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600 border-b border-gray-100 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-800">
                          <tr>
                            <th scope="col" className="px-4 py-3.5 text-center font-bold w-16">
                              તારીખ
                            </th>
                            <th scope="col" className="px-4 py-3.5 text-center w-40">
                              હાજરીપત્રક
                            </th>
                            <th scope="col" className="px-4 py-3.5 text-left w-48 font-bold">
                              ચૂકવેલ રકમ / ઉપાડ (₹)
                            </th>
                            <th scope="col" className="px-4 py-3.5 text-left font-bold">
                              કોમેન્ટ અથવા અન્ય નોંધ
                            </th>
                            <th scope="col" className="px-4 py-3.5 text-center w-36 font-bold print:hidden">
                              મોકલો / શેર કરો
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                          {daysArray.map((day) => {
                            const record = currentAttendance[day] || { status: '', upad: 0, note: '' };
                            const isToday = isCurrentYear && isCurrentMonth && day === currentDay;

                            return (
                              <tr
                                key={day}
                                className={`transition-colors ${
                                  isToday
                                    ? 'bg-amber-50/15 dark:bg-amber-950/5 hover:bg-amber-50/25 border-l-4 border-amber-500'
                                    : 'hover:bg-teal-50/5 dark:hover:bg-slate-800/10'
                                }`}
                              >
                                {/* Day Number Column */}
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold font-sans border ${
                                    isToday
                                      ? 'bg-amber-500 text-white border-amber-600 font-black'
                                      : 'bg-gray-100 text-gray-900 border-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                                  }`}>
                                    {day}
                                  </span>
                                  {isToday && (
                                    <div className="text-[9px] font-black text-amber-600 mt-0.5">આજે</div>
                                  )}
                                </td>

                                {/* Attendance Selection Column (Cycles instantly on Click!) */}
                                <td className="px-4 py-3 select-none">
                                  <div className="flex flex-col items-center justify-center min-w-[140px]">
                                    <button
                                      id={`btn-status-${worker.id}-${day}`}
                                      type="button"
                                      onClick={() => {
                                        let nextStatus: AttendanceStatus = '';
                                        if (record.status === '') nextStatus = 'P';
                                        else if (record.status === 'P') nextStatus = 'A';
                                        else if (record.status === 'A') nextStatus = 'H';
                                        else if (record.status === 'H') nextStatus = 'D';
                                        else if (record.status === 'D') nextStatus = 'O';
                                        else if (record.status === 'O') nextStatus = '';

                                        onUpdateAttendance(
                                          worker.id,
                                          day,
                                          'status',
                                          nextStatus
                                        );
                                        triggerAutoShare(worker, day, nextStatus, record.upad, record.note);
                                      }}
                                      className={`w-full rounded-xl border px-3 py-2 text-xs font-black shadow-sm transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-between gap-1.5 ${
                                        record.status === 'P'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 hover:bg-emerald-100'
                                          : record.status === 'A'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 hover:bg-rose-100'
                                          : record.status === 'H'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 hover:bg-amber-100'
                                          : record.status === 'O'
                                          ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900 hover:bg-cyan-100'
                                          : record.status === 'D'
                                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900 hover:bg-purple-100'
                                          : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-gray-205'
                                      }`}
                                    >
                                      <span className="truncate text-left">
                                        {record.status === 'P'
                                          ? '✅ હાજર (૧.૦)'
                                          : record.status === 'A'
                                          ? '❌ ગેરહાજર'
                                          : record.status === 'H'
                                          ? '🌗 અડધો દિવસ (૦.૫)'
                                          : record.status === 'O'
                                          ? '⏰ ઓવર ટાઈમ (૧.૫)'
                                          : record.status === 'D'
                                          ? '⚡ ડબલ હાજરી (૨.૦)'
                                          : '⚪ બાકી (નોંધવી)'}
                                      </span>
                                      <svg className="h-3.5 w-3.5 shrink-0 opacity-60 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 12H19M9 5a9 9 0 010 12m0-12H4.5" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>

                                {/* Advance Upad Amount Column */}
                                <td className="px-4 py-3">
                                  <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold dark:text-slate-500">
                                      ₹
                                    </span>
                                    <input
                                      id={`input-upad-${worker.id}-${day}`}
                                      type="number"
                                      min="0"
                                      value={record.upad || ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                                        onUpdateAttendance(worker.id, day, 'upad', val);
                                      }}
                                      placeholder="0"
                                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-7 pr-3 py-1.5 text-xs font-semibold text-gray-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                                    />
                                  </div>
                                </td>

                                {/* Remarks/Note Column */}
                                <td className="px-4 py-3">
                                  <input
                                    id={`input-note-${worker.id}-${day}`}
                                    type="text"
                                    value={record.note || ''}
                                    onChange={(e) =>
                                      onUpdateAttendance(worker.id, day, 'note', e.target.value)
                                    }
                                    placeholder="વિગતો અથવા નોંધો લખો..."
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1.5 text-xs text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                                  />
                                </td>

                                {/* 1-Click Send Notification/Share Column */}
                                <td className="px-4 py-3 text-center print:hidden">
                                  <div className="flex items-center justify-center gap-1.5 justify-center min-w-[100px]">
                                    <button
                                      id={`btn-share-wa-${worker.id}-${day}`}
                                      type="button"
                                      title="WhatsApp પર હાજરી મોકલો"
                                      onClick={() => {
                                        const dayStr = String(day).padStart(2, '0');
                                        const pMonthStr = String(selectedMonth).padStart(2, '0');
                                        const dateStr = `${dayStr}/${pMonthStr}/${selectedYear}`;
                                        const statusText = getStatusGujarati(record.status);
                                        const upadText = record.upad > 0 ? `₹${record.upad}` : '₹0';
                                        const noteText = record.note ? record.note : '-';

                                        const waText = 
                                          `કારીગર હાજરી વિગત\n\n` +
                                          `નામ: ${worker.name}\n` +
                                          `તારીખ: ${dateStr}\n` +
                                          `હાજરી: ${statusText}\n` +
                                          `ઉપાડ: ${upadText}\n` +
                                          `નોંધ: ${noteText}\n\n` +
                                          `મોકલનાર : ભરતભાઈ ચૌહાણ`;

                                        const phoneNo = worker.mobile ? worker.mobile.trim() : '';
                                        // country code prepended
                                        const finalPhone = phoneNo.length === 10 ? `91${phoneNo}` : phoneNo;
                                        window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(waText)}`, '_blank');
                                      }}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 hover:border-emerald-300 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                                    >
                                      <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.012 2c-5.506 0-9.982 4.476-9.982 9.984 0 1.76.458 3.41 1.258 4.858l-1.334 4.87 4.986-1.31c1.408.768 3.012 1.206 4.716 1.206 5.508 0 9.982-4.476 9.982-9.984 0-5.508-4.474-9.984-9.982-9.984zm5.832 14.288c-.244.694-1.22 1.272-1.684 1.326-.464.054-.928.272-2.932-.552-2.583-1.048-4.225-3.692-4.353-3.864-.13-.172-1.042-1.386-1.042-2.642s.652-1.876.884-2.122c.23-.244.5-.31.67-.31h.478c.15 0 .356.012.518.398s.552 1.346.602 1.446c.052.1.088.21.018.338-.06.13-.102.21-.21.326-.104.116-.22.258-.314.35-.104.102-.212.214-.088.428.12.21.542.894 1.156 1.442.794.708 1.462.926 1.666 1.03.204.102.324.088.444-.052.122-.138.518-.602.656-.804.138-.204.276-.17.464-.1.188.07 1.204.568 1.41.672s.344.156.394.244c.05.088.05.512-.194 1.206z"/>
                                      </svg>
                                    </button>

                                    <button
                                      id={`btn-share-sms-${worker.id}-${day}`}
                                      type="button"
                                      title="મોબાઇલ SMS પર હાજરી મોકલો"
                                      onClick={() => {
                                        const dayStr = String(day).padStart(2, '0');
                                        const pMonthStr = String(selectedMonth).padStart(2, '0');
                                        const dateStr = `${dayStr}/${pMonthStr}/${selectedYear}`;
                                        const statusText = getStatusGujarati(record.status);
                                        const upadText = record.upad > 0 ? `₹${record.upad}` : '₹0';
                                        const noteText = record.note ? record.note : '-';

                                        const smsText = 
                                          `કારીગર હાજરી વિગત\n\n` +
                                          `નામ: ${worker.name}\n` +
                                          `તારીખ: ${dateStr}\n` +
                                          `હાજરી: ${statusText}\n` +
                                          `ઉપાડ: ${upadText}\n` +
                                          `નોંધ: ${noteText}\n\n` +
                                          `મોકલનાર : ભરતભાઈ ચૌહાણ`;

                                        const phoneNo = worker.mobile ? worker.mobile.trim() : '';
                                        window.open(`sms:${phoneNo}?body=${encodeURIComponent(smsText)}`, '_blank');
                                      }}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 hover:border-sky-300 dark:bg-slate-800 dark:text-sky-400 dark:border-slate-700 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                                    >
                                      <i className="fa-solid fa-comment-sms text-sm"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
