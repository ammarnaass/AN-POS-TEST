import type { Customer } from '@/types';

export function formatCustomerMoney(val: number | undefined | null): string {
  return Number(val || 0).toLocaleString('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getCreditStatus(customer: Customer): 'in_credit' | 'settled' | 'normal_debt' | 'warning' | 'exceeded' {
  if (customer.balance < 0) return 'in_credit';
  if (customer.balance === 0) return 'settled';
  if (customer.creditLimit <= 0) return 'normal_debt';
  const ratio = customer.balance / customer.creditLimit;
  if (ratio >= 1) return 'exceeded';
  if (ratio >= 0.8) return 'warning';
  return 'normal_debt';
}

export function getWhatsAppUrl(customer: Customer, storeName = 'متجرنا', currencySymbol = 'دج'): string | null {
  if (!customer.phone || customer.balance <= 0) return null;
  let cleanPhone = customer.phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '213' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('213')) {
    cleanPhone = '213' + cleanPhone;
  }
  const text = encodeURIComponent(
    `السلام عليكم ورحمة الله أخي الكريم ${customer.name}،\n\nنود تذكيركم بأن الرصيد المتبقي المستحق في حسابكم لدى "${storeName}" هو: ${formatCustomerMoney(customer.balance)} ${currencySymbol}.\n\nنشكركم على ثقتكم وحسن تعاملكم!`
  );
  return `https://wa.me/${cleanPhone}?text=${text}`;
}
