// BarcodeLabelsPage — شاشة استوديو طباعة وتصميم ملصقات الباركود المتطورة (Refactored Modular Architecture)
import React, { useMemo } from 'react';
import { useBarcodeLabelsData } from './hooks/useBarcodeLabelsData';
import { useBarcodeLabelFilters } from './hooks/useBarcodeLabelFilters';
import { useBarcodeLabelConfig } from './hooks/useBarcodeLabelConfig';
import { useBarcodePrintMutation } from './hooks/useBarcodePrintMutation';
import { buildProductLabelItems } from './services/barcodeLabelGenerator';
import { BarcodeLabelsHeader } from './components/BarcodeLabelsHeader';
import { BarcodePrintHistoryModal } from './components/BarcodePrintHistoryModal';
import { ProductSelectionPanel } from './components/ProductSelectionPanel';
import { LabelConfiguratorPanel } from './components/LabelConfiguratorPanel';
import { LabelPreviewSandbox } from './components/LabelPreviewSandbox';

// إعادة تصدير متوافقة عكسياً بنسبة 100% مع أي استيراد سابق
export type { BarcodeFormat, LabelSize } from './types';
export { LABEL_SIZES, BARCODE_FORMATS } from './constants/labelConfigs';

export default function BarcodeLabelsPage() {
  // 1. استعلامات البيانات (Dexie, Settings, Barcodes, Print History)
  const {
    products,
    printHistory,
    productBars,
    categories,
    baseCurrency,
    shopName,
  } = useBarcodeLabelsData();

  // 2. حالة التخصيص والمقاسات والزووم (Config & Zoom State)
  const {
    opts,
    updateOpts,
    labelSize,
    previewVisible,
    setPreviewVisible,
    showHistory,
    setShowHistory,
    previewZoom,
    zoomIn,
    zoomOut,
  } = useBarcodeLabelConfig();

  // 3. التصفية والبحث وإدارة الاختيار الجماعي (Filters & Selection)
  const {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    selectedIds,
    filteredProducts,
    toggleSelect,
    selectAll,
    clearAll,
    generateForAll,
  } = useBarcodeLabelFilters({
    products,
    productBars,
    barcodeFormat: opts.barcodeFormat,
  });

  // 4. بناء بنود وتكرارات الملصقات الجاهزة للطباعة
  const labelItems = useMemo(() => {
    return buildProductLabelItems({
      selectedIds,
      products,
      productBars,
      opts,
    });
  }, [selectedIds, products, productBars, opts]);

  // 5. محرك أمر وطفرة الطباعة
  const { handlePrint, isSaving } = useBarcodePrintMutation();

  const onExecutePrint = () => {
    handlePrint(labelItems, opts);
  };

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in font-tajawal" dir="rtl">
      {/* ترويسة استوديو الملصقات مع أزرار الإجراءات */}
      <BarcodeLabelsHeader
        printHistoryCount={printHistory.length}
        previewVisible={previewVisible}
        labelItemsCount={labelItems.length}
        isPrinting={isSaving}
        onToggleHistory={() => setShowHistory((v) => !v)}
        onTogglePreview={() => setPreviewVisible((v) => !v)}
        onPrint={onExecutePrint}
      />

      {/* نافذة سجل عمليات الطباعة السابقة */}
      <BarcodePrintHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={printHistory}
      />

      {/* شبكة الاستوديو الثلاثية الأعمدة */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* العمود 1: اختيار والبحث عن المنتجات (4 أعمدة) */}
        <ProductSelectionPanel
          products={products}
          filteredProducts={filteredProducts}
          selectedIds={selectedIds}
          productBars={productBars}
          search={search}
          setSearch={setSearch}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          baseCurrency={baseCurrency}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onClearAll={clearAll}
          onGenerateForAll={generateForAll}
        />

        {/* العمود 2: لوحة تخصيص المقاسات والصيغ والنسخ (4 أعمدة) */}
        <LabelConfiguratorPanel
          opts={opts}
          labelSize={labelSize}
          onUpdateOpts={updateOpts}
        />

        {/* العمود 3: المعاينة الحية وشبكة الطباعة A4 (4 أعمدة) */}
        {previewVisible && (
          <LabelPreviewSandbox
            labelItems={labelItems}
            labelSize={labelSize}
            opts={opts}
            shopName={shopName}
            baseCurrency={baseCurrency}
            previewZoom={previewZoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
          />
        )}
      </div>
    </div>
  );
}
