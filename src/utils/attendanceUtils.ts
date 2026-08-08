import { Worker, MonthlyWorkerAttendance } from '../types';

export const GUJARATI_MONTHS = [
  { value: 1, label: 'જાન્યુઆરી' },
  { value: 2, label: 'ફેબ્રુઆરી' },
  { value: 3, label: 'માર્ચ' },
  { value: 4, label: 'એપ્રિલ' },
  { value: 5, label: 'મે' },
  { value: 6, label: 'જૂન' },
  { value: 7, label: 'જુલાઈ' },
  { value: 8, label: 'ઓગસ્ટ' },
  { value: 9, label: 'સપ્ટેમ્બર' },
  { value: 10, label: 'ઓક્ટોબર' },
  { value: 11, label: 'નવેમ્બર' },
  { value: 12, label: 'ડિસેમ્બર' },
];

export const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

/**
 * Checks if a worker is active for a given year and month.
 */
export function isWorkerActiveInMonth(worker: Worker, month: number, year: number): boolean {
  if (!worker.inactiveMonths || worker.inactiveMonths.length === 0) return true;
  const keyHyphen = `${year}-${month}`;
  const keyUnderscore = `${year}_${month}`;
  return !worker.inactiveMonths.includes(keyHyphen) && !worker.inactiveMonths.includes(keyUnderscore);
}

/**
 * Get number of days in a given month and year
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates attendance status totals for a single worker in a selected month
 */
export function calculateWorkerTotals(
  attendance: MonthlyWorkerAttendance | undefined,
  dailyWage: number,
  daysCount: number
) {
  let presentDays = 0;
  let absentDays = 0;
  let totalUpad = 0;

  for (let day = 1; day <= daysCount; day++) {
    const record = attendance?.[day];
    if (record) {
      if (record.status === 'P') {
        presentDays += 1;
      } else if (record.status === 'A') {
        absentDays += 1;
      } else if (record.status === 'H') {
        presentDays += 0.5;
        absentDays += 0.5;
      } else if (record.status === 'O') {
        presentDays += 1.5;
      } else if (record.status === 'D') {
        presentDays += 2;
      }
      totalUpad += Number(record.upad) || 0;
    }
  }

  const totalEarnings = presentDays * dailyWage;
  const balance = totalEarnings - totalUpad;

  return {
    presentDays,
    absentDays,
    totalUpad,
    totalEarnings,
    balance,
  };
}

/**
 * Calculates global summaries across all workers for the selected month/year
 */
export function calculateGlobalSummary(
  workers: Worker[],
  attendanceDB: Record<string, MonthlyWorkerAttendance>, // Key format: `${workerId}_${year}_${month}`
  year: number,
  month: number
) {
  const daysCount = getDaysInMonth(year, month);
  const activeWorkers = workers.filter((w) => isWorkerActiveInMonth(w, month, year));
  let totalWorkers = activeWorkers.length;
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalEarnings = 0;
  let totalUpad = 0;

  activeWorkers.forEach((worker) => {
    const key = `${worker.id}_${year}_${month}`;
    const monthlyData = attendanceDB[key];
    const totals = calculateWorkerTotals(monthlyData, worker.dailyWage, daysCount);
    
    totalPresent += totals.presentDays;
    totalAbsent += totals.absentDays;
    totalEarnings += totals.totalEarnings;
    totalUpad += totals.totalUpad;
  });

  const totalBalance = totalEarnings - totalUpad;

  return {
    totalWorkers,
    totalPresent,
    totalAbsent,
    totalEarnings,
    totalUpad,
    totalBalance,
  };
}
