// InvoicesTab — POS-PRINT-001 / D phase
// تبويب إدارة الفواتير والمبيعات مع المعاينة الحية وسجل الطباعة والخيارات المتقدمة
import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { formatDate } from '@/utils';
import {
  Search, Eye, Trash2, Receipt, Printer as PrinterIcon, X,
  ShoppingCart, DollarSign, TrendingUp, ChevronLeft, ChevronRight,
  Download, Calendar, User, FileText, CheckCircle2, RotateCcw,
  Sparkles, RefreshCw, AlertCircle, ArrowUpDown, Filter, History,
  CheckSquare, Layers
} from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { generateReceiptHTML } from '@/services';
import { printDocument, previewDocument } from '@/services/print/printService';
import { getAllTemplates } from '@/services/print/templateService';
import { listPrinters, getDefaultPrinter } from '@/services/print/printerService';
import { useAuthStore } from '@/store/authStore';
import { useCanPerform } from '@/services/print/permissions';
import { settleSpecificInvoiceDebtRecord, toggleInvoicePaymentStatus } from '@/features/pos/debt';
import type { DocType } from '@/types';
import type { DocTypeKey, PrintTemplate, Printer as PrinterType } from '@/types/invoicePrint';
import * as XLSX from 'xlsx';

const PrintHistoryPanel = lazy(() => import('@/components/print/PrintHistoryPanel'));

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'proforma', label: 'برو فورما' },
  { value: 'devis', label: 'ديفي' },
  { value: 'bl', label: 'بي ل (BL)' },
  { value: 'facture', label: 'فاتورة رسمية' },
  { value: 'wholesale', label: 'فاتورة بيع بالجملة (Gros)' },
];

const QUICK_PERIODS = [
  { label: 'اليوم', days: 0 },
  { label: '7 أيام', days: 7 },
  { label: '30 يوم', days: 30 },
  { label: 'السنة', days: 365 },
  { label: 'كل الفترات', days: -1 },
] as const;

/**
 * دالة مساعدة لفك عناصر الفاتورة بأمان سواء كانت مصفوفة أو نص JSON أو كائناً
 */
function parseSaleItems(items: unknown): any[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function InvoicesTab() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const canReprint = useCanPerform('reprint');
  const canDelete = useCanPerform('reprint');

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.toArray(),
    refetchOnWindowFocus: true,
  });

  // تحديث فوري مبني على الأحداث بدلاً من الـ Polling المستمر
  useEffect(() => {
    const electron = (window as any).electronAPI;
    if (electron?.db?.onTableUpdated) {
      return electron.db.onTableUpdated((data: { table: string }) => {
        if (data.table === 'sales' || data.table === 'sale_items') {
          queryClient.invalidateQueries({ queryKey: ['sales'] });
        }
      });
    }
  }, [queryClient]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

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

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'return'>('all');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewSale, setViewSale] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal Print State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Multi-selection state for sales
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const salesCheckboxRef = useRef<HTMLInputElement>(null);

  // Debt settlement & status toggling state
  const [saleToSettle, setSaleToSettle] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'card' | 'transfer' | 'baridimob'>('cash');
  const [settleNote, setSettleNote] = useState<string>('');
  const [settleCustomerId, setSettleCustomerId] = useState<string>('');
  const [targetStatusAction, setTargetStatusAction] = useState<'settle' | 'convert_to_credit'>('settle');
  const [isSettling, setIsSettling] = useState(false);

  const toggleSelectSale = (id: string) => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSaleSelection = () => {
    setSelectedSaleIds(new Set());
  };

  const applyQuickPeriod = (days: number) => {
    if (days === -1) {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const now = new Date();
    const from = new Date();
    if (days === 0) {
      from.setHours(0, 0, 0, 0);
    } else {
      from.setDate(now.getDate() - days);
    }
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
  };

  const filteredSales = useMemo(() => {
    let filtered = [...sales];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((s) => {
        const parsedItems = parseSaleItems(s.items);
        return (
          (s.number && s.number.toLowerCase().includes(q)) ||
          parsedItems.some((i: any) => (i.name && String(i.name).toLowerCase().includes(q)))
        );
      });
    }
    if (filterStatus) filtered = filtered.filter((s) => s.status === filterStatus);
    if (filterType !== 'all') filtered = filtered.filter((s) => s.type === filterType);
    if (filterDocType) filtered = filtered.filter((s) => s.docType === filterDocType);
    if (filterCustomer) filtered = filtered.filter((s) => s.customerId === filterCustomer);
    if (dateFrom) filtered = filtered.filter((s) => s.date >= dateFrom);
    if (dateTo) filtered = filtered.filter((s) => s.date <= dateTo + 'T23:59:59');

    filtered.sort((a, b) => {
      if (sortBy === 'newest') return (b.date || '').localeCompare(a.date || '');
      if (sortBy === 'oldest') return (a.date || '').localeCompare(b.date || '');
      if (sortBy === 'highest') return (b.total || 0) - (a.total || 0);
      if (sortBy === 'lowest') return (a.total || 0) - (b.total || 0);
      return 0;
    });
    return filtered;
  }, [sales, searchQuery, filterStatus, filterType, filterDocType, filterCustomer, dateFrom, dateTo, sortBy]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterType, filterDocType, filterCustomer, dateFrom, dateTo, sortBy, itemsPerPage]);

  const isAllPageSalesSelected = useMemo(() => {
    if (paginatedSales.length === 0) return false;
    return paginatedSales.every((s) => selectedSaleIds.has(s.id));
  }, [paginatedSales, selectedSaleIds]);

  const isPageSalesIndeterminate = useMemo(() => {
    const count = paginatedSales.filter((s) => selectedSaleIds.has(s.id)).length;
    return count > 0 && count < paginatedSales.length;
  }, [paginatedSales, selectedSaleIds]);

  useEffect(() => {
    if (salesCheckboxRef.current) {
      salesCheckboxRef.current.indeterminate = isPageSalesIndeterminate;
    }
  }, [isPageSalesIndeterminate]);

  const toggleSelectAllOnPage = () => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSalesSelected) {
        paginatedSales.forEach((s) => next.delete(s.id));
      } else {
        paginatedSales.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const selectAllFilteredSales = () => {
    setSelectedSaleIds(new Set(filteredSales.map((s) => s.id)));
  };

  const selectedSalesList = useMemo(() => {
    return sales.filter((s) => selectedSaleIds.has(s.id));
  }, [sales, selectedSaleIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedSalesList.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [selectedSalesList]);

  const stats = useMemo(() => {
    const totalSales = filteredSales.filter(s => s.type === 'sale').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const totalReturns = filteredSales.filter(s => s.type === 'return').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const saleCount = filteredSales.filter(s => s.type === 'sale').length;
    const returnCount = filteredSales.filter(s => s.type === 'return').length;
    const avgTicket = saleCount > 0 ? totalSales / saleCount : 0;
    return { totalSales, totalReturns, saleCount, returnCount, totalCount: filteredSales.length, avgTicket };
  }, [filteredSales]);

  const deleteMutation = useMutation({
    mutationFn: async (saleId: string) => {
      await db.sales.delete(saleId);
      const electron = (window as any).electronAPI;
      if (electron?.db?.delete) {
        await electron.db.delete('sales', saleId).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      useNotificationStore.getState().addNotification({
        title: 'تم حذف الفاتورة',
        message: 'تم حذف الفاتورة من السجل بنجاح.',
        type: 'info',
        category: 'sales',
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (saleIds: string[]) => {
      await db.sales.bulkDelete(saleIds);
      const electron = (window as any).electronAPI;
      if (electron?.db?.delete) {
        for (const id of saleIds) {
          await electron.db.delete('sales', id).catch(() => {});
        }
      }
      return saleIds;
    },
    onMutate: async (saleIds) => {
      await queryClient.cancelQueries({ queryKey: ['sales'] });
      const previousSales = queryClient.getQueryData<typeof sales>(['sales']) || [];
      const idSet = new Set(saleIds);
      queryClient.setQueryData<typeof sales>(['sales'], (old = []) =>
        old.filter((s) => !idSet.has(s.id))
      );
      return { previousSales };
    },
    onSuccess: (saleIds) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      useNotificationStore.getState().addNotification({
        title: 'تم حذف الفواتير بنجاح',
        message: `تم حذف ${saleIds.length} فاتورة بنجاح.`,
        type: 'info',
        category: 'sales',
      });
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousSales) {
        queryClient.setQueryData(['sales'], context.previousSales);
      }
      useNotificationStore.getState().addNotification({
        title: 'فشل حذف الفواتير',
        message: err?.message || 'حدث خطأ أثناء حذف الفواتير المحددة.',
        type: 'error',
        category: 'sales',
      });
    },
  });

  const handleConfirmBulkDeleteSales = () => {
    const ids = Array.from(selectedSaleIds);
    if (ids.length === 0) return;
    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        clearSaleSelection();
        setShowBulkDeleteModal(false);
      },
    });
  };

  const selectedSale = sales.find((s) => s.id === viewSale);
  const selectedSaleItems = useMemo(() => parseSaleItems(selectedSale?.items), [selectedSale?.items]);

  const docTypeForSale = (sale: typeof sales[0]): DocTypeKey => {
    const docTypeMap: Record<string, DocTypeKey> = {
      facture: 'sale-invoice',
      proforma: 'proforma',
      devis: 'devis',
      bl: 'bl',
      wholesale: 'wholesale-invoice',
      return: 'return-invoice',
    };
    return docTypeMap[sale.docType] ?? docTypeMap[sale.type] ?? 'sale-invoice';
  };

  const handlePrint = async (
    sale: typeof sales[0],
    opts?: { templateId?: string; printerId?: string; docTypeOverride?: DocTypeKey }
  ) => {
    setIsPrinting(true);
    const docType = opts?.docTypeOverride || docTypeForSale(sale);

    const fallbackPrint = () => {
      const html = generateReceiptHTML(sale, {
        tvaRate: Number(settings?.tvaRate ?? (settings as any)?.tva_rate ?? 0),
        baseCurrency: settings?.baseCurrency ?? 'دج',
        invoicePrefix: settings?.invoicePrefix ?? 'INV',
        shopName: settings?.shopName ?? '',
        phone: settings?.phone ?? '',
        receiptFooter: settings?.receiptFooter ?? '',
      });
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>إيصال - ${sale.number}</title><style>@media print { body { margin: 0; } }</style></head><body>${html}</body></html>`);
        printWindow.document.close();
        printWindow.print();
      }
    };

    try {
      const res = await printDocument(sale.id, docType, {
        userId: currentUser?.id ?? '',
        userName: currentUser?.name ?? '',
        copies: 1,
        isReprint: true,
        templateId: opts?.templateId || undefined,
        printerId: opts?.printerId || undefined,
      });
      if (!res.success) fallbackPrint();
    } catch {
      fallbackPrint();
    } finally {
      setIsPrinting(false);
    }
  };

  // Preview generation
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
    }, 150);
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [selectedSale, selectedTemplateId, currentUser?.id, currentUser?.name]);

  useEffect(() => {
    if (viewSale) {
      setSelectedTemplateId('');
      setSelectedPrinterId(defaultPrinter?.id ?? 'browser');
      setPreviewHtml('');
      setShowHistory(false);
    }
  }, [viewSale, defaultPrinter]);

  const getStatusBadge = (status: string, sale?: any) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>مدفوعة</span>
          </span>
        );
      case 'partial': {
        const paid = Number(sale?.paidAmount ?? sale?.amountPaid ?? 0);
        const total = Number(sale?.total || 0);
        const rem = Math.max(0, total - paid);
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400"
            title={`مسدد: ${paid.toLocaleString()} | دين متبقي: ${rem.toLocaleString()}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>جزئية {rem > 0 ? `(دين: ${rem.toLocaleString()} ${baseCurrency})` : ''}</span>
          </span>
        );
      }
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3 h-3" />
            <span>غير مدفوعة (دين)</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant">
            {status || 'غير محدد'}
          </span>
        );
    }
  };

  const handleConfirmSettleOrToggle = async () => {
    if (!saleToSettle) return;
    setIsSettling(true);
    try {
      if (targetStatusAction === 'settle') {
        const effectiveCustomerId = saleToSettle.customerId || settleCustomerId;
        if (!effectiveCustomerId) {
          addNotification({
            title: 'تنبيه',
            message: 'يرجى اختيار العميل لربط السداد بحسابه المالي',
            type: 'warning',
          });
          setIsSettling(false);
          return;
        }

        const effectiveCustomer = customers.find((c) => c.id === effectiveCustomerId);
        const res = await settleSpecificInvoiceDebtRecord({
          saleId: saleToSettle.id,
          customerId: effectiveCustomerId,
          customerName: saleToSettle.customerName || effectiveCustomer?.name || 'زبون',
          amount: settleAmount,
          paymentMethod: settleMethod,
          note: settleNote || `تسديد فاتورة #${saleToSettle.number}`,
          currentUserName: currentUser?.name || 'الكاشير',
        });

        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['cash_sessions'] });
        queryClient.invalidateQueries({ queryKey: ['payments'] });

        addNotification({
          title: 'تم تسجيل السداد بنجاح',
          message: `تم سداد مبلغ ${settleAmount.toLocaleString()} ${baseCurrency} من الفاتورة #${saleToSettle.number}. الرصيد المتبقي على العميل: ${res.newBalance.toLocaleString()} ${baseCurrency}`,
          type: 'success',
          category: 'debt',
        });
      } else {
        // تحويل الفاتورة إلى دين غير مسدد
        const effectiveCustomerId = saleToSettle.customerId || settleCustomerId;
        if (!effectiveCustomerId) {
          addNotification({
            title: 'تنبيه',
            message: 'لا يمكن تحويل الفاتورة إلى دين دون تحديد زبون مسجل.',
            type: 'warning',
            category: 'debt',
          });
          setIsSettling(false);
          return;
        }

        const res = await toggleInvoicePaymentStatus({
          saleId: saleToSettle.id,
          targetStatus: 'unpaid',
          currentUserName: currentUser?.name || 'الكاشير',
          note: settleNote || `تحويل الفاتورة #${saleToSettle.number} إلى دين`,
        });

        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['cash_sessions'] });

        addNotification({
          title: 'تم تحويل الفاتورة إلى دين',
          message: `تم قيد مبلغ ${res.amountChanged.toLocaleString()} ${baseCurrency} كدين مستحق على العميل.`,
          type: 'success',
          category: 'debt',
        });
      }
      setSaleToSettle(null);
    } catch (err: any) {
      addNotification({
        title: 'خطأ أثناء المعالجة',
        message: err.message || 'فشلت عملية تحديث حالة الفاتورة',
        type: 'error',
      });
    } finally {
      setIsSettling(false);
    }
  };

  const handleExport = () => {
    const exportData = filteredSales.map((s) => {
      const customer = customers.find((c) => c.id === s.customerId);
      const itemsList = parseSaleItems(s.items);
      return {
        'رقم الفاتورة': s.number,
        'التاريخ': s.date ? s.date.replace('T', ' ').slice(0, 19) : '',
        'الزبون': customer?.name || 'عميل نقدي',
        'النوع': s.type === 'sale' ? 'بيع' : 'إرجاع',
        'المستند': DOC_TYPES.find((d) => d.value === s.docType)?.label || s.docType || '',
        'المجموع الفرعي': s.subtotal || 0,
        'الخصم': s.discount || 0,
        'الضريبة TVA': s.tvaAmount || 0,
        'الإجمالي': s.total || 0,
        'الحالة': s.status === 'paid' ? 'مدفوعة' : s.status === 'partial' ? 'جزئية' : 'غير مدفوعة',
        'عدد الأصناف': itemsList.length,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الفواتير');
    XLSX.writeFile(wb, `AN_POS_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const baseCurrency = settings?.baseCurrency ?? 'دج';

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Hero Financial Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div
          onClick={() => setFilterType('sale')}
          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            filterType === 'sale'
              ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/40'
              : 'bg-surface-container border-outline-variant/20 hover:border-emerald-500/30 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
              {stats.saleCount} عملية بيع
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant">إجمالي المبيعات المحققة</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="font-cairo text-2xl font-bold text-on-surface truncate">
              {stats.totalSales.toLocaleString('ar-DZ')} <span className="text-xs font-normal">{baseCurrency}</span>
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-outline-variant/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            اضغط لتصفية عمليات البيع
          </div>
        </div>

        {/* Card 2: Returns */}
        <div
          onClick={() => setFilterType('return')}
          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            filterType === 'return'
              ? 'bg-rose-500/10 border-rose-500/50 shadow-sm ring-1 ring-rose-500/40'
              : 'bg-surface-container border-outline-variant/20 hover:border-rose-500/30 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 font-semibold">
              {stats.returnCount} مرتجع
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant">إجمالي المرتجعات</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="font-cairo text-2xl font-bold text-rose-500 truncate">
              {stats.totalReturns.toLocaleString('ar-DZ')} <span className="text-xs font-normal">{baseCurrency}</span>
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-outline-variant/10 text-xs text-rose-600 dark:text-rose-400 font-medium">
            اضغط لتصفية المرتجعات
          </div>
        </div>

        {/* Card 3: Invoices Count */}
        <div
          onClick={() => setFilterType('all')}
          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            filterType === 'all'
              ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/30'
              : 'bg-surface-container border-outline-variant/20 hover:border-outline-variant/40 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold">
              كل الحركات
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant">إجمالي الفواتير المسجلة</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="font-cairo text-2xl font-bold text-on-surface">{stats.totalCount}</h3>
            <span className="text-xs text-on-surface-variant">فاتورة ووصل</span>
          </div>
          <div className="mt-3 pt-3 border-t border-outline-variant/10 text-xs text-primary font-medium">
            عرض كافة الفواتير
          </div>
        </div>

        {/* Card 4: Average Ticket */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/20 hover:border-outline-variant/40 transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
              سلة الشراء
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant">متوسط قيمة الفاتورة</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="font-cairo text-xl font-bold text-on-surface truncate">
              {stats.avgTicket.toFixed(2)} <span className="text-xs font-normal">{baseCurrency}</span>
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-outline-variant/10 flex justify-between items-center text-xs text-on-surface-variant">
            <span>معدل الصرف للعملية</span>
            <span className="text-emerald-500 font-semibold">معدل نشط</span>
          </div>
        </div>
      </div>

      {/* Control & Filter Hub */}
      <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 space-y-3.5 shadow-sm">
        {/* Search, Customer, Sort & Export Row */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="flex-1 w-full relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الفاتورة، اسم الزبون، أو اسم الصنف..."
              className="w-full bg-surface-container-high/60 border border-outline-variant/30 rounded-xl py-2.5 pr-10 pl-9 text-body-sm focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-highest transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Customer Filter */}
          <div className="w-full md:w-48">
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full bg-surface-container-high/60 border border-outline-variant/30 rounded-xl py-2.5 px-3 text-body-sm appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium text-on-surface"
            >
              <option value="">جميع الزبائن</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="w-full md:w-44">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full bg-surface-container-high/60 border border-outline-variant/30 rounded-xl py-2.5 px-3 text-body-sm appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium text-on-surface"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
              <option value="highest">الأعلى قيمة</option>
              <option value="lowest">الأقل قيمة</option>
            </select>
          </div>

          {/* Export to Excel */}
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-surface-container-high/80 hover:bg-surface-container-highest border border-outline-variant/30 px-4 py-2.5 rounded-xl text-on-surface text-body-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer w-full md:w-auto"
            title="تصدير القائمة إلى ملف Excel"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>تصدير Excel</span>
          </button>
        </div>

        {/* Quick Date Periods & Custom Dates */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-outline-variant/10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-on-surface-variant ml-2">الفترة:</span>
            {QUICK_PERIODS.map((p) => {
              const isSelected = p.days === -1 ? (!dateFrom && !dateTo) : false;
              return (
                <button
                  key={p.label}
                  onClick={() => applyQuickPeriod(p.days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-sm font-bold'
                      : 'bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-surface-container-high/60 px-3 py-1.5 rounded-xl border border-outline-variant/20">
              <span className="text-on-surface-variant">من:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent border-0 text-on-surface text-xs focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 bg-surface-container-high/60 px-3 py-1.5 rounded-xl border border-outline-variant/20">
              <span className="text-on-surface-variant">إلى:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent border-0 text-on-surface text-xs focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Status & Document Type Filters */}
        <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-outline-variant/10 text-xs">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-on-surface-variant ml-1">حالة الدفع:</span>
            {[
              { val: '', label: 'الكل' },
              { val: 'paid', label: 'مدفوعة' },
              { val: 'partial', label: 'جزئية' },
              { val: 'unpaid', label: 'غير مدفوعة' },
            ].map((st) => (
              <button
                key={st.val}
                onClick={() => setFilterStatus(st.val)}
                className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                  filterStatus === st.val
                    ? 'bg-on-surface text-surface font-bold'
                    : 'bg-surface-container-high/50 text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Doc Type Pills */}
          <div className="flex items-center gap-1.5 flex-wrap border-r border-outline-variant/20 pr-4 mr-2">
            <span className="font-semibold text-on-surface-variant ml-1">نوع المستند:</span>
            <button
              onClick={() => setFilterDocType('')}
              className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                filterDocType === ''
                  ? 'bg-on-surface text-surface font-bold'
                  : 'bg-surface-container-high/50 text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              الكل
            </button>
            {DOC_TYPES.map((dt) => (
              <button
                key={dt.value}
                onClick={() => setFilterDocType(dt.value)}
                className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                  filterDocType === dt.value
                    ? 'bg-on-surface text-surface font-bold'
                    : 'bg-surface-container-high/50 text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-high/50 text-on-surface-variant text-xs font-semibold border-b border-outline-variant/20">
                <th className="px-3 py-3.5 text-center w-12">
                  <input
                    ref={salesCheckboxRef}
                    type="checkbox"
                    checked={isAllPageSalesSelected}
                    onChange={toggleSelectAllOnPage}
                    title={isAllPageSalesSelected ? "إلغاء تحديد الكل" : "تحديد كل فواتير هذه الصفحة"}
                    className="w-4 h-4 rounded-md border-outline-variant/40 text-primary focus:ring-primary cursor-pointer accent-primary transition-all"
                    aria-label="تحديد كل الفواتير المعروضة"
                  />
                </th>
                <th className="px-5 py-3.5">رقم الفاتورة</th>
                <th className="px-4 py-3.5">التاريخ والوقت</th>
                <th className="px-4 py-3.5">الزبون</th>
                <th className="px-4 py-3.5 text-center">المستند</th>
                <th className="px-4 py-3.5 text-center">النوع</th>
                <th className="px-4 py-3.5 text-center">حالة الدفع</th>
                <th className="px-4 py-3.5 text-center">الإجمالي</th>
                <th className="px-5 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-body-sm">
              {paginatedSales.map((sale) => {
                const customer = customers.find((c) => c.id === sale.customerId);
                const itemsList = parseSaleItems(sale.items);
                const isSelected = selectedSaleIds.has(sale.id);

                return (
                  <tr
                    key={sale.id}
                    className={`transition-colors group cursor-pointer ${
                      isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-surface-container-high/40'
                    }`}
                    onClick={() => setViewSale(sale.id)}
                  >
                    {/* Checkbox Column */}
                    <td className="px-3 py-3.5 text-center w-12" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectSale(sale.id);
                        }}
                        className="w-4 h-4 rounded-md border-outline-variant/40 text-primary focus:ring-primary cursor-pointer accent-primary transition-all"
                        aria-label={`تحديد الفاتورة ${sale.number}`}
                      />
                    </td>
                    {/* Invoice ID & Icon */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          sale.type === 'sale' ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {sale.type === 'sale' ? <Receipt className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface font-mono group-hover:text-primary transition-colors">
                            {sale.number}
                          </p>
                          <p className="text-[11px] text-on-surface-variant">
                            {itemsList.length} أصناف
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-on-surface-variant/60" />
                        <span>{formatDate(sale.date)}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface">
                        <User className="w-3.5 h-3.5 text-primary/70" />
                        <span>{customer?.name || 'عميل نقدي'}</span>
                      </div>
                    </td>

                    {/* Document Type */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-surface-container-high text-xs font-medium text-on-surface-variant">
                        {DOC_TYPES.find((d) => d.value === sale.docType)?.label || sale.docType || 'فاتورة'}
                      </span>
                    </td>

                    {/* Transaction Type */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-bold ${
                        sale.type === 'sale' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}>
                        {sale.type === 'sale' ? 'بيع' : 'إرجاع'}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sale.type !== 'return') {
                            setSaleToSettle(sale);
                            const unpaid = Math.max(0, (sale.total || 0) - (sale.paidAmount || 0));
                            setSettleAmount(unpaid > 0 ? unpaid : sale.total);
                            setSettleCustomerId(sale.customerId || '');
                            setTargetStatusAction(sale.status === 'paid' ? 'convert_to_credit' : 'settle');
                          }
                        }}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        title="انقر لتسديد الفاتورة أو تغيير حالة الدفع"
                      >
                        {getStatusBadge(sale.status, sale)}
                      </button>
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-3.5 text-center font-cairo font-bold text-base text-on-surface">
                      {Number(sale.total || 0).toFixed(2)} <span className="text-xs font-normal text-on-surface-variant">{baseCurrency}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {sale.type === 'sale' && sale.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSaleToSettle(sale);
                              const unpaid = Math.max(0, (sale.total || 0) - (sale.paidAmount || 0));
                              setSettleAmount(unpaid > 0 ? unpaid : sale.total);
                              setSettleCustomerId(sale.customerId || '');
                              setTargetStatusAction('settle');
                            }}
                            className="p-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="تسديد الفاتورة"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">تسديد</span>
                          </button>
                        )}
                        <button
                          onClick={() => setViewSale(sale.id)}
                          className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all"
                          title="عرض ومعاينة الفاتورة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canReprint && (
                          <>
                            <button
                              onClick={() => handlePrint(sale)}
                              className="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
                              title="طباعة سريعة"
                            >
                              <PrinterIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrint(sale, { docTypeOverride: 'wholesale-invoice' })}
                              className="p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-all"
                              title="طباعة فاتورة جملة (A4 Gros)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف الفاتورة رقم "${sale.number}"؟`)) {
                                deleteMutation.mutate(sale.id);
                              }
                            }}
                            className="p-2 rounded-xl text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                            title="حذف الفاتورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredSales.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 p-8 text-center">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-4 shadow-inner">
              <Receipt className="w-10 h-10" />
            </div>
            <h3 className="font-cairo text-xl font-bold text-on-surface mb-2">لا توجد فواتير مطابقة</h3>
            <p className="text-body-sm text-on-surface-variant mb-6 max-w-sm">
              لم يتم العثور على أية فواتير أو إيصالات في نطاق البحث أو التصفية الحالية.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('');
                setFilterType('all');
                setFilterDocType('');
                setFilterCustomer('');
                setDateFrom('');
                setDateTo('');
              }}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-on-surface text-body-sm font-medium transition-all"
            >
              إعادة ضبط التصفية
            </button>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-surface-container-high/30 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <p className="text-xs text-on-surface-variant">
              عرض {paginatedSales.length > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredSales.length)}` : '0'} من أصل {filteredSales.length} فاتورة
            </p>
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant border-r border-outline-variant/20 pr-3 mr-1">
              <span>عرض في الصفحة:</span>
              {[10, 25, 50].map((size) => (
                <button
                  key={size}
                  onClick={() => setItemsPerPage(size)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                    itemsPerPage === size ? 'bg-primary text-on-primary' : 'bg-surface-container-high hover:bg-surface-container-highest'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) p = i + 1;
                else if (currentPage <= 4) p = i + 1;
                else if (currentPage >= totalPages - 3) p = totalPages - 6 + i;
                else p = currentPage - 3 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === p
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======= نافذة عرض الفاتورة والمعاينة الحية والتخصيص ======= */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-surface-container rounded-3xl border border-outline-variant/30 w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-high/40">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-cairo text-lg font-bold text-on-surface">
                      الفاتورة {selectedSale.number}
                    </h3>
                    {getStatusBadge(selectedSale.status, selectedSale)}
                    {selectedSale.type !== 'return' && selectedSale.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSaleToSettle(selectedSale);
                          const unpaid = Math.max(0, (selectedSale.total || 0) - (selectedSale.paidAmount || 0));
                          setSettleAmount(unpaid > 0 ? unpaid : selectedSale.total);
                          setSettleCustomerId(selectedSale.customerId || '');
                          setTargetStatusAction('settle');
                        }}
                        className="mr-2 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="تسديد الفاتورة"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>تسديد الفاتورة</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    تاريخ الإنشاء: {formatDate(selectedSale.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewSale(null)}
                className="text-on-surface-variant hover:text-on-surface p-2 rounded-xl hover:bg-surface-container-highest transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two-Column Responsive Layout */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Live Interactive Print Preview (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                  {/* Template and Printer Pickers */}
                  <div className="p-4 bg-surface-container-high/40 rounded-2xl border border-outline-variant/20 space-y-3">
                    <h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
                      <PrinterIcon className="w-4 h-4 text-primary" />
                      إعدادات ومصدر الطباعة
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                          قالب التصميم
                        </label>
                        <select
                          value={selectedTemplateId}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                          className="w-full px-3 py-2 border border-outline-variant/20 rounded-xl bg-surface-container text-xs text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                        >
                          <option value="">تلقائي (حسب نوع المستند)</option>
                          {templates.map((t: PrintTemplate) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.paperSize})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                          الطابعة المستهدفة
                        </label>
                        <select
                          value={selectedPrinterId}
                          onChange={(e) => setSelectedPrinterId(e.target.value)}
                          className="w-full px-3 py-2 border border-outline-variant/20 rounded-xl bg-surface-container text-xs text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                        >
                          <option value="browser">طابعة المتصفح / الحوار الافتراضي</option>
                          {printers.map((p: PrinterType) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.connection})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Iframe Preview */}
                  <div className="flex-1 flex flex-col bg-surface-container-high/30 rounded-2xl border border-outline-variant/20 overflow-hidden min-h-[380px]">
                    <div className="px-4 py-2.5 bg-surface-container-high/60 border-b border-outline-variant/15 flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        المعاينة المباشرة للقالب
                      </span>
                      {previewLoading && (
                        <span className="text-xs text-primary flex items-center gap-1.5 font-medium">
                          <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          تحديث المعاينة...
                        </span>
                      )}
                    </div>
                    <div className="flex-1 p-3 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
                      {previewHtml ? (
                        <iframe
                          srcDoc={previewHtml}
                          title="معاينة الفاتورة"
                          className="w-full h-full min-h-[340px] border-0 rounded-xl bg-white shadow-sm"
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <div className="text-on-surface-variant text-xs flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          جاري تحضير المعاينة...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Invoice Breakdown & History (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Summary Box */}
                  <div className="p-4 bg-surface-container-high/40 rounded-2xl border border-outline-variant/20 space-y-3">
                    <h4 className="text-xs font-bold text-on-surface">تفاصيل المستند</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-outline-variant/10">
                        <span className="text-on-surface-variant">نوع المستند:</span>
                        <span className="font-bold text-on-surface">
                          {DOC_TYPES.find(d => d.value === selectedSale.docType)?.label || selectedSale.docType || 'فاتورة'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-outline-variant/10">
                        <span className="text-on-surface-variant">العميل:</span>
                        <span className="font-bold text-on-surface">
                          {customers.find(c => c.id === selectedSale.customerId)?.name || 'عميل نقدي'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-outline-variant/10">
                        <span className="text-on-surface-variant">طريقة الدفع:</span>
                        <span className="font-bold text-on-surface">
                          {selectedSale.paymentMethod === 'card' ? 'بطاقة بنكية' : selectedSale.paymentMethod === 'credit' ? 'آجل / ديون' : 'نقداً'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 bg-surface-container-high/40 rounded-2xl border border-outline-variant/20 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-on-surface">الأصناف ({selectedSaleItems.length})</h4>
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                      {selectedSaleItems.map((item, i) => (
                        <div key={i} className="flex justify-between items-center py-1.5 px-2 bg-surface-container rounded-xl text-xs">
                          <div className="min-w-0 flex-1 pl-2">
                            <p className="font-semibold text-on-surface truncate">{item.name || item.productName || 'صنف'}</p>
                            <p className="text-[11px] text-on-surface-variant">
                              {item.qty || item.quantity || 1} × {Number(item.price || item.unitPrice || 0).toFixed(2)} {baseCurrency}
                            </p>
                          </div>
                          <span className="font-bold text-on-surface font-mono shrink-0">
                            {Number(item.lineTotal || ((item.qty || item.quantity || 1) * (item.price || item.unitPrice || 0)) || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {selectedSaleItems.length === 0 && (
                        <p className="text-xs text-on-surface-variant text-center py-3">لا توجد تفاصيل للأصناف</p>
                      )}
                    </div>

                    {/* Totals Calculation */}
                    <div className="pt-2 border-t border-outline-variant/15 space-y-1.5 text-xs">
                      <div className="flex justify-between text-on-surface-variant">
                        <span>المجموع الفرعي:</span>
                        <span className="font-mono">{Number(selectedSale.subtotal || 0).toFixed(2)} {baseCurrency}</span>
                      </div>
                      {Number(selectedSale.discount || 0) > 0 && (
                        <div className="flex justify-between text-rose-500 font-semibold">
                          <span>الخصم الممنوح:</span>
                          <span className="font-mono">-{Number(selectedSale.discount).toFixed(2)} {baseCurrency}</span>
                        </div>
                      )}
                      {Number(selectedSale.tvaAmount || 0) > 0 && (
                        <div className="flex justify-between text-on-surface-variant">
                          <span>الرسم الضريبي (TVA):</span>
                          <span className="font-mono">+{Number(selectedSale.tvaAmount).toFixed(2)} {baseCurrency}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-outline-variant/20 font-cairo text-base font-bold text-on-surface">
                        <span>المجموع الصافي:</span>
                        <span className="text-primary font-mono">{Number(selectedSale.total || 0).toFixed(2)} {baseCurrency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Print Audit History (Collapsible) */}
                  <div className="p-4 bg-surface-container-high/40 rounded-2xl border border-outline-variant/20 space-y-2">
                    <button
                      onClick={() => setShowHistory((v) => !v)}
                      className="w-full flex items-center justify-between text-xs font-bold text-on-surface hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-4 h-4 text-primary" />
                        سجل عمليات طباعة هذه الفاتورة
                      </span>
                      <span className="text-primary font-normal">{showHistory ? 'إخفاء' : 'عرض السجل'}</span>
                    </button>
                    {showHistory && (
                      <div className="pt-2">
                        <Suspense fallback={<div className="text-xs text-on-surface-variant py-2">جارٍ التحميل...</div>}>
                          <PrintHistoryPanel saleId={selectedSale.id} />
                        </Suspense>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20 bg-surface-container-high/30">
              <button
                onClick={() => setViewSale(null)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest text-xs font-semibold transition-all cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => handlePrint(selectedSale, {
                  templateId: selectedTemplateId || undefined,
                  printerId: selectedPrinterId === 'browser' ? undefined : selectedPrinterId,
                })}
                disabled={!canReprint || isPrinting}
                className="flex items-center gap-2 px-7 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPrinting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ الإرسال للطابعة...</span>
                  </>
                ) : (
                  <>
                    <PrinterIcon className="w-4 h-4" />
                    <span>طباعة الفاتورة الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedSaleIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[92%] sm:w-auto min-w-[340px] sm:min-w-[540px] bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-5 duration-200"
          dir="rtl"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-cairo">
                  تم تحديد <span className="text-blue-400 font-mono text-base px-1">{selectedSaleIds.size}</span> فاتورة
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  (المجموع: <span className="font-mono text-emerald-400 font-bold">{selectedTotalAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} دج</span>)
                </span>
              </div>
              {filteredSales.length > selectedSaleIds.size && (
                <button
                  type="button"
                  onClick={selectAllFilteredSales}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors mt-0.5"
                >
                  <Layers className="w-3 h-3" />
                  <span>تحديد كل الـ {filteredSales.length} فاتورة المفلترة</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 mr-auto">
            <button
              type="button"
              onClick={clearSaleSelection}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>إلغاء التحديد</span>
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/30 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف الفواتير المحددة ({selectedSaleIds.size})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Invoice Debt Settlement & Status Toggling Modal */}
      {saleToSettle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/30 w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                  targetStatusAction === 'settle'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-cairo text-on-surface">
                    {targetStatusAction === 'settle' ? 'تسديد دين الفاتورة' : 'تحويل الفاتورة إلى دين آجل'}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    فاتورة رقم: <span className="font-mono font-bold text-on-surface">#{saleToSettle.number}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaleToSettle(null)}
                disabled={isSettling}
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Switcher Tabs */}
            <div className="flex rounded-xl bg-surface-container p-1 border border-outline-variant/20 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTargetStatusAction('settle')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  targetStatusAction === 'settle'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                تسديد دفعة / سداد كامل
              </button>
              <button
                type="button"
                onClick={() => setTargetStatusAction('convert_to_credit')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  targetStatusAction === 'convert_to_credit'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                قيد الفاتورة كدين (غير مسدد)
              </button>
            </div>

            {/* Financial Status of the Invoice */}
            <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي الفاتورة:</span>
                <span className="font-mono font-black text-sm text-on-surface mt-0.5 inline-block">
                  {Number(saleToSettle.total || 0).toLocaleString()} {baseCurrency}
                </span>
              </div>
              <div className="border-r border-l border-outline-variant/20 px-1">
                <span className="text-[11px] font-bold text-on-surface-variant block">المسدد سابقاً:</span>
                <span className="font-mono font-black text-sm text-emerald-600 mt-0.5 inline-block">
                  {Number(saleToSettle.paidAmount ?? saleToSettle.amountPaid ?? 0).toLocaleString()} {baseCurrency}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant block">المتبقي كدين:</span>
                <span className="font-mono font-black text-sm text-rose-600 mt-0.5 inline-block">
                  {Math.max(0, (saleToSettle.total || 0) - Number(saleToSettle.paidAmount ?? saleToSettle.amountPaid ?? 0)).toLocaleString()} {baseCurrency}
                </span>
              </div>
            </div>

            {/* Customer Selector if invoice is not associated with registered customer */}
            {(!saleToSettle.customerId || !customers.some((c) => c.id === saleToSettle.customerId)) && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface block">
                  ربط الفاتورة بزبون مسجل في النظام *:
                </label>
                <select
                  value={settleCustomerId}
                  onChange={(e) => setSettleCustomerId(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                >
                  <option value="">-- اختر الزبون لتسجيل الحركة في حسابه --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} [الدين: {Number(c.balance || 0).toLocaleString()} {baseCurrency}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetStatusAction === 'settle' ? (
              <div className="space-y-4">
                {/* Amount to pay */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-on-surface">مبلغ السداد الحالي *:</label>
                    <button
                      type="button"
                      onClick={() => {
                        const unpaid = Math.max(0, (saleToSettle.total || 0) - Number(saleToSettle.paidAmount ?? saleToSettle.amountPaid ?? 0));
                        setSettleAmount(unpaid > 0 ? unpaid : saleToSettle.total);
                      }}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      كامل المتبقي
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={settleAmount || ''}
                      onChange={(e) => setSettleAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full h-11 px-4 bg-surface-container border border-outline-variant/30 rounded-xl text-base font-mono font-black text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="0.00"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                      {baseCurrency}
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">طريقة استلام المبلغ:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'نقداً في الصندوق' },
                      { id: 'baridimob', label: 'بريدي موب / CCP' },
                      { id: 'transfer', label: 'تحويل / شيك' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSettleMethod(m.id as any)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          settleMethod === m.id
                            ? 'bg-primary text-on-primary border-primary shadow-xs'
                            : 'bg-surface-container text-on-surface border-outline-variant/20 hover:bg-surface-container-high'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">ملاحظة أو بيان الدفعة (اختياري):</label>
                  <input
                    type="text"
                    value={settleNote}
                    onChange={(e) => setSettleNote(e.target.value)}
                    placeholder="مثال: تسديد نقدي مباشر من الزبون"
                    className="w-full h-9 px-3 bg-surface-container border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-800 dark:text-rose-300 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>تأكيد تحويل الفاتورة إلى دين آجل</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  سيتم تغيير حالة الفاتورة إلى "غير مدفوعة (دين)"، وقيد مبلغ{' '}
                  <strong className="font-mono">{(saleToSettle.total || 0).toLocaleString()} {baseCurrency}</strong>{' '}
                  كمديونية مستحقة في حساب الزبون.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSaleToSettle(null)}
                disabled={isSettling}
                className="flex-1 h-11 bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-on-surface-variant font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmSettleOrToggle}
                disabled={isSettling || (targetStatusAction === 'settle' && settleAmount <= 0)}
                className="flex-2 h-11 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSettling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ المعالجة...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{targetStatusAction === 'settle' ? 'تأكيد التسديد' : 'تأكيد التحويل لدين'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Delete Sales */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-cairo text-slate-900 dark:text-slate-100">
                    تأكيد حذف الفواتير المحددة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    عملية الحذف نهائية ولا يمكن التراجع عنها
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleteMutation.isPending}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 text-xs text-rose-800 dark:text-rose-300 space-y-1.5">
              <p className="font-bold text-sm">
                أنت على وشك حذف <span className="font-mono underline px-1">{selectedSaleIds.size}</span> فاتورة.
              </p>
              <p>
                إجمالي قيمة هذه الفواتير: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{selectedTotalAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} دج</span>.
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">
                سيتم مسح سجلات الفواتير المحددة من قاعدة البيانات ولن تظهر في التقارير أو كشف الحساب.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                معاينة لأرقام الفواتير المستهدفة:
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/40 custom-scrollbar">
                {selectedSalesList.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[200px]">
                      <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{s.number}</span>
                      {s.customerName && <span className="text-[10px] text-slate-500 truncate">({s.customerName})</span>}
                    </div>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px] shrink-0">
                      {Number(s.total || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} دج
                    </span>
                  </div>
                ))}
                {selectedSaleIds.size > 5 && (
                  <div className="text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 py-1">
                    ... بالإضافة إلى {selectedSaleIds.size - 5} فواتير أخرى
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDeleteSales}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {bulkDeleteMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف ({selectedSaleIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
