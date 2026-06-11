import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  backupToFirestore,
  restoreFromFirestore,
  testConnection
} from '../utils/firebaseSync';
import { Worker, MonthlyWorkerAttendance } from '../types';

interface FirebaseSyncPanelProps {
  workers: Worker[];
  attendanceDB: Record<string, MonthlyWorkerAttendance>;
  onRestoreSuccess: (
    workers: Worker[],
    attendanceDB: Record<string, MonthlyWorkerAttendance>
  ) => void;
}

export default function FirebaseSyncPanel({
  workers,
  attendanceDB,
  onRestoreSuccess,
}: FirebaseSyncPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [hasLocalChanges, setHasLocalChanges] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const isFirstRender = useRef(true);
  const ignoreNextChangeRef = useRef(false);

  // Initialize Auth handler and connection testing on load
  useEffect(() => {
    testConnection();
    
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Detect local state changes to mark as dirty/pending sync
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (ignoreNextChangeRef.current) {
      ignoreNextChangeRef.current = false;
      return;
    }
    setHasLocalChanges(true);
  }, [workers, attendanceDB]);

  // Check if user has cloud data on login
  useEffect(() => {
    const checkCloudData = async () => {
      if (!user) return;
      try {
        const data = await restoreFromFirestore(user.uid);
        if (data && (data.workers.length > 0 || Object.keys(data.attendanceDB).length > 0)) {
          // Only show prompt if local changes are false
          if (!hasLocalChanges) {
            setStatusMessage({
              text: 'તમારો અગાઉ સેવ કરેલો હિસાબ ગૂગલ ક્લાઉડ પર ઉપલબ્ધ છે. જો તમારે જૂનો હિસાબ આ ફોનમાં પાછો લાવવો હોય તો નીચે "ક્લાઉડ માંથી હિસાબ રીસ્ટોર કરો" બટન દબાવો.',
              type: 'info',
            });
          }
        }
      } catch (err) {
        console.error('Error checking cloud data:', err);
      }
    };

    checkCloudData();
  }, [user]);

  // Automatic backup trigger (Debounced)
  useEffect(() => {
    if (!user || !hasLocalChanges) return;

    const delayDebounceFn = setTimeout(async () => {
      setIsBackingUp(true);
      setStatusMessage(null);
      try {
        await backupToFirestore(user.uid, workers, attendanceDB);
        setHasLocalChanges(false);
        setStatusMessage({
          text: 'નવા સુધારા આપોઆપ ક્લાઉડ ડેટાબેઝ પર સુરક્ષિત રીતે સેવ થઈ ગયા છે ✓',
          type: 'success',
        });
      } catch (err: any) {
        console.error('Auto-backup failed:', err);
        setStatusMessage({
          text: `ઓટો-સેવ નિષ્ફળ: ${err.message || 'અજ્ઞાત ક્ષતિ'}`,
          type: 'error',
        });
      } finally {
        setIsBackingUp(false);
      }
    }, 2500); // 2.5s debounce

    return () => clearTimeout(delayDebounceFn);
  }, [workers, attendanceDB, user, hasLocalChanges]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const currentUser = await googleSignIn();
      if (currentUser) {
        setUser(currentUser);
        setStatusMessage({
          text: 'ગૂગલ એકાઉન્ટ સાથે લોગિન સફળ થયું! હવે તમારો બધો ચોપડો ઓટોમેટીક સુરક્ષિત રીતે સેવ થશે.',
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('popup-closed-by-user')) {
        setStatusMessage({
          text: 'સિંક કરવા માટે કનેક્શન વિન્ડો અકાળે બંધ થઈ હતી. "Open in New Tab" માં ચલાવો જેથી પોપઅપ બ્લોક ન થાય.',
          type: 'info',
        });
      } else {
        setStatusMessage({
          text: `લૉગ-ઈન અસફળ: ${err.message || 'અજ્ઞાત ક્ષતિ'}`,
          type: 'error',
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setStatusMessage(null);
    try {
      await logout();
      setUser(null);
      setHasLocalChanges(false);
      setStatusMessage({
        text: 'ગૂગલ ક્લાઉડ સિંકિંગ બંધ કરવામાં આવ્યું છે.',
        type: 'info',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    
    const confirmRestore = window.confirm(
      'સાવધાની: શું તમે ખરેખર ગૂગલ ક્લાઉડ પરથી જૂનો ડેટા આ ફોનમાં લેવા (Restore) માંગો છો? આનાથી તમારા ચાલુ ફોનનો ડેટા સંપૂર્ણ બદલાઈ જશે!'
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const data = await restoreFromFirestore(user.uid);
      if (data) {
        ignoreNextChangeRef.current = true;
        onRestoreSuccess(data.workers, data.attendanceDB);
        setHasLocalChanges(false);
        setStatusMessage({
          text: 'ક્લાઉડ ડેટાબેઝ પરથી સફળતાપૂર્વક હિસાબ પાછો મેળવી લીધો છે!',
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: 'તમારા આ ગૂગલ ખાતા પર ક્લાઉડ ડેટાબેઝમાં હજી કોઈ સેવ ડેટા મળ્યો નથી.',
          type: 'info',
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `રીસ્ટોર નિષ્ફળ: ${err.message || 'અજ્ઞાત ક્ષતિ'}`,
        type: 'error',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 mt-6" id="firebase-sync-panel">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4 dark:border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-sans dark:text-slate-100">
              સુરક્ષિત ગૂગલ ક્લાઉડ ઓટો-સેવ (Secured Google Cloud Auto-Save)
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
              હવે તમારો ચોપડો કોઈ કિંમત આપ્યા વિના ગૂગલના સુરક્ષિત અને ફ્રી ક્લાઉડ સર્વર પર આપોઆપ ઓટો-સેવ થઈ જશે! મોબાઈલ ખોવાઈ જાય તો પણ બધો હિસાબ અકબંધ રહેશે.
            </p>
          </div>
        </div>

        {/* Auth Buttons */}
        <div>
          {!user ? (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-600 shadow select-none cursor-pointer transition-all disabled:opacity-50"
            >
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.745-.079-1.32-.174-1.883H12.24z"/>
              </svg>
              <span>{isLoggingIn ? 'કનેક્ટ થઈ રહ્યું છે...' : 'ગૂગલ એકાઉન્ટ જોડો (લૉગિન)'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-1.5 dark:bg-slate-950 border border-gray-100 dark:border-slate-800">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-6 w-6 rounded-full border border-teal-200"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="text-left leading-none">
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Google આઈડી લોગઆઉટ કરો"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-100 hover:bg-rose-50 hover:border-rose-200 text-gray-400 hover:text-rose-500 transition-all dark:border-slate-800 dark:hover:bg-rose-950/20"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 013 3H6a3 3 0 013-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-xs font-medium flex items-center gap-2 transition-all ${
            statusMessage.type === 'success'
              ? 'border-emerald-100 bg-emerald-50/50 text-emerald-700 dark:border-emerald-950/40 dark:bg-emerald-900/20 dark:text-emerald-400'
              : statusMessage.type === 'error'
              ? 'border-rose-100 bg-rose-50/50 text-rose-600 dark:border-rose-950/40 dark:bg-rose-900/20 dark:text-rose-400'
              : 'border-blue-100 bg-blue-50/50 text-blue-600 dark:border-blue-950/40 dark:bg-blue-900/20 dark:text-blue-400'
          }`}
        >
          <span>{statusMessage.text}</span>
        </div>
      )}

      {user ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-50 bg-gray-50/30 p-4 dark:border-slate-800/40 dark:bg-slate-950/30 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                ડેટાબેઝ સ્થિતી (Database Spark Plan)
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">
                જ્યારે પણ તમે નવો કારીગર ઉમેરશો અથવા હાજરી પૂરશો, નવો ડેટા આપોઆપ ગૂગલના ક્લાઉડ પર સુરક્ષિત રીતે સેવ થઈ જાય છે. તમારે મેન્યુઅલ સિંક કરવાની ચિંતા કરવાની જરૂર નથી!
              </p>
            </div>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-2 font-medium">
              ✓ આપોઆપ ૧૦૦% મફત, ખાનગી અને અત્યંત સુરક્ષિત ઓટો-બેકઅપ
            </p>
          </div>

          <div className="flex flex-col justify-center gap-3">
            {/* Auto backup status panel */}
            <div className="rounded-xl border border-gray-100 dark:border-slate-800 p-4 bg-gray-50/10 dark:bg-slate-950/30">
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
                ડેટા સિંકની સ્થિતિ (Sync Status)
              </span>
              <div className="flex items-center gap-2 mt-2">
                {isBackingUp ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 animate-pulse">
                      નવા સુધારા આપોઆપ સેવ થઈ રહ્યા છે...
                    </span>
                  </>
                ) : hasLocalChanges ? (
                  <>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      નવા ફેરફારો મળ્યા, આપોઆપ સેવ થશે...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      બધો ડેટા ક્લાઉડ માં સુરક્ષિત છે ✓
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleRestore}
              disabled={isRestoring || isBackingUp}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-40 select-none cursor-pointer transition-all dark:bg-slate-800 dark:text-teal-400 dark:border-slate-750 dark:hover:bg-slate-700"
            >
              {isRestoring ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-teal-700 dark:text-teal-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>રીસ્ટોર ડાઉનલોડ થઈ રહ્યું છે...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>ક્લાઉડ માંથી હિસાબ રીસ્ટોર કરો</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-950/10 text-center">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            તમારો ડેટા ક્લાઉડ પર આપોઆપ સુરક્ષિત રીતે સેવ કરવા માટે ઉપર <strong>"ગૂગલ એકાઉન્ટ જોડો (લૉગિન)"</strong> બટન દબાવો.
          </p>
        </div>
      )}
    </div>
  );
}
