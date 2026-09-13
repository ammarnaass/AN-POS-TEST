import type { FavoritePackType } from '../types';

export const QUICK_PIECES_OPTIONS: number[] = [2, 3, 4, 6, 8, 10, 12, 24, 30, 48];

export const QUICK_UNIT_OPTIONS: string[] = [
  'كرتونة',
  'طرد',
  'باقة',
  'شدة',
  'صندوق',
  'علبة',
  'كيس',
  'ربطة',
];

export interface PackTypeOption {
  value: FavoritePackType;
  label: string;
  description: string;
}

export const PACK_TYPE_OPTIONS: PackTypeOption[] = [
  {
    value: 'bundle',
    label: 'باقة مجمعة (سريعة)',
    description: 'كرتونة أو حزمة سريعة تباع باللمس على الكاشير مع خصم تلقائي من المخزن',
  },
  {
    value: 'wholesale',
    label: 'بيع بالجملة',
    description: 'عبوة مخصصة للعملاء التجاريين مع تطبيق سعر الجملة عند بلوغ الحد الأدنى',
  },
  {
    value: 'half_wholesale',
    label: 'نصف جملة',
    description: 'عبوة ذات تسعير وسيط للكميات المتوسطة',
  },
];
