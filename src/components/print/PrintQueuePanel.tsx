// PrintQueuePanel — POS-PRINT-001 Phase 2
// لوحة طابور الطباعة - عرض المهام + إلغاء + إعادة محاولة + TTL
// FR-009/FR-012 · BR-003/004/005
import { useState, Component, type ReactNode } from 'react';
import { Loader2, Printer, X, RefreshCw, Trash2, CheckCircle2, XCircle, Clock, ListChecks, AlertTriangle } from 'lucide-react';
import { usePrintQueue, useCancelPrintJob, useRetryPrintJob, useDeletePrintJob, useProcessQueue } from '@/services/print/usePrintQueue';
import type { PrintJobEntity, PrintJobStatus } from '@/infrastructure/database/dexie/db';

const STATUS_CONFIG: Record<PrintJobStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: 'في الانتظار', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  printing: { label: 'قيد الطباعة', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Loader2 },
  success: { label: 'نجحت', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  failed: { label: 'فشلت', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', icon: XCircle },
  cancelled: { label: 'ملغاة', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', icon: X },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `قبل ${min} دقيقة`;
  const h = Math.floor(min / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  return `قبل ${Math.floor(h / 24)} يوم`;
}

export default function PrintQueuePanel() {
  const [statusFilter, setStatusFilter] = useState<PrintJobStatus | 'all'>('all');
  const { data: jobs = [], isLoading } = usePrintQueue(statusFilter === 'all' ? undefined : statusFilter);
  const cancelMutation = useCancelPrintJob();
  const retryMutation = useRetryPrintJob();
  const deleteMutation = useDeletePrintJob();
  const processMutation = useProcessQueue();

  // عد الإحصائيات من كل المهام
  const allJobs = jobs as PrintJobEntity[];

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-headline-lg text-on-surface font-headline-lg flex items-center gap-2">
            <ListChecks className="w-6 h-6" />
            طابور الطباعة
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            إدارة مهام الطباعة المؤجلة · POS-PRINT-001 Phase 2 · BR-004/005
          </p>
        </div>
        <button
          onClick={() => processMutation.mutate()}
          disabled={processMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${processMutation.isPending ? 'animate-spin' : ''}`} />
          معالجة الطابور
        </button>
      </header>

      {/* فلاتر الحالة */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'pending', 'printing', 'success', 'failed', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-body-sm transition-all ${
              statusFilter === s
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            {s === 'all' ? 'الكل' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* القائمة */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : allJobs.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <Printer className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-body-lg">لا توجد مهام في الطابور</p>
          <p className="text-body-sm mt-1">المهام المعلّقة تُحذف تلقائياً بعد 24 ساعة (BR-005)</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-low">
          <table className="w-full">
            <thead className="bg-surface-container-high/50 text-on-surface-variant text-label-md text-right">
              <tr>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">الفاتورة</th>
                <th className="px-4 py-3">القالب</th>
                <th className="px-4 py-3">النسخ</th>
                <th className="px-4 py-3">أُنشئت</th>
                <th className="px-4 py-3">الخطأ</th>
                <th className="px-4 py-3 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {allJobs.map((job) => {
                const cfg = STATUS_CONFIG[job.status];
                const Icon = cfg.icon;
                let invoiceNumber = '';
                let templateName = '';
                try {
                  const p = JSON.parse(job.payload) as { invoiceNumber?: string; templateName?: string };
                  invoiceNumber = p.invoiceNumber ?? job.invoiceId;
                  templateName = p.templateName ?? job.templateId;
                } catch {
                  invoiceNumber = job.invoiceId;
                  templateName = job.templateId;
                }
                return (
                  <tr key={job.id} className="hover:bg-surface-container/40 transition-all">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-label-sm ${cfg.bg} ${cfg.color}`}>
                        <Icon className={`w-3.5 h-3.5 ${job.status === 'printing' ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-body-sm text-on-surface">{invoiceNumber}</td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">{templateName}</td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">{job.copies}</td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">{timeAgo(job.createdAt)}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {job.errorMessage ? (
                        <span className="text-rose-600 text-label-sm truncate inline-flex items-center gap-1" title={job.errorMessage}>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{job.errorMessage}</span>
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {job.status === 'pending' && (
                          <button
                            onClick={() => cancelMutation.mutate(job.id)}
                            disabled={cancelMutation.isPending}
                            title="إلغاء المهمة"
                            className="p-2 rounded-lg hover:bg-rose-50 text-rose-600 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {job.status === 'failed' && (
                          <>
                            <button
                              onClick={() => retryMutation.mutate(job.id)}
                              disabled={retryMutation.isPending}
                              title="إعادة المحاولة"
                              className="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-all"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(job.id)}
                              disabled={deleteMutation.isPending}
                              title="حذف"
                              className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(job.status === 'success' || job.status === 'cancelled') && (
                          <button
                            onClick={() => deleteMutation.mutate(job.id)}
                            disabled={deleteMutation.isPending}
                            title="حذف من السجل"
                            className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-all"
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
      )}

      <footer className="mt-6 text-label-sm text-on-surface-variant text-center">
        POS-PRINT-001 · Phase 2 · FR-009 (طباعة مؤجلة) · FR-012 (إلغاء) · BR-004/005 (TTL 24h)
      </footer>
    </div>
  );
}

// ===== ErrorBoundary محلي — عرض أخطاء render بدل الصفحة الفارغة =====
interface EBState { hasError: boolean; error: Error | null }
class PrintQueueErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: unknown) {
    console.error('[PrintQueuePanel] render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-3xl mx-auto" dir="rtl">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="font-headline-md text-headline-md">حدث خطأ في طابور الطباعة</h2>
            </div>
            <p className="text-body-sm mb-3">قد تكون قاعدة البيانات المحلية قديمة. حاول إعادة فتح التطبيق أو تحديث الصفحة.</p>
            <pre className="text-xs bg-white/60 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {this.state.error?.message}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all"
              >
                تحديث الصفحة
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-100 transition-all"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// تصدير مُغلّف بـ ErrorBoundary لاستخدامه في الصفحة بسهولة
export function PrintQueuePanelWithBoundary() {
  return (
    <PrintQueueErrorBoundary>
      <PrintQueuePanel />
    </PrintQueueErrorBoundary>
  );
}
