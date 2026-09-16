import React, { useState, useEffect, useCallback } from 'react';
import { Keyboard, X, Delete, CornerDownLeft, Globe, Space } from 'lucide-react';

interface Design7VirtualKeyboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: string;
  onConfirm: (value: string) => void;
  title?: string;
  placeholder?: string;
}

type KeyboardLayout = 'ar' | 'en' | '123';

const ARABIC_ROWS = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'ذ'],
];

const ENGLISH_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const SYMBOLS_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['@', '#', '$', '%', '&', '*', '-', '+', '=', '/'],
  ['(', ')', '[', ']', '{', '}', ':', ';', '"', '.', '_'],
];

export const Design7VirtualKeyboardModal: React.FC<Design7VirtualKeyboardModalProps> = ({
  isOpen,
  onClose,
  initialValue = '',
  onConfirm,
  title = 'لوحة المفاتيح اللمسية الافتراضية',
  placeholder = 'انقر على الأحرف للكتابة باللمس...',
}) => {
  const [text, setText] = useState<string>(initialValue);
  const [layout, setLayout] = useState<KeyboardLayout>('ar');
  const [isCaps, setIsCaps] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setText(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleKeyPress = useCallback((key: string) => {
    setText((prev) => prev + key);
  }, []);

  const handleBackspace = useCallback(() => {
    setText((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
  }, []);

  const handleClear = useCallback(() => {
    setText('');
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(text);
    onClose();
  }, [text, onConfirm, onClose]);

  // Handle physical keyboard typing when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleConfirm, handleBackspace]);

  if (!isOpen) return null;

  const currentRows =
    layout === 'ar'
      ? ARABIC_ROWS
      : layout === 'en'
      ? ENGLISH_ROWS.map((row) => row.map((char) => (isCaps ? char.toUpperCase() : char)))
      : SYMBOLS_ROWS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 select-none">
      <div
        className="w-full max-w-2xl bg-[#e6ecf2] border-2 border-[#54606e] rounded-lg shadow-2xl flex flex-col overflow-hidden text-slate-800"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon (Classic Design 7 Glossy Style) */}
        <div className="px-4 py-2.5 bg-gradient-to-b from-[#e3e8ee] to-[#cad3de] border-b border-[#9ba8b7] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded d7-glossy-action-tile flex items-center justify-center text-sky-700 shadow-xs">
              <Keyboard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded border font-bold d7-pill-gloss-cyan">
                  {layout === 'ar' ? 'العربية' : layout === 'en' ? 'English' : '123 / رموز'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-600">
                إدخال نصوص، أرقام وباركود للشاشات اللمسية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded d7-glossy-top-btn text-slate-600 hover:text-rose-700 flex items-center justify-center cursor-pointer transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Text Display Strip */}
        <div className="p-3 bg-[#cfdbe6] border-b border-[#a9b9c9] flex flex-col gap-1.5">
          <div className="relative bg-[#081426] border-2 border-[#193b68] rounded-md p-2.5 flex items-center justify-between shadow-inner">
            <div className="flex-1 font-mono text-lg font-bold text-sky-300 tracking-wide break-all min-h-[28px] flex items-center">
              {text ? (
                <span>{text}</span>
              ) : (
                <span className="text-slate-500 font-sans text-sm font-normal">
                  {placeholder}
                </span>
              )}
              <span className="inline-block w-2 h-5 bg-amber-400 ml-1 animate-pulse" />
            </div>

            {text && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs px-2 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 rounded cursor-pointer ml-2 flex items-center gap-1 font-bold"
                title="مسح الحقل كاملاً"
              >
                <X className="w-3 h-3" />
                <span>مسح</span>
              </button>
            )}
          </div>
        </div>

        {/* Virtual Keyboard Matrix */}
        <div className="p-3 flex flex-col gap-1.5 bg-[#e6ecf2]">
          {/* Main Key Rows */}
          {currentRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1">
              {row.map((keyChar) => (
                <button
                  key={keyChar}
                  type="button"
                  onClick={() => handleKeyPress(keyChar)}
                  className="flex-1 max-w-[54px] h-11 rounded font-bold text-base d7-glossy-action-tile text-slate-900 flex items-center justify-center cursor-pointer active:scale-95 shadow-xs transition-transform font-sans"
                >
                  {keyChar}
                </button>
              ))}
            </div>
          ))}

          {/* Bottom Control & Spacebar Row */}
          <div className="flex justify-center gap-1.5 pt-1">
            {/* Language Switcher Button */}
            <button
              type="button"
              onClick={() => {
                setLayout((prev) => {
                  if (prev === 'ar') return 'en';
                  if (prev === 'en') return '123';
                  return 'ar';
                });
              }}
              className="px-3 h-11 rounded font-bold text-xs d7-glossy-action-tile text-sky-800 hover:text-sky-950 flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              title="تبديل لغة لوحة المفاتيح (عربي / EN / 123)"
            >
              <Globe className="w-4 h-4" />
              <span>{layout === 'ar' ? 'EN' : layout === 'en' ? '123' : 'عربي'}</span>
            </button>

            {/* Caps Lock (when in English mode) */}
            {layout === 'en' && (
              <button
                type="button"
                onClick={() => setIsCaps((prev) => !prev)}
                className={`px-3 h-11 rounded font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95 shadow-xs ${
                  isCaps
                    ? 'bg-amber-500 text-white border border-amber-600 font-black'
                    : 'd7-glossy-action-tile text-slate-700'
                }`}
                title="تبديل الأحرف الكبيرة / الصغيرة (Caps Lock)"
              >
                <span>{isCaps ? 'ABC' : 'abc'}</span>
              </button>
            )}

            {/* Spacebar Key */}
            <button
              type="button"
              onClick={() => handleKeyPress(' ')}
              className="flex-1 max-w-[280px] h-11 rounded font-bold text-xs d7-glossy-action-tile text-slate-700 flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              title="مسافة (Space)"
            >
              <Space className="w-4 h-4" />
              <span>مسافة</span>
            </button>

            {/* Backspace Key */}
            <button
              type="button"
              onClick={handleBackspace}
              className="px-4 h-11 rounded font-bold text-xs bg-gradient-to-b from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 border border-rose-300 text-rose-800 flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              title="حذف الحرف الأخير (Backspace)"
            >
              <Delete className="w-4 h-4 stroke-[2.2]" />
              <span>حذف</span>
            </button>

            {/* Clear All Key */}
            <button
              type="button"
              onClick={handleClear}
              className="px-3 h-11 rounded font-bold text-xs bg-gradient-to-b from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border border-amber-300 text-amber-800 flex items-center justify-center cursor-pointer active:scale-95 shadow-xs font-mono"
              title="مسح الكل (C)"
            >
              C
            </button>
          </div>

          {/* Footer Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 mt-1 border-t border-[#b7c6d6]">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded font-bold text-xs d7-glossy-top-btn text-slate-700 cursor-pointer active:scale-95"
            >
              إلغاء (Esc)
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="h-10 rounded font-bold text-sm bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 active:scale-95 text-white flex items-center justify-center gap-2 cursor-pointer shadow-md border border-emerald-600"
            >
              <CornerDownLeft className="w-4 h-4 stroke-[2.5]" />
              <span>تأكيد وإدخال (Enter)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Design7VirtualKeyboardModal;
