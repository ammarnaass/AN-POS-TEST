// ImageUpload — reads image file → base64 string with Drag&Drop + Clipboard Paste
import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
  className?: string;
}

export default function ImageUpload({ value, onChange, className = '' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('الملف المختار ليس صورة صالحة');
      return;
    }
    if (file.size > 2_000_000) {
      setError('حجم الصورة كبير جدًا (الحد الأقصى 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange(String(reader.result));
    };
    reader.onerror = () => {
      setError('تعذر قراءة ملف الصورة');
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  // Support paste from clipboard (Ctrl+V) when hovering / focusing drop area
  const handlePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFile(file);
          return;
        }
      }
    }
  }, [handleFile]);

  return (
    <div className={`space-y-2 ${className}`} dir="rtl">
      <div
        ref={dropRef}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onPaste={handlePaste}
        tabIndex={0}
        className={`flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl border-2 border-dashed transition-all outline-none ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-outline-variant/30 hover:border-primary/40 bg-surface-container-low/60'
        }`}
      >
        {/* الصورة أو أيقونة الرفع */}
        <div className="w-20 h-20 rounded-xl border border-outline-variant/25 overflow-hidden bg-surface-container flex items-center justify-center shrink-0 relative group shadow-sm">
          {value ? (
            <>
              <img src={value} alt="صورة المنتج" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  title="حذف الصورة"
                  className="p-1.5 rounded-lg bg-error text-on-error hover:bg-error/90 transition-transform active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <ImageIcon className="w-8 h-8 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
          )}
        </div>

        {/* تفاصيل وتوجيهات الرفع */}
        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-right gap-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3.5 py-1.5 bg-primary text-on-primary rounded-xl text-label-sm font-semibold hover:bg-primary/90 shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {value ? 'تغيير الصورة' : 'اختيار صورة من الجهاز'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-3 py-1.5 bg-surface-container-high text-error hover:bg-error/10 rounded-xl text-label-sm font-medium transition-all cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                إزالة
              </button>
            )}
          </div>
          <p className="text-body-xs text-on-surface-variant">
            اسحب الصورة وأفلتها هنا، أو الصقها بالحافظة (<kbd className="px-1 py-0.5 bg-surface-container-highest rounded text-[10px] font-mono">Ctrl+V</kbd>)
          </p>
          <span className="text-[10px] text-on-surface-variant/70">يدعم JPG, PNG, WebP (الحد الأقصى 2MB)</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-error text-body-xs font-medium bg-error/10 px-3 py-1.5 rounded-xl border border-error/20">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
