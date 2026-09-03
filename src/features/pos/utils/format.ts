export const formatMoney = (val: number | null | undefined, decimals = 2): string => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('ar-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatNumber = (val: number | null | undefined): string => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('ar-DZ');
};
