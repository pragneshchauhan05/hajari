import React from 'react';
import { Worker, MonthlyWorkerAttendance } from '../types';
import { calculateGlobalSummary, calculateWorkerTotals, getDaysInMonth, isWorkerActiveInMonth, getWorkerWageForMonth } from '../utils/attendanceUtils';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/translations';

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
  const { language, t, months } = useLanguage();
  const [printTarget, setPrintTarget] = React.useState<string | 'all'>('all');

  const stats = calculateGlobalSummary(workers, attendanceDB, selectedYear, selectedMonth);
  const activeMonthLabel = months.find((m) => m.value === selectedMonth)?.label || '';
  const daysCount = getDaysInMonth(selectedYear, selectedMonth);

  // Include workers who are active in the selected month OR have recorded attendance/upad for that month
  const reportWorkers = workers.filter((w) => {
    const key = `${w.id}_${selectedYear}_${selectedMonth}`;
    const monthlyData = attendanceDB[key];
    const hasData = monthlyData && Object.values(monthlyData).some((r) => Boolean(r.status) || (r.upad && r.upad > 0));
    if (w.isDeleted) {
      return hasData;
    }
    return isWorkerActiveInMonth(w, selectedMonth, selectedYear) || hasData;
  });

  // Format currency
  const formatCurrency = (val: number) => {
    return formatIndianCurrency(val);
  };

  const handlePrintSingleWorker = (workerId: string) => {
    setPrintTarget(workerId);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintAll = () => {
    setPrintTarget('all');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Overview Block with Screen Actions */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div>
          <h3 className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2 dark:text-slate-100">
            <i className="fa-solid fa-chart-line text-emerald-500"></i>
            {t('reportsSheetTitle')}
          </h3>
          <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
            {t('selectedPeriodLabel')}{' '}
            <span className="font-semibold text-teal-600 dark:text-teal-400">{activeMonthLabel} - {selectedYear}</span>
          </p>
        </div>

        {/* PDF/Print Trigger Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintAll}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-500 text-white hover:bg-teal-600 px-5 py-2.5 text-xs font-bold shadow-md shadow-teal-100 transition-colors select-none dark:shadow-none cursor-pointer"
          >
            <i className="fa-solid fa-file-pdf"></i>
            {t('downloadAllPdfBtn')}
          </button>
        </div>
      </div>

      {/* Screen Only: Six Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6 print:hidden">
        {/* Total Workers */}
        <div className="rounded-xl border border-gray-100 bg-white p-3 xs:p-4 shadow-sm text-center dark:border-slate-800 dark:bg-slate-900 transition-colors">
          <p className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest dark:text-slate-500 truncate" title={t('totalWorkers')}>
            {t('totalWorkers')}
          </p>
          <h4 className="text-xl sm:text-2xl font-black text-slate-800 font-sans mt-1.5 dark:text-slate-100">{stats.totalWorkers}</h4>
          <span className="text-[9px] sm:text-[10px] text-gray-400 mt-1 block dark:text-slate-500 truncate">
            {language === 'en' ? 'Registered' : 'કંપનીમાં રજિસ્ટર્ડ'}
          </span>
        </div>

        {/* Total Present */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-3 xs:p-4 shadow-sm text-center dark:border-emerald-950/40 dark:bg-emerald-950/20 transition-colors">
          <p className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-widest dark:text-emerald-400 truncate" title={t('totalPresentDays')}>
            {t('totalPresentDays')}
          </p>
          <h4 className="text-xl sm:text-2xl font-black text-emerald-600 font-sans mt-1.5 dark:text-emerald-400">{stats.totalPresent}</h4>
          <span className="text-[9px] sm:text-[10px] text-emerald-500 mt-1 block dark:text-emerald-500 truncate">
            {language === 'en' ? 'Total Days' : 'નક્કી કરેલ દિવસો'}
          </span>
        </div>

        {/* Total Absent */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-3 xs:p-4 shadow-sm text-center dark:border-rose-900/40 dark:bg-rose-900/20 transition-colors">
          <p className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-rose-600 uppercase tracking-widest dark:text-rose-400 truncate" title={t('totalAbsentDays')}>
            {t('totalAbsentDays')}
          </p>
          <h4 className="text-xl sm:text-2xl font-black text-rose-600 font-sans mt-1.5 dark:text-rose-400">{stats.totalAbsent}</h4>
          <span className="text-[9px] sm:text-[10px] text-rose-500 mt-1 block dark:text-rose-500 truncate">
            {language === 'en' ? 'Days' : 'ગેરહાજર દિવસો'}
          </span>
        </div>

        {/* Total Earnings */}
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/20 p-3 xs:p-4 shadow-sm text-center dark:border-cyan-950/40 dark:bg-cyan-950/20 transition-colors">
          <p className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-cyan-600 uppercase tracking-widest dark:text-cyan-400 truncate" title={t('totalEarnings')}>
            {t('totalEarnings')}
          </p>
          <h4 className="text-base sm:text-xl font-bold text-cyan-700 font-sans mt-1.5 dark:text-cyan-400">{formatCurrency(stats.totalEarnings)}</h4>
          <span className="text-[9px] sm:text-[10px] text-cyan-500 mt-1 block dark:text-cyan-400 truncate">
            {language === 'en' ? 'Gross Pay' : 'સિસ્ટમ દ્વારા જનરેટ'}
          </span>
        </div>

        {/* Total Upad */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-3 xs:p-4 shadow-sm text-center dark:border-amber-950/40 dark:bg-amber-950/20 transition-colors">
          <p className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-widest dark:text-amber-400 truncate" title={t('totalAdvance')}>
            {t('totalAdvance')}
          </p>
          <h4 className="text-base sm:text-xl font-bold text-amber-700 font-sans mt-1.5 dark:text-amber-400">{formatCurrency(stats.totalUpad)}</h4>
          <span className="text-[9px] sm:text-[10px] text-amber-500 mt-1 block dark:text-amber-400 truncate">
            {language === 'en' ? 'Advance Paid' : 'મેં ચૂકવેલ કુલ રકમ'}
          </span>
        </div>

        {/* Total Remaining / Balance */}
        <div className="rounded-xl border border-purple-100 bg-purple-50/20 p-3 xs:p-4 shadow-sm text-center dark:border-purple-950/40 dark:bg-purple-950/20 transition-colors">
          <p className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-purple-600 uppercase tracking-widest dark:text-purple-400 truncate" title={t('netPayable')}>
            {t('netPayable')}
          </p>
          <h4 className="text-base sm:text-xl font-bold text-purple-700 font-sans mt-1.5 dark:text-purple-400">{formatCurrency(stats.totalBalance)}</h4>
          <span className="text-[9px] sm:text-[10px] text-purple-500 mt-1 block dark:text-purple-400 truncate">
            {language === 'en' ? 'Net Dues' : 'હવે ચૂકવવાના બાકી રૂપિયા'}
          </span>
        </div>
      </div>

      {/* Screen Only: Main List Table */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 print:hidden dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <h3 className="text-base font-bold text-gray-900 font-sans flex items-center gap-2 dark:text-slate-100">
          <i className="fa-solid fa-list-check text-teal-500"></i>
          {language === 'en' ? 'Detailed Monthly Worker Statement' : 'બધા કારીગરોનું વિગતવાર માસિક પત્રક'}
        </h3>

        {reportWorkers.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-slate-500">
            {language === 'en'
              ? 'No active workers found for this month. Please add workers from the Workers section.'
              : 'આ મહિના માટે કોઈ ચાલુ કારીગરો પંજીકૃત કરેલ નથી. કૃપા કરીને કારીગરો સેક્શનમાં જઈને નવા કારીગર ઉમેરો.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
            {/* Mobile Horizontal Swipe Indicator helper */}
            <div className="flex items-center justify-between px-4 py-2 bg-teal-50/20 border-b border-gray-100 dark:bg-slate-800/50 dark:border-slate-800 md:hidden text-[11px] font-bold text-teal-700 dark:text-teal-400">
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-arrows-left-right text-xs text-teal-500"></i>
                {language === 'en' ? 'Swipe table horizontally' : 'આંગળીથી ડાબે-જમણે સ્ક્રૉલ કરો (Swipe Table)'}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">{activeMonthLabel}</span>
            </div>

            <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-slate-400">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600 border-b border-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-left font-bold">
                    {t('tableWorkerName')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center font-bold">
                    {t('tableDailyWage')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center font-bold">
                    {t('tablePresentDays')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center font-bold">
                    {language === 'en' ? 'Absent Days' : 'ગેરહાજર દિવસો'}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-bold">
                    {t('tableTotalEarnings')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-bold">
                    {t('tableTotalUpad')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-bold">
                    {t('tableBalance')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center font-bold">
                    {language === 'en' ? 'Action' : 'એક્શન'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {reportWorkers.map((worker) => {
                  const key = `${worker.id}_${selectedYear}_${selectedMonth}`;
                  const currentAttendance = attendanceDB[key] || {};
                  const wage = getWorkerWageForMonth(worker, selectedYear, selectedMonth);
                  const totals = calculateWorkerTotals(currentAttendance, wage, daysCount);

                  return (
                    <tr key={worker.id} className="hover:bg-teal-50/5 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Name & Village */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-slate-100">{worker.name}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500">
                          🏗️ {language === 'en' ? 'Site' : 'સાઇટ'}: {worker.village}{worker.mobile ? ` | 📞 ${language === 'en' ? 'Mo' : 'મો'}: ${worker.mobile}` : ''}
                        </div>
                      </td>

                      {/* wage rate */}
                      <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-slate-300">
                        ₹{wage}
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
                        ₹{totals.totalEarnings.toLocaleString('en-IN')}
                      </td>

                      {/* total upad */}
                      <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                        ₹{totals.totalUpad.toLocaleString('en-IN')}
                      </td>

                      {/* balance remaining dues */}
                      <td className={`px-4 py-3 text-right font-black ${totals.balance >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        ₹{totals.balance.toLocaleString('en-IN')}
                      </td>

                      {/* details action */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                          <button
                            id={`btn-report-view-${worker.id}`}
                            onClick={() => onViewWorkerAttendance(worker.id)}
                            className="inline-flex items-center justify-center rounded-lg bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 text-xs font-bold text-teal-700 transition-colors dark:bg-teal-950/40 dark:text-teal-400 cursor-pointer"
                          >
                            {language === 'en' ? 'Details' : 'વિગતવાર પત્રક'}
                          </button>
                          <button
                            id={`btn-print-single-${worker.id}`}
                            onClick={() => handlePrintSingleWorker(worker.id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition-colors dark:bg-emerald-950/40 dark:text-emerald-400 cursor-pointer"
                          >
                            <i className="fa-solid fa-file-pdf"></i>
                            {t('printSingleBtn')}
                          </button>
                        </div>
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
      {/* 🖨️ Multi-Page Print & PDF Section */}
      {/* ========================================================================= */}
      <div className="hidden print:block bg-white text-black p-4 space-y-8 font-sans">
        
        {/* Cover sheet header banner */}
        {printTarget === 'all' && (
          <div className="border-b-4 border-teal-600 pb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-teal-850">
                {language === 'en' ? 'Monthly Wage & Attendance Statement' : '"હાજરી" - માસિક સંપૂર્ણ હિસાબી અહેવાલ'}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                {language === 'en' ? 'Month:' : 'મહિનો:'} <span className="font-bold text-teal-700">{activeMonthLabel} - {selectedYear}</span> | {language === 'en' ? 'Generated on:' : 'રિપોર્ટ કાઢ્યા તારીખ:'} {new Date().toLocaleDateString(language === 'en' ? 'en-IN' : 'gu-IN')}
              </p>
            </div>
            <div className="text-right border border-teal-200 bg-teal-50 px-3 py-1 rounded-lg">
              <span className="text-xs font-bold text-teal-800">
                {language === 'en' ? 'Official Statement' : 'અધિકૃત હિસાબપત્રક'}
              </span>
            </div>
          </div>
        )}

        {/* Global Statistics Cards for Print */}
        {printTarget === 'all' && (
          <div className="grid grid-cols-3 gap-4 border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <div>
              <span className="text-[10px] text-gray-500 font-bold block">{t('totalWorkers')}</span>
              <span className="text-lg font-black text-slate-800">{stats.totalWorkers}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block">{t('totalPresentDays')}</span>
              <span className="text-lg font-black text-emerald-600">{stats.totalPresent}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block">{t('totalAbsentDays')}</span>
              <span className="text-lg font-black text-rose-600">{stats.totalAbsent}</span>
            </div>
            <div className="border-t border-gray-100 pt-2.5">
              <span className="text-[10px] text-gray-500 font-bold block">{t('totalEarnings')}</span>
              <span className="text-base font-black text-teal-700">{formatCurrency(stats.totalEarnings)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2.5">
              <span className="text-[10px] text-gray-500 font-bold block">{t('totalAdvance')}</span>
              <span className="text-base font-black text-amber-700">{formatCurrency(stats.totalUpad)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2.5">
              <span className="text-[10px] text-gray-500 font-bold block">{t('netPayable')}</span>
              <span className="text-base font-black text-purple-700">{formatCurrency(stats.totalBalance)}</span>
            </div>
          </div>
        )}

        {/* Primary Consolidated Salary Sheet table */}
        {printTarget === 'all' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-teal-900 border-b pb-1">
              {language === 'en' ? '1. Consolidated Monthly Wage and Balance Sheet' : '૧. બધા કારીગરોનું એકીકૃત માસિક પગાર અને બાકી પત્રક'}
            </h3>
            <table className="w-full text-xs border-collapse border border-gray-200 text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-200 p-2">{t('tableWorkerName')}</th>
                  <th className="border border-gray-200 p-2 text-center">{t('tableDailyWage')}</th>
                  <th className="border border-gray-200 p-2 text-center">{language === 'en' ? 'Present' : 'હાજર'}</th>
                  <th className="border border-gray-200 p-2 text-center">{language === 'en' ? 'Absent' : 'ગેરહાજર'}</th>
                  <th className="border border-gray-200 p-2 text-right">{t('tableTotalEarnings')}</th>
                  <th className="border border-gray-200 p-2 text-right">{t('tableTotalUpad')}</th>
                  <th className="border border-gray-200 p-2 text-right">{t('tableBalance')}</th>
                </tr>
              </thead>
              <tbody>
                {reportWorkers.map((w) => {
                  const k = `${w.id}_${selectedYear}_${selectedMonth}`;
                  const att = attendanceDB[k] || {};
                  const wage = getWorkerWageForMonth(w, selectedYear, selectedMonth);
                  const tRec = calculateWorkerTotals(att, wage, daysCount);
                  return (
                    <tr key={w.id}>
                      <td className="border border-gray-200 p-2 font-medium text-slate-900">
                        {w.name} ({language === 'en' ? 'Site' : 'સાઇટ'}: {w.village}){w.mobile ? ` - ${language === 'en' ? 'Mo' : 'મો'}: ${w.mobile}` : ''}
                      </td>
                      <td className="border border-gray-200 p-2 text-center">₹{wage}</td>
                      <td className="border border-gray-200 p-2 text-center font-bold text-emerald-700">{tRec.presentDays}</td>
                      <td className="border border-gray-200 p-2 text-center font-bold text-rose-700">{tRec.absentDays}</td>
                      <td className="border border-gray-200 p-2 text-right font-bold text-teal-700">₹{tRec.totalEarnings.toLocaleString('en-IN')}</td>
                      <td className="border border-gray-200 p-2 text-right font-bold text-amber-700">₹{tRec.totalUpad.toLocaleString('en-IN')}</td>
                      <td className="border border-gray-200 p-2 text-right font-black text-slate-900">₹{tRec.balance.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Detailed page break for each worker's daily records */}
        <div className="pt-2">
          {printTarget === 'all' && (
            <h3 className="text-sm font-bold text-teal-900 border-b pb-1 mb-4">
              {language === 'en' ? '2. Worker-wise Daily Attendance and Advance Logs' : '૨. કારીગરો વાઇસ દૈનિક હાજરી, રોજનો ઉપાડ અને વિગતવાર નોંધો'}
            </h3>
          )}

          {reportWorkers
            .filter((w) => printTarget === 'all' || w.id === printTarget)
            .map((worker) => {
              const k = `${worker.id}_${selectedYear}_${selectedMonth}`;
              const att = attendanceDB[k] || {};
              const wage = getWorkerWageForMonth(worker, selectedYear, selectedMonth);
              const tRec = calculateWorkerTotals(att, wage, daysCount);
              const daysArr = Array.from({ length: daysCount }, (_, i) => i + 1);

              return (
                <div 
                  key={worker.id} 
                  className="pt-6 pb-6 border-b border-gray-200 last:border-none break-after-page"
                >
                  {/* Detailed header for individual worker PDF report */}
                  {printTarget !== 'all' && (
                    <div className="border-b-4 border-teal-600 pb-5 mb-6 flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-black text-teal-900 font-sans">
                          {language === 'en' ? 'Worker Monthly Attendance & Wage Slip' : '👷 કારીગર માસિક હાજરીપત્રક અને ઉપાડ અહેવાલ'}
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                          {language === 'en' ? 'Month:' : 'મહિનો:'} <span className="font-bold text-teal-700">{activeMonthLabel} - {selectedYear}</span> | {language === 'en' ? 'Generated on:' : 'રિપોર્ટ કાઢ્યા તારીખ:'} {new Date().toLocaleDateString(language === 'en' ? 'en-IN' : 'gu-IN')}
                        </p>
                      </div>
                      <div className="text-right border border-teal-200 bg-teal-50 px-3 py-1.5 rounded-lg">
                        <span className="text-xs font-bold text-teal-800">
                          {t('printSlipTitle')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Individual strip header */}
                  <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-100 flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-teal-950">👷 {worker.name}</h4>
                      <p className="text-[10px] text-teal-800/80 mt-0.5">
                        🏗️ {language === 'en' ? 'Site' : 'સાઇટ'}: {worker.village}{worker.mobile ? ` | 📞 ${language === 'en' ? 'Mo' : 'મો'}: ${worker.mobile}` : ''} | {t('tableDailyWage')}: ₹{wage}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-teal-900">{activeMonthLabel} - {selectedYear}</p>
                    </div>
                  </div>

                  {/* Micro Attendance Grid Table */}
                  <table className="w-full text-[10px] border-collapse border border-gray-200 mb-3 text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-200 p-1 text-center w-8">{t('dateCol')}</th>
                        <th className="border border-gray-200 p-1 text-center w-24">{t('statusCol')}</th>
                        <th className="border border-gray-200 p-1 text-right w-24">{t('upadCol')}</th>
                        <th className="border border-gray-200 p-1">{t('noteCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysArr.map((day) => {
                        const record = att[day] || { status: '', upad: 0, note: '' };
                        return (
                          <tr key={day} className={day % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'}>
                            <td className="border border-gray-200 p-1 text-center font-bold">{day}</td>
                            <td className="border border-gray-200 p-1 text-center">
                              {record.status === 'P' ? (
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-1 border border-emerald-200 rounded">
                                  {language === 'en' ? 'Present (P)' : 'હાજર (P)'}
                                </span>
                              ) : record.status === 'A' ? (
                                <span className="text-rose-700 font-bold bg-rose-50 px-1 border border-rose-200 rounded">
                                  {language === 'en' ? 'Absent (A)' : 'ગેરહાજર (A)'}
                                </span>
                              ) : record.status === 'H' ? (
                                <span className="text-amber-700 font-bold bg-amber-50 px-1 border border-amber-200 rounded">
                                  {language === 'en' ? 'Half Day (H)' : 'અડધો દિવસ (H)'}
                                </span>
                              ) : record.status === 'O' ? (
                                <span className="text-cyan-700 font-bold bg-cyan-50 px-1 border border-cyan-200 rounded">
                                  {language === 'en' ? 'Overtime (O)' : 'ઓવર ટાઈમ (O)'}
                                </span>
                              ) : record.status === 'D' ? (
                                <span className="text-purple-700 font-bold bg-purple-50 px-1 border border-purple-200 rounded">
                                  {language === 'en' ? 'Double (D)' : 'ડબલ OT (D)'}
                                </span>
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
                      <span className="text-gray-500 font-semibold block">{language === 'en' ? 'Present Days' : 'હાજર દિવસ'}</span>
                      <span className="text-xs font-bold text-emerald-700">{tRec.presentDays}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-semibold block">{language === 'en' ? 'Absent Days' : 'ગેરહાજર'}</span>
                      <span className="text-xs font-bold text-rose-700">{tRec.absentDays}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-semibold block">{t('tableTotalEarnings')}</span>
                      <span className="text-xs font-bold text-teal-800">₹{tRec.totalEarnings}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-semibold block">{t('tableTotalUpad')}</span>
                      <span className="text-xs font-bold text-amber-700">₹{tRec.totalUpad}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-semibold block">{t('tableBalance')}</span>
                      <span className="text-xs font-black text-purple-700">₹{tRec.balance}</span>
                    </div>
                  </div>

                  {/* Standard Signatures line for approval and handovers */}
                  <div className="mt-8 grid grid-cols-2 gap-8 text-center text-[10px] font-bold text-gray-600 pt-6">
                    <div className="pt-6 border-t border-dashed border-gray-300">
                      ✍️ {language === 'en' ? "Worker's Signature" : "કારીગરની સહી (Worker's Signature)"}
                    </div>
                    <div className="pt-6 border-t border-dashed border-gray-300">
                      ✍️ {language === 'en' ? "Employer's Signature" : "માલિક / સેઠની સહી (Employer's Signature)"}
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
