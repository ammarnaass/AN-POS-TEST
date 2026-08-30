// CategorySelect — مكون لاختيار الفئات مع دعم الإضافة السريعة والتراجع الآمن
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/services/api/categoriesApi';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import { Plus, Check, X, FolderTree } from 'lucide-react';

interface CategorySelectProps {
  value?: string | null;
  onChange: (categoryId: string | null, categoryName?: string) => void;
  className?: string;
  required?: boolean;
}

export default function CategorySelect({ value, onChange, className, required }: CategorySelectProps) {
  const queryClient = useQueryClient();
  const [showAddInline, setShowAddInline] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const list = await categoriesApi.list();
        if (Array.isArray(list) && list.length > 0) return list;
      } catch {
        /* fallback to direct proxy */
      }
      try {
        const raw = await db.categories.toArray();
        return (raw || []).map((r: any) => ({
          id: r.id || generateId(),
          name: typeof r === 'object' && r !== null ? r.name : String(r),
        }));
      } catch {
        return [];
      }
    },
  });

  const handleCreateCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newId = generateId();
      let createdId = newId;

      try {
        const res = await categoriesApi.create({ name: trimmed });
        if (res?.id) createdId = res.id;
      } catch {
        // Fallback to db proxy
        await db.categories.add({
          id: newId,
          name: trimmed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      onChange(createdId, trimmed);
      setNewCatName('');
      setShowAddInline(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل في إنشاء الفئة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showAddInline) {
    return (
      <div className="space-y-1.5" dir="rtl">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            value={newCatName}
            onChange={(e) => { setNewCatName(e.target.value); setErrorMsg(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); }
              if (e.key === 'Escape') { setShowAddInline(false); setNewCatName(''); }
            }}
            placeholder="اسم الفئة الجديدة..."
            className="flex-1 h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-primary/40 text-on-surface"
          />
          <button
            type="button"
            onClick={handleCreateCategory}
            disabled={isSubmitting || !newCatName.trim()}
            className="h-10 px-3.5 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container disabled:opacity-50 transition-all flex items-center justify-center gap-1 shadow-sm"
            title="حفظ الفئة"
          >
            <Check className="w-4 h-4" />
            <span>حفظ</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowAddInline(false); setNewCatName(''); setErrorMsg(''); }}
            className="h-10 px-2.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 rounded-lg text-on-surface-variant transition-all flex items-center justify-center"
            title="إلغاء"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {errorMsg && <p className="text-xs text-error pr-1">{errorMsg}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" dir="rtl">
      <div className="relative flex-1">
        <select
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value || null;
            const selected = categories.find((c) => c.id === val);
            onChange(val, selected?.name);
          }}
          required={required}
          className={
            className ??
            'w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20 appearance-none cursor-pointer'
          }
          dir="rtl"
        >
          <option value="">— بدون فئة —</option>
          {isLoading ? (
            <option disabled>جاري التحميل...</option>
          ) : (
            categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          )}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setShowAddInline(true)}
        className="h-10 px-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 hover:border-primary/40 rounded-lg text-primary text-body-sm font-semibold transition-all flex items-center justify-center gap-1 shrink-0"
        title="إضافة فئة جديدة"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">فئة جديدة</span>
      </button>
    </div>
  );
}
