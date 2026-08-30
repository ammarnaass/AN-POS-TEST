// PrintTemplatesPage — POS-PRINT-001
// إدارة وتخصيص قوالب الطباعة للمستندات التجارية
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit2,
  Trash2,
  Star,
  Copy,
  FileText,
  Eye,
  ArrowRight,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Printer,
  FileCheck,
  Palette,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Download,
  Layers,
  Receipt,
  FileSpreadsheet,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  getAllTemplates,
  createTemplate,
  deleteTemplate,
  setTemplateAsDefault,
  duplicateTemplate,
  validateTemplate,
  importAllPresets,
  createFromPreset,
  TEMPLATE_PRESETS,
  type PresetDef,
} from '@/services/print/templateService';
import {
  useCanEditTemplates,
  useCanDeleteTemplates,
  useCanSetDefaultTemplate,
} from '@/services/print/permissions';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import TemplateEditor from '@/components/print/TemplateEditor';
import TemplateAssignmentManager from '@/components/print/TemplateAssignmentManager';
import {
  PAPER_LABELS_AR,
  DOC_TYPE_LABELS_AR,
  ALL_DOC_TYPES,
  type PrintTemplate,
  type PaperSize,
  type DocTypeKey,
  type PrintLanguage,
} from '@/types/invoicePrint';
import { renderDocumentHTML, buildPrintPage } from '@/services/print/renderTemplate';

export default function PrintTemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const canEdit = useCanEditTemplates();
  const canDelete = useCanDeleteTemplates();
  const canSetDefault = useCanSetDefaultTemplate();

  // حالات الواجهة والتبويبات
  const [activeTopTab, setActiveTopTab] = useState<'my-templates' | 'presets' | 'assignments'>('my-templates');
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<'all' | 'receipt' | 'invoice' | 'document'>('all');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [viewingAssignments, setViewingAssignments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // نوافذ الحوار
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PrintTemplate | null>(null);
  const [previewLang, setPreviewLang] = useState<PrintLanguage>('ar');
  const [duplicateModal, setDuplicateModal] = useState<{ id: string; name: string } | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // نموذج إنشاء قالب جديد
  const [newTplName, setNewTplName] = useState('');
  const [newTplDescription, setNewTplDescription] = useState('');
  const [newTplPaperSize, setNewTplPaperSize] = useState<PaperSize>('80mm');
  const [newTplTheme, setNewTplTheme] = useState<'cyan' | 'blue' | 'emerald' | 'crimson' | 'amber' | 'slate'>('cyan');

  // جلب القوالب من قاعدة البيانات
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: getAllTemplates,
  });

  // استيراد كافة القوالب الجاهزة دفعة واحدة
  const importAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('يجب تسجيل الدخول');
      return importAllPresets(user.id);
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      addNotification({
        title: 'تم استيراد القوالب',
        message: count > 0 ? `تمت إضافة ${count} قوالب جاهزة واحترافية بنجاح` : 'جميع القوالب الجاهزة موجودة بالفعل في حسابك',
        type: 'success',
      });
      setActiveTopTab('my-templates');
    },
  });

  // إنشاء قالب من نموذج جاهز
  const createFromPresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      if (!user) throw new Error('يجب تسجيل الدخول');
      return createFromPreset(presetId, user.id);
    },
    onSuccess: (tpl) => {
      if (tpl) {
        queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
        addNotification({ title: 'تم الإنشاء', message: `تم تجهيز قالب "${tpl.name}" بنجاح`, type: 'success' });
        setEditingTemplateId(tpl.id);
      }
    },
  });

  // حذف قالب
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('يجب تسجيل الدخول');
      return deleteTemplate(id, user.role);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
        queryClient.invalidateQueries({ queryKey: ['templateAssignments'] });
        addNotification({
          title: result.softDeleted ? 'تم إيقاف القالب' : 'تم حذف القالب',
          message: result.softDeleted
            ? 'تم أرشفة القالب لوجود سجلات طباعة مرتبطة به (BR-PRINT-004)'
            : 'تم حذف القالب بنجاح',
          type: 'success',
        });
      } else {
        addNotification({ title: 'تعذر الحذف', message: result.error ?? 'حدث خطأ أثناء الحذف', type: 'error' });
      }
    },
    onError: (err: unknown) => {
      addNotification({
        title: 'خطأ',
        message: err instanceof Error ? err.message : 'حدث خطأ غير متوقع',
        type: 'error',
      });
    },
  });

  // تعيين قالب كافتراضي
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('يجب تسجيل الدخول');
      return setTemplateAsDefault(id, user.role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      addNotification({ title: 'تم التعيين', message: 'تم تعيين القالب كافتراضي للطباعة', type: 'success' });
    },
  });

  // نسخ قالب
  const duplicateMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      if (!user) throw new Error('يجب تسجيل الدخول');
      return duplicateTemplate(id, newName, user.id);
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
        addNotification({ title: 'تم النسخ', message: `تم إنشاء نسخة من: ${result.name}`, type: 'success' });
        setDuplicateModal(null);
      }
    },
  });

  // إنشاء قالب جديد
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('يجب تسجيل الدخول');
      const size = newTplPaperSize;
      const widthMm = size === '58mm' ? 58 : size === '76mm' ? 76 : size === '80mm' ? 80 : size === 'A5' ? 148 : 210;
      const heightMm = size === '58mm' || size === '76mm' || size === '80mm' ? undefined : size === 'A5' ? 210 : 297;

      const themeColors: Record<string, { primary: string; header: string; footer: string; table: string; logo: string }> = {
        cyan: { primary: '#0891b2', header: '#0e7490', footer: '#475569', table: '#e2e8f0', logo: '#0891b2' },
        blue: { primary: '#2563eb', header: '#1d4ed8', footer: '#64748b', table: '#dbeafe', logo: '#2563eb' },
        emerald: { primary: '#059669', header: '#047857', footer: '#64748b', table: '#d1fae5', logo: '#059669' },
        crimson: { primary: '#dc2626', header: '#b91c1c', footer: '#57534e', table: '#fee2e2', logo: '#dc2626' },
        amber: { primary: '#d97706', header: '#b45309', footer: '#44403c', table: '#fef3c7', logo: '#d97706' },
        slate: { primary: '#334155', header: '#1e293b', footer: '#94a3b8', table: '#f1f5f9', logo: '#334155' },
      };

      const selectedColors = themeColors[newTplTheme] || themeColors.cyan;

      const template = {
        name: newTplName.trim() || `قالب ${PAPER_LABELS_AR[size]} جديد`,
        description: newTplDescription.trim() || `قالب مخصص بحجم ${PAPER_LABELS_AR[size]}`,
        paperSize: size,
        orientation: 'portrait' as const,
        widthMm,
        heightMm,
        supportedDocuments: (size === '80mm' || size === '58mm'
          ? ['thermal-receipt', 'return-invoice']
          : ['sale-invoice', 'proforma', 'devis']) as DocTypeKey[],
        visibility: {
          logo: true,
          shopName: true,
          invoiceNumber: true,
          customerName: true,
          customerPhone: false,
          customerAddress: false,
          barcode: size === '58mm' || size === '76mm' || size === '80mm',
          unitPrice: true,
          discount: true,
          tva: false,
          sellerName: false,
          cashierName: true,
          paymentMethod: true,
          qr: true,
          signature: size === 'A4' || size === 'A5',
          stamp: size === 'A4' || size === 'A5',
        },
        layout: {
          header: [
            { id: 'h-name', type: 'text' as const, text: '{{shopLegal.name}}', align: 'center' as const, size: 'lg' as const, weight: 700, colorVar: 'primary' },
            { id: 'h-phone', type: 'text' as const, text: '{{shopLegal.phone}}', align: 'center' as const, size: 'sm' as const, colorVar: 'footer' },
            { id: 'h-sep', type: 'separator' as const, style: 'dashed' as const },
          ],
          body: [
            {
              id: 'b-num',
              type: 'row' as const,
              align: 'space-between' as const,
              children: [
                { id: 'b-num-lbl', type: 'text' as const, text: 'رقم الفاتورة' },
                { id: 'b-num-val', type: 'text' as const, text: '{{invoice.number}}', weight: 700 },
              ],
            },
            {
              id: 'b-date',
              type: 'row' as const,
              align: 'space-between' as const,
              children: [
                { id: 'b-date-lbl', type: 'text' as const, text: 'التاريخ' },
                { id: 'b-date-val', type: 'text' as const, text: '{{invoice.date}}' },
              ],
            },
            {
              id: 'b-table',
              type: 'table' as const,
              columns: [
                { key: 'name', label: 'المنتج', align: 'right' as const },
                { key: 'qty', label: 'الكمية', align: 'center' as const, format: 'number' as const },
                { key: 'unitPrice', label: 'السعر', align: 'left' as const, format: 'currency' as const },
                { key: 'lineTotal', label: 'الإجمالي', align: 'left' as const, format: 'currency' as const },
              ],
              source: 'items' as const,
              showTotal: true,
              showDiscount: true,
              showTva: false,
            },
          ],
          footer: [
            { id: 'f-sep', type: 'separator' as const, style: 'dashed' as const },
            { id: 'f-qr', type: 'qr' as const, payload: 'invoiceNumber:date:total' as const, size: 100 },
            { id: 'f-foot', type: 'text' as const, text: 'شكراً لتسوقكم معنا', align: 'center' as const, size: 'sm' as const, colorVar: 'footer' },
          ],
        },
        styles: {
          primaryColor: selectedColors.primary,
          headerColor: selectedColors.header,
          footerColor: selectedColors.footer,
          tableColor: selectedColors.table,
          logoColor: selectedColors.logo,
          font: { family: 'Cairo', size: 13, weight: 400 as const },
        },
        isDefault: false,
        isSystem: false,
        createdBy: user.id,
      };

      const created = await createTemplate(template, user.id, user.role);
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      addNotification({ title: 'تم إنشاء القالب', message: `تم إنشاء قالب "${created.name}" بنجاح`, type: 'success' });
      setIsCreateModalOpen(false);
      setNewTplName('');
      setNewTplDescription('');
      setEditingTemplateId(created.id);
    },
    onError: (err: unknown) => {
      addNotification({
        title: 'فشل الإنشاء',
        message: err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء القالب',
        type: 'error',
      });
    },
  });

  // إحصائيات القوالب
  const stats = useMemo(() => {
    const total = templates.length;
    const thermal = templates.filter((t) => t.paperSize === '80mm' || t.paperSize === '58mm' || t.paperSize === '76mm').length;
    const standard = templates.filter((t) => t.paperSize === 'A4' || t.paperSize === 'A5').length;
    const custom = templates.filter((t) => !t.isSystem).length;
    return { total, thermal, standard, custom };
  }, [templates]);

  // تصفية القوالب
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesSearch =
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tpl.description && tpl.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPaper = selectedPaperFilter === 'all' || tpl.paperSize === selectedPaperFilter;
      return matchesSearch && matchesPaper;
    });
  }, [templates, searchQuery, selectedPaperFilter]);

  // بناء محتوى المعاينة السريعة للقالب
  const previewHtml = useMemo(() => {
    if (!previewTemplate) return '';
    try {
      const mockContext = {
        invoice: {
          number: 'INV-2026-0088',
          date: new Date().toISOString().split('T')[0],
          subtotal: 4850,
          discount: 150,
          tvaAmount: 0,
          total: 4700,
          paymentMethod: 'نقداً',
          customerName: 'كريم بن علي',
          customerPhone: '0550 12 34 56',
          customerAddress: 'الجزائر العاصمة',
          items: [
            { name: 'زيت زيتون بكر 1 لتر', qty: 2, unitPrice: 950, lineTotal: 1900 },
            { name: 'عسل جبلي طبيعي 500 غ', qty: 1, unitPrice: 1600, lineTotal: 1600 },
            { name: 'تمور دقلة نور فاخرة 1 كغ', qty: 3, unitPrice: 450, lineTotal: 1350 },
          ],
        },
        settings: { shopName: 'سوبرماركت البركة', receiptFooter: 'شكراً لزيارتكم' },
        template: previewTemplate,
        shopLegal: {
          name: 'سوبرماركت البركة',
          phone: '023 45 67 89',
          email: 'contact@elbaraka.dz',
          address: 'شارع فلسطين، الجزائر',
          footer: 'شكراً لزيارتكم ونتمنى عودتكم قريباً',
          commercialRegister: '16/00-1234567B',
          nif: '001616012345678',
          ai: '16012345678',
          taxNumber: '123456789',
          logo: '',
        },
        user: { id: 'usr-1', name: 'أحمد (الكاشير)', role: 'cashier' },
        lang: previewLang,
      };
      const bodyHtml = renderDocumentHTML(mockContext as any);
      return buildPrintPage(previewTemplate, bodyHtml, `معاينة: ${previewTemplate.name}`, previewLang);
    } catch (err) {
      return `<!doctype html><html dir="rtl"><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#ef4444;"><p>تعذر تجهيز المعاينة: ${String(err)}</p></body></html>`;
    }
  }, [previewTemplate, previewLang]);
  // ====== شاشة محرر القوالب المرئي الكامل ======
  if (editingTemplateId && user) {
    return (
      <div className="p-6 max-w-7xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingTemplateId(null)}
              className="p-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all flex items-center gap-2 font-bold"
            >
              <ArrowRight className="w-5 h-5" />
              <span>رجوع إلى قائمة القوالب</span>
            </button>
            <div className="h-6 w-px bg-outline-variant/30" />
            <div>
              <h1 className="text-xl font-bold font-cairo text-on-surface">محرر القوالب المرئي</h1>
              <p className="text-xs text-on-surface-variant">تخصيص الهيكل، الأنماط، الشعار، والـ QR Code لحظياً</p>
            </div>
          </div>
        </div>
        <TemplateEditor
          templateId={editingTemplateId}
          userId={user.id}
          userName={user.name}
          onClose={() => setEditingTemplateId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* الرأس الأساسي للوحة القوالب */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-high p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-cairo text-on-surface tracking-tight">إدارة وتخصيص قوالب الطباعة</h1>
              <p className="text-xs text-on-surface-variant">معرض القوالب الجاهزة، التخصيص المرئي، والربط بالوثائق التجارية · POS-PRINT-001</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/settings', { state: { tab: 'invoices' } })}
            className="px-4 py-2.5 rounded-xl bg-surface-container-highest/80 hover:bg-surface-container-highest text-on-surface transition-all flex items-center gap-2 text-sm font-semibold border border-outline-variant/20 shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>إعدادات الفواتير</span>
          </button>

          {canEdit && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>إنشاء قالب فارغ</span>
            </button>
          )}
        </div>
      </header>

      {/* شريط التبويبات الرئيسي المتقدم */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/20 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTopTab('my-templates')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTopTab === 'my-templates'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>قوالب المتجر النشطة</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTopTab === 'my-templates' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
            }`}>
              {templates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTopTab('presets')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTopTab === 'presets'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>معرض النماذج الجاهزة</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTopTab === 'presets' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
            }`}>
              {TEMPLATE_PRESETS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTopTab('assignments')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTopTab === 'assignments'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>ربط القوالب بالوثائق</span>
          </button>
        </div>

        {activeTopTab === 'presets' && canEdit && (
          <button
            type="button"
            onClick={() => importAllMutation.mutate()}
            disabled={importAllMutation.isPending}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{importAllMutation.isPending ? 'جاري الاستيراد...' : 'استيراد كافة النماذج (10 قوالب)'}</span>
          </button>
        )}
      </div>

      {/* تبويب: ربط القوالب بالوثائق */}
      {activeTopTab === 'assignments' && (
        <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-md animate-in fade-in duration-200">
          <TemplateAssignmentManager />
        </div>
      )}

      {/* تبويب: معرض النماذج الجاهزة (Preset Studio) */}
      {activeTopTab === 'presets' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* بانر النماذج الجاهزة وفلاتر التصنيف */}
          <div className="bg-gradient-to-l from-primary/10 via-surface-container to-surface-container-low p-6 rounded-3xl border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-cairo text-on-surface flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>نماذج معتمدة ومجهزة مسبقاً وفق المعايير التجارية الجزائرية</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                قوالب متكاملة للإيصالات الحرارية 80mm/58mm، الفواتير A4/A5، سندات التسليم BL، عروض الأسعار Devis، وطلبيات الشراء.
              </p>
            </div>

            {/* أزرار الفئات */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'جميع النماذج' },
                { id: 'receipt', label: 'إيصالات نقاط البيع (80/58mm)' },
                { id: 'invoice', label: 'فواتير المبيعات (A4/A5)' },
                { id: 'document', label: 'سندات وعروض أسعار' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPresetCategoryFilter(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    presetCategoryFilter === cat.id
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-highest/80 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* شبكة النماذج الجاهزة */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TEMPLATE_PRESETS.filter(
              (p) => presetCategoryFilter === 'all' || p.category === presetCategoryFilter,
            ).map((preset) => {
              const buildData = preset.build();
              const isAlreadyImported = templates.some(
                (t) => t.id === preset.id || t.name === (preset.nameAr || preset.name),
              );

              return (
                <div
                  key={preset.id}
                  className="bg-surface-container-low hover:bg-surface-container rounded-2xl border border-outline-variant/20 hover:border-primary/40 p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md group relative"
                >
                  <div>
                    {/* رأس بطاقة النموذج */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20">
                          {PAPER_LABELS_AR[preset.paperSize] || preset.paperSize}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-surface-container-highest text-on-surface-variant">
                          {preset.category === 'receipt'
                            ? 'إيصال حراري'
                            : preset.category === 'invoice'
                            ? 'فاتورة رسمية'
                            : 'سند تجاري'}
                        </span>
                        {isAlreadyImported && (
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>مضاف</span>
                          </span>
                        )}
                      </div>

                      {/* ألوان الثيم للنموذج */}
                      <div className="flex items-center -space-x-1.5 rtl:space-x-reverse">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-xs"
                          style={{ backgroundColor: buildData.styles?.primaryColor || '#0891b2' }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-xs"
                          style={{ backgroundColor: buildData.styles?.headerColor || '#0e7490' }}
                        />
                      </div>
                    </div>

                    {/* الاسم والوصف */}
                    <h3 className="text-base font-bold font-cairo text-on-surface mb-1 group-hover:text-primary transition-colors">
                      {preset.nameAr || preset.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* المستندات المدعومة */}
                    <div className="mb-4">
                      <div className="text-[11px] font-bold text-on-surface-variant mb-1.5">الوثائق المدعومة:</div>
                      <div className="flex flex-wrap gap-1">
                        {buildData.supportedDocuments?.map((dt) => (
                          <span key={dt} className="px-2 py-0.5 rounded-md bg-surface-container-high text-[11px] font-semibold text-on-surface">
                            {DOC_TYPE_LABELS_AR[dt] || dt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* إجراءات النموذج */}
                  <div className="pt-3.5 border-t border-outline-variant/15 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const mockTpl: PrintTemplate = {
                          ...buildData,
                          id: preset.id,
                          name: preset.nameAr || preset.name,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        };
                        setPreviewTemplate(mockTpl);
                        setPreviewLang('ar');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>معاينة</span>
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => createFromPresetMutation.mutate(preset.id)}
                        disabled={createFromPresetMutation.isPending}
                        className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إنشاء من هذا النموذج</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* تبويب: قوالب المتجر النشطة */}
      {activeTopTab === 'my-templates' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* بطاقات الإحصائيات الذكية */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-cairo text-on-surface">{stats.total}</div>
                <div className="text-xs text-on-surface-variant font-medium">إجمالي القوالب</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-cairo text-on-surface">{stats.thermal}</div>
                <div className="text-xs text-on-surface-variant font-medium">إيصالات حرارية (80/58mm)</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-cairo text-on-surface">{stats.standard}</div>
                <div className="text-xs text-on-surface-variant font-medium">فواتير قياسية (A4/A5)</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-cairo text-on-surface">{stats.custom}</div>
                <div className="text-xs text-on-surface-variant font-medium">قوالب مخصصة للمتجر</div>
              </div>
            </div>
          </div>

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
                  onClick={() => setActiveTopTab('presets')}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>تصفح معرض النماذج الجاهزة</span>
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* شبكة البطاقات (Grid View) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-surface-container-low hover:bg-surface-container rounded-2xl border border-outline-variant/20 hover:border-primary/30 p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md group relative"
                >
                  <div>
                    {/* رأس البطاقة والشارات */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20">
                          {PAPER_LABELS_AR[tpl.paperSize]}
                        </span>
                        {tpl.isDefault && (
                          <span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>افتراضي</span>
                          </span>
                        )}
                        {tpl.isSystem ? (
                          <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-surface-container-highest text-on-surface-variant">
                            نظامي
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                            مخصص
                          </span>
                        )}
                      </div>

                      {/* نقاط ألوان الثيم */}
                      <div className="flex items-center -space-x-1.5 rtl:space-x-reverse" title="ألوان القالب">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-xs"
                          style={{ backgroundColor: tpl.styles?.primaryColor || '#0891b2' }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-xs"
                          style={{ backgroundColor: tpl.styles?.headerColor || '#0e7490' }}
                        />
                      </div>
                    </div>

                    {/* الاسم والوصف */}
                    <h3 className="text-base font-bold font-cairo text-on-surface mb-1 group-hover:text-primary transition-colors">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                      {tpl.description || 'قالب طباعة مستندات تجارية'}
                    </p>

                    {/* المستندات المدعومة */}
                    <div className="mb-4">
                      <div className="text-[11px] font-bold text-on-surface-variant mb-1.5">الوثائق المدعومة:</div>
                      <div className="flex flex-wrap gap-1">
                        {!tpl.supportedDocuments || tpl.supportedDocuments.length === 0 ? (
                          <span className="text-xs text-on-surface-variant/70 italic">عام لجميع الوثائق</span>
                        ) : (
                          tpl.supportedDocuments.slice(0, 3).map((dt) => (
                            <span key={dt} className="px-2 py-0.5 rounded-md bg-surface-container-high text-[11px] font-semibold text-on-surface">
                              {DOC_TYPE_LABELS_AR[dt] || dt}
                            </span>
                          ))
                        )}
                        {tpl.supportedDocuments && tpl.supportedDocuments.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-surface-container-high text-[11px] font-semibold text-on-surface-variant">
                            +{tpl.supportedDocuments.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* شريط الإجراءات السفلي */}
                  <div className="pt-3.5 border-t border-outline-variant/15 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setPreviewTemplate(tpl);
                          setPreviewLang('ar');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all flex items-center gap-1.5"
                        title="معاينة حية"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>معاينة</span>
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => setEditingTemplateId(tpl.id)}
                          className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1.5"
                          title="فتح المحرر المرئي"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تخصيص</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {canSetDefault && !tpl.isDefault && (
                        <button
                          onClick={() => setDefaultMutation.mutate(tpl.id)}
                          className="p-2 rounded-xl text-on-surface-variant hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                          title="تعيين كافتراضي"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}

                      {canEdit && (
                        <button
                          onClick={() => {
                            setDuplicateModal({ id: tpl.id, name: tpl.name });
                            setDuplicateName(`${tpl.name} (نسخة)`);
                          }}
                          className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all"
                          title="نسخ القالب"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}

                      {canDelete && !tpl.isSystem && (
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف قالب "${tpl.name}"؟`)) {
                              deleteMutation.mutate(tpl.id);
                            }
                          }}
                          className="p-2 rounded-xl text-on-surface-variant hover:text-red-600 hover:bg-red-500/10 transition-all"
                          title="حذف القالب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* جدول القوالب (Table View) */
            <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low shadow-sm">
              <table className="w-full">
                <thead className="bg-surface-container-high/60 text-on-surface-variant text-xs font-bold text-right border-b border-outline-variant/15">
                  <tr>
                    <th className="px-5 py-3.5">القالب</th>
                    <th className="px-4 py-3.5">المقاس</th>
                    <th className="px-4 py-3.5">الوثائق المدعومة</th>
                    <th className="px-4 py-3.5">الحالة</th>
                    <th className="px-5 py-3.5 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-sm">
                  {filteredTemplates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-on-surface">{tpl.name}</div>
                        <div className="text-xs text-on-surface-variant line-clamp-1">{tpl.description}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20">
                          {PAPER_LABELS_AR[tpl.paperSize]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {!tpl.supportedDocuments || tpl.supportedDocuments.length === 0 ? (
                            <span className="text-xs text-on-surface-variant/70 italic">عام لجميع الوثائق</span>
                          ) : (
                            tpl.supportedDocuments.map((dt) => (
                              <span key={dt} className="px-2 py-0.5 rounded-md bg-surface-container-high text-[11px] font-semibold text-on-surface">
                                {DOC_TYPE_LABELS_AR[dt] || dt}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {tpl.isDefault ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>افتراضي</span>
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant">عادي</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setPreviewTemplate(tpl);
                              setPreviewLang('ar');
                            }}
                            className="p-2 rounded-lg hover:bg-surface-container-highest text-primary transition-all"
                            title="معاينة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => setEditingTemplateId(tpl.id)}
                              className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface transition-all"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => {
                                setDuplicateModal({ id: tpl.id, name: tpl.name });
                                setDuplicateName(`${tpl.name} (نسخة)`);
                              }}
                              className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-all"
                              title="نسخ"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && !tpl.isSystem && (
                            <button
                              onClick={() => {
                                if (confirm(`حذف القالب "${tpl.name}"؟`)) deleteMutation.mutate(tpl.id);
                              }}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 transition-all"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* نافذة إنشاء قالب جديد (Create Modal) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-surface-container-low w-full max-w-lg rounded-3xl p-6 border border-outline-variant/20 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-cairo text-on-surface">إنشاء قالب طباعة جديد</h3>
                  <p className="text-xs text-on-surface-variant">اختر مقاس الورق والثيم الأولي لبدء التخصيص</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-highest"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">اسم القالب</label>
                <input
                  type="text"
                  placeholder="مثال: إيصال الكاشير السريع (80mm)"
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">الوصف (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: مخصص لطابعات الاستقبال مع باركود وQR ضريبي"
                  value={newTplDescription}
                  onChange={(e) => setNewTplDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* اختيار مقاس الورق */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2">مقاس الورق</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['80mm', '58mm', 'A4', 'A5'] as PaperSize[]).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setNewTplPaperSize(sz)}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                        newTplPaperSize === sz
                          ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                          : 'bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <Printer className="w-4 h-4 opacity-70" />
                      <span className="text-xs">{PAPER_LABELS_AR[sz]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* اختيار الثيم اللوني */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2">الثيم اللوني الأولي</label>
                <div className="flex items-center gap-3">
                  {[
                    { id: 'cyan', label: 'سماوي', bg: '#0891b2' },
                    { id: 'blue', label: 'أزرق', bg: '#2563eb' },
                    { id: 'emerald', label: 'زمردي', bg: '#059669' },
                    { id: 'crimson', label: 'عنابي', bg: '#dc2626' },
                    { id: 'amber', label: 'ذهبي', bg: '#d97706' },
                    { id: 'slate', label: 'رمادي', bg: '#334155' },
                  ].map((thm) => (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => setNewTplTheme(thm.id as any)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        newTplTheme === thm.id ? 'ring-3 ring-primary ring-offset-2 ring-offset-surface scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: thm.bg }}
                      title={thm.label}
                    >
                      {newTplTheme === thm.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/15">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-semibold transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-sm font-bold shadow-md transition-all flex items-center gap-2"
              >
                {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء والانتقال للمحرر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة المعاينة السريعة (Instant Floating Preview Modal) */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] rounded-3xl border border-outline-variant/20 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* شريط رأس المعاينة */}
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-sm text-on-surface font-cairo">معاينة القالب: {previewTemplate.name}</h3>
                  <p className="text-xs text-on-surface-variant">مقاس {PAPER_LABELS_AR[previewTemplate.paperSize]}</p>
                </div>
              </div>

              {/* محدد لغة الفاتورة السريع */}
              <div className="flex items-center gap-1.5 bg-surface-container-high rounded-xl p-1 border border-outline-variant/20">
                {[
                  { key: 'ar', label: '🇩🇿 العربية' },
                  { key: 'ar-fr', label: '🌐 عربي/فرنسي' },
                  { key: 'fr', label: '🇫🇷 Français' },
                  { key: 'en', label: '🇬🇧 English' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPreviewLang(item.key as PrintLanguage)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      previewLang === item.key
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى الـ iframe للمعاينة */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <iframe
                title="Template Preview"
                srcDoc={previewHtml}
                className="w-full h-[550px] border-0 rounded-xl shadow-lg bg-white"
              />
            </div>

            {/* أزرار الإجراء في أسفل المعاينة */}
            <div className="p-3.5 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-between gap-3">
              <span className="text-xs text-on-surface-variant">
                توليد Vector SVG فوري 0ms مع دعم RTL و LTR التام
              </span>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    onClick={() => {
                      const id = previewTemplate.id;
                      setPreviewTemplate(null);
                      setEditingTemplateId(id);
                    }}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل في المحرر</span>
                  </button>
                )}
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-all"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة نسخ القالب */}
      {duplicateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-surface-container-low w-full max-w-sm rounded-3xl p-6 border border-outline-variant/20 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold font-cairo text-on-surface">نسخ القالب</h3>
            <p className="text-xs text-on-surface-variant">أدخل اسماً للنسخة الجديدة من القالب:</p>
            <input
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDuplicateModal(null)}
                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => duplicateMutation.mutate({ id: duplicateModal.id, newName: duplicateName })}
                disabled={duplicateMutation.isPending}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all"
              >
                نسخ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
