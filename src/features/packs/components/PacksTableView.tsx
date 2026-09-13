import React from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { Barcode, Edit2, Trash2, Gift, Box, ShoppingBag } from 'lucide-react';
import { formatPackMoney, calculatePackStockReadiness } from '../services/packCalculations';

interface PacksTableViewProps {
  packs: PackEntity[];
  products: Product[];
  currencySymbol: string;
  onEdit: (pack: PackEntity) => void;
  onDelete: (packId: string, packName: string) => void;
}

export const PacksTableView: React.FC<PacksTableViewProps> = ({
  packs,
  products,
  currencySymbol,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="bg-surface-container-low/80 border-b border-outline-variant/30 text-on-surface-variant font-bold">
              <th className="py-3 px-4">اسم الباقة / الحزمة</th>
              <th className="py-3 px-4">النوع والتعبئة</th>
              <th className="py-3 px-4">الباركود</th>
              <th className="py-3 px-4">الأصناف المشمولة</th>
              <th className="py-3 px-4">جاهزية التجميع</th>
              <th className="py-3 px-4">سعر البيع</th>
              <th className="py-3 px-4">هامش الربح</th>
              <th className="py-3 px-4">الحالة</th>
              <th className="py-3 px-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-on-surface">
            {packs.map((pack) => {
              let items: any[] = [];
              try {
                items = typeof pack.items === 'string' ? JSON.parse(pack.items) : pack.items || [];
              } catch {
                items = [];
              }

              const price = Number(pack.packPrice ?? pack.pack_price ?? 0);
              const piecesCount =
                pack.piecesCount || items.reduce((a: number, b: any) => a + (b.qty || 0), 0);

              let totalCost = 0;
              for (const it of items) {
                const prod = products.find((p) => p.id === it.productId);
                totalCost += Number(prod?.costPrice ?? 0) * (Number(it.qty) || 1);
              }

              const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
              const readiness = calculatePackStockReadiness(items, products);

              return (
                <tr
                  key={pack.id}
                  className="hover:bg-surface-container-low/50 transition-colors"
                >
                  {/* الاسم */}
                  <td className="py-3 px-4 font-bold text-sm font-cairo">
                    {pack.name}
                  </td>

                  {/* النوع والتعبئة */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        pack.packType === 'bundle'
                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                          : pack.packType === 'half_wholesale'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {pack.packType === 'bundle' ? (
                        <Gift className="w-3 h-3" />
                      ) : pack.packType === 'half_wholesale' ? (
                        <ShoppingBag className="w-3 h-3" />
                      ) : (
                        <Box className="w-3 h-3" />
                      )}
                      <span>
                        {pack.packType === 'bundle'
                          ? 'باقة مجمعة'
                          : pack.packType === 'half_wholesale'
                          ? 'نصف جملة'
                          : 'طرد جملة'}
                      </span>
                    </span>
                    <span className="text-on-surface-variant block text-[10px] mt-0.5">
                      {pack.unitName || 'كرتونة'} ({piecesCount} ق)
                    </span>
                  </td>

                  {/* الباركود */}
                  <td className="py-3 px-4 font-mono text-on-surface-variant">
                    {pack.barcode || '—'}
                  </td>

                  {/* الأصناف المشمولة */}
                  <td className="py-3 px-4">
                    <span className="font-bold">{items.length} صنف</span>
                    <span className="text-on-surface-variant text-[10px] block truncate max-w-[150px]">
                      {items.map((i: any) => i.name).filter(Boolean).join('، ') || '—'}
                    </span>
                  </td>

                  {/* جاهزية التجميع من المخزون */}
                  <td className="py-3 px-4">
                    {readiness.availablePacks > 5 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-700 dark:text-green-300">
                        {readiness.availablePacks} باقة متوفرة
                      </span>
                    ) : readiness.availablePacks > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {readiness.availablePacks} باقة فقط
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                        غير جاهز
                      </span>
                    )}
                  </td>

                  {/* السعر */}
                  <td className="py-3 px-4 font-bold text-primary font-cairo">
                    {formatPackMoney(price)} {currencySymbol}
                  </td>

                  {/* هامش الربح */}
                  <td className="py-3 px-4">
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        margin >= 20
                          ? 'text-green-600 bg-green-500/10'
                          : margin > 0
                          ? 'text-blue-600 bg-blue-500/10'
                          : 'text-rose-600 bg-rose-500/10'
                      }`}
                    >
                      {margin.toFixed(1)}%
                    </span>
                  </td>

                  {/* الحالة */}
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pack.status !== 'inactive'
                          ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                          : 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {pack.status !== 'inactive' ? 'نشطة' : 'معطلة'}
                    </span>
                  </td>

                  {/* إجراءات */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onEdit(pack)}
                        className="p-1.5 rounded-lg border border-outline-variant/40 hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(pack.id, pack.name)}
                        className="p-1.5 rounded-lg border border-outline-variant/40 text-error hover:bg-error/10 transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
