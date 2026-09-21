import React, { useState, useEffect } from 'react';
import {
  Barcode,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Hash,
  Info,
  Layers,
  Tag,
} from 'lucide-react';
import { generateEAN13, generateCode128 } from '@/services/barcode';
import { ProductBarcodeRepository } from '@/infrastructure/database/repositories/ProductBarcodeRepository';
import type { ProductBarcodeType } from '@/infrastructure/database/dexie/db';

export interface LinkedBarcodeItem {
  id?: string;
  barcode: string;
  type: ProductBarcodeType;
  variantLabel?: string;
  batchNumber?: string;
  expiryDate?: string;
}

interface ProductMultipleBarcodesSectionProps {
  primaryBarcode: string;
  onPrimaryBarcodeChange?: (barcode: string) => void;
  linkedBarcodes: LinkedBarcodeItem[];
  onAddBarcode: (item: LinkedBarcodeItem) => void;
  onUpdateBarcode?: (index: number, item: LinkedBarcodeItem) => void;
  onDeleteBarcode: (index: number) => void;
  productId?: string;
  productName?: string;
  disabled?: boolean;
}

export const ProductMultipleBarcodesSection: React.FC<ProductMultipleBarcodesSectionProps> = ({
  primaryBarcode,
  linkedBarcodes,
  onAddBarcode,
  onUpdateBarcode,
  onDeleteBarcode,
  productId,
  productName,
  disabled = false,
}) => {
  // حالة نموذج الإضافة / التعديل
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeType, setBarcodeType] = useState<ProductBarcodeType>('variant');
  const [variantLabel, setVariantLabel] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // أخطاء وتنبيهات
  const [inputError, setInputError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // التحقق الفوري عند تغيير الباركود المدخل
  useEffect(() => {
    const trimmed = barcodeInput.trim();
    if (!trimmed || trimmed.length < 3) {
      setDuplicateWarning(null);
      return;
    }

    // 1. فحص التعارض مع الباركود الرئيسي
    if (primaryBarcode && trimmed === primaryBarcode.trim()) {
      setDuplicateWarning('هذا الباركود مطابق للباركود الرئيسي للمنتج.');
      return;
    }

    // 2. فحص التعارض مع الباركودات المرتبطة المسجلة محلياً
    const existsLocally = linkedBarcodes.some(
      (b, idx) => b.barcode.trim() === trimmed && idx !== editingIndex
    );
    if (existsLocally) {
      setDuplicateWarning('هذا الباركود مضاف بالفعل في قائمة الباركودات الإضافية لهذا المنتج.');
      return;
    }

    // 3. فحص قاعدة البيانات للتأكد من عدم استخدامه في منتج آخر
    let isCancelled = false;
    (async () => {
      try {
        const found = await ProductBarcodeRepository.findByBarcode(trimmed);
        if (!isCancelled && found && found.productId !== productId) {
          setDuplicateWarning(`هذا الباركود مستخدم بالفعل لمنتج آخر في النظام.`);
        } else if (!isCancelled) {
          setDuplicateWarning(null);
        }
      } catch {
        // تجاهل أخطاء الفحص الصامت
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [barcodeInput, primaryBarcode, linkedBarcodes, editingIndex, productId]);

  const resetForm = () => {
    setEditingIndex(null);
    setBarcodeInput('');
    setBarcodeType('variant');
    setVariantLabel('');
    setBatchNumber('');
    setExpiryDate('');
    setInputError(null);
    setDuplicateWarning(null);
  };

  const handleStartEdit = (index: number) => {
    const item = linkedBarcodes[index];
    if (!item) return;
    setEditingIndex(index);
    setBarcodeInput(item.barcode);
    setBarcodeType(item.type || 'variant');
    setVariantLabel(item.variantLabel || '');
    setBatchNumber(item.batchNumber || '');
    setExpiryDate(item.expiryDate || '');
    setInputError(null);
  };

  const handleCopy = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleGenerateEAN13 = () => {
    const code = generateEAN13('22');
    setBarcodeInput(code);
    setInputError(null);
  };

  const handleGenerateCode128 = () => {
    const code = generateCode128('AN');
    setBarcodeInput(code);
    setInputError(null);
  };

  const handleSubmitBarcode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = barcodeInput.trim();
    if (!trimmed) {
      setInputError('يرجى إدخال رقم الباركود أولاً.');
      return;
    }

    if (primaryBarcode && trimmed === primaryBarcode.trim()) {
      setInputError('لا يمكن إضافة الباركود الرئيسي كباركود إضافي.');
      return;
    }

    const existsLocally = linkedBarcodes.some(
      (b, idx) => b.barcode.trim() === trimmed && idx !== editingIndex
    );
    if (existsLocally) {
      setInputError('هذا الباركود مضاف بالفعل لهذا المنتج.');
      return;
    }

    const payload: LinkedBarcodeItem = {
      barcode: trimmed,
      type: barcodeType,
      variantLabel: variantLabel.trim() || undefined,
      batchNumber: barcodeType === 'batch' && batchNumber.trim() ? batchNumber.trim() : undefined,
      expiryDate: barcodeType === 'batch' && expiryDate ? expiryDate : undefined,
    };

    if (editingIndex !== null && onUpdateBarcode) {
      const existingId = linkedBarcodes[editingIndex]?.id;
      onUpdateBarcode(editingIndex, { ...payload, id: existingId });
    } else {
      onAddBarcode(payload);
    }

    resetForm();
  };

  const getTypeBadge = (type: ProductBarcodeType) => {
    switch (type) {
      case 'primary':
        return {
          label: 'باركود بديل',
          className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'variant':
        return {
          label: 'نكهة / صنف / حجم',
          className: 'bg-primary/10 text-primary border-primary/20',
        };
      case 'batch':
        return {
          label: 'تشغيلة / دفعة',
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      default:
        return {
          label: 'إضافي',
          className: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
        };
    }
  };

  return (
    <div className="col-span-2 space-y-5" dir="rtl">
      {/* بطاقة التوجيه والتعليمات */}
      <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <p className="font-bold text-on-surface">
            محرك الباركود المتعدد الذكي لنقطة البيع
          </p>
          <p className="text-on-surface-variant leading-relaxed">
            تتيح لك هذه الميزة ربط عدة باركودات (تغليف جديد، ألوان ونكهات مختلفة، أو باركودات موردين متعددي المصادر) بنفس السلعة.
            عند مسح أي باركود من هذه القائمة في الكاشير، سيتم التعرف على المنتج فوراً وإضافته للسلة.
          </p>
        </div>
      </div>

      {/* بطاقة الباركود الرئيسي الحالي */}
      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Barcode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-label-sm font-bold text-on-surface">الباركود الرئيسي للمنتج</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                الأساسي
              </span>
            </div>
            <p className="font-mono text-body-sm font-bold text-on-surface tracking-wider mt-0.5" dir="ltr">
              {primaryBarcode || 'لم يتم تحديد باركود رئيسي بعد'}
            </p>
          </div>
        </div>

        {primaryBarcode && (
          <button
            type="button"
            onClick={() => handleCopy(primaryBarcode)}
            className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary p-2 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
            title="نسخ الباركود الرئيسي"
          >
            {copiedCode === primaryBarcode ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copiedCode === primaryBarcode ? 'تم النسخ' : 'نسخ'}</span>
          </button>
        )}
      </div>

      {/* نموذج إضافة / تعديل باركود إضافي */}
      <div className="p-4 rounded-2xl bg-surface-container-high/40 border border-outline-variant/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {editingIndex !== null ? <Tag className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <h4 className="font-cairo text-sm font-bold text-on-surface">
              {editingIndex !== null ? 'تعديل بيانات الباركود الإضافي' : 'إضافة باركود إضافي جديد'}
            </h4>
          </div>
          {editingIndex !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* حقل الباركود */}
          <div>
            <label className="block text-label-xs text-on-surface-variant mb-1 font-medium">
              رقم الباركود الإضافي *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="امسح بالماسح الضوئي أو اكتب الرقم"
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setInputError(null);
                }}
                disabled={disabled}
                className={`w-full px-3.5 py-2.5 pl-9 border rounded-xl text-right bg-surface-container transition-all font-mono text-sm ${
                  inputError || duplicateWarning
                    ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                    : 'border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary'
                }`}
              />
              <Barcode className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {inputError && <p className="text-error text-[11px] mt-1">{inputError}</p>}
            {duplicateWarning && !inputError && (
              <p className="text-amber-500 text-[11px] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{duplicateWarning}</span>
              </p>
            )}
          </div>

          {/* نوع الباركود */}
          <div>
            <label className="block text-label-xs text-on-surface-variant mb-1 font-medium">
              نوع الباركود
            </label>
            <select
              value={barcodeType}
              onChange={(e) => setBarcodeType(e.target.value as ProductBarcodeType)}
              disabled={disabled}
              className="w-full px-3.5 py-2.5 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="variant">نكهة / صنف / حجم مختلف (Variant)</option>
              <option value="primary">باركود بديل للمنتج (Alternative)</option>
              <option value="batch">تشغيلة / دفعة إنتاج (Batch)</option>
            </select>
          </div>

          {/* الوصف / الملاحظة */}
          <div className={barcodeType === 'batch' ? 'col-span-1' : 'col-span-2'}>
            <label className="block text-label-xs text-on-surface-variant mb-1 font-medium">
              البيان أو الوصف (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: نكهة الفراولة، عبوة بلاستيكية، كود المورّد"
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value)}
              disabled={disabled}
              className="w-full px-3.5 py-2.5 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
            />
          </div>

          {/* حقول الدفعة في حال اختيار batch */}
          {barcodeType === 'batch' && (
            <>
              <div>
                <label className="block text-label-xs text-on-surface-variant mb-1 font-medium">
                  رقم الدفعة / التشغيلة
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="مثال: BATCH-2026-09"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    disabled={disabled}
                    className="w-full px-3.5 py-2.5 pl-9 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono"
                  />
                  <Hash className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-label-xs text-on-surface-variant mb-1 font-medium">
                  تاريخ انتهاء الصلاحية
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    disabled={disabled}
                    className="w-full px-3.5 py-2.5 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* أزرار التوليد والإضافة */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/15">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateEAN13}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-highest border border-outline-variant/20 rounded-xl text-xs font-semibold text-on-surface transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>توليد EAN-13</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateCode128}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-highest border border-outline-variant/20 rounded-xl text-xs font-semibold text-on-surface transition-all cursor-pointer shadow-2xs"
            >
              <Barcode className="w-3.5 h-3.5 text-primary" />
              <span>توليد CODE128</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSubmitBarcode()}
            disabled={disabled || !barcodeInput.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-xs hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {editingIndex !== null ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>حفظ تعديل الباركود</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة الباركود للقائمة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* قائمة الباركودات المرتبطة المسجلة */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h4 className="font-cairo text-sm font-bold text-on-surface">
              الباركودات المرتبطة المسجلة
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
              {linkedBarcodes.length}
            </span>
          </div>
        </div>

        {linkedBarcodes.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/30 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-surface-container-highest text-on-surface-variant mx-auto flex items-center justify-center">
              <Barcode className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-xs font-bold text-on-surface">لا يوجد باركود إضافي مرتبط حتى الآن</p>
            <p className="text-[11px] text-on-surface-variant max-w-md mx-auto">
              يمكنك مسح أو توليد باركودات إضافية بالأعلى وربطها بهذا المنتج ليتعرف عليها الكاشير فوراً.
            </p>
          </div>
        ) : (
          <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface-container-low">
            <div className="divide-y divide-outline-variant/15">
              {linkedBarcodes.map((item, idx) => {
                const badge = getTypeBadge(item.type);
                const isSelected = editingIndex === idx;

                return (
                  <div
                    key={item.id || `${item.barcode}-${idx}`}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                        <Barcode className="w-4 h-4 text-on-surface-variant" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-mono text-body-sm font-bold text-on-surface tracking-wider"
                            dir="ltr"
                          >
                            {item.barcode}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {item.variantLabel && (
                          <p className="text-xs text-on-surface-variant font-medium truncate">
                            {item.variantLabel}
                          </p>
                        )}

                        {(item.batchNumber || item.expiryDate) && (
                          <div className="flex items-center gap-3 text-[11px] text-on-surface-variant font-mono">
                            {item.batchNumber && <span>دفعة: {item.batchNumber}</span>}
                            {item.expiryDate && <span>صلاحية: {item.expiryDate}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.barcode)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer"
                        title="نسخ الباركود"
                      >
                        {copiedCode === item.barcode ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {onUpdateBarcode && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(idx)}
                          disabled={disabled}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteBarcode(idx)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                        title="حذف هذا الباركود"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductMultipleBarcodesSection;
