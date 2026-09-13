/**
 * محرك حسابات شبكة وتنسيقات طباعة ملصقات الباركود
 */

/**
 * حساب عدد أعمدة الملصقات الممكن رصها في صفحة A4 بدون تداخل
 * عرض ورقة A4 الصافي القابل للطباعة بعد الهوامش هو قرابة 190mm
 */
export function calculatePrintColumns(
  labelWidthMm: number,
  printablePageWidthMm: number = 190
): number {
  if (labelWidthMm <= 0) return 1;
  const colGap = 3; // mm
  return Math.max(1, Math.floor(printablePageWidthMm / (labelWidthMm + colGap)));
}

/**
 * تشغيل أمر الطباعة عبر المتصفح / إلكترون بعد مهلة بسيطة لضمان اكتمال الرندر
 */
export function triggerSystemPrint(delayMs: number = 250): void {
  setTimeout(() => {
    window.print();
  }, delayMs);
}

/**
 * تنسيق سعر المنتج للملصق
 */
export function formatLabelPrice(price: number | undefined | null, currency: string = 'دج'): string {
  const val = Number(price || 0);
  return `${val.toFixed(0)} ${currency}`;
}
