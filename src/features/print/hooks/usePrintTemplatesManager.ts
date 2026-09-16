// usePrintTemplatesManager — POS-PRINT-001
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllTemplates,
  createTemplate,
  deleteTemplate,
  setTemplateAsDefault,
  duplicateTemplate,
  importAllPresets,
  createFromPreset,
} from '@/services/print/templateService';
import {
  useCanEditTemplates,
  useCanDeleteTemplates,
  useCanSetDefaultTemplate,
} from '@/services/print/permissions';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { db, type SettingsEntity } from '@/infrastructure/database/dexie/db';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';
import {
  PAPER_LABELS_AR,
  type PrintTemplate,
  type PaperSize,
  type DocTypeKey,
} from '@/types/invoicePrint';

export interface CreateTemplateInput {
  name: string;
  description: string;
  paperSize: PaperSize;
  theme: 'cyan' | 'blue' | 'emerald' | 'crimson' | 'amber' | 'slate';
}

export function usePrintTemplatesManager() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const canEdit = useCanEditTemplates();
  const canDelete = useCanDeleteTemplates();
  const canSetDefault = useCanSetDefaultTemplate();

  // فلاتر البحث والمقاس وطريقة العرض
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<'all' | 'receipt' | 'invoice' | 'document'>('all');

  // إعدادات المتجر العامة وهوية الطباعة والشعار
  const { data: storeSettings } = useQuery({
    queryKey: ['storeSettingsDefault'],
    queryFn: async () => {
      const s = await db.settings.get('default');
      return s || null;
    },
  });

  // حالة لوحة شعار المتجر للطباعة
  const [isLogoHubOpen, setIsLogoHubOpen] = useState(false);
  const [logoWidth, setLogoWidth] = useState<number>(80);
  const [logoHeight, setLogoHeight] = useState<number>(80);
  const [logoAlign, setLogoAlign] = useState<'right' | 'center' | 'left' | 'auto'>('auto');

  // مزامنة أبعاد ومحاذاة الشعار عند تحميل الإعدادات
  useEffect(() => {
    if (storeSettings) {
      if (storeSettings.printLogoWidth) setLogoWidth(storeSettings.printLogoWidth);
      if (storeSettings.printLogoHeight) setLogoHeight(storeSettings.printLogoHeight);
      if (storeSettings.printLogoAlign) setLogoAlign(storeSettings.printLogoAlign);
    }
  }, [storeSettings]);

  // ضمان وجود وتحديث القوالب النظامية دائماً
  useEffect(() => {
    seedDefaultTemplates()
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
        queryClient.invalidateQueries({ queryKey: ['templateAssignments'] });
      })
      .catch((err) => console.warn('Failed to seed templates in PrintTemplatesPage:', err));
  }, [queryClient]);

  // حفظ إعدادات الشعار في قاعدة البيانات
  const saveLogoSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<SettingsEntity>) => {
      const current = (await db.settings.get('default')) || { id: 'default', shopName: 'المحل' };
      const next = { ...current, ...updates };
      await db.settings.put(next as any);
      return next;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeSettingsDefault'] });
      addNotification({
        title: 'تم تحديث هوية الطباعة',
        message: 'تم حفظ إعدادات ومقاسات الشعار بنجاح لكافة الفواتير والإيصالات',
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      addNotification({
        title: 'فشل الحفظ',
        message: err instanceof Error ? err.message : 'تعذر حفظ إعدادات الشعار',
        type: 'error',
      });
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        addNotification({ title: 'حجم الملف كبير', message: 'يرجى اختيار صورة أقل من 3 ميغابايت', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          await saveLogoSettingsMutation.mutateAsync({
            shopLogo: dataUrl,
            logo: dataUrl,
            printLogoWidth: logoWidth,
            printLogoHeight: logoHeight,
            printLogoAlign: logoAlign,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (confirm('هل أنت متأكد من حذف شعار الطباعة؟')) {
      await saveLogoSettingsMutation.mutateAsync({
        shopLogo: '',
        logo: '',
      });
    }
  };

  const handleSaveLogoDimensions = async (w: number, h: number, a: 'right' | 'center' | 'left' | 'auto') => {
    setLogoWidth(w);
    setLogoHeight(h);
    setLogoAlign(a);
    await saveLogoSettingsMutation.mutateAsync({
      printLogoWidth: w,
      printLogoHeight: h,
      printLogoAlign: a,
    });
  };

  // جلب القوالب من قاعدة البيانات
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: async () => {
      await seedDefaultTemplates().catch((err) => {
        console.warn('seedDefaultTemplates error:', err);
      });
      return getAllTemplates();
    },
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
      }
    },
  });

  // إنشاء قالب جديد
  const createMutation = useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!user) throw new Error('يجب تسجيل الدخول');
      const size = input.paperSize;
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

      const selectedColors = themeColors[input.theme] || themeColors.cyan;

      const template = {
        name: input.name.trim() || `قالب ${PAPER_LABELS_AR[size]} جديد`,
        description: input.description.trim() || `قالب مخصص بحجم ${PAPER_LABELS_AR[size]}`,
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

  return {
    user,
    canEdit,
    canDelete,
    canSetDefault,
    // Store settings & logo branding
    storeSettings,
    isLogoHubOpen,
    setIsLogoHubOpen,
    logoWidth,
    logoHeight,
    logoAlign,
    handleLogoUpload,
    handleRemoveLogo,
    handleSaveLogoDimensions,
    // Templates data & status
    templates,
    isLoading,
    stats,
    filteredTemplates,
    // Filters & views
    searchQuery,
    setSearchQuery,
    selectedPaperFilter,
    setSelectedPaperFilter,
    viewMode,
    setViewMode,
    presetCategoryFilter,
    setPresetCategoryFilter,
    // Mutations
    importAllMutation,
    createFromPresetMutation,
    deleteMutation,
    setDefaultMutation,
    duplicateMutation,
    createMutation,
  };
}
