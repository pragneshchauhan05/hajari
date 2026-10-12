import { Worker, MonthlyWorkerAttendance } from '../types';

export interface HazariBackupData {
  version: 1;
  appName: string;
  exportedAt: string;
  workers: Worker[];
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
}

/**
 * Downloads a complete JSON backup file containing all workers and attendance records.
 * Can be sent via WhatsApp/Email from mobile to laptop.
 */
export function exportBackupToFile(
  workers: Worker[],
  attendanceDB: Record<string, MonthlyWorkerAttendance>
): void {
  const backup: HazariBackupData = {
    version: 1,
    appName: 'Hazari Register (કારીગર હાજરી રજીસ્ટર)',
    exportedAt: new Date().toISOString(),
    workers,
    attendanceDB,
  };

  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `hazari_register_backup_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an uploaded JSON backup file.
 */
export function importBackupFromFile(
  file: File
): Promise<{ workers: Worker[]; attendanceDB: Record<string, MonthlyWorkerAttendance>; count: number }> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('કોઈ ફાઈલ પસંદ કરવામાં આવી નથી.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          throw new Error('ફાઈલ ખાલી છે.');
        }

        const data = JSON.parse(content);

        // Validation
        let workers: Worker[] = [];
        let attendanceDB: Record<string, MonthlyWorkerAttendance> = {};

        if (Array.isArray(data.workers)) {
          workers = data.workers;
        } else if (Array.isArray(data)) {
          // Direct array of workers format
          workers = data;
        }

        if (data.attendanceDB && typeof data.attendanceDB === 'object') {
          attendanceDB = data.attendanceDB;
        }

        if (workers.length === 0 && Object.keys(attendanceDB).length === 0) {
          throw new Error('આ ફાઇલમાં કોઈ માન્ય કારીગરો કે હિસાબનો ડેટા મળ્યો નથી.');
        }

        resolve({
          workers,
          attendanceDB,
          count: workers.length,
        });
      } catch (err: any) {
        reject(new Error(`ફાઈલ વાંચવામાં ભૂલ આવી: ${err.message || 'અમાન્ય JSON ફાઈલ'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('ફાઈલ વાંચી શકાઈ નથી.'));
    };

    reader.readAsText(file);
  });
}
