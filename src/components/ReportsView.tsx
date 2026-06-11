import React from 'react';
import { Worker, MonthlyWorkerAttendance } from '../types';
import { calculateGlobalSummary, calculateWorkerTotals, getDaysInMonth, GUJARATI_MONTHS } from '../utils/attendanceUtils';

interface ReportsViewProps {
  workers: Worker[];
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
  selectedMonth: number;
  selectedYear: number;
  onViewWorkerAttendance: (id: string) => void;
}

export default function ReportsView({
  workers,
  attendanceDB,
  selectedMonth,
  selectedYear,
  onViewWorkerAttendance,
}: ReportsViewProps) {
  const stats = calculateGlobalSummary(workers, attendanceDB, selectedYear, selectedMonth);
  const activeMonthLabel = GUJARATI_MONTHS.find((m) => m.value === selectedMonth)?.label || '';
  const daysCount = getDaysInMonth(selectedYear, selectedMonth);

  // Format currency
  const formatCurrency = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('gu-IN');
  };  return (
    <div className="space-y-6">
      {/* Overview Block with Screen Actions */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div>
          <h3 className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2 dark:text-slate-100">
            <i className="fa-solid fa-chart-line text-emerald-500"></i>
            કારીગર માસિક હિસાબ અહેવાલ (Summary Sheet)
          </h3>
          <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
            પસંદ કરેલ સમયગાળો: <span className="font-semibold text-teal-600 dark:text-teal-400">{activeMonthLabel} - {selectedYear}</span>
          </p>
        </div>

        {/* PDF/Print Trigger Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-500 text-white hover:bg-teal-600 px-5 py-2.5 text-xs font-bold shadow-md shadow-teal-100 transition-colors select-none dark:shadow-none"
          >
            <i className="fa-solid fa-file-pdf"></i>
            પીડીએફ ડાઉનલોડ / પ્રિન્ટ (Download PDF)
          </button>
        </div>
      </div>

      {/* Screen Only: Six Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 print:hidden">
        {/* Total Workers */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center dark:border-slate-800 dark:bg-slate-900 transition-colors">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest dark:text-slate-500">કુલ કારીગરો</p>
          <h4 className="text-2xl font-black text-slate-800 font-sans mt-2 dark:text-slate-100">{stats.totalWorkers}</h4>
          <span className="text-[10px] text-gray-400 mt-1 block dark:text-slate-500">કંપનીમાં રજિસ્ટર્ડ</span>
        </div>

        {/* Total Present */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 shadow-sm text-center dark:border-emerald-950/40 dark:bg-emerald-950/20 transition-colors">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest dark:text-emerald-400">કુલ હાજર</p>
          <h4 className="text-2xl font-black text-emerald-600 font-sans mt-2 dark:text-emerald-400">{stats.totalPresent}</h4>
          <span className="text-[10px] text-emerald-500 mt-1 block dark:text-emerald-500">નક્કી કરેલ દિવસો</span>
        </div>

        {/* Total Absent */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-4 shadow-sm text-center dark:border-rose-900/40 dark:bg-rose-900/20 transition-colors">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest dark:text-rose-400">કુલ ગેરહાજર</p>
          <h4 className="text-2xl font-black text-rose-600 font-sans mt-2 dark:text-rose-400">{stats.totalAbsent}</h4>
          <span className="text-[10px] text-rose-500 mt-1 block dark:text-rose-500">ગેરહાજર દિવસો</span>
        </div>

        {/* Total Earnings */}
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/20 p-4 shadow-sm text-center dark:border-cyan-950/40 dark:bg-cyan-950/20 transition-colors">
          <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest dark:text-cyan-400">કુલ બનેલ કમાણી (જમા)</p>
          <h4 className="text-xl font-bold text-cyan-700 font-sans mt-2 dark:text-cyan-400">{formatCurrency(stats.totalEarnings)}</h4>
          <span className="text-[10px] text-cyan-500 mt-1 block dark:text-cyan-400">સિસ્ટમ દ્વારા જનરેટ</span>
        </div>

        {/* Total Upad */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-4 shadow-sm text-center dark:border-amber-950/40 dark:bg-amber-950/20 transition-colors">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest dark:text-amber-400">કુલ ચૂકવેલ રકમ (ઉપાડ)</p>
          <h4 className="text-xl font-bold text-amber-700 font-sans mt-2 dark:text-amber-400">{formatCurrency(stats.totalUpad)}</h4>
          <span className="text-[10px] text-amber-500 mt-1 block dark:text-amber-400">મેં ચૂકવેલ કુલ રકમ</span>
        </div>

        {/* Total Remaining / Balance */}
        <div className="rounded-xl border border-purple-100 bg-purple-50/20 p-4 shadow-sm text-center dark:border-purple-950/40 dark:bg-purple-950/20 transition-colors">
          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest dark:text-purple-400">કુલ ચૂકવવાની બાકી રકમ</p>
          <h4 className="text-xl font-bold text-purple-700 font-sans mt-2 dark:text-purple-400">{formatCurrency(stats.totalBalance)}</h4>
          <span className="text-[10px] text-purple-500 mt-1 block dark:text-purple-400">હવે ચૂકવવાના બાકી રૂપિયા</span>
        </div>
      </div>

      {/* Screen Only: Main List Table */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 print:hidden dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <h3 className="text-base font-bold text-gray-900 font-sans flex items-center gap-2 dark:text-slate-100">
          <i className="fa-solid fa-list-check text-teal-500"></i>
          બધા કારીગરોનું વિગતવાર માસિક પત્રક
        </h3>

        {workers.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-slate-500">
            હજુ સુધી કોઈ કારીગરો પંજીકૃત કરેલ નથી. કૃપા કરીને કારીગરો સેક્શનમાં જઈને નવા કારીગર ઉમેરો.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
            {/* Mobile Horizontal Swipe Indicator helper */}
            <div className="flex items-center justify-between px-4 py-2 bg-teal-50/20 border-b border-gray-100 dark:bg-slate-800/50 dark:border-slate-800 md:hidden text-[11px] font-bold text-teal-700 dark:text-teal-400">
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-arrows-left-right text-xs text-teal-500"></i>
                આંગળીથી ડાબે-જમણે સ્ક્રૉલ કરો (Swipe Table)
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">કારીગર માસિક હિસાબ</span>
            </div>

            <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-slate-400">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600 border-b border-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-left font-bold">
                    કારીગર
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center font-bold">
                    રોજ (₹)
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center font-bold">
                    હાજર દિવસો
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center font-bold">
                    ગેરહાજર દિવસો
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-bold">
                    કુલ કમાણી (જમા) (₹)
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-bold">
                    ચૂકવેલ રકમ / ઉપાડ (₹)
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-bold">
                    બાકી ચૂકવવાના (₹)
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center font-bold">
                    એક્શન
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {workers.map((worker) => {
                  const key = `${worker.id}_${selectedYear}_${selectedMonth}`;
                  const currentAttendance = attendanceDB[key] || {};
                  const totals = calculateWorkerTotals(currentAttendance, worker.dailyWage, daysCount);

                  return (
                    <tr key={worker.id} className="hover:bg-teal-50/5 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Name & Village */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-slate-100">{worker.name}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500">{worker.village}</div>
                      </td>

                      {/* wage rate */}
                      <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-slate-300">
                        ₹{worker.dailyWage}
                      </td>

                      {/* present count */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {totals.presentDays}
                        </span>
                      </td>

                      {/* absent count */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-905/40 dark:text-rose-400">
                          {totals.absentDays}
                        </span>
                      </td>

                      {/* total earnings */}
                      <td className="px-4 py-3 text-right font-bold text-teal-600 dark:text-teal-400">
                        ₹{totals.totalEarnings.toLocaleString('gu-IN')}
                      </td>

                      {/* total upad */}
                      <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                        ₹{totals.totalUpad.toLocaleString('gu-IN')}
                      </td>

                      {/* balance remaining dues */}
                      <td className={`px-4 py-3 text-right font-black ${totals.balance >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        ₹{totals.balance.toLocaleString('gu-IN')}
                      </td>

                      {/* details action */}
                      <td className="px-4 py-3 text-center">
                        <button
                          id={`btn-report-view-${worker.id}`}
                          onClick={() => onViewWorkerAttendance(worker.id)}
                          className="inline-flex items-center justify-center rounded-lg bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 text-xs font-bold text-teal-700 transition-colors dark:bg-teal-950/40 dark:text-teal-400 dark:hover:bg-teal-900/40"
                        >
                          વિગતવાર પત્રક
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🖨️ મલ્ટી-પેજ પ્રિન્ટ અને પીડીએફ રિપોર્ટ સેક્શન (ફક્ત પીડીએફ પ્રિન્ટમાં જ સરસ દેખાશે) */}
      {/* ========================================================================= */}
      <div className="hidden print:block bg-white text-black p-4 space-y-8 font-sans">
        
        {/* Cover sheet header banner */}
        <div className="border-b-4 border-teal-600 pb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-teal-850">"હાજરી" - માસિક સંપૂર્ણ હિસાબી અહેવાલ</h1>
            <p className="text-xs text-gray-500 mt-1">
              મહિનો: <span className="font-bold text-teal-700">{activeMonthLabel} - {selectedYear}</span> | રિપોર્ટ કાઢ્યા તારીખ: {new Date().toLocaleDateString('gu-IN')}
            </p>
          </div>
          <div className="text-right border border-teal-200 bg-teal-55 px-3 py-1 rounded-lg">
            <span className="text-xs font-bold text-teal-800">અધિકૃત હિસાબપત્રક</span>
          </div>
        </div>

        {/* Global Statistics Cards for Print */}
        <div className="grid grid-cols-3 gap-4 border border-gray-200 rounded-xl p-4 bg-gray-50/50">
          <div>
            <span className="text-[10px] text-gray-500 font-bold block">કુલ કારીગરો</span>
            <span className="text-lg font-black text-slate-800">{stats.totalWorkers}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold block">કુલ હાજર દિવસો</span>
            <span className="text-lg font-black text-emerald-600">{stats.totalPresent}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold block">કુલ ગેરહાજર દિવસો</span>
            <span className="text-lg font-black text-rose-600">{stats.totalAbsent}</span>
          </div>
          <div className="border-t border-gray-100 pt-2.5">
            <span className="text-[10px] text-gray-500 font-bold block">કુલ જનરેટેડ કમાણી (જમા રકમ)</span>
            <span className="text-base font-black text-teal-700">{formatCurrency(stats.totalEarnings)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2.5">
            <span className="text-[10px] text-gray-500 font-bold block">કુલ ચૂકવેલ રકમ (ઉપાડ)</span>
            <span className="text-base font-black text-amber-700">{formatCurrency(stats.totalUpad)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2.5">
            <span className="text-[10px] text-gray-500 font-bold block">કુલ ચૂકવવાની બાકી રકમ</span>
            <span className="text-base font-black text-purple-700">{formatCurrency(stats.totalBalance)}</span>
          </div>
        </div>

        {/* Primary Consolidated Salary Sheet table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-teal-900 border-b pb-1">
            ૧. બધા કારીગરોનું એકીકૃત માસિક પગાર અને બાકી પત્રક
          </h3>
          <table className="w-full text-xs border-collapse border border-gray-200 text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-200 p-2">કારીગર નામ</th>
                <th className="border border-gray-200 p-2 text-center">રોજનો રોજ (₹)</th>
                <th className="border border-gray-200 p-2 text-center">હાજર</th>
                <th className="border border-gray-200 p-2 text-center">ગેરહાજર</th>
                <th className="border border-gray-200 p-2 text-right">કુલ કમાણી (જમા) (₹)</th>
                <th className="border border-gray-200 p-2 text-right">ચૂકવેલ રકમ / ઉપાડ (₹)</th>
                <th className="border border-gray-200 p-2 text-right">ચૂકવવાની બાકી (₹)</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const k = `${w.id}_${selectedYear}_${selectedMonth}`;
                const att = attendanceDB[k] || {};
                const t = calculateWorkerTotals(att, w.dailyWage, daysCount);
                return (
                  <tr key={w.id}>
                    <td className="border border-gray-200 p-2 font-medium text-slate-900">
                      {w.name} ({w.village})
                    </td>
                    <td className="border border-gray-200 p-2 text-center">₹{w.dailyWage}</td>
                    <td className="border border-gray-200 p-2 text-center font-bold text-emerald-700">{t.presentDays}</td>
                    <td className="border border-gray-200 p-2 text-center font-bold text-rose-700">{t.absentDays}</td>
                    <td className="border border-gray-200 p-2 text-right font-bold text-teal-700">₹{t.totalEarnings.toLocaleString('gu-IN')}</td>
                    <td className="border border-gray-200 p-2 text-right font-bold text-amber-700">₹{t.totalUpad.toLocaleString('gu-IN')}</td>
                    <td className="border border-gray-200 p-2 text-right font-black text-slate-900">₹{t.balance.toLocaleString('gu-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detailed page break for each worker's daily records */}
        <div className="pt-2">
          <h3 className="text-sm font-bold text-teal-900 border-b pb-1 mb-4">
            ૨. કારીગરો વાઇસ દૈનિક હાજરી, રોજનો ઉપાડ અને વિગતવાર નોંધો
          </h3>

          {workers.map((worker) => {
            const k = `${worker.id}_${selectedYear}_${selectedMonth}`;
            const att = attendanceDB[k] || {};
            const t = calculateWorkerTotals(att, worker.dailyWage, daysCount);
            const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

            return (
              <div 
                key={worker.id} 
                className="pt-6 pb-6 border-b border-gray-200 last:border-none break-after-page"
              >
                {/* Individual strip header */}
                <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-100 flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-teal-950">👷 કારીગર: {worker.name}</h4>
                    <p className="text-[10px] text-teal-800/80 mt-0.5">ગામ: {worker.village} | દૈનિક રોજ: ₹{worker.dailyWage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-teal-900">{activeMonthLabel} - {selectedYear}</p>
                  </div>
                </div>

                {/* Micro Attendance Grid Table */}
                <table className="w-full text-[10px] border-collapse border border-gray-200 mb-3 text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 p-1 text-center w-8">તારીખ</th>
                      <th className="border border-gray-200 p-1 text-center w-24">હાજરી હાલો</th>
                      <th className="border border-gray-200 p-1 text-right w-24">લેલો ઉપાડ (₹)</th>
                      <th className="border border-gray-200 p-1">અન્ય કોમેન્ટ તથા રજીસ્ટર નોંધો</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daysArray.map((day) => {
                      const record = att[day] || { status: '', upad: 0, note: '' };
                      return (
                        <tr key={day} className={day % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'}>
                          <td className="border border-gray-200 p-1 text-center font-bold">{day}</td>
                          <td className="border border-gray-200 p-1 text-center">
                            {record.status === 'P' ? (
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1 border border-emerald-200 rounded">હાજર (P)</span>
                            ) : record.status === 'A' ? (
                              <span className="text-rose-700 font-bold bg-rose-50 px-1 border border-rose-200 rounded">ગેરહાજર (A)</span>
                            ) : record.status === 'H' ? (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1 border border-amber-200 rounded">અડધો દિવસ (H)</span>
                            ) : record.status === 'O' ? (
                              <span className="text-cyan-700 font-bold bg-cyan-50 px-1 border border-cyan-200 rounded">ઓવર ટાઈમ (O)</span>
                            ) : record.status === 'D' ? (
                              <span className="text-purple-700 font-bold bg-purple-50 px-1 border border-purple-200 rounded">ડબલ OT (D)</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-200 p-1 text-right font-semibold">
                            {record.upad > 0 ? `₹${record.upad}` : '-'}
                          </td>
                          <td className="border border-gray-200 p-1 text-gray-600 italic">
                            {record.note || ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Summary footer for this specific worker to make it clear */}
                <div className="grid grid-cols-5 gap-2 text-center text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-gray-500 font-semibold block">હાજર દિવસ</span>
                    <span className="text-xs font-bold text-emerald-700">{t.presentDays}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold block">ગેરહાજર</span>
                    <span className="text-xs font-bold text-rose-700">{t.absentDays}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold block">કુલ કમાણી (જમા)</span>
                    <span className="text-xs font-bold text-teal-800">₹{t.totalEarnings}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold block">કુલ ચૂકવેલ રકમ</span>
                    <span className="text-xs font-bold text-amber-700">₹{t.totalUpad}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold block">બાકી ચૂકવણી</span>
                    <span className="text-xs font-black text-purple-700">₹{t.balance}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

}
