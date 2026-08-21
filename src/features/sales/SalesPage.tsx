// SalesPage — صفحة الفواتير بنظام التبويبات العمودية (POS-PRINT-001 / D phase)
// 5 تبويبات: الفواتير | القوالب | السجل | الطابعات | الطابور
// التبويبات أفقية مكدّسة فوق المحتوى (vertical tabs = rows of tabs above content).
import { useState, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { Receipt, FileText, History, Printer, ListChecks } from 'lucide-react';
import { useCanAssignTemplate, useCanManagePrinters, useCanPerform } from '@/services/print/permissions';
import InvoicesTab from './InvoicesTab';

// المكوّنات الثقيلة تُحمّل عند الحاجة فقط (lazy) لتقليل bundle المبدئي
const TemplateAssignmentManager = lazy(() => import('@/components/print/TemplateAssignmentManager'));
const PrintHistoryPanel = lazy(() => import('@/components/print/PrintHistoryPanel'));
const PrintQueuePanel = lazy(() => import('@/components/print/PrintQueuePanel'));
const PrintersPage = lazy(() => import('@/features/print/PrintersPage'));

type TabKey = 'invoices' | 'templates' | 'history' | 'printers' | 'queue';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  needsPerm?: 'assign' | 'manage_printers' | 'view_history';
}

const TABS: TabDef[] = [
  { key: 'invoices', label: 'الفواتير', icon: <Receipt className="w-4 h-4" /> },
  { key: 'templates', label: 'القوالب', icon: <FileText className="w-4 h-4" />, needsPerm: 'assign' },
  { key: 'history', label: 'السجل', icon: <History className="w-4 h-4" />, needsPerm: 'view_history' },
  { key: 'printers', label: 'الطابعات', icon: <Printer className="w-4 h-4" />, needsPerm: 'manage_printers' },
  { key: 'queue', label: 'الطابور', icon: <ListChecks className="w-4 h-4" /> },
];

function TabButton({ active, onClick, label, icon }: {
  active: boolean; onClick: () => void; label: string; icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-label-lg transition-all whitespace-nowrap ${
        active
          ? 'bg-primary text-on-primary shadow-sm'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default function SalesPage() {
  const location = useLocation();
  const initialTab = ((location.state as { tab?: TabKey } | null)?.tab ?? 'invoices') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const canAssign = useCanAssignTemplate();
  const canManagePrinters = useCanManagePrinters();
  const canViewHistory = useCanPerform('view_history');

  const isTabVisible = (tab: TabDef): boolean => {
    if (!tab.needsPerm) return true;
    if (tab.needsPerm === 'assign') return canAssign;
    if (tab.needsPerm === 'manage_printers') return canManagePrinters;
    if (tab.needsPerm === 'view_history') return canViewHistory;
    return true;
  };

  const visibleTabs = TABS.filter(isTabVisible);

  // إذا كان التبويب المُختار مخفيّاً للصلاحية، ارجع للفواتير
  if (!visibleTabs.some((t) => t.key === activeTab)) {
    setActiveTab('invoices');
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-row-reverse justify-between items-center">
        <div>
          <h2 className="font-cairo text-headline-sm font-bold text-on-surface">الفواتير والطباعة</h2>
          <p className="text-body-md text-on-surface-variant">إدارة الفواتير، القوالب، الطابعات وسجل الطباعة</p>
        </div>
      </div>

      {/* Vertical tabs bar — أزرر أفقية مكدّسة فوق المحتوى */}
      <div className="flex gap-2 overflow-x-auto p-1 bg-surface-container-low/50 rounded-xl border border-outline-variant/20" dir="rtl">
        {visibleTabs.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            label={tab.label}
            icon={tab.icon}
          />
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'invoices' && <InvoicesTab />}

        {activeTab === 'templates' && (
          <Suspense fallback={<TabLoading />}>
            <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
              <TemplateAssignmentManager />
            </div>
          </Suspense>
        )}

        {activeTab === 'history' && (
          <Suspense fallback={<TabLoading />}>
            <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
              {/* saleId فارغ = عرض كل سجل الطباعة (تم تعديل المكوّن لقبول ذلك) */}
              <PrintHistoryPanel saleId="" />
            </div>
          </Suspense>
        )}

        {activeTab === 'printers' && (
          <Suspense fallback={<TabLoading />}>
            {/* prop embedded يلغي الحشو الكامل للصفحة */}
            <PrintersPage embedded />
          </Suspense>
        )}

        {activeTab === 'queue' && (
          <Suspense fallback={<TabLoading />}>
            <PrintQueuePanel />
          </Suspense>
        )}
      </div>
    </div>
  );
}
