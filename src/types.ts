export interface Worker {
  id: string;
  name: string;
  village: string;
  dailyWage: number;
  mobile?: string;
  inactiveMonths?: string[]; // Array of "YYYY-M" or "YYYY_M" e.g. ["2026-8"] indicating month deactivations
}

export type AttendanceStatus = 'P' | 'A' | 'H' | 'O' | 'D' | ''; // P: Present (હાજર), A: Absent (ગેરહાજર), H: Half Day (અડધો દિવસ), O: Overtime (ઓવર ટાઈમ), D: Double Overtime (ડબલ ઓવર ટાઈમ), '': Unmarked (નોંધાયેલ નથી)

export interface DailyRecord {
  status: AttendanceStatus;
  upad: number; // Advance (ઉપાડ) in rupees
  note: string; // Remarks (નોંધ)
}

// Maps date string (1 to 31) to DailyRecord
export type MonthlyWorkerAttendance = Record<number, DailyRecord>;

export type ActiveTab = 'dashboard' | 'workers' | 'attendance' | 'reports' | 'admin';
