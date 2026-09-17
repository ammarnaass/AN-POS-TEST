import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { StockMovementV2Entity, Product } from '@/types';
import {
  ArrowLeftRight,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  RefreshCw,
  ShoppingBag,
  Truck,
  AlertTriangle,
  RotateCcw,
  ClipboardList,
  Calendar,
} from 'lucide-react';

export function StockMovementsHistorySection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // جلب سجل الحركات من stock_movements_v2
  const { data: movements = [], isFetching, refetch } = useQuery<StockMovementV2Entity[]>({
    queryKey: ['stock_movements_v2'],
    queryFn: async () => {
      const rows = await db.stock_movements_v2.toArray();
      return (rows as unknown as StockMovementV2Entity[]).sort((a, b) =>
        (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || '')
      );
    },
    refetchOnWindowFocus: true,
  });

  // جلب المنتجات لربط الأسماء بالباركودات
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const p = await db.products.toArray();
      return p as unknown as Product[];
    },
  });

  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      map.set(p.id, p);
      if (p.barcode) map.set(p.barcode, p);
    }
    return map;
  }, [products]);

  // إحصائيات سريعة
  const stats = useMemo(() => {
    let salesCount = 0;
    let purchasesCount = 0;
    let adjustmentsCount = 0;
    let totalQtyMoved = 0;

    for (const m of movements) {
      totalQtyMoved += Number(m.quantity) || 0;
      if (m.type === 'sale') salesCount++;
      else if (m.type === 'purchase') purchasesCount++;
      else if (m.type === 'adjust') adjustmentsCount++;
    }

    return {
      total: movements.length,
      salesCount,
      purchasesCount,
      adjustmentsCount,
      totalQtyMoved,
    };
  }, [movements]);

  // تصفية وبحث
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (selectedType !== 'all' && m.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const prod = productsMap.get(m.itemId);
        const nameMatch = prod?.name.toLowerCase().includes(q) ?? false;
        const barcodeMatch = prod?.barcode?.toLowerCase().includes(q) ?? false;
        const numberMatch = m.movementNumber?.toLowerCase().includes(q) ?? false;
        const refMatch = m.reference?.toLowerCase().includes(q) ?? false;
        const descMatch = m.description?.toLowerCase().includes(q) ?? false;
        return nameMatch || barcodeMatch || numberMatch || refMatch || descMatch;
      }
      return true;
    });
  }, [movements, selectedType, searchQuery, productsMap]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMovements.slice(start, start + itemsPerPage);
  }, [filteredMovements, currentPage, itemsPerPage]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'purchase':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Truck className="w-3.5 h-3.5" />
            <span>توريد / شراء</span>
          </span>
        );
      case 'sale':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>مبيعات نقطة البيع</span>
          </span>
        );
      case 'adjust':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>تعديل يدوي</span>
          </span>
        );
      case 'waste':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>تالف / هدر</span>
          </span>
        );
      case 'return':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مرتجع</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{type}</span>
          </span>
        );
    }
  };

  const isPositiveDirection = (type: string) => {
    return ['purchase', 'receive', 'return'].includes(type);
  };

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      {/* 1. البطاقات الإحصائية السريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">إجمالي الحركات</span>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="w-11 h-11 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">عمليات التوريد</span>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{stats.purchasesCount}</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">مبيعات نقطة البيع</span>
            <p className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">{stats.salesCount}</p>
          </div>
          <div className="w-11 h-11 bg-sky-50 dark:bg-sky-950/50 text-sky-600 rounded-xl flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">التعديلات اليدوية</span>
            <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{stats.adjustmentsCount}</p>
          </div>
          <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-xl flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. شريط البحث والفلترة */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم المنتج، الباركود، رقم الحركة أو المرجع..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <button
              type="button"
              onClick={() => { setSelectedType('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedType === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => { setSelectedType('purchase'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedType === 'purchase' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              توريد
            </button>
            <button
              type="button"
              onClick={() => { setSelectedType('sale'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedType === 'sale' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              مبيعات
            </button>
            <button
              type="button"
              onClick={() => { setSelectedType('adjust'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedType === 'adjust' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              تعديل يدوي
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. جدول الحركات */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الحركة</th>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-4">نوع الحركة</th>
                <th className="py-3 px-4">الصنف / المنتج</th>
                <th className="py-3 px-4 text-center">الكمية</th>
                <th className="py-3 px-4">سعر الوحدة</th>
                <th className="py-3 px-4">الإجمالي</th>
                <th className="py-3 px-4">المرجع / البيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">لا توجد حركات مخزنية مسجلة مطابقة للبحث</p>
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((m) => {
                  const prod = productsMap.get(m.itemId);
                  const isPositive = isPositiveDirection(m.type);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {m.movementNumber || m.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.date || (m.createdAt ? m.createdAt.slice(0, 10) : '-')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getTypeBadge(m.type)}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{prod?.name || m.itemId}</p>
                          {prod?.barcode && (
                            <span className="text-[11px] font-mono text-slate-400">{prod.barcode}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                              : m.type === 'adjust'
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                          }`}
                        >
                          {isPositive ? `+${m.quantity}` : m.type === 'adjust' ? `${m.quantity}` : `-${m.quantity}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {(Number(m.unitPrice) || 0).toLocaleString('ar-DZ')} د.ج
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {(Number(m.totalAmount) || (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0)).toLocaleString('ar-DZ')} د.ج
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={m.description || m.reference}>
                        {m.description || m.reference || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* الترقيم (Pagination) */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              عرض {((currentPage - 1) * itemsPerPage) + 1} إلى {Math.min(currentPage * itemsPerPage, filteredMovements.length)} من إجمالي {filteredMovements.length} حركة
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                السابق
              </button>
              <span className="px-2 font-mono font-bold text-slate-800 dark:text-white">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
