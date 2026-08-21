// InvoicesTab — POS-PRINT-001 / D phase
// تبويب الفواتير داخل SalesPage. يحتوي القائمة الحالية (إحصائيات + فلاتر + جدول) +
// نافذة عرض الفاتورة المطوّرة: اختيار القالب + الطابعة + معاينة مصغّرة.
import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { formatDate } from '@/utils';
import { Search, Eye, Trash2, Receipt, Printer as PrinterIcon, X, ShoppingCart, DollarSign, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateReceiptHTML } from '@/services';
import { printDocument, previewDocument } from '@/services/print/printService';
import { getAllTemplates } from '@/services/print/templateService';
import { listPrinters, getDefaultPrinter } from '@/services/print/printerService';
import { useAuthStore } from '@/store/authStore';
import { useCanPerform } from '@/services/print/permissions';
import type { DocType } from '@/types';
import type { DocTypeKey, PrintTemplate, Printer as PrinterType } from '@/types/invoicePrint';

// Lazy load لتقليل bundle المبدئي (هذه المكوّنات ثقيلة)
const PrintHistoryPanel = lazy(() => import('@/components/print/PrintHistoryPanel'));

type SortOption = 'newest' | 'oldest' | 'highest';

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'proforma', label: 'برو فورما' },
  { value: 'devis', label: 'ديفي' },
  { value: 'bl', label: 'بي ل' },
  { value: 'facture', label: 'فاتورة' },
];

const QUICK_PERIODS = [
  { label: 'اليوم', days: 0 },
  { label: '7 أيام', days: 7 },
  { label: '30 يوم', days: 30 },
  { label: 'السنة', days: 365 },
  { label: 'الكل', days: -1 },
] as const;

export default function InvoicesTab() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const canReprint = useCanPerform('reprint');
  const canDelete = useCanPerform('reprint'); // نفس صلاحية الإدارة

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.toArray(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  // POS-PRINT-001 / D4: جلب القوالب والطابعات للاختيار عند الطباعة
  const { data: templates = [] } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: getAllTemplates,
  });

  const { data: printers = [] } = useQuery({
    queryKey: ['printers'],
    queryFn: () => listPrinters(true),
  });

  const { data: defaultPrinter } = useQuery({
    queryKey: ['defaultPrinter'],
    queryFn: getDefaultPrinter,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewSale, setViewSale] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // D4: حالات اختيار القالب/الطابعة/المعاينة في نافذة العرض
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ITEMS_PER_PAGE = 10;

  const applyQuickPeriod = (days: number) => {
    if (days === -1) { setDateFrom(''); setDateTo(''); return; }
    const now = new Date();
    const from = new Date();
    if (days === 0) from.setHours(0, 0, 0, 0);
    else from.setDate(now.getDate() - days);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
  };

  const filteredSales = useMemo(() => {
    let filtered = sales;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => s.number.toLowerCase().includes(q) || s.items.some((i) => i.name.toLowerCase().includes(q)));
    }
    if (filterStatus) filtered = filtered.filter((s) => s.status === filterStatus);
    if (filterType) filtered = filtered.filter((s) => s.type === filterType);
    if (filterDocType) filtered = filtered.filter((s) => s.docType === filterDocType);
    if (filterCustomer) filtered = filtered.filter((s) => s.customerId === filterCustomer);
    if (dateFrom) filtered = filtered.filter((s) => s.date >= dateFrom);
    if (dateTo) filtered = filtered.filter((s) => s.date <= dateTo + 'T23:59:59');
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') return b.date.localeCompare(a.date);
      if (sortBy === 'oldest') return a.date.localeCompare(b.date);
      return b.total - a.total;
    });
    return filtered;
  }, [sales, searchQuery, filterStatus, filterType, filterDocType, filterCustomer, dateFrom, dateTo, sortBy]);

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSales.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSales, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStatus, filterType, filterDocType, filterCustomer, dateFrom, dateTo, sortBy]);

  const stats = useMemo(() => {
    const totalSales = filteredSales.filter(s => s.type === 'sale').reduce((sum, s) => sum + s.total, 0);
    const totalReturns = filteredSales.filter(s => s.type === 'return').reduce((sum, s) => sum + s.total, 0);
    const saleCount = filteredSales.filter(s => s.type === 'sale').length;
    const avgTicket = saleCount > 0 ? totalSales / saleCount : 0;
    return { totalSales, totalReturns, count: filteredSales.length, avgTicket };
  }, [filteredSales]);

  const deleteMutation = useMutation({
    mutationFn: async (saleId: string) => {
      await db.sales.delete(saleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  const selectedSale = sales.find((s) => s.id === viewSale);

  // D5: إضافة فرع return → 'return-invoice'
  const docTypeForSale = (sale: typeof sales[0]): DocTypeKey => {
    const docTypeMap: Record<string, DocTypeKey> = {
      facture: 'sale-invoice',
      proforma: 'proforma',
      devis: 'devis',
      bl: 'bl',
      return: 'return-invoice',
    };
    return docTypeMap[sale.docType] ?? docTypeMap[sale.type] ?? 'sale-invoice';
  };

  // BR-PRINT-003: إعادة الطباعة لا تنشئ فاتورة جديدة — تسجَّل في سجل الطباعة
  // D4: قبول templateId و printerId اختياريين
  const handlePrint = (sale: typeof sales[0], opts?: { templateId?: string; printerId?: string }) => {
    const docType = docTypeForSale(sale);

    const fallbackPrint = () => {
      const html = generateReceiptHTML(sale, { tvaRate: settings?.tvaRate ?? 19, baseCurrency: settings?.baseCurrency ?? 'دج', invoicePrefix: settings?.invoicePrefix ?? 'INV', shopName: settings?.shopName ?? '', phone: settings?.phone ?? '', receiptFooter: settings?.receiptFooter ?? '' });
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>إيصال - ${sale.number}</title><style>@media print { body { margin: 0; } }</style></head><body>${html}</body></html>`);
        printWindow.document.close();
        printWindow.print();
      }
    };

    printDocument(sale.id, docType, {
      userId: currentUser?.id ?? '',
      userName: currentUser?.name ?? '',
      copies: 1,
      isReprint: true,
      templateId: opts?.templateId || undefined,
      printerId: opts?.printerId || undefined,
    }).then((res) => {
      if (!res.success) fallbackPrint();
    }).catch(fallbackPrint);
  };

  // D4: توليد معاينة مصغّرة عند تغيير القالب/الفاتورة المختارة (debounce 200ms)
  useEffect(() => {
    if (!selectedSale) return;
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    setPreviewLoading(true);
    previewDebounceRef.current = setTimeout(async () => {
      try {
        const docType = docTypeForSale(selectedSale);
        const res = await previewDocument(selectedSale.id, docType, {
          userId: currentUser?.id ?? '',
          userName: currentUser?.name ?? '',
          templateId: selectedTemplateId || undefined,
        });
        if (res.success && res.html) {
          setPreviewHtml(res.html);
        } else {
          setPreviewHtml(
            `<!doctype html><html dir="rtl"><body style="font-family:Cairo,sans-serif;padding:2rem;text-align:center;"><p style="color:#ef4444;font-weight:bold;margin-bottom:4px;">تعذّر توليد المعاينة</p><p style="color:#64748b;font-size:12px;">${res.error || 'يرجى التحقق من بيانات الفاتورة أو القالب المحدد'}</p></body></html>`
          );
        }
      } catch (err) {
        console.error('Preview error:', err);
        setPreviewHtml(
          `<!doctype html><html dir="rtl"><body style="font-family:Cairo,sans-serif;padding:2rem;text-align:center;"><p style="color:#ef4444;font-weight:bold;margin-bottom:4px;">خطأ في المعاينة</p><p style="color:#64748b;font-size:12px;">${String(err)}</p></body></html>`
        );
      } finally {
        setPreviewLoading(false);
      }
    }, 200);
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSale?.id, selectedTemplateId]);

  // عند فتح نافذة العرض، إعادة ضبط الاختيارات + تعيين الطابعة الافتراضية
  useEffect(() => {
    if (viewSale) {
      setSelectedTemplateId('');
      setSelectedPrinterId(defaultPrinter?.id ?? 'browser');
      setPreviewHtml('');
      setShowHistory(false);
    }
  }, [viewSale, defaultPrinter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-body-sm text-label-sm">مدفوعة</span>;
      case 'partial': return <span className="bg-amber-100/20 text-amber-400 px-3 py-1 rounded-full text-body-sm text-label-sm">جزئية</span>;
      case 'unpaid': return <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-body-sm text-label-sm">غير مدفوعة</span>;
      default: return null;
    }
  };

  const baseCurrency = settings?.baseCurrency ?? 'دج';

  return (
    <div className="space-y-6">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
          <div className="flex mb-4"><div className="bg-primary/10 p-2 rounded-lg text-primary"><ShoppingCart className="w-5 h-5" /></div></div>
          <p className="text-on-surface-variant text-label-sm">عدد المبيعات</p>
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{filteredSales.filter(s => s.type === 'sale').length}</h3>
        </div>
        <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
          <div className="flex mb-4"><div className="bg-tertiary/10 p-2 rounded-lg text-tertiary"><DollarSign className="w-5 h-5" /></div></div>
          <p className="text-on-surface-variant text-label-sm">إجمالي المبيعات</p>
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.totalSales.toFixed(2)} {baseCurrency}</h3>
        </div>
        <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
          <div className="flex mb-4"><div className="bg-error/10 p-2 rounded-lg text-error"><Receipt className="w-5 h-5" /></div></div>
          <p className="text-on-surface-variant text-label-sm">المرتجعات</p>
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.totalReturns.toFixed(2)} {baseCurrency}</h3>
        </div>
        <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
          <div className="flex mb-4"><div className="bg-secondary/10 p-2 rounded-lg text-secondary"><TrendingUp className="w-5 h-5" /></div></div>
          <p className="text-on-surface-variant text-label-sm">متوسط الفاتورة</p>
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.avgTicket.toFixed(2)} {baseCurrency}</h3>
        </div>
      </div>

      {/* شريط الفلاتر */}
      <div className="glass-card rounded-xl border border-outline-variant/20 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الفاتورة أو المنتج..." className="w-full bg-surface-container border border-outline-variant/20 rounded-lg py-2.5 pr-10 pl-4 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-surface-container border border-outline-variant/20 rounded-lg px-4 py-2.5 text-body-md text-right focus:border-primary focus:ring-1 focus:ring-primary transition-all">
            <option value="">كل الحالات</option>
            <option value="paid">مدفوعة</option>
            <option value="partial">جزئية</option>
            <option value="unpaid">غير مدفوعة</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-surface-container border border-outline-variant/20 rounded-lg px-4 py-2.5 text-body-md text-right focus:border-primary focus:ring-1 focus:ring-primary transition-all">
            <option value="">كل الأنواع</option>
            <option value="sale">بيع</option>
            <option value="return">إرجاع</option>
          </select>
          <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)} className="bg-surface-container border border-outline-variant/20 rounded-lg px-4 py-2.5 text-body-md text-right focus:border-primary focus:ring-1 focus:ring-primary transition-all">
            <option value="">كل المستندات</option>
            {DOC_TYPES.map((dt) => (<option key={dt.value} value={dt.value}>{dt.label}</option>))}
          </select>
          <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="bg-surface-container border border-outline-variant/20 rounded-lg px-4 py-2.5 text-body-md text-right focus:border-primary focus:ring-1 focus:ring-primary transition-all">
            <option value="">كل الزبائن</option>
            {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="bg-surface-container border border-outline-variant/20 rounded-lg px-4 py-2.5 text-body-md text-right focus:border-primary focus:ring-1 focus:ring-primary transition-all">
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
            <option value="highest">أعلى مبلغ</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-2 flex-wrap">
            {QUICK_PERIODS.map((p) => (
              <button key={p.label} onClick={() => applyQuickPeriod(p.days)} className="px-4 py-1.5 rounded-full text-body-sm text-label-sm bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all">
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-1.5 border border-outline-variant/20 rounded-lg text-body-sm bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
            <span className="text-on-surface-variant">إلى</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-1.5 border border-outline-variant/20 rounded-lg text-body-sm bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>
        </div>
      </div>

      {/* جدول الفواتير */}
      <div className="glass-card rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-surface-container text-on-surface-variant text-label-sm border-b border-outline-variant/20">
              <tr>
                <th className="px-5 py-4 text-label-sm">رقم الفاتورة</th>
                <th className="px-5 py-4 text-label-sm">التاريخ</th>
                <th className="px-5 py-4 text-label-sm">الزبون</th>
                <th className="px-5 py-4 text-label-sm text-center">الإجمالي</th>
                <th className="px-5 py-4 text-label-sm text-center">المستند</th>
                <th className="px-5 py-4 text-label-sm text-center">النوع</th>
                <th className="px-5 py-4 text-label-sm text-center">الحالة</th>
                <th className="px-5 py-4 text-label-sm text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/15">
              {paginatedSales.map((sale) => {
                const customer = customers.find((c) => c.id === sale.customerId);
                return (
                  <tr key={sale.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${sale.type === 'sale' ? 'bg-primary-fixed text-primary' : 'bg-error-container/30 text-error'}`}>
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-label-md text-on-surface">{sale.number}</p>
                          <p className="text-body-sm text-on-surface-variant">{formatDate(sale.date)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-body-md text-on-surface-variant">{formatDate(sale.date)}</td>
                    <td className="px-5 py-4 text-body-md text-on-surface">{customer?.name || 'عميل نقدي'}</td>
                    <td className="px-5 py-4 text-center font-cairo text-headline-sm font-bold text-on-surface">{sale.total.toFixed(2)} {baseCurrency}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="bg-surface-container text-on-surface-variant px-3 py-1 rounded-full text-body-sm text-label-sm">
                        {DOC_TYPES.find((d) => d.value === sale.docType)?.label || sale.docType}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-label-md ${sale.type === 'sale' ? 'text-primary' : 'text-error'}`}>
                        {sale.type === 'sale' ? 'بيع' : 'إرجاع'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(sale.status)}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setViewSale(sale.id)} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" title="عرض"><Eye className="w-4 h-4" /></button>
                        {canReprint && (
                          <button onClick={() => handlePrint(sale)} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" title="طباعة"><PrinterIcon className="w-4 h-4" /></button>
                        )}
                        {canDelete && (
                          <button onClick={() => deleteMutation.mutate(sale.id)} className="p-2 rounded-lg text-error hover:bg-error-container/20 transition-all" title="حذف"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center text-outline-variant mb-4">
              <Receipt className="w-12 h-12" />
            </div>
            <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-2">لا توجد مبيعات</h3>
            <p className="text-body-md text-on-surface-variant text-center max-w-xs">لم يتم تسجيل أي مبيعات بعد في هذه الفترة</p>
          </div>
        )}

        <div className="px-6 py-4 bg-surface-container flex justify-between items-center border-t border-outline-variant/20">
          <p className="text-body-sm text-on-surface-variant">عرض {paginatedSales.length > 0 ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredSales.length)}` : '0'} من أصل {filteredSales.length} فاتورة</p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) p = i + 1;
                else if (currentPage <= 4) p = i + 1;
                else if (currentPage >= totalPages - 3) p = totalPages - 6 + i;
                else p = currentPage - 3 + i;
                return (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`w-9 h-9 rounded-lg text-label-md transition-all ${currentPage === p ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======= نافذة عرض الفاتورة (D4: اختيار القالب + الطابعة + المعاينة) ======= */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-xl border border-outline-variant/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl bg-surface-container-lowest">
            <div className="flex items-center justify-between p-6 sticky top-0 bg-surface-container-lowest border-b border-outline-variant/20 z-10">
              <div>
                <h3 className="font-cairo text-headline-sm font-bold text-on-surface">الفاتورة {selectedSale.number}</h3>
                <p className="text-body-sm text-on-surface-variant">{formatDate(selectedSale.date)}</p>
              </div>
              <button onClick={() => setViewSale(null)} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container transition-all"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* تفاصيل أساسية */}
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-outline-variant/20">
                  <span className="text-on-surface-variant">المستند</span>
                  <span className="text-label-md text-on-surface">{DOC_TYPES.find(d => d.value === selectedSale.docType)?.label || selectedSale.docType}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-outline-variant/20">
                  <span className="text-on-surface-variant">النوع</span>
                  <span className={`text-label-md ${selectedSale.type === 'sale' ? 'text-primary' : 'text-error'}`}>{selectedSale.type === 'sale' ? 'بيع' : 'إرجاع'}</span>
                </div>
              </div>

              {/* المنتجات */}
              <div className="bg-surface-container rounded-xl p-4">
                <p className="text-label-md text-on-surface mb-3">المنتجات</p>
                {selectedSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 text-body-md">
                    <span className="text-on-surface">{item.name} <span className="text-on-surface-variant">×{item.qty}</span></span>
                    <span className="text-label-md text-on-surface">{item.lineTotal.toFixed(2)} {baseCurrency}</span>
                  </div>
                ))}
              </div>

              {/* المجاميع */}
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-on-surface-variant">المجموع الفرعي</span><span className="text-on-surface">{selectedSale.subtotal.toFixed(2)} {baseCurrency}</span></div>
                {selectedSale.discount > 0 && <div className="flex justify-between text-tertiary"><span>الخصم</span><span>-{selectedSale.discount.toFixed(2)} {baseCurrency}</span></div>}
                <div className="flex justify-between"><span className="text-on-surface-variant">TVA</span><span className="text-on-surface">{selectedSale.tvaAmount.toFixed(2)} {baseCurrency}</span></div>
                <div className="flex justify-between font-cairo text-headline-sm font-bold pt-3 border-t border-outline-variant/20"><span>الإجمالي</span><span className="text-primary">{selectedSale.total.toFixed(2)} {baseCurrency}</span></div>
              </div>

              {/* ===== D4: اختيار القالب + الطابعة ===== */}
              <div className="border-t border-outline-variant/20 pt-4 space-y-3">
                <h4 className="font-label-lg text-on-surface flex items-center gap-2">
                  <PrinterIcon className="w-4 h-4" />
                  خيارات الطباعة
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label-sm text-on-surface-variant mb-1">قالب الطباعة</label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg bg-surface-container text-body-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="">تلقائي (حسب نوع المستند)</option>
                      {templates.map((t: PrintTemplate) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.paperSize})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface-variant mb-1">الطابعة</label>
                    <select
                      value={selectedPrinterId}
                      onChange={(e) => setSelectedPrinterId(e.target.value)}
                      className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg bg-surface-container text-body-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="browser">المتصفح (افتراضي)</option>
                      {printers.map((p: PrinterType) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.connection})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ===== D4: المعاينة المصغّرة ===== */}
              <div className="border-t border-outline-variant/20 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-label-lg text-on-surface">معاينة مصغّرة</h4>
                  {previewLoading && (
                    <span className="text-body-sm text-on-surface-variant flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      تحديث...
                    </span>
                  )}
                </div>
                <div className="bg-white rounded-lg border border-outline-variant/20 overflow-hidden h-72 relative">
                  {previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      title="معاينة"
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-on-surface-variant text-body-sm">
                      جاري تحضير المعاينة...
                    </div>
                  )}
                </div>
              </div>

              {/* ===== D4: سجل طباعة هذه الفاتورة (قابل للطي) ===== */}
              <div className="border-t border-outline-variant/20 pt-4">
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="text-body-sm text-primary hover:bg-primary/10 rounded-lg px-3 py-2 flex items-center gap-1 transition-all"
                >
                  <Receipt className="w-4 h-4" />
                  {showHistory ? 'إخفاء سجل الطباعة' : 'عرض سجل الطباعة لهذه الفاتورة'}
                </button>
                {showHistory && (
                  <div className="mt-2">
                    <Suspense fallback={<div className="text-body-sm text-on-surface-variant py-4">جاري التحميل...</div>}>
                      <PrintHistoryPanel saleId={selectedSale.id} />
                    </Suspense>
                  </div>
                )}
              </div>

              {/* زر الطباعة */}
              <button
                onClick={() => handlePrint(selectedSale, {
                  templateId: selectedTemplateId || undefined,
                  printerId: selectedPrinterId === 'browser' ? undefined : selectedPrinterId,
                })}
                disabled={!canReprint}
                className="w-full py-3.5 bg-primary text-on-primary rounded-lg font-label-lg shadow-sm hover:bg-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PrinterIcon className="w-5 h-5" /> طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
