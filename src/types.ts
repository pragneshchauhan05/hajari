export interface Worker {
  id: string;
  name: string;
  village: string;
  dailyWage: number;
  wageHistory?: Record<string, number>; // Maps "YYYY-MM" (e.g. "2026-10") to dailyWage starting from that month onwards
  mobile?: string;
  inactiveMonths?: string[]; // Array of "YYYY-M" or "YYYY_M" e.g. ["2026-8"] indicating month deactivations
  isDeleted?: boolean; // When permanently deleted from active list, old attendance and historical payroll reports remain preserved
  updatedAt?: number; // Epoch timestamp (ms) for reliable synchronization and avoiding refresh overwrites
  userId?: string; // Firebase Auth UID of the owner for strict data isolation
  userEmail?: string; // Email of the owner for multi-account safety
  specificMonthOnly?: string; // Format: "YYYY-M" (e.g. "2026-8") - worker was created exclusively for this specific past month
  activeMonthsOnly?: string[]; // Array of "YYYY-M" or "YYYY_M" formats - only active in these specific historical months
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

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'admin' | 'user';
  workerCount?: number;
  recordsCount?: number;
  lastActive?: string;
  createdAt?: string;
}

export const ADMIN_EMAIL = 'pragneshc517@gmail.com';

export function isUserAdmin(user?: { email?: string | null } | null): boolean {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
