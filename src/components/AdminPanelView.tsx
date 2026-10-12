import React, { useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { Worker, MonthlyWorkerAttendance } from '../types';
import { useLanguage } from '../context/LanguageContext';

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
  const { language, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const activeWorkers = workers.filter((w) => !w.isDeleted);
  const totalMonthsRecorded = Object.keys(attendanceDB).length;
  const isPragnesh = user?.email?.toLowerCase().includes('pragneshc517');

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

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="admin-panel-stage">
      {/* Admin Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-teal-700 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white text-2xl">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight font-sans">
                  {language === 'en' ? 'Admin Control Panel' : 'એડમિન કંટ્રોલ પેનલ'}
                </h2>
                <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-950">
                  {isPragnesh ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-purple-100/90 font-medium">
                {language === 'en'
                  ? 'Cloud sync, multi-device backup, and account data isolation'
                  : 'ગૂગલ ક્લાઉડ સિંક, લેપટોપ બેકઅપ અને સુરક્ષિત ડેટા સંચાલન'}
              </p>
            </div>
          </div>

          {/* Quick Stats in Banner */}
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/15 text-center">
              <p className="text-[10px] uppercase font-bold text-purple-200">
                {language === 'en' ? 'Workers' : 'કારીગરો'}
              </p>
              <p className="text-lg font-black">{activeWorkers.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/15 text-center">
              <p className="text-[10px] uppercase font-bold text-purple-200">
                {language === 'en' ? 'Records' : 'હિસાબ મહિના'}
              </p>
              <p className="text-lg font-black">{totalMonthsRecorded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Notice if any */}
      {statusMessage && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold flex items-center gap-3 transition-all ${
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
            } text-base`}
          ></i>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Account Info Card */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="h-14 w-14 rounded-2xl border-2 border-purple-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white text-xl font-bold shadow-md">
                <i className="fa-solid fa-user-tie"></i>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-slate-100 font-sans">
                  {user ? user.displayName || user.email?.split('@')[0] : (language === 'en' ? 'Not Signed In' : 'ગૂગલ લોગિન નથી')}
                </h3>
                {user && (
                  <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200/60">
                    {user.email}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {user
                  ? (language === 'en' ? 'Connected Google Account for Cloud Backup' : 'આ ગૂગલ એકાઉન્ટ વડે ક્લાઉડ બેકઅપ અને સુરક્ષા સક્રિય છે.')
                  : (language === 'en' ? 'Sign in with your Google account to enable cloud backup' : 'ક્લાઉડ બેકઅપ શરૂ કરવા માટે નીચે આપેલા બટનથી ગૂગલ લોગિન કરો.')}
              </p>
            </div>
          </div>

          <div>
            {!user ? (
              <button
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-3 text-xs font-black text-white hover:from-teal-600 hover:to-emerald-700 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <i className="fa-brands fa-google text-sm"></i>
                <span>
                  {isLoggingIn
                    ? (language === 'en' ? 'Connecting...' : 'કનેક્ટ થઈ રહ્યું છે...')
                    : (language === 'en' ? 'Sign in with Google' : 'ગૂગલ એકાઉન્ટ વડે લોગિન કરો')}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                <span>{language === 'en' ? 'Sign Out' : 'લોગ આઉટ કરો'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Google Cloud Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cloud Backup & Restore */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 text-lg">
                <i className="fa-solid fa-cloud-arrow-up"></i>
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900 dark:text-slate-100">
                  {language === 'en' ? 'Google Cloud Backup & Restore' : 'ગૂગલ ક્લાઉડ બેકઅપ અને રીસ્ટોર'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {language === 'en' ? 'Direct manual sync with Firebase' : 'તમારા ડેટાને સીધો ગૂગલ સર્વર પર સાચવો અથવા પાછો મેળવો'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="rounded-2xl bg-gray-50 p-3.5 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-slate-400 font-medium">
                    {language === 'en' ? 'Cloud Status:' : 'ક્લાઉડ સ્થિતિ:'}
                  </span>
                  <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                    {user ? (language === 'en' ? 'Connected' : 'કનેક્ટેડ ✓') : (language === 'en' ? 'Offline' : 'ઓફલાઇન')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onBackup}
              disabled={!user || isBackingUp}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-40"
            >
              {isBackingUp ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  <span>{language === 'en' ? 'Saving...' : 'સેવ થઈ રહ્યું છે...'}</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <span>{language === 'en' ? 'Backup to Cloud Now' : 'ક્લાઉડ પર અત્યારે સેવ કરો'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onRestore}
              disabled={isRestoring}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 px-4 py-3 text-xs font-black transition-all cursor-pointer active:scale-95 disabled:opacity-40 dark:border-teal-900 dark:bg-slate-800 dark:text-teal-300"
            >
              {isRestoring ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  <span>{language === 'en' ? 'Restoring...' : 'રીસ્ટોર થઈ રહ્યું છે...'}</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-down"></i>
                  <span>{language === 'en' ? 'Restore from Cloud' : 'ક્લાઉડ માંથી ડેટા રીસ્ટોર કરો'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* WhatsApp & Laptop File Transfer (100% Offline & Reliable) */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-lg">
                <i className="fa-solid fa-file-arrow-down"></i>
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900 dark:text-slate-100">
                  {language === 'en' ? 'WhatsApp & Laptop File Transfer' : 'લેપટોપ / WhatsApp બેકઅપ ટ્રાન્સફર'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {language === 'en'
                    ? '100% bug-free offline JSON backup. Send via WhatsApp to laptop!'
                    : 'કોઈ પણ બગ વિના સુરક્ષિત ફાઇલ બેકઅપ. WhatsApp થી લેપટોપમાં મોકલી શકાય છે.'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-indigo-50/50 p-3.5 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 leading-relaxed">
              <i className="fa-solid fa-circle-check text-indigo-600 mr-1.5"></i>
              {language === 'en'
                ? 'Download this file on your mobile, send to yourself via WhatsApp, and upload it on your laptop to see all records instantly!'
                : 'મોબાઇલમાં આ ફાઇલ ડાઉનલોડ કરી WhatsApp દ્વારા લેપટોપમાં મોકલો અને ત્યાં "અપલોડ" બટન દબાવો. બધો હિસાબ એક ક્ષણમાં આવી જશે!'}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onExportBackup}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <i className="fa-solid fa-download"></i>
              <span>{language === 'en' ? 'Download Backup (.json)' : 'બેકઅપ ડાઉનલોડ કરો'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 px-4 py-3 text-xs font-black transition-all cursor-pointer active:scale-95 disabled:opacity-40 dark:border-indigo-900 dark:bg-slate-800 dark:text-indigo-300"
            >
              <i className="fa-solid fa-upload"></i>
              <span>{importing ? (language === 'en' ? 'Importing...' : 'અપલોડ થઈ રહ્યું છે...') : (language === 'en' ? 'Upload Backup (.json)' : 'બેકઅપ અપલોડ કરો')}</span>
            </button>

            {/* Hidden File Input */}
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

      {/* App & System Details */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h4 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <i className="fa-solid fa-circle-nodes text-purple-600"></i>
          <span>{language === 'en' ? 'System & Storage Information' : 'સિસ્ટમ અને ડેટાબેઝ સ્થિતિ'}</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-gray-50 p-3.5 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800">
            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
              {language === 'en' ? 'Total Workers' : 'કુલ કારીગરો'}
            </p>
            <p className="text-lg font-black text-gray-900 dark:text-slate-100 mt-0.5">{workers.length}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3.5 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800">
            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
              {language === 'en' ? 'Active Workers' : 'ચાલુ કારીગરો'}
            </p>
            <p className="text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">{activeWorkers.length}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3.5 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800">
            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
              {language === 'en' ? 'Attendance Months' : 'નોંધાયેલ મહિના'}
            </p>
            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{totalMonthsRecorded}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3.5 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800">
            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
              {language === 'en' ? 'Local Storage' : 'સ્થાનિક સ્ટોરેજ'}
            </p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">સુરક્ષિત ✓</p>
          </div>
        </div>
      </div>
    </div>
  );
}
