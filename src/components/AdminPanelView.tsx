import React, { useRef, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Worker, MonthlyWorkerAttendance, AppUser, isUserAdmin, ADMIN_EMAIL } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { fetchAllUsersForAdmin, fetchUserDataForAdmin } from '../utils/firebaseSync';
import { formatIndianCurrency } from '../utils/translations';
import { calculateGlobalSummary, YEARS } from '../utils/attendanceUtils';

interface AdminPanelViewProps {
  workers: Worker[];
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
  user: User | null;
  isLoggingIn: boolean;
  isBackingUp: boolean;
  isRestoring: boolean;
  statusMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  onLogin: () => void;
  onLogout: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export default function AdminPanelView({
  workers,
  attendanceDB,
  user,
  isLoggingIn,
  isBackingUp,
  isRestoring,
  statusMessage,
  onLogin,
  onLogout,
  onBackup,
  onRestore,
  onExportBackup,
  onImportBackup,
}: AdminPanelViewProps) {
  const { language, months } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Sub-tabs for high-density no-scroll layout
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'backup' | 'system'>('users');

  // Verification: Is user the authorized super admin
  const isPragnesh = isUserAdmin(user);

  // All Users state
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Target User for deep inspection
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [targetUserData, setTargetUserData] = useState<{
    workers: Worker[];
    attendanceDB: Record<string, MonthlyWorkerAttendance>;
  } | null>(null);
  const [loadingTargetData, setLoadingTargetData] = useState(false);

  // Mobile view toggle between list and inspected detail
  const [mobileViewPane, setMobileViewPane] = useState<'list' | 'detail'>('list');

  // Inspector period filters
  const now = new Date();
  const [inspectorYear, setInspectorYear] = useState(now.getFullYear());
  const [inspectorMonth, setInspectorMonth] = useState(now.getMonth() + 1);

  // Local active workers and stats
  const activeWorkers = workers.filter((w) => !w.isDeleted);
  const totalMonthsRecorded = Object.keys(attendanceDB).length;

  // Load all app users when admin logs in
  const loadAppUsers = async () => {
    if (!isPragnesh || !user) return;
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const usersList = await fetchAllUsersForAdmin();
      setAppUsers(usersList);
      // Auto-select the first user if none selected
      if (usersList.length > 0 && !selectedUser) {
        const defaultUser = usersList.find((u) => u.uid === user.uid) || usersList[0];
        handleInspectUser(defaultUser);
      }
    } catch (err: any) {
      console.warn('Error loading app users for admin:', err);
      setUsersError(err?.message || 'યુઝર્સ લોડ કરવામાં સમસ્યા આવી.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isPragnesh && user) {
      loadAppUsers();
    }
  }, [isPragnesh, user]);

  // Inspect a specific user's workers & attendance
  const handleInspectUser = async (targetUser: AppUser) => {
    setSelectedUser(targetUser);
    setMobileViewPane('detail');
    setLoadingTargetData(true);
    try {
      const data = await fetchUserDataForAdmin(targetUser.uid, targetUser.email);
      setTargetUserData(data);
    } catch (err: any) {
      console.warn('Error fetching target user details:', err);
      alert('વપરાશકર્તાનો ડેટા લાવવામાં સમસ્યા આવી: ' + (err?.message || 'Unknown'));
    } finally {
      setLoadingTargetData(false);
    }
  };

  // Export inspected user's data as backup JSON
  const handleExportTargetUserData = () => {
    if (!selectedUser || !targetUserData) return;
    const exportPayload = {
      appName: 'Hazari Register Super Admin Export',
      exportedAt: new Date().toISOString(),
      user: {
        uid: selectedUser.uid,
        email: selectedUser.email,
        displayName: selectedUser.displayName,
      },
      workers: targetUserData.workers,
      attendanceDB: targetUserData.attendanceDB,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hazari_user_${selectedUser.email.replace(/[@.]/g, '_')}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await onImportBackup(file);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter app users by search query
  const filteredUsers = appUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  // Calculate target user summary stats if inspecting
  const targetStats = targetUserData
    ? calculateGlobalSummary(
        targetUserData.workers,
        targetUserData.attendanceDB,
        inspectorYear,
        inspectorMonth
      )
    : null;

  // Access Denied Screen if unauthorized
  if (!isPragnesh) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-8 text-center space-y-4 dark:border-rose-900/50 dark:bg-rose-950/20 max-w-xl mx-auto my-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 text-2xl font-bold dark:bg-rose-900/40 dark:text-rose-400">
          <i className="fa-solid fa-lock"></i>
        </div>
        <h3 className="text-xl font-black text-rose-950 dark:text-rose-200">
          એક્સેસ પ્રતિબંધિત છે (Access Restricted)
        </h3>
        <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 leading-relaxed">
          આ એડમિન કંટ્રોલ પેનલ માત્ર અધિકૃત સુપર એડમિન (<strong>{ADMIN_EMAIL}</strong>) માટે જ આરક્ષિત છે. સામાન્ય વપરાશકર્તાઓને આ સેક્શનનો એક્સેસ નથી.
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          તમારો વર્તમાન લૉગિન: {user?.email || 'કોઈ લૉગિન નથી'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fadeIn" id="admin-panel-stage">
      {/* Sleek, Compact Super Admin Header Bar (Fits on single screen) */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-teal-900 px-4 py-3 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md text-amber-300 text-lg shadow-inner">
            <i className="fa-solid fa-crown"></i>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight font-sans">
                {language === 'en' ? 'Super Admin Dashboard' : 'સુપર એડમિન કંટ્રોલ સેન્ટર'}
              </h2>
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-amber-950 tracking-wider">
                {ADMIN_EMAIL}
              </span>
            </div>
            <p className="text-[11px] text-purple-200/90 truncate">
              {language === 'en'
                ? 'Compact no-scroll view for supervising all registered users & accounts'
                : 'વગર સ્ક્રોલ એ તમામ યુઝર્સ અને તેમનો હિસાબ સીધો એક જ સ્ક્રીન પર જુઓ'}
            </p>
          </div>
        </div>

        {/* Compact Quick Indicators */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <div className="rounded-xl bg-white/10 px-3 py-1.5 border border-white/15 text-center">
            <span className="text-[9px] uppercase font-bold text-purple-200 block">
              {language === 'en' ? 'Total Users' : 'કુલ યુઝર્સ'}
            </span>
            <span className="text-sm font-black text-amber-300 leading-none">
              {appUsers.length || 1}
            </span>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-1.5 border border-white/15 text-center">
            <span className="text-[9px] uppercase font-bold text-purple-200 block">
              {language === 'en' ? 'My Workers' : 'મારા કારીગરો'}
            </span>
            <span className="text-sm font-black text-white leading-none">
              {activeWorkers.length}
            </span>
          </div>
        </div>
      </div>

      {/* High-Density Segmented Tab Switcher */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
          <button
            type="button"
            onClick={() => setActiveAdminTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeAdminTab === 'users'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50'
            }`}
          >
            <i className="fa-solid fa-users-viewfinder"></i>
            <span>{language === 'en' ? 'Users & Live Inspector' : '👥 એપ યુઝર્સ અને લાઈવ હિસાબ'}</span>
            <span className="ml-1 rounded-full bg-white/20 dark:bg-purple-950 px-1.5 py-0.2 text-[10px]">
              {appUsers.length || 1}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('backup')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeAdminTab === 'backup'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50'
            }`}
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
            <span>{language === 'en' ? 'Cloud & File Backup' : '☁️ ક્લાઉડ અને બેકઅપ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('system')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeAdminTab === 'system'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50'
            }`}
          >
            <i className="fa-solid fa-gear"></i>
            <span>{language === 'en' ? 'Account & System' : '⚙️ એકાઉન્ટ અને સિસ્ટમ'}</span>
          </button>
        </div>

        {/* Global Refresh List button */}
        {activeAdminTab === 'users' && (
          <button
            type="button"
            onClick={loadAppUsers}
            disabled={loadingUsers}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-[11px] font-bold cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shrink-0"
            title="રીફ્રેશ લિસ્ટ"
          >
            <i className={`fa-solid fa-rotate ${loadingUsers ? 'animate-spin' : ''}`}></i>
            <span className="hidden sm:inline">{loadingUsers ? 'લોડ...' : 'રીફ્રેશ'}</span>
          </button>
        )}
      </div>

      {/* Status Notice if any */}
      {statusMessage && (
        <div
          className={`rounded-xl border p-2.5 text-xs font-semibold flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
              : statusMessage.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300'
          }`}
        >
          <i
            className={`fa-solid ${
              statusMessage.type === 'success'
                ? 'fa-circle-check text-emerald-600 dark:text-emerald-400'
                : statusMessage.type === 'error'
                ? 'fa-circle-exclamation text-rose-600 dark:text-rose-400'
                : 'fa-circle-info text-blue-600 dark:text-blue-400'
            } text-sm`}
          ></i>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: MASTER-DETAIL SPLIT VIEW (USERS + LIVE INSPECTOR ON SINGLE SCREEN)  */}
      {/* ========================================================================= */}
      {activeAdminTab === 'users' && (
        <div className="space-y-3">
          {/* Mobile view sub-switch (only on small screens) */}
          <div className="sm:hidden flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileViewPane('list')}
              className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                mobileViewPane === 'list'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-gray-600 dark:text-slate-300'
              }`}
            >
              યુઝર્સ યાદી ({filteredUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileViewPane('detail')}
              className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                mobileViewPane === 'detail'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-gray-600 dark:text-slate-300'
              }`}
            >
              પસંદ કરેલ હિસાબ {selectedUser ? `(${selectedUser.displayName || selectedUser.email.split('@')[0]})` : ''}
            </button>
          </div>

          {/* Master-Detail Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            
            {/* ------------------------------------------------------------- */}
            {/* LEFT MASTER COLUMN: COMPACT USERS DIRECTORY (lg:col-span-4)   */}
            {/* ------------------------------------------------------------- */}
            <div
              className={`lg:col-span-5 xl:col-span-4 rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 shadow-xs flex flex-col ${
                mobileViewPane === 'detail' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Search Box */}
              <div className="relative mb-2.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  <i className="fa-solid fa-magnifying-glass"></i>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="યુઝર અથવા જીમેલ શોધો..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-purple-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Users Scroll Container (contained height so page never scrolls) */}
              <div className="space-y-1.5 overflow-y-auto max-h-[520px] pr-1">
                {loadingUsers ? (
                  <div className="py-10 text-center text-gray-500 space-y-2">
                    <i className="fa-solid fa-spinner animate-spin text-xl text-purple-600"></i>
                    <p className="text-xs">યુઝર્સ લોડ થઈ રહ્યા છે...</p>
                  </div>
                ) : usersError ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <p className="font-bold">{usersError}</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    કોઈ યુઝર મળ્યો નથી.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUser?.uid === u.uid;
                    const isThisAdmin = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                    return (
                      <div
                        key={u.uid}
                        onClick={() => handleInspectUser(u)}
                        className={`group relative flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-50 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 shadow-xs'
                            : 'bg-white border-gray-100 hover:bg-gray-50/80 dark:bg-slate-900 dark:border-slate-800/80 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName || 'User'}
                              className="h-8 w-8 rounded-full border border-purple-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 dark:bg-purple-950 dark:text-purple-300">
                              <i className="fa-solid fa-user"></i>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-xs text-gray-900 dark:text-slate-100 truncate">
                                {u.displayName || u.email.split('@')[0]}
                              </p>
                              {isThisAdmin && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.2 text-[9px] font-black text-amber-900">
                                  <i className="fa-solid fa-crown text-[8px]"></i>
                                  તમે
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-black text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-100 dark:border-teal-900">
                            {u.workerCount || 0} કારીગરો
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT DETAIL COLUMN: INSTANT LIVE DATA INSPECTOR              */}
            {/* ------------------------------------------------------------- */}
            <div
              className={`lg:col-span-7 xl:col-span-8 rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-xs ${
                mobileViewPane === 'list' ? 'hidden lg:block' : 'block'
              }`}
            >
              {selectedUser ? (
                <div className="space-y-3.5">
                  {/* Top Bar of Inspected User */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white text-base">
                        <i className="fa-solid fa-folder-open"></i>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-slate-100">
                            {selectedUser.displayName || selectedUser.email}
                          </h3>
                          <span className="text-[10px] font-bold bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                            {selectedUser.email}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          UID: <span className="font-mono">{selectedUser.uid}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleExportTargetUserData}
                        disabled={!targetUserData}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-xs cursor-pointer transition-all disabled:opacity-50"
                        title="આ વપરાશકર્તાનો સંપૂર્ણ બેકઅપ ડાઉનલોડ કરો"
                      >
                        <i className="fa-solid fa-download"></i>
                        <span>બેકઅપ JSON</span>
                      </button>

                      {/* Mobile back to list button */}
                      <button
                        type="button"
                        onClick={() => setMobileViewPane('list')}
                        className="sm:hidden px-2 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold"
                      >
                        ← પાછા
                      </button>
                    </div>
                  </div>

                  {/* Period Filter (Month & Year Selector) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/70 dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
                        મહિનો અને વર્ષ:
                      </span>
                      <select
                        value={inspectorMonth}
                        onChange={(e) => setInspectorMonth(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {months.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={inspectorYear}
                        onChange={(e) => setInspectorYear(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400">
                      લાઈવ હિસાબ વિગતો ✓
                    </span>
                  </div>

                  {/* Target User Status Metric Cards (4 compact cards in one row) */}
                  {loadingTargetData ? (
                    <div className="py-8 text-center text-gray-500 space-y-2">
                      <i className="fa-solid fa-spinner animate-spin text-xl text-purple-600"></i>
                      <p className="text-xs">આ યુઝરનો હિસાબ આવી રહ્યો છે...</p>
                    </div>
                  ) : targetStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                        <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                          હાજર દિવસ
                        </p>
                        <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                          {targetStats.totalPresent}
                        </p>
                      </div>

                      <div className="bg-teal-50/70 dark:bg-teal-950/20 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900/40 text-center">
                        <p className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400">
                          કુલ પગાર
                        </p>
                        <p className="text-base sm:text-lg font-black text-teal-700 dark:text-teal-300 mt-0.5">
                          {formatIndianCurrency(targetStats.totalEarnings)}
                        </p>
                      </div>

                      <div className="bg-amber-50/70 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/40 text-center">
                        <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                          લીધેલ ઉપાડ
                        </p>
                        <p className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                          {formatIndianCurrency(targetStats.totalUpad)}
                        </p>
                      </div>

                      <div className="bg-purple-50/70 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/40 text-center">
                        <p className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400">
                          ચૂકવવાપાત્ર
                        </p>
                        <p className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300 mt-0.5">
                          {formatIndianCurrency(targetStats.totalBalance)}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Workers of this User (Scroll-contained so page never expands) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-extrabold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span>કારીગરોની યાદી</span>
                        <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.2 text-[10px] font-black text-gray-700 dark:text-slate-300">
                          {targetUserData?.workers?.length || 0}
                        </span>
                      </h4>
                      <span className="text-[10px] text-gray-400">
                        {months.find((m) => m.value === inspectorMonth)?.label} {inspectorYear}
                      </span>
                    </div>

                    {targetUserData?.workers?.length === 0 ? (
                      <div className="py-6 text-center text-gray-400 text-xs italic bg-gray-50/50 rounded-xl dark:bg-slate-950/30">
                        આ યુઝરે હજુ સુધી કોઈ કારીગર ઉમેર્યો નથી.
                      </div>
                    ) : (
                      <div className="space-y-1.5 overflow-y-auto max-h-[320px] pr-1">
                        {targetUserData?.workers?.map((w) => {
                          const mKey = `${w.id}_${inspectorYear}_${inspectorMonth}`;
                          const workerMonthly = targetUserData.attendanceDB[mKey] || {};
                          const records = Object.values(workerMonthly) as { status?: string; upad?: number; note?: string }[];
                          const presentCount = records.filter(
                            (r) => r.status === 'P' || r.status === 'PP' || r.status === 'O' || r.status === 'D'
                          ).length;
                          const totalWorkerUpad = records.reduce(
                            (sum, r) => sum + (r.upad || 0),
                            0
                          );

                          return (
                            <div
                              key={w.id}
                              className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between gap-2 text-xs transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-extrabold text-gray-900 dark:text-slate-100 truncate">
                                    👤 {w.name}
                                  </p>
                                  {w.village && (
                                    <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                                      ({w.village})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                                  {w.mobile && <span>📞 {w.mobile}</span>}
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    હાજર: {presentCount} દિ.
                                  </span>
                                  {totalWorkerUpad > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                      ઉપાડ: ₹{totalWorkerUpad}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-gray-400 block font-medium">દૈનિક રોજ</span>
                                <span className="font-black text-teal-600 dark:text-teal-400 text-sm">
                                  ₹{w.dailyWage}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400 space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 text-2xl dark:bg-purple-950/40 dark:text-purple-400">
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300">
                    ડાબી બાજુની યાદીમાંથી કોઈપણ યુઝર પસંદ કરો
                  </h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    તેમનો આખો હિસાબ, કારીગરો, હાજરી અને ઉપાડ અહીં વગર સ્ક્રોલ એ તરત જ દેખાશે.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CLOUD & FILE BACKUP (COMPACT SIDE-BY-SIDE)                          */}
      {/* ========================================================================= */}
      {activeAdminTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
          {/* Cloud Backup & Restore */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 text-base">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-slate-100">
                    ગૂગલ ક્લાઉડ બેકઅપ અને રીસ્ટોર
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    તમારા ડેટાને સીધો ગૂગલ સર્વર પર સાચવો અથવા પાછો મેળવો
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-gray-50 p-2.5 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800 text-xs flex items-center justify-between">
                <span className="text-gray-500 dark:text-slate-400 font-medium">ક્લાઉડ સ્થિતિ:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                  {user ? 'કનેક્ટેડ ✓' : 'ઓફલાઇન'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onBackup}
                disabled={!user || isBackingUp}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3 py-2.5 text-xs font-black shadow-xs transition-all cursor-pointer disabled:opacity-40"
              >
                {isBackingUp ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    <span>સેવિંગ...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span>ક્લાઉડ સેવ</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onRestore}
                disabled={isRestoring}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 px-3 py-2.5 text-xs font-black transition-all cursor-pointer disabled:opacity-40 dark:border-teal-900 dark:bg-slate-800 dark:text-teal-300"
              >
                {isRestoring ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    <span>રીસ્ટોરિંગ...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-cloud-arrow-down"></i>
                    <span>રીસ્ટોર ડેટા</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* WhatsApp & Laptop File Transfer */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-base">
                  <i className="fa-solid fa-file-arrow-down"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-slate-100">
                    લેપટોપ / WhatsApp બેકઅપ ટ્રાન્સફર
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    100% ઓફલાઇન ફાઇલ બેકઅપ (કોઈ નેટવર્ક બગ વિના)
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-indigo-50/50 p-2.5 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 leading-relaxed">
                <i className="fa-solid fa-circle-check text-indigo-600 mr-1"></i>
                મોબાઇલમાં બેકઅપ ડાઉનલોડ કરી WhatsApp વડે લેપટોપમાં મોકલી ત્યાં અપલોડ કરો.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2.5 text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                <i className="fa-solid fa-download"></i>
                <span>ડાઉનલોડ JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 px-3 py-2.5 text-xs font-black transition-all cursor-pointer disabled:opacity-40 dark:border-indigo-900 dark:bg-slate-800 dark:text-indigo-300"
              >
                <i className="fa-solid fa-upload"></i>
                <span>{importing ? 'અપલોડિંગ...' : 'અપલોડ JSON'}</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACCOUNT & SYSTEM SPECS (COMPACT)                                   */}
      {/* ========================================================================= */}
      {activeAdminTab === 'system' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Account Info Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-11 w-11 rounded-xl border border-purple-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-lg font-bold shadow-sm">
                  <i className="fa-solid fa-user-tie"></i>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-slate-100 font-sans truncate">
                    {user ? user.displayName || user.email?.split('@')[0] : 'લૉગિન નથી'}
                  </h3>
                  {user && (
                    <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-black text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200/60">
                      {user.email}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                  આ ગૂગલ એકાઉન્ટ વડે સુપર એડમિન એક્સેસ અને ક્લાઉડ સુરક્ષા સક્રિય છે.
                </p>
              </div>
            </div>

            <div>
              {!user ? (
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={isLoggingIn}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2 text-xs font-black text-white hover:from-teal-600 hover:to-emerald-700 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  <i className="fa-brands fa-google text-xs"></i>
                  <span>{isLoggingIn ? 'કનેક્ટિંગ...' : 'ગૂગલ લોગિન'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-rose-950/30"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                  <span>લોગ આઉટ</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics 4-tile grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-gray-100 dark:border-slate-800 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
                કુલ એપ યુઝર્સ
              </p>
              <p className="text-base font-black text-purple-700 dark:text-purple-400 mt-0.5">
                {appUsers.length || 1}
              </p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-gray-100 dark:border-slate-800 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
                મારા કારીગરો
              </p>
              <p className="text-base font-black text-teal-600 dark:text-teal-400 mt-0.5">
                {activeWorkers.length}
              </p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-gray-100 dark:border-slate-800 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
                નોંધાયેલ મહિના
              </p>
              <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {totalMonthsRecorded}
              </p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-gray-100 dark:border-slate-800 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
                એડમિન પરમિશન
              </p>
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                સુરક્ષિત (તમે) ✓
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
