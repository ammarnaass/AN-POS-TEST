// PrintHistoryPanel — POS-PRINT-001
// عرض سجل عمليات الطباعة للمستندات والفواتير
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPrintHistory } from '@/services/print/printService';
import { Printer, History, Search, User, Clock, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { DOC_TYPE_LABELS_AR } from '@/types/invoicePrint';

interface PrintHistoryPanelProps {
  saleId?: string;
}

export default function PrintHistoryPanel({ saleId }: PrintHistoryPanelProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'original' | 'reprint'>('all');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['printHistory', saleId || 'all'],
    queryFn: () => getPrintHistory(saleId || undefined),
  });

  const filteredHistory = useMemo(() => {
    let list = history;
    if (filterType === 'reprint') list = list.filter((r) => r.isReprint);
    if (filterType === 'original') list = list.filter((r) => !r.isReprint);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.userName?.toLowerCase().includes(q) ||
        r.templateName?.toLowerCase().includes(q) ||
        r.printerName?.toLowerCase().includes(q) ||
        r.invoiceNumber?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [history, filterType, search]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-3">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-body-sm">جارٍ تحميل سجل الطباعة...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search & Filter Bar (Only shown if history has items or searching) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الفاتورة، المستخدم، أو الطابعة..."
            className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-2 pr-9 pl-4 text-xs focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl border border-outline-variant/20 self-stretch sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filterType === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            الكل ({history.length})
          </button>
          <button
            onClick={() => setFilterType('original')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filterType === 'original' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            أول مرة
          </button>
          <button
            onClick={() => setFilterType('reprint')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filterType === 'reprint' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            إعادة طباعة
          </button>
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 p-6 bg-surface-container/20 rounded-2xl border border-outline-variant/15 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant mb-2">
            <History className="w-6 h-6" />
          </div>
          <p className="text-on-surface font-semibold text-sm">لا توجد عمليات طباعة مسجلة</p>
          <p className="text-on-surface-variant text-xs mt-1">يتم تسجيل كل عملية طباعة أو إعادة طباعة تلقائياً هنا مع التوقيت والمستخدم</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
          {filteredHistory.map((record) => {
            const dateObj = new Date(record.printedAt);
            const dateStr = dateObj.toLocaleDateString('ar-DZ', {
              year: 'numeric', month: 'short', day: 'numeric',
            });
            const timeStr = dateObj.toLocaleTimeString('ar-DZ', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            });

            return (
              <div
                key={record.id}
                className="p-3.5 bg-surface-container border border-outline-variant/20 rounded-2xl hover:border-outline-variant/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    record.isReprint ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                  }`}>
                    {record.isReprint ? <RotateCcw className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-on-surface font-mono">
                        {record.invoiceNumber || 'مستند بدون رقم'}
                      </span>
                      {record.docType && (
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-[11px] text-on-surface-variant">
                          {DOC_TYPE_LABELS_AR[record.docType as keyof typeof DOC_TYPE_LABELS_AR] || record.docType}
                        </span>
                      )}
                      {record.isReprint ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[10px] font-bold">
                          إعادة طباعة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-bold">
                          طباعة أولى
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-on-surface-variant/60" />
                        <span>{dateStr} ({timeStr})</span>
                      </span>
                      {record.userName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-on-surface-variant/60" />
                          <span>المستخدم: {record.userName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center text-xs text-on-surface-variant font-medium">
                  {record.templateName && (
                    <span className="px-2 py-1 bg-surface-container-high rounded-lg">
                      القالب: {record.templateName}
                    </span>
                  )}
                  <span className="px-2.5 py-1 bg-primary/10 text-primary font-bold rounded-lg">
                    {record.copies || 1} نسخة
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}