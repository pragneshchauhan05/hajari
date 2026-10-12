import React, { useRef } from 'react';
import { User } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext';

interface SyncHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export default function SyncHelpModal({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  onExportBackup,
  onImportBackup,
}: SyncHelpModalProps) {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-gray-100 dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-5 dark:border-slate-800 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-800/60 dark:to-teal-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-none">
              <i className="fa-solid fa-laptop-mobile text-lg sm:text-xl"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                {language === 'en'
                  ? 'Mobile ↔ Laptop Data Sync Guide'
                  : 'મોબાઇલ અને લેપટોપ વચ્ચે ડેટા કેવી રીતે જોવો?'}
              </h3>
              <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                {language === 'en'
                  ? 'View your register seamlessly across all devices'
                  : 'એક જ ચોપડો મોબાઇલ અને લેપટોપ બંનેમાં સાથે વાપરો'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white transition-all cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-gray-700 dark:text-slate-350 text-xs sm:text-sm">
          
          {/* Question explanation banner */}
          <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 sm:p-4 dark:bg-amber-950/30 dark:border-amber-800/50">
            <div className="flex items-start gap-3">
              <span className="text-xl">❓</span>
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                  {language === 'en'
                    ? 'Why does it show on mobile, but not on laptop?'
                    : 'મોબાઇલમાં દેખાય છે પણ લેપટોપમાં કેમ નથી દેખાતું?'}
                </h4>
                <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                  {language === 'en'
                    ? 'Every device stores its data locally in browser memory. To see mobile data on laptop, you must either log in with the same Google Account on both devices, or transfer a backup file.'
                    : 'તમારો ડેટા અત્યાર સુધી તમારા મોબાઈલના બ્રાઉઝરમાં સેવ હતો. લેપટોપમાં જોવા માટે નીચે દર્શાવેલી કોઈપણ એક સરળ રીત અપનાવો:'}
                </p>
              </div>
            </div>
          </div>

          {/* Method 1: Google Cloud Live Sync (Recommended) */}
          <div className="rounded-2xl border-2 border-teal-500/30 bg-teal-50/20 p-4 sm:p-5 dark:border-teal-700/50 dark:bg-teal-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white font-bold text-xs">
                  ૧
                </span>
                <h4 className="font-black text-gray-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                  <span>{language === 'en' ? 'Google Account Live Sync' : 'ગૂગલ એકાઉન્ટ લાઈવ સિંક'}</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] font-extrabold px-2 py-0.5">
                    {language === 'en' ? 'Recommended' : 'સૌથી સરળ & આપોઆપ'}
                  </span>
                </h4>
              </div>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] sm:text-xs text-gray-600 dark:text-slate-400 leading-relaxed font-medium">
              <li>
                <strong className="text-gray-900 dark:text-slate-200">
                  {language === 'en' ? 'On Mobile:' : 'તમારા મોબાઇલમાં:'}
                </strong>{' '}
                {language === 'en'
                  ? 'Sign in with your Google account. Your records will automatically upload to the cloud.'
                  : 'ગૂગલ એકાઉન્ટ વડે લોગિન કરો. તમારો તમામ હિસાબ આપોઆપ ક્લાઉડ પર સુરક્ષિત થશે.'}
              </li>
              <li>
                <strong className="text-gray-900 dark:text-slate-200">
                  {language === 'en' ? 'On Laptop:' : 'તમારા લેપટોપમાં:'}
                </strong>{' '}
                {language === 'en'
                  ? 'Sign in with the SAME Google account. All workers and attendance will appear instantly!'
                  : 'તે જ સરખા ગૂગલ એકાઉન્ટ વડે લોગિન કરો. તરત જ બધા કારીગરો અને હિસાબ લેપટોપમાં આવી જશે!'}
              </li>
            </ol>

            {/* Google Login Status & Button */}
            <div className="pt-2 border-t border-teal-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {language === 'en' ? 'Connected: ' : 'લૉગિન થયેલ છે: '}
                    {user.email || user.displayName}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-gray-500 dark:text-slate-400">
                  {language === 'en'
                    ? 'Currently not logged in on this device'
                    : 'આ ડિવાઇસમાં હજુ લૉગિન કરેલ નથી'}
                </span>
              )}

              {user ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer dark:border-rose-900/50 dark:text-rose-400"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket mr-1"></i>
                  {language === 'en' ? 'Logout' : 'લૉગ આઉટ'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={isLoggingIn}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-black text-xs shadow-md shadow-teal-200 transition-all flex items-center gap-2 cursor-pointer dark:shadow-none"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.745-.079-1.32-.174-1.883H12.24z"/>
                  </svg>
                  <span>
                    {isLoggingIn
                      ? (language === 'en' ? 'Connecting...' : 'કનેક્ટ થઈ રહ્યું છે...')
                      : (language === 'en' ? 'Sign in with Google' : 'ગૂગલ એકાઉન્ટ વડે લૉગિન કરો')}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Method 2: Offline File Transfer (WhatsApp / File) */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-600 text-white font-bold text-xs">
                ૨
              </span>
              <h4 className="font-black text-gray-900 dark:text-white text-sm sm:text-base">
                {language === 'en'
                  ? 'Backup File Transfer (WhatsApp / File)'
                  : 'ઓફલાઇન બેકઅપ ફાઇલ ટ્રાન્સફર (WhatsApp દ્વારા)'}
              </h4>
            </div>

            <p className="text-[11px] sm:text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
              {language === 'en'
                ? 'If you do not want to use Google login, you can download a backup file from your mobile, send it via WhatsApp to your laptop, and upload it here.'
                : 'જો ગૂગલ લોગિન ન કરવું હોય, તો મોબાઈલમાંથી બેકઅપ ફાઈલ ડાઉનલોડ કરીને WhatsApp દ્વારા લેપટોપમાં મોકલીને અહીં સીધી અપલોડ કરી શકો છો:'}
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {/* Export Button */}
              <button
                type="button"
                onClick={onExportBackup}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-xs transition-all cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <i className="fa-solid fa-download text-teal-600"></i>
                <span>{language === 'en' ? 'Download Backup (.json)' : 'બેકઅપ ફાઇલ ડાઉનલોડ કરો'}</span>
              </button>

              {/* Import Button */}
              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer">
                <i className="fa-solid fa-upload"></i>
                <span>{language === 'en' ? 'Upload Backup File' : 'બેકઅપ ફાઇલ અપલોડ કરો'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-100 p-4 dark:border-slate-800 flex justify-end bg-gray-50/50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-all cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {language === 'en' ? 'Got it / Close' : 'સમજાઈ ગયું (બંધ કરો)'}
          </button>
        </div>
      </div>
    </div>
  );
}
