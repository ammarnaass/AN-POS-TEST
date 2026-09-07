// تبويب مركز النسخ الاحتياطي والاستعادة الشاملة (Export & Backup Center)
// يوفر تصدير واستيراد كامل لكافة الجداول الـ 25 مع حفظ كامل للصور، الشعار،
// عبوات الجملة، المبيعات، والقوالب. يدعم بيئة Electron الأصلية والمتصفح.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import {
  Download,
  Upload,
  HardDrive,
  Database,
  Image as ImageIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Package,
  ShieldCheck,
  Sparkles,
  Clock,
  X,
  FileJson,
  Users,
  Receipt,
  Palette,
  FileCode2,
} from 'lucide-react';
import {
  getLiveDatabaseStats,
  generateComprehensiveBackup,
  saveBackupToFile,
  inspectBackupFile,
  executeRestore,
  exportRawDatabaseFile,
  type LiveDbStats,
  type BackupInspectionResult,
} from '@/services/backup/backupService';
import { db } from '@/lib/db';

interface ExportBackupTabProps {
  handleExportBackup?: () => Promise<void>;
  handleExportExcel?: () => Promise<void>;
  handleImportBackup?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

export default function ExportBackupTab({ handleExportExcel: propExportExcel }: ExportBackupTabProps) {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  // الحالة العامة
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<LiveDbStats | null>(null);
  const [exportingFull, setExportingFull] = useState(false);
  const [exportingDb, setExportingDb] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // حالة نافذة فحص واسترجاع النسخة
  const [inspectionResult, setInspectionResult] = useState<BackupInspectionResult | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'clean'>('merge');
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحديث إحصائيات قاعدة البيانات الحية
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getLiveDatabaseStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // تصدير النسخة الاحتياطية الشاملة الكاملة
  const handleComprehensiveExport = async () => {
    setExportingFull(true);
    try {
      const backup = await generateComprehensiveBackup();
      const res = await saveBackupToFile(backup);

      if (res.saved) {
        addNotification({
          title: 'تم التصدير بنجاح',
          message: `تم حفظ النسخة الاحتياطية بنجاح (${backup.metadata.stats.productsCount} صنف، ${backup.metadata.stats.imagesCount} صورة محفوظة، ${backup.metadata.stats.totalSizeEstMB} ميغابايت)`,
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('Export backup failed:', err);
      addNotification({
        title: 'خطأ في التصدير',
        message: err?.message || 'تعذر تصدير النسخة الاحتياطية',
        type: 'error',
      });
    } finally {
      setExportingFull(false);
    }
  };

  // تصدير ملف قاعدة بيانات SQLite الخام (.db)
  const handleRawDbExport = async () => {
    setExportingDb(true);
    try {
      const res = await exportRawDatabaseFile();
      if (res.success) {
        addNotification({
          title: 'تم تصدير قاعدة البيانات',
          message: 'تم حفظ نسخة مطابقة من ملف an-pos.db بنجاح',
          type: 'success',
        });
      } else if (!res.canceled) {
        addNotification({
          title: 'تنبيه',
          message: res.error || 'تعذر تصدير ملف قاعدة البيانات',
          type: 'warning',
        });
      }
    } catch (err: any) {
      addNotification({
        title: 'خطأ',
        message: err?.message || 'فشل تصدير ملف قاعدة البيانات',
        type: 'error',
      });
    } finally {
      setExportingDb(false);
    }
  };

  // تصدير المنتجات إلى CSV / Excel
  const handleCsvExport = async () => {
    if (propExportExcel) {
      return propExportExcel();
    }
    setExportingCsv(true);
    try {
      const products = await db.products.toArray();
      const csvHeader = 'الاسم,الباركود,التصنيف,سعر التكلفة,سعر الجملة,سعر التجزئة,الكمية,الحد الأدنى\n';
      const csvRows = products
        .map(
          (p: any) =>
            `"${p.name || ''}","${p.barcode || ''}","${p.category || ''}",${p.costPrice || 0},${
              p.wholesalePrice || 0
            },${p.retailPrice || 0},${p.quantity || 0},${p.lowStockThreshold || 0}`
        )
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      addNotification({
        title: 'تم التصدير',
        message: 'تم تصدير المنتجات إلى ملف Excel بنجاح',
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'خطأ',
        message: err?.message || 'فشل تصدير المنتجات',
        type: 'error',
      });
    } finally {
      setExportingCsv(false);
    }
  };

  // عند اختيار ملف النسخة الاحتياطية للاسترجاع (فحص الملف وعرض النافذة)
  const onFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = inspectBackupFile(content);

      if (!result.valid) {
        addNotification({
          title: 'ملف غير صالح',
          message: result.error || 'الملف المحدد لا يحتوي على بيانات نسخة احتياطية متوافقة',
          type: 'error',
        });
        return;
      }

      setInspectionResult(result);
      setShowRestoreModal(true);
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // تنفيذ الاسترجاع بعد تأكيد المستخدم
  const handleConfirmRestore = async () => {
    if (!inspectionResult) return;

    setIsRestoring(true);
    setRestoreProgress('جاري معالجة البيانات...');

    try {
      // 1. أخذ نسخة أمان إذا تم طلبها
      if (createSafetyBackup) {
        setRestoreProgress('جاري أخذ نسخة أمان سريعة قبل التعديل...');
        try {
          const safety = await generateComprehensiveBackup();
          // حفظها تلقائياً في التخزين المحلي أو التنزيل
          const blob = new Blob([JSON.stringify(safety)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `safety-backup-before-restore-${new Date().toISOString().slice(0, 10)}.anpos.json`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (safetyErr) {
          console.warn('Safety backup download skipped:', safetyErr);
        }
      }

      // 2. تطبيق الاستعادة
      setRestoreProgress('جاري كتابة السجلات وتثبيت الصور في قاعدة البيانات...');
      const res = await executeRestore(
        { data: inspectionResult.parsedData },
        restoreMode
      );

      // 3. تحديث كافة الاستعلامات والواجهات
      setRestoreProgress('جاري تحديث واجهة النظام...');
      await queryClient.invalidateQueries();
      await loadStats();

      setShowRestoreModal(false);
      setInspectionResult(null);

      const totalImported = Object.values(res.importedCounts || {}).reduce((a, b) => a + b, 0);

      addNotification({
        title: 'تم استرجاع البيانات بنجاح',
        message: `تم استيراد ${totalImported} سجل بنجاح بما فيها جميع صور المنتجات وإعدادات المتجر.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Restore failed:', err);
      addNotification({
        title: 'فشل الاسترجاع',
        message: err?.message || 'حدث خطأ أثناء استيراد النسخة الاحتياطية',
        type: 'error',
      });
    } finally {
      setIsRestoring(false);
      setRestoreProgress('');
    }
  };

  const isElectron = Boolean(window.electronAPI);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. رأس الصفحة والتعريف بالخدمة */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
              <HardDrive className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-bold text-on-surface">مركز النسخ الاحتياطي والاستعادة</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  حفظ الصور بنسبة 100%
                </span>
              </div>
              <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">
                حفظ واسترجاع كافة بيانات المتجر (25 جدولاً تشغيلياً) بما في ذلك صور المنتجات والشعار، عبوات الجملة، المبيعات، الحسابات، وقوالب الطباعة المخصصة.
              </p>
            </div>
          </div>

          <button
            onClick={loadStats}
            disabled={loadingStats}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl border border-outline-variant/30 hover:bg-surface-variant/40 text-on-surface transition-all active:scale-95 disabled:opacity-50"
            title="تحديث الإحصائيات الحية"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin text-primary' : ''}`} />
            تحديث الحالة
          </button>
        </div>

        {/* 2. بطاقات الإحصائيات المباشرة للبيانات الحالية */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-outline-variant/15">
          <div className="bg-surface/50 border border-outline-variant/20 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-xs font-medium">المنتجات</span>
              <Package className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg font-bold text-on-surface">
              {loadingStats ? '...' : stats?.productsCount.toLocaleString() ?? 0}
            </p>
            <span className="text-[10px] text-on-surface-variant/70">صنف مسجل</span>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-xs font-medium">صور المنتجات</span>
              <ImageIcon className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {loadingStats ? '...' : stats?.imagesCount.toLocaleString() ?? 0}
            </p>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">محفوظة بالكامل</span>
          </div>

          <div className="bg-surface/50 border border-outline-variant/20 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-xs font-medium">عبوات الجملة</span>
              <Layers className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-lg font-bold text-on-surface">
              {loadingStats ? '...' : stats?.packsCount.toLocaleString() ?? 0}
            </p>
            <span className="text-[10px] text-on-surface-variant/70">باقة / كرتونة</span>
          </div>

          <div className="bg-surface/50 border border-outline-variant/20 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-xs font-medium">العملاء والموردون</span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-on-surface">
              {loadingStats ? '...' : ((stats?.customersCount ?? 0) + (stats?.suppliersCount ?? 0)).toLocaleString()}
            </p>
            <span className="text-[10px] text-on-surface-variant/70">طرف مسجل</span>
          </div>

          <div className="bg-surface/50 border border-outline-variant/20 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-xs font-medium">المبيعات والحركات</span>
              <Receipt className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-lg font-bold text-on-surface">
              {loadingStats ? '...' : stats?.salesCount.toLocaleString() ?? 0}
            </p>
            <span className="text-[10px] text-on-surface-variant/70">فاتورة بيع</span>
          </div>

          <div className="bg-surface/50 border border-outline-variant/20 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-xs font-medium">حجم التخزين التقديري</span>
              <Database className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-lg font-bold text-on-surface">
              {loadingStats ? '...' : `${stats?.sizeEstMB ?? 0} ميغابايت`}
            </p>
            <span className="text-[10px] text-on-surface-variant/70">شامل كافة الصور</span>
          </div>
        </div>
      </div>

      {/* 3. قسم خيارات التصدير (Export Actions) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-on-surface">خيارات التصدير والنسخ الاحتياطي</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* كارت النسخة الشاملة الكاملة (الموصى به) */}
          <div className="relative flex flex-col justify-between p-6 rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-primary/10 via-surface to-surface shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-on-primary">
                <Sparkles className="w-3 h-3" />
                شامل وموصى به
              </span>
            </div>

            <div>
              <div className="p-3 w-fit rounded-xl bg-primary/20 text-primary mb-4">
                <FileJson className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-on-surface mb-2">النسخة الاحتياطية الشاملة</h3>
              <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                ملف JSON متكامل يشمل كافة الجداول التشغيلية، وصور المنتجات عالية الجودة، وشعار المتجر، والمبيعات، والقوالب.
              </p>

              <ul className="space-y-1.5 mb-6 text-xs text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>حفظ كامل لصور المنتجات (Base64)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>عبوات الجملة والتسعير والباركودات</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>الفواتير، العملاء، والموردين</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>قوالب الطباعة المخصصة وإعدادات المحل</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleComprehensiveExport}
              disabled={exportingFull}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-on-primary font-semibold text-xs shadow-md hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${exportingFull ? 'animate-bounce' : ''}`} />
              {exportingFull ? 'جاري تجهيز النسخة الكاملة...' : 'تصدير النسخة الاحتياطية الآن'}
            </button>
          </div>

          {/* كارت قاعدة بيانات SQLite الخام */}
          <div className="flex flex-col justify-between p-6 rounded-2xl border border-outline-variant/25 bg-surface hover:border-outline-variant/50 transition-all shadow-sm">
            <div>
              <div className="p-3 w-fit rounded-xl bg-sky-500/10 text-sky-500 mb-4">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-on-surface mb-2">قاعدة بيانات SQLite (.db)</h3>
              <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                نسخة ثنائية مطابقة للأصل لملف an-pos.db الخاص بالنظام. سريعة ومثالية للنقل الفوري أو الاسترجاع الطارئ على أجهزة أخرى.
              </p>

              <div className="p-3 rounded-xl bg-surface-variant/30 border border-outline-variant/20 mb-6 text-xs text-on-surface-variant space-y-1">
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-primary" />
                  ملف قاعدة البيانات الخام
                </p>
                <p className="text-[11px]">مخصص لتطبيق سطح المكتب لعمل نسخة سريعة متكاملة.</p>
              </div>
            </div>

            <button
              onClick={handleRawDbExport}
              disabled={exportingDb || !isElectron}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-outline-variant/30 hover:bg-surface-variant/40 text-on-surface font-semibold text-xs transition-all active:scale-98 disabled:opacity-40"
              title={!isElectron ? 'متاح فقط في نسخة سطح المكتب' : undefined}
            >
              <Database className="w-4 h-4 text-sky-500" />
              {exportingDb ? 'جاري تصدير الملف...' : 'حفظ نسخة قاعدة البيانات (.db)'}
            </button>
          </div>

          {/* كارت تصدير Excel / CSV */}
          <div className="flex flex-col justify-between p-6 rounded-2xl border border-outline-variant/25 bg-surface hover:border-outline-variant/50 transition-all shadow-sm">
            <div>
              <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-500 mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-on-surface mb-2">جدول المنتجات (Excel / CSV)</h3>
              <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                تصدير قائمة المنتجات فقط كجدول بيانات متوافق مع Microsoft Excel أو برامج الجرد لمراجعة الأسعار والكميات.
              </p>

              <div className="p-3 rounded-xl bg-surface-variant/30 border border-outline-variant/20 mb-6 text-xs text-on-surface-variant space-y-1">
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  حقول الجدول
                </p>
                <p className="text-[11px]">الاسم، الباركود، التصنيف، سعر التكلفة، الجملة، التجزئة، والكمية.</p>
              </div>
            </div>

            <button
              onClick={handleCsvExport}
              disabled={exportingCsv}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-outline-variant/30 hover:bg-surface-variant/40 text-on-surface font-semibold text-xs transition-all active:scale-98 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              {exportingCsv ? 'جاري التصدير...' : 'تصدير المنتجات لـ Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. قسم استرجاع النسخ الاحتياطية (Restore Section) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-tertiary" />
          <h2 className="text-base font-bold text-on-surface">استرجاع واستيراد نسخة احتياطية</h2>
        </div>

        <div className="p-8 rounded-2xl border-2 border-dashed border-outline-variant/30 bg-surface/50 hover:bg-surface-variant/20 hover:border-primary/50 transition-all text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-tertiary/10 text-tertiary border border-tertiary/20 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-on-surface mb-2">حدد ملف النسخة الاحتياطية للاسترجاع</h3>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
              اختر ملف نسخة احتياطية بصيغة <span className="font-mono text-primary font-bold">.anpos.json</span> أو <span className="font-mono font-bold">.json</span>. سيتم فحص محتويات الملف وعرض إحصائياته بدقة قبل إجراء أي تعديل على قاعدة البيانات.
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-tertiary text-on-tertiary font-semibold text-xs shadow-md hover:brightness-110 active:scale-98 transition-all"
            >
              <Upload className="w-4 h-4" />
              اختيار ملف النسخة الاحتياطية
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.anpos.json"
              onChange={onFileSelectForRestore}
              className="hidden"
            />

            <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-on-surface-variant/70">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                فحص ومعاينة قبل الاستعادة
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                استعادة الصور بدقة 100%
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                خيار دمج ذكي بدون حذف
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. نافذة المعاينة والتأكيد قبل استرجاع النسخة (Inspection & Confirmation Modal) */}
      {showRestoreModal && inspectionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 bg-surface-variant/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-base">فحص ومعاينة النسخة الاحتياطية</h3>
                  <p className="text-xs text-on-surface-variant">تأكد من تفاصيل الملف قبل تطبيق الاسترجاع</p>
                </div>
              </div>

              {!isRestoring && (
                <button
                  onClick={() => setShowRestoreModal(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* تفاصيل الملف */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-variant/20 border border-outline-variant/20 text-xs">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>تاريخ النسخة:</span>
                  <span className="font-semibold text-on-surface">
                    {inspectionResult.summary.exportDate
                      ? new Date(inspectionResult.summary.exportDate).toLocaleString('ar-EG')
                      : 'غير محدد'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span>الإصدار:</span>
                  <span className="font-semibold text-on-surface">
                    {inspectionResult.summary.appVersion || 'AN POS 3.5'}
                  </span>
                </div>
              </div>

              {/* بطاقات ملخص السجلات داخل الملف */}
              <div>
                <h4 className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  محتويات الملف المكتشفة:
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl border border-outline-variant/20 bg-surface/60">
                    <p className="text-on-surface-variant text-[11px] mb-1">المنتجات</p>
                    <p className="text-base font-bold text-on-surface">
                      {inspectionResult.summary.productsCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-emerald-600 dark:text-emerald-400 text-[11px] mb-1 font-medium">الصور المحفوظة</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {inspectionResult.summary.imagesCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-outline-variant/20 bg-surface/60">
                    <p className="text-on-surface-variant text-[11px] mb-1">عبوات الجملة</p>
                    <p className="text-base font-bold text-on-surface">
                      {inspectionResult.summary.packsCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-outline-variant/20 bg-surface/60">
                    <p className="text-on-surface-variant text-[11px] mb-1">العملاء والموردين</p>
                    <p className="text-base font-bold text-on-surface">
                      {(inspectionResult.summary.customersCount + inspectionResult.summary.suppliersCount).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-outline-variant/20 bg-surface/60">
                    <p className="text-on-surface-variant text-[11px] mb-1">الفواتير</p>
                    <p className="text-base font-bold text-on-surface">
                      {inspectionResult.summary.salesCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-outline-variant/20 bg-surface/60">
                    <p className="text-on-surface-variant text-[11px] mb-1">قوالب الطباعة</p>
                    <p className="text-base font-bold text-on-surface">
                      {inspectionResult.summary.templatesCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-outline-variant/20 bg-surface/60 col-span-2">
                    <p className="text-on-surface-variant text-[11px] mb-1">إجمالي السجلات المفحوصة</p>
                    <p className="text-base font-bold text-primary">
                      {inspectionResult.summary.totalRecords.toLocaleString()} سجل
                    </p>
                  </div>
                </div>
              </div>

              {/* خيارات طريقة الاسترجاع */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-on-surface">طريقة استرجاع البيانات:</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      restoreMode === 'merge'
                        ? 'border-primary bg-primary/5 text-on-surface'
                        : 'border-outline-variant/20 hover:bg-surface-variant/20 text-on-surface-variant'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="mt-1 text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-xs font-bold text-on-surface">دمج ذكي (مستحسن)</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                        تحديث السجلات الموجودة وإضافة الجديدة دون مسح البيانات الحالية الأخرى.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      restoreMode === 'clean'
                        ? 'border-rose-500 bg-rose-500/5 text-on-surface'
                        : 'border-outline-variant/20 hover:bg-surface-variant/20 text-on-surface-variant'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'clean'}
                      onChange={() => setRestoreMode('clean')}
                      className="mt-1 text-rose-500 focus:ring-rose-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-rose-500">استبدال كامل ونظيف</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                        مسح الجداول الحالية بالكامل واستبدالها بمحتوى النسخة الاحتياطية.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* خيار أخذ نسخة أمان */}
              <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-variant/20 border border-outline-variant/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createSafetyBackup}
                  onChange={(e) => setCreateSafetyBackup(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-xs text-on-surface font-medium">
                  أخذ نسخة احتياطية تلقائية من بياناتك الحالية قبل بدء الاسترجاع كإجراء وقائي
                </span>
              </label>

              {/* مؤشر حالة التقدم أثناء الاسترجاع */}
              {isRestoring && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-primary animate-spin shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-on-surface">جاري استرجاع النسخة الاحتياطية...</p>
                    <p className="text-[11px] text-on-surface-variant">{restoreProgress}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-outline-variant/20 bg-surface-variant/10">
              <button
                onClick={() => setShowRestoreModal(false)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:bg-surface-variant/50 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isRestoring ? 'جاري الاسترجاع...' : 'تأكيد واسترجاع البيانات الآن'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
