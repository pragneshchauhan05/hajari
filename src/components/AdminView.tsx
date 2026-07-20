import React, { useEffect, useState } from 'react';
import { getAdminAllData, UserProfileData } from '../utils/firebaseSync';
import { Worker, MonthlyWorkerAttendance } from '../types';
import { 
  calculateGlobalSummary, 
  calculateWorkerTotals, 
  getDaysInMonth, 
  GUJARATI_MONTHS, 
  YEARS 
} from '../utils/attendanceUtils';

export default function AdminView() {
  const [users, setUsers] = useState<UserProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date selection inside admin view
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedAdminSubTab, setSelectedAdminSubTab] = useState<'workers' | 'attendance' | 'reports'>('workers');

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminAllData();
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setError('એડમિન ડેટા લોડ કરવામાં ભૂલ આવી. કૃપા કરીને ખાતરી કરો કે તમે યોગ્ય એડમિન એકાઉન્ટથી લોગીન છો.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Filter users based on search (user ID, email, village or worker name)
  const filteredUsers = users.filter(user => {
    const term = searchQuery.toLowerCase();
    if (user.userId.toLowerCase().includes(term)) return true;
    if (user.userEmail?.toLowerCase().includes(term)) return true;
    
    // Check if any worker name or village matches
    const hasMatchingWorker = user.workers.some(w => 
      w.name.toLowerCase().includes(term) || 
      w.village.toLowerCase().includes(term)
    );
    return hasMatchingWorker;
  });

  const getUniqueVillages = (workers: Worker[]) => {
    const villages = Array.from(new Set(workers.map(w => w.village).filter(Boolean)));
    return villages.join(', ') || 'કોઈ વિગત નથી';
  };

  // Format currency
  const formatCurrency = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('gu-IN');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
        <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">એડમિન પેનલ ડેટા લોડ થઈ રહ્યો છે...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-6 text-center dark:border-rose-950/40 dark:bg-rose-950/10">
        <i className="fa-solid fa-triangle-exclamation text-3xl text-rose-500"></i>
        <h4 className="mt-3 text-base font-bold text-gray-900 dark:text-slate-100">ભૂલ આવી!</h4>
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        <button 
          onClick={fetchAdminData}
          className="mt-4 rounded-xl bg-teal-500 px-5 py-2 text-xs font-bold text-white hover:bg-teal-600"
        >
          ફરી પ્રયાસ કરો (Retry)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2 dark:text-slate-100">
              <i className="fa-solid fa-user-shield text-teal-500"></i>
              એડમિન કંટ્રોલ પેનલ (Admin Panel)
            </h3>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
              અહીંથી તમે એપ્લિકેશન વાપરતા તમામ વપરાશકર્તાઓ (વર્કર્સ અને હાજરી ડેટા) જોઈ શકો છો.
            </p>
          </div>
          <button
            onClick={fetchAdminData}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 transition-colors select-none dark:bg-teal-950/40 dark:text-teal-400 dark:hover:bg-teal-900"
          >
            <i className="fa-solid fa-arrows-rotate"></i>
            ડેટા રિફ્રેશ કરો (Refresh Data)
          </button>
        </div>
      </div>

      {!selectedUser ? (
        // ==========================================
        // 1. LIST OF ALL USERS
        // ==========================================
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 dark:text-slate-500">
              <i className="fa-solid fa-magnifying-glass text-sm"></i>
            </span>
            <input
              type="text"
              placeholder="યુઝર ID, ઇમેઇલ/Gmail, ગામ/સાઇટ અથવા કારીગરનું નામ શોધો..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-450 dark:text-slate-500 bg-white rounded-2xl border border-gray-100 dark:border-slate-800 dark:bg-slate-900">
                <i className="fa-solid fa-users text-4xl text-gray-300 dark:text-slate-750 mb-3 block"></i>
                કોઈ વપરાશકર્તાઓ (Users) મળ્યા નથી.
              </div>
            ) : (
              filteredUsers.map((user, idx) => {
                const totalWorkers = user.workers.length;
                const villages = getUniqueVillages(user.workers);
                
                return (
                  <div 
                    key={user.userId} 
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:border-teal-500 dark:hover:border-teal-500 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
                          <i className="fa-solid fa-user-circle"></i>
                          વપરાશકર્તા #{idx + 1}
                        </span>
                        {user.userEmail ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-450">
                            <i className="fa-solid fa-envelope"></i>
                            Google લૉગિન
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-450">
                            <i className="fa-solid fa-circle-user"></i>
                            અનામી (Local)
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        {user.userEmail ? (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-450 dark:text-slate-500 font-medium">Gmail (ઇમેઇલ):</span>
                            <span className="font-bold text-teal-600 dark:text-teal-400 truncate max-w-[180px]" title={user.userEmail}>
                              {user.userEmail}
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-450 dark:text-slate-500 font-medium">Gmail ID:</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-450 text-[11px] bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">
                              ગૂગલ લૉગિન વગર (Local)
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-[10px]">
                          <span className="text-gray-400 dark:text-slate-500">યુઝર ID:</span>
                          <span className="font-mono text-gray-400 dark:text-slate-500 truncate max-w-[185px]" title={user.userId}>
                            {user.userId}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-450 dark:text-slate-500 font-medium">કુલ કારીગરો:</span>
                          <span className="font-bold text-gray-900 dark:text-slate-100">{totalWorkers} કારીગર</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-450 dark:text-slate-500 font-medium">સાઇટ / ગામ:</span>
                          <span className="font-semibold text-gray-700 dark:text-slate-350 truncate max-w-[160px]" title={villages}>
                            {villages}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedAdminSubTab('workers');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-teal-500 py-2.5 text-xs font-bold text-white hover:bg-teal-600 transition-colors cursor-pointer select-none"
                    >
                      <i className="fa-solid fa-folder-open"></i>
                      ડેટા જુઓ (View Records)
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        // ==========================================
        // 2. DETAILED VIEW OF SELECTED USER
        // ==========================================
        <div className="space-y-6">
          {/* Selected User Header Card */}
          <div className="rounded-2xl border border-gray-150 bg-teal-50/10 p-5 dark:border-teal-950/30 dark:bg-teal-950/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-600 shadow-sm border border-gray-100 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 cursor-pointer"
                title="પાછા જાઓ"
              >
                <i className="fa-solid fa-chevron-left text-sm"></i>
              </button>
              <div>
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">યુઝર રેકોર્ડ્સ મોડ</span>
                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 mt-0.5 flex flex-wrap items-center gap-2">
                  <i className="fa-solid fa-user-gear text-teal-500"></i>
                  {selectedUser.userEmail ? (
                    <>
                      Gmail: <span className="font-bold text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-750 dark:text-blue-350 px-2 py-0.5 rounded">{selectedUser.userEmail}</span>
                    </>
                  ) : (
                    <>
                      યુઝર ID: <span className="font-mono font-bold text-xs bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">{selectedUser.userId}</span>
                    </>
                  )}
                </h4>
              </div>
            </div>

            {/* Time period filter for attendance & reports inside selected user */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-250 cursor-pointer"
              >
                {GUJARATI_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-250 cursor-pointer"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub Navigation inside Selected User Data */}
          <div className="flex border-b border-gray-100 dark:border-slate-800">
            <button
              onClick={() => setSelectedAdminSubTab('workers')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                selectedAdminSubTab === 'workers'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-450'
                  : 'border-transparent text-gray-550 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-users-gear mr-1.5"></i>
              કારીગરોની યાદી ({selectedUser.workers.length})
            </button>
            <button
              onClick={() => setSelectedAdminSubTab('attendance')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                selectedAdminSubTab === 'attendance'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-450'
                  : 'border-transparent text-gray-550 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-calendar-check mr-1.5"></i>
              હાજરીપત્રક જુઓ
            </button>
            <button
              onClick={() => setSelectedAdminSubTab('reports')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                selectedAdminSubTab === 'reports'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-450'
                  : 'border-transparent text-gray-550 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-chart-pie mr-1.5"></i>
              માસિક હિસાબ / અહેવાલ
            </button>
          </div>

          {/* Render Sub Tabs */}
          {selectedAdminSubTab === 'workers' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors space-y-4">
              <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">નોંધાયેલા કારીગરો</h4>
              {selectedUser.workers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 dark:text-slate-500">આ યુઝરે કોઈ કારીગરો ઉમેર્યા નથી.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
                  <table className="w-full text-left text-xs text-gray-550 dark:text-slate-400">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="px-4 py-3">નામ</th>
                        <th className="px-4 py-3 text-center">ગામ / સાઇટ</th>
                        <th className="px-4 py-3 text-center">દૈનિક રોજ (₹)</th>
                        <th className="px-4 py-3 text-center">મોબાઈલ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {selectedUser.workers.map((worker) => (
                        <tr key={worker.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-slate-150">{worker.name}</td>
                          <td className="px-4 py-3 text-center font-semibold text-teal-600 dark:text-teal-400">{worker.village}</td>
                          <td className="px-4 py-3 text-center font-bold">₹{worker.dailyWage}</td>
                          <td className="px-4 py-3 text-center text-gray-400 font-mono">{worker.mobile || 'નથી'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {selectedAdminSubTab === 'attendance' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">માસિક હાજરીપત્રક વિગત</h4>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-450">
                  {GUJARATI_MONTHS.find(m => m.value === selectedMonth)?.label} - {selectedYear}
                </span>
              </div>

              {selectedUser.workers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">જુઓ: કોઈ કારીગરો ઉપલબ્ધ નથી.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
                  <table className="w-full text-left text-xs text-gray-550 dark:text-slate-400">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="px-4 py-3 min-w-[140px]">કારીગર</th>
                        {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1).map((day) => (
                          <th key={day} className="px-2 py-3 text-center w-8 border-l border-gray-100 dark:border-slate-850">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {selectedUser.workers.map((worker) => {
                        const key = `${worker.id}_${selectedYear}_${selectedMonth}`;
                        const attendance = selectedUser.attendanceDB[key] || {};
                        
                        return (
                          <tr key={worker.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-slate-150">
                              {worker.name}
                              <div className="text-[10px] text-gray-400 font-normal">દૈનિક: ₹{worker.dailyWage}</div>
                            </td>
                            {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1).map((day) => {
                              const record = attendance[day];
                              const status = record?.status || '';
                              const upad = record?.upad || 0;
                              
                              let bgClass = 'bg-gray-50 text-gray-400 dark:bg-slate-850 dark:text-slate-600';
                              if (status === 'P') bgClass = 'bg-emerald-500 text-white font-black';
                              if (status === 'A') bgClass = 'bg-rose-500 text-white font-black';
                              if (status === 'H') bgClass = 'bg-amber-400 text-white font-black';
                              if (status === 'O') bgClass = 'bg-cyan-500 text-white font-black';
                              if (status === 'D') bgClass = 'bg-purple-500 text-white font-black';

                              return (
                                <td key={day} className="px-1 py-1 text-center border-l border-gray-100 dark:border-slate-850">
                                  <div className="flex flex-col items-center justify-center space-y-0.5">
                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[9px] ${bgClass}`}>
                                      {status || '-'}
                                    </span>
                                    {upad > 0 && (
                                      <span className="text-[8px] font-bold text-amber-600 dark:text-amber-450">
                                        ₹{upad}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {selectedAdminSubTab === 'reports' && (
            <div className="space-y-6">
              {/* Report global metrics for selected user */}
              {(() => {
                const stats = calculateGlobalSummary(
                  selectedUser.workers, 
                  selectedUser.attendanceDB, 
                  selectedYear, 
                  selectedMonth
                );
                
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center dark:border-slate-850 dark:bg-slate-900">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">કુલ કારીગરો</p>
                        <h4 className="text-xl font-bold text-slate-800 mt-1 dark:text-slate-100">{stats.totalWorkers}</h4>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/10 p-4 shadow-sm text-center dark:border-emerald-950/20 dark:bg-emerald-950/10">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest truncate">કુલ હાજર</p>
                        <h4 className="text-xl font-bold text-emerald-600 mt-1 dark:text-emerald-450">{stats.totalPresent}</h4>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-rose-50/10 p-4 shadow-sm text-center dark:border-rose-950/20 dark:bg-rose-950/10">
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest truncate">કુલ ગેરહાજર</p>
                        <h4 className="text-xl font-bold text-rose-600 mt-1 dark:text-rose-450">{stats.totalAbsent}</h4>
                      </div>
                      <div className="rounded-xl border border-cyan-100 bg-cyan-50/10 p-4 shadow-sm text-center dark:border-cyan-950/20 dark:bg-cyan-950/10">
                        <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest truncate">કુલ બનેલ પગાર</p>
                        <h4 className="text-base font-bold text-cyan-700 mt-1 dark:text-cyan-400">{formatCurrency(stats.totalEarnings)}</h4>
                      </div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50/10 p-4 shadow-sm text-center dark:border-amber-950/20 dark:bg-amber-950/10">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest truncate">ચૂકવેલ ઉપાડ</p>
                        <h4 className="text-base font-bold text-amber-700 mt-1 dark:text-amber-400">{formatCurrency(stats.totalUpad)}</h4>
                      </div>
                      <div className="rounded-xl border border-purple-100 bg-purple-50/10 p-4 shadow-sm text-center dark:border-purple-950/20 dark:bg-purple-950/10">
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest truncate">કુલ બાકી ચૂકવણી</p>
                        <h4 className="text-base font-bold text-purple-700 mt-1 dark:text-purple-400">{formatCurrency(stats.totalBalance)}</h4>
                      </div>
                    </div>

                    {/* Detailed worker list with calculations for the month */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">કારીગર વાઇઝ વિગતવાર માસિક હિસાબ</h4>
                      
                      {selectedUser.workers.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">જુઓ: કોઈ કારીગરો ઉપલબ્ધ નથી.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
                          <table className="w-full text-left text-xs text-gray-550 dark:text-slate-400">
                            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold">
                              <tr>
                                <th className="px-4 py-3">કારીગર</th>
                                <th className="px-4 py-3 text-center">રોજ (₹)</th>
                                <th className="px-4 py-3 text-center">હાજર દિવસ</th>
                                <th className="px-4 py-3 text-center">ગેરહાજર</th>
                                <th className="px-4 py-3 text-right">બનેલ કમાણી (₹)</th>
                                <th className="px-4 py-3 text-right">લીધેલ ઉપાડ (₹)</th>
                                <th className="px-4 py-3 text-right">ચૂકવવાની બાકી રકમ (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {selectedUser.workers.map((worker) => {
                                const key = `${worker.id}_${selectedYear}_${selectedMonth}`;
                                const att = selectedUser.attendanceDB[key] || {};
                                const totals = calculateWorkerTotals(att, worker.dailyWage, getDaysInMonth(selectedYear, selectedMonth));
                                
                                return (
                                  <tr key={worker.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                                    <td className="px-4 py-3">
                                      <div className="font-bold text-gray-900 dark:text-slate-150">{worker.name}</div>
                                      <div className="text-[10px] text-gray-400">🏗️ {worker.village}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">₹{worker.dailyWage}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-emerald-600">{totals.presentDays}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-rose-500">{totals.absentDays}</td>
                                    <td className="px-4 py-3 text-right font-bold text-teal-600">₹{totals.totalEarnings.toLocaleString('gu-IN')}</td>
                                    <td className="px-4 py-3 text-right font-bold text-amber-600">₹{totals.totalUpad.toLocaleString('gu-IN')}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${totals.balance >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600 dark:text-rose-450'}`}>
                                      ₹{totals.balance.toLocaleString('gu-IN')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
