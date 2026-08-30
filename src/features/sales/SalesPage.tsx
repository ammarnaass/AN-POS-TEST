// SalesPage — صفحة الفواتير والطباعة الشاملة (POS-PRINT-001 / D phase)
// 5 تبويبات تفاعلية: الفواتير | القوالب | سجل الطباعة | الطابعات | طابور الطباعة
import { useState, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { listPrinters } from '@/services/print/printerService';
import { getAllTemplates } from '@/services/print/templateService';
import {
  Receipt, FileText, History, Printer, ListChecks,
  Plus, ShoppingBag, Sparkles, SlidersHorizontal, Layers
} from 'lucide-react';
import { useCanAssignTemplate, useCanManagePrinters, useCanPerform } from '@/services/print/permissions';
import InvoicesTab from './InvoicesTab';

// Lazy load heavy print components
const TemplateAssignmentManager = lazy(() => import('@/components/print/TemplateAssignmentManager'));
const PrintHistoryPanel = lazy(() => import('@/components/print/PrintHistoryPanel'));
const PrintQueuePanel = lazy(() => import('@/components/print/PrintQueuePanel'));
const PrintersPage = lazy(() => import('@/features/print/PrintersPage'));

type TabKey = 'invoices' | 'templates' | 'history' | 'printers' | 'queue';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  needsPerm?: 'assign' | 'manage_printers' | 'view_history';
}

const TABS: TabDef[] = [
  { key: 'invoices', label: 'الفواتير', icon: Receipt },
  { key: 'templates', label: 'القوالب', icon: FileText, needsPerm: 'assign' },
  { key: 'history', label: 'السجل', icon: History, needsPerm: 'view_history' },
  { key: 'printers', label: 'الطابعات', icon: Printer, needsPerm: 'manage_printers' },
  { key: 'queue', label: 'الطابور', icon: ListChecks },
];

function TabLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
      <div className="w-9 h-9 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-body-sm font-medium">جارٍ تحميل القسم...</span>
    </div>
  );
}

export default function SalesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = ((location.state as { tab?: TabKey } | null)?.tab ?? 'invoices') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const canAssign = useCanAssignTemplate();
  const canManagePrinters = useCanManagePrinters();
  const canViewHistory = useCanPerform('view_history');

  // Queries for live counts on tabs
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.toArray(),
  });

  const { data: printers = [] } = useQuery({
    queryKey: ['printers'],
    queryFn: () => listPrinters(true),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: getAllTemplates,
  });

  const isTabVisible = (tab: TabDef): boolean => {
    if (!tab.needsPerm) return true;
    if (tab.needsPerm === 'assign') return canAssign;
    if (tab.needsPerm === 'manage_printers') return canManagePrinters;
    if (tab.needsPerm === 'view_history') return canViewHistory;
    return true;
  };

  const visibleTabs = TABS.filter(isTabVisible);

  if (!visibleTabs.some((t) => t.key === activeTab)) {
    setActiveTab('invoices');
  }

  const getTabCount = (key: TabKey): number | null => {
    switch (key) {
      case 'invoices': return sales.length;
      case 'printers': return printers.length;
      case 'templates': return templates.length;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/15">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-cairo text-2xl font-bold text-on-surface">الفواتير والطباعة</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              POS & Print Hub
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            إدارة فواتير المبيعات، معاينة القوالب، ربط الطابعات، ومتابعة سجلات التدقيق
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl shadow-md hover:shadow-primary/30 hover:opacity-95 transition-all active:scale-95 text-body-sm font-bold cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>نقطة البيع (POS)</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar touch-scroll p-1.5 bg-surface-container rounded-2xl border border-outline-variant/20">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = getTabCount(tab.key);

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-md shadow-primary/20 scale-[1.02]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {count !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <div className="min-h-[450px]">
        {activeTab === 'invoices' && <InvoicesTab />}

        {activeTab === 'templates' && (
          <Suspense fallback={<TabLoading />}>
            <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6 shadow-sm">
              <TemplateAssignmentManager />
            </div>
          </Suspense>
        )}

        {activeTab === 'history' && (
          <Suspense fallback={<TabLoading />}>
            <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6 shadow-sm">
              <div className="mb-4 pb-3 border-b border-outline-variant/15 flex items-center justify-between">
                <div>
                  <h3 className="font-cairo text-lg font-bold text-on-surface">سجل عمليات الطباعة العام</h3>
                  <p className="text-xs text-on-surface-variant">سجل تدقيق كامل لجميع عمليات الطباعة وإعادة الطباعة المنفذة في النظام</p>
                </div>
              </div>
              <PrintHistoryPanel saleId="" />
            </div>
          </Suspense>
        )}

        {activeTab === 'printers' && (
          <Suspense fallback={<TabLoading />}>
            <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6 shadow-sm">
              <PrintersPage embedded />
            </div>
          </Suspense>
        )}

        {activeTab === 'queue' && (
          <Suspense fallback={<TabLoading />}>
            <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6 shadow-sm">
              <PrintQueuePanel />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}
