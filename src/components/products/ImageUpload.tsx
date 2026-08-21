// ImageUpload — reads image file → base64 string
import { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
}

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('الملف ليس صورة');
      return;
    }
    if (file.size > 2_000_000) {
      alert('الصورة كبيرة جدًا (الحد 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3" dir="rtl">
      <div className="w-16 h-16 rounded-lg border border-outline-variant/30 overflow-hidden bg-surface-container-low flex items-center justify-center shrink-0">
        {value ? (
          <img src={value} alt="منتج" className="w-full h-full object-cover" />
        ) : (
          <Upload className="w-5 h-5 text-on-surface-variant opacity-50" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 bg-surface-container-high text-on-surface rounded-lg text-label-sm hover:bg-surface-container-highest"
        >
          اختيار صورة
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-3 py-1 text-error text-label-sm flex items-center gap-1 hover:underline"
          >
            <X className="w-3 h-3" /> إزالة
          </button>
        )}
      </div>
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
