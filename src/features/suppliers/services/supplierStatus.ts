import type { Supplier } from '@/types';

export function formatSupplierMoney(val: number | undefined | null): string {
  return Number(val || 0).toLocaleString('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getSupplierWhatsAppUrl(supplier: Supplier, shopName = 'المتجر'): string | null {
  if (!supplier.phone) return null;
  let cleanPhone = supplier.phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '213' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('213')) {
    cleanPhone = '213' + cleanPhone;
  }
  const text = encodeURIComponent(
    `السلام عليكم ورحمة الله،\nمن متجر "${shopName}". بخصوص طلبيات التوريد ومتابعة الحساب...`
  );
  return `https://wa.me/${cleanPhone}?text=${text}`;
}
