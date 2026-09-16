// MyTemplatesTab — POS-PRINT-001
import { Search, LayoutGrid, List, Printer, Sparkles } from 'lucide-react';
import { TemplatesSummaryCards } from './TemplatesSummaryCards';
import { TemplateCard } from './TemplateCard';
import { TemplatesTableView } from './TemplatesTableView';
import { PAPER_LABELS_AR, type PrintTemplate, type PaperSize } from '@/types/invoicePrint';

export interface MyTemplatesTabProps {
  stats: {
    total: number;
    thermal: number;
    standard: number;
    custom: number;
  };
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedPaperFilter: string;
  setSelectedPaperFilter: (sz: string) => void;
  viewMode: 'grid' | 'table';
  setViewMode: (vm: 'grid' | 'table') => void;
  isLoading: boolean;
  filteredTemplates: PrintTemplate[];
  canEdit: boolean;
  canDelete: boolean;
  canSetDefault: boolean;
  onPreview: (tpl: PrintTemplate) => void;
  onEdit: (tplId: string) => void;
  onSetDefault: (tplId: string) => void;
  onDuplicate: (tpl: { id: string; name: string }) => void;
  onDelete: (tpl: PrintTemplate) => void;
  onGoToPresets: () => void;
}

export function MyTemplatesTab({
  stats,
  searchQuery,
  setSearchQuery,
  selectedPaperFilter,
  setSelectedPaperFilter,
  viewMode,
  setViewMode,
  isLoading,
  filteredTemplates,
  canEdit,
  canDelete,
  canSetDefault,
  onPreview,
  onEdit,
  onSetDefault,
  onDuplicate,
  onDelete,
  onGoToPresets,
}: MyTemplatesTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* بطاقات الإحصائيات الذكية */}
      <TemplatesSummaryCards stats={stats} />

      {/* شريط البحث والفلترة */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/15">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في القوالب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-10 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-semibold text-on-surface-variant whitespace-nowrap">المقاس:</span>
          {['all', '80mm', '58mm', 'A4', 'A5'].map((sz) => (
            <button
              key={sz}
              onClick={() => setSelectedPaperFilter(sz)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedPaperFilter === sz
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {sz === 'all' ? 'جميع المقاسات' : PAPER_LABELS_AR[sz as PaperSize] || sz}
            </button>
          ))}

          <div className="h-5 w-px bg-outline-variant/30 mx-1 hidden sm:block" />

          {/* تبديل وضع العرض */}
          <div className="flex items-center bg-surface-container rounded-xl p-1 border border-outline-variant/15">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض البطاقات"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض الجدول"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* عرض القوالب */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-on-surface-variant">جاري تحميل قوالب الطباعة...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30 space-y-4">
          <Printer className="w-14 h-14 mx-auto text-on-surface-variant opacity-30" />
          <div>
            <h3 className="text-base font-bold text-on-surface">لم يتم العثور على قوالب</h3>
            <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
              {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا توجد قوالب طباعة مسجلة حالياً، يمكنك تصفح النماذج الجاهزة واستيرادها بنقرة واحدة.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              onClick={onGoToPresets}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>تصفح معرض النماذج الجاهزة</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              canEdit={canEdit}
              canDelete={canDelete}
              canSetDefault={canSetDefault}
              onPreview={onPreview}
              onEdit={onEdit}
              onSetDefault={onSetDefault}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <TemplatesTableView
          templates={filteredTemplates}
          canEdit={canEdit}
          canDelete={canDelete}
          onPreview={onPreview}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
