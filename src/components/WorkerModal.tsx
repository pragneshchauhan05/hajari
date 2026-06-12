import React, { useState, useEffect } from 'react';

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; village: string; dailyWage: number; mobile?: string }) => void;
  initialData?: { name: string; village: string; dailyWage: number; mobile?: string } | null;
}

export default function WorkerModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: WorkerModalProps) {
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [mobile, setMobile] = useState('');
  const [dailyWage, setDailyWage] = useState<number | ''>('');
  const [error, setError] = useState('');

  // Sync with initialData for editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setVillage(initialData.village);
      setMobile(initialData.mobile || '');
      setDailyWage(initialData.dailyWage);
    } else {
      setName('');
      setVillage('');
      setMobile('');
      setDailyWage('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!name.trim()) {
      setError('કૃપા કરીને કારીગરનું નામ લખો!');
      return;
    }
    if (!village.trim()) {
      setError('કૃપા કરીને કારીગરની સાઇટનું નામ લખો!');
      return;
    }
    if (!mobile.trim()) {
      setError('કૃપા કરીને કારીગરનો મોબાઇલ નંબર લખો!');
      return;
    }
    if (mobile.trim().length !== 10) {
      setError('મોબાઇલ નંબર ૧૦ આંકડાનો હોવો જોઈએ!');
      return;
    }
    if (!dailyWage || Number(dailyWage) <= 0) {
      setError('કૃપા કરીને માન્ય રોજનો પગાર લખો!');
      return;
    }

    onSave({
      name: name.trim(),
      village: village.trim(),
      mobile: mobile.trim(),
      dailyWage: Number(dailyWage),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all duration-300 md:p-8 dark:bg-slate-900 dark:border dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-slate-800">
          <h3 className="text-xl font-bold text-teal-950 font-sans flex items-center gap-2 dark:text-teal-400">
            <i className={`fa-solid ${initialData ? 'fa-user-pen text-amber-500' : 'fa-user-plus text-teal-600'}`}></i>
            {initialData ? 'કારીગરો વિગતો સુધારો' : 'નવો કારીગર ઉમેરો'}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-250"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          
          {/* Validation Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 flex items-center gap-2 dark:border-rose-950 dark:bg-rose-900/20 dark:text-rose-400">
              <i className="fa-solid fa-circle-exclamation text-rose-500 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 dark:text-slate-300" htmlFor="worker-name">
              👤 કારીગરનું નામ
            </label>
            <input
              id="worker-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="દા.ત. રમેશભાઈ પટેલ"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-950/40 dark:focus:bg-slate-905"
            />
          </div>

          {/* Mobile Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 dark:text-slate-300" htmlFor="worker-mobile">
              📞 મોબાઇલ નંબર (Mobile Number)
            </label>
            <input
              id="worker-mobile"
              type="tel"
              value={mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setMobile(val);
              }}
              placeholder="દા.ત. 9876543210"
              maxLength={10}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-950/40 dark:focus:bg-slate-905"
            />
          </div>

          {/* Village Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 dark:text-slate-300" htmlFor="worker-village">
              🏗️ સાઇટનું નામ (Site Name)
            </label>
            <input
              id="worker-village"
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="દા.ત. વરાછા પ્રોજેક્ટ, સુરત"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-950/40 dark:focus:bg-slate-905"
            />
          </div>

          {/* Wage Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 dark:text-slate-300" htmlFor="worker-wage">
              💰 રોજનો પગાર (રૂપીયામાં)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm dark:text-slate-400">
                ₹
              </span>
              <input
                id="worker-wage"
                type="number"
                value={dailyWage}
                onChange={(e) => setDailyWage(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="દા.ત. 500"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-3 text-sm text-gray-950 font-medium outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-950/40 dark:focus:bg-slate-900"
              />
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-5 mt-6 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
            >
              રદ કરો (Cancel)
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 shadow-md shadow-teal-100 transition-all flex items-center gap-1.5 dark:shadow-none"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              સાચવો (Save)
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
