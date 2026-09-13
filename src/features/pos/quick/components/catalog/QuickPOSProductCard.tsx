import React from 'react';
import type { Product } from '@/types';
import { formatNumber } from '../../../utils/format';

interface QuickPOSProductCardProps {
  product: Product;
  onAddProduct: (product: Product) => void;
  baseCurrency?: string;
}

export const QuickPOSProductCard: React.FC<QuickPOSProductCardProps> = ({
  product,
  onAddProduct,
  baseCurrency = 'دج',
}) => {
  const isOutOfStock =
    product.trackStock !== false && product.stock !== undefined && product.stock <= 0;
  const isLowStock =
    product.trackStock !== false &&
    product.stock !== undefined &&
    product.stock > 0 &&
    Boolean(product.minStockAlert && product.stock <= product.minStockAlert);

  const stockColorClass = isOutOfStock
    ? 'bg-rose-500'
    : isLowStock
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const stockTitle = isOutOfStock
    ? 'نفد المخزون'
    : isLowStock
    ? `مخزون منخفض (${product.stock})`
    : `متوفر (${product.stock ?? 'غير محدود'})`;

  return (
    <article
      onClick={() => onAddProduct(product)}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer group relative select-none"
    >
      <div>
        <div className="flex items-start justify-between">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[80%]">
            {product.barcode || product.sku || 'صنف سريع'}
          </span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${stockColorClass}`}
            title={stockTitle}
          />
        </div>
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition truncate">
          {product.name}
        </h3>
      </div>

      <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="text-brand-600 dark:text-brand-400 font-extrabold text-sm font-mono">
          {formatNumber(product.retailPrice)}{' '}
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
            {baseCurrency}
          </span>
        </div>
        <button
          type="button"
          className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 group-hover:bg-brand-600 dark:group-hover:bg-brand-600 text-amber-800 dark:text-amber-300 group-hover:text-white flex items-center justify-center transition font-bold text-sm"
        >
          +
        </button>
      </div>
    </article>
  );
};
