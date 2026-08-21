// CategorySelect — reusable Select that fetches categories from API
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/services/api/categoriesApi';

interface CategorySelectProps {
  value?: string | null;
  onChange: (categoryId: string | null) => void;
  className?: string;
  required?: boolean;
}

export default function CategorySelect({ value, onChange, className, required }: CategorySelectProps) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      required={required}
      className={className ?? 'w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20'}
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
  );
}
