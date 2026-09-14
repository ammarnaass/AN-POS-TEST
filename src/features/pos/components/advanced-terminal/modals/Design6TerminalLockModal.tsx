import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock } from 'lucide-react';

export interface Design6TerminalLockModalProps {
  isOpen: boolean;
  onUnlock: () => void;
  userName?: string;
}

export const Design6TerminalLockModal: React.FC<Design6TerminalLockModalProps> = ({
  isOpen,
  onUnlock,
  userName = 'المسؤول',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeypadPress = useCallback((val: string) => {
    setPin((prev) => {
      if (prev.length < 6) {
        return prev + val;
      }
      return prev;
    });
    setError(false);
  }, []);

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setError(false);
  }, []);

  const handleUnlockAttempt = useCallback(() => {
    // Allows unlocking with any standard 4-digit PIN or empty for testing demo
    if (pin.length >= 4 || pin === '1234' || pin === '0000' || pin === '') {
      onUnlock();
      setPin('');
    } else {
      setError(true);
    }
  }, [pin, onUnlock]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlockAttempt();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeypadPress, handleBackspace, handleUnlockAttempt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 dark:bg-[#050811]/95 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-sm bg-white dark:bg-[#0a101f] border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center transition-colors">
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border-2 border-amber-400 dark:border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <Lock className="w-8 h-8 stroke-[2.5]" />
        </div>

        <h2 className="text-lg font-black text-slate-900 dark:text-white">نقطة البيع مقفلة مؤقتاً</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          الجلسة نشطة للمستخدم: <span className="text-amber-600 dark:text-amber-400 font-bold">{userName}</span>
        </p>

        {/* PIN Dots */}
        <div className="flex items-center justify-center gap-3 my-5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? 'bg-amber-500 border-amber-500 scale-110 shadow-[0_0_10px_#f59e0b]'
                  : 'bg-slate-100 border-slate-300 dark:bg-slate-900 dark:border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2">
            رمز PIN غير صحيح، يرجى المحاولة مجدداً
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="w-full grid grid-cols-3 gap-2 mb-4 font-mono">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadPress(num)}
              className="h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 active:scale-95 text-slate-900 dark:text-white font-bold text-lg rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 bg-rose-50 hover:bg-rose-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 active:scale-95 text-slate-900 dark:text-white font-bold text-lg rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
          >
            ⌫
          </button>
        </div>

        {/* Unlock Button */}
        <button
          type="button"
          onClick={handleUnlockAttempt}
          className="w-full h-12 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-sm"
        >
          <Unlock className="w-4 h-4 stroke-[3]" />
          <span>إلغاء القفل والمتابعة (Enter)</span>
        </button>
      </div>
    </div>
  );
};
