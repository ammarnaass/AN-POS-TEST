import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  X,
  Printer,
  FileText,
  Globe,
  Plus,
  Minus,
  Check,
  RotateCw,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { printInvoice, type PrintInvoiceData } from '@/lib/print';
import {
  getTemplateById,
  getDefaultTemplate,
  getDocTypeAssignment,
  interpolateVariables,
  DEFAULT_THERMAL_80,
} from '@/lib/templateService';
import type {
  DocTypeKey,
  PrintTemplate,
} from '@shared/types/invoicePrint';
import { PAPER_LABELS_AR, DOC_TYPE_LABELS_AR } from '@shared/types/invoicePrint';
import {
  TemplateLanguage,
  TRANSLATIONS,
  translatePhrase,
  formatCurrency,
  formatDate,
  getLocalizedDocType,
  getLocalizedPaymentMethod,
  getLocalizedColumns,
} from '@shared/services/templateTranslator';
import { useThemeStore } from '@/store/themeStore';
import { radii, spacing, shadows, typography } from '@/theme';
import { BarcodeSvg } from '@/lib/barcodeSvg';
import { notify } from '@/lib/notify';

interface InvoicePrintPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  saleId?: string;
  invoiceData?: PrintInvoiceData;
  templateId?: string;
  sampleDocType?: DocTypeKey;
}

const LANGUAGES: Array<{ key: TemplateLanguage; label: string; flag: string }> = [
  { key: 'ar', label: 'العربية', flag: '🇩🇿' },
  { key: 'ar-fr', label: 'عربي / FR', flag: '🌐' },
  { key: 'fr', label: 'Français', flag: '🇫🇷' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
];

function safeParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(String(val));
  } catch {
    return fallback;
  }
}

export const InvoicePrintPreviewModal = ({
  visible,
  onClose,
  saleId,
  invoiceData: customInvoiceData,
  templateId: initialTemplateId,
  sampleDocType = 'sale-invoice',
}: InvoicePrintPreviewModalProps) => {
  const { colors, isDark } = useThemeStore();
  const [template, setTemplate] = useState<PrintTemplate>(DEFAULT_THERMAL_80);
  const [data, setData] = useState<PrintInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [copies, setCopies] = useState(1);
  const [selectedLang, setSelectedLang] = useState<TemplateLanguage>('ar');

  useEffect(() => {
    if (visible) {
      loadPreviewData();
    }
  }, [visible, saleId, customInvoiceData, initialTemplateId, sampleDocType]);

  async function loadPreviewData() {
    setLoading(true);
    try {
      await ensureInit();

      // 1. Resolve template
      let tpl: PrintTemplate | undefined;
      try {
        if (initialTemplateId) {
          tpl = await getTemplateById(initialTemplateId);
        } else {
          const assign = await getDocTypeAssignment(sampleDocType);
          if (assign?.templateId) {
            tpl = await getTemplateById(assign.templateId);
          }
        }
        if (!tpl) {
          tpl = await getDefaultTemplate();
        }
      } catch (err) {
        console.warn('[InvoicePreview] Template fetch error:', err);
      }

      const activeTpl = tpl || DEFAULT_THERMAL_80;
      const normalizedTpl: PrintTemplate = {
        ...activeTpl,
        layout: safeParse(activeTpl.layout, DEFAULT_THERMAL_80.layout),
        styles: safeParse(activeTpl.styles, DEFAULT_THERMAL_80.styles),
        visibility: safeParse(activeTpl.visibility, DEFAULT_THERMAL_80.visibility),
      };
      setTemplate(normalizedTpl);

      // 2. Resolve invoice data
      if (customInvoiceData && (customInvoiceData.items?.length || customInvoiceData.number)) {
        setData(customInvoiceData);
      } else if (saleId) {
        let sale = await db.sales.get(saleId);
        if (!sale) {
          const allSales = await db.sales.toArray();
          sale = allSales.find((s: any) => s.id === saleId || s.number === saleId);
        }

        if (sale) {
          let rawItems: any[] = [];
          if (Array.isArray(sale.items)) {
            rawItems = sale.items;
          } else if (typeof sale.items === 'string') {
            try {
              const parsed = JSON.parse(sale.items);
              if (Array.isArray(parsed)) rawItems = parsed;
              else if (parsed && typeof parsed === 'object') rawItems = Object.values(parsed);
            } catch {
              rawItems = [];
            }
          } else if (sale.items && typeof sale.items === 'object') {
            rawItems = Object.values(sale.items);
          }

          // If rawItems is still empty, look up in sale_items table
          if (!rawItems || rawItems.length === 0) {
            try {
              const allSaleItems = await db.saleItems.toArray();
              const matching = allSaleItems.filter(
                (si: any) => si.saleId === sale.id || si.sale_id === sale.id
              );
              if (matching.length > 0) {
                rawItems = matching.map((si: any) => ({
                  name: si.name,
                  qty: si.qty || si.quantity || 1,
                  unitPrice: si.unitPrice || si.unit_price || 0,
                  lineTotal:
                    si.lineTotal ||
                    si.line_total ||
                    (si.qty || 1) * (si.unitPrice || si.unit_price || 0),
                }));
              }
            } catch (err) {
              console.warn('[InvoicePreview] Lookup in sale_items error:', err);
            }
          }

          setData({
            id: sale.id,
            number: sale.number || 'INV-0001',
            date: sale.date || sale.created_at || new Date().toISOString(),
            items: (Array.isArray(rawItems) ? rawItems : []).map((i: any) => ({
              name: i?.name || 'منتج',
              qty: Number(i?.qty || i?.quantity || 1),
              unitPrice: Number(i?.unitPrice || i?.unit_price || 0),
              lineTotal: Number(i?.lineTotal || i?.line_total || (i?.qty || 1) * (i?.unitPrice || 0)),
            })),
            subtotal: Number(sale.subtotal || sale.total || 0),
            discount: Number(sale.discount || 0),
            tvaAmount: Number(sale.tvaAmount || sale.tva_amount || 0),
            total: Number(sale.total || 0),
            paymentMethod: sale.paymentMethod || sale.payment_method || 'cash',
            customerName: sale.customerName || sale.customer_name || 'زبون عام',
            soldBy: sale.soldBy || sale.sold_by || 'الكاشير',
            docType: sampleDocType,
          });
        } else {
          setData(getFallbackInvoice(sampleDocType));
        }
      } else {
        setData(getFallbackInvoice(sampleDocType));
      }
    } catch (err) {
      console.warn('[InvoicePreview] Failed to load invoice preview:', err);
      setData(getFallbackInvoice(sampleDocType));
    }
    setLoading(false);
  }

  function getFallbackInvoice(docType: string): PrintInvoiceData {
    return {
      number: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      items: [
        { name: 'منتج تجريبي 1', qty: 2, unitPrice: 500, lineTotal: 1000 },
        { name: 'منتج تجريبي 2', qty: 1, unitPrice: 350, lineTotal: 350 },
      ],
      subtotal: 1350,
      discount: 0,
      tvaAmount: 0,
      total: 1350,
      paymentMethod: 'cash',
      customerName: 'زبون عام (نقدي)',
      soldBy: 'الكاشير',
      docType: docType as any,
    };
  }

  const handlePrint = async () => {
    if (!data) return;
    setPrinting(true);
    try {
      const ok = await printInvoice({
        ...data,
        templateId: template?.id,
        copies,
        lang: selectedLang,
      });
      if (ok) {
        notify.success('تم إرسال الفاتورة إلى الطابعة بنجاح', '✓ تمت الطباعة');
        onClose();
      } else {
        notify.warning('تعذر الاتصال بالطابعة مباشرة. يرجى مراجعة إعدادات الطابعة.', 'تنبيه الطباعة');
      }
    } catch (err) {
      notify.error(err, 'فشل تنفيذ أمر الطباعة');
    }
    setPrinting(false);
  };

  if (!visible) return null;

  const layout = safeParse(template.layout, DEFAULT_THERMAL_80.layout);
  const tplStyles = safeParse(template.styles, DEFAULT_THERMAL_80.styles);
  const currentDict = TRANSLATIONS[selectedLang] || TRANSLATIONS.ar;

  // Context for interpolation with localization (Memoized for peak scroll performance)
  const renderContext = React.useMemo(() => {
    const rawDate = data?.date || new Date().toISOString();
    const formattedDate = formatDate(rawDate, selectedLang);
    const localizedPayment = getLocalizedPaymentMethod(data?.paymentMethod || 'cash', selectedLang);

    return {
      invoice: {
        ...(data || {}),
        date: formattedDate,
        paymentMethod: localizedPayment,
        totalFormatted: formatCurrency(data?.total || 0, selectedLang),
        subtotalFormatted: formatCurrency(data?.subtotal || 0, selectedLang),
      },
      shopLegal: {
        name: 'AN POS - متجر المستقبل',
        phone: '0550 00 00 00',
        address: selectedLang === 'fr' ? 'Alger, Algérie' : selectedLang === 'en' ? 'Algiers, Algeria' : 'الجزائر العاصمة',
        footer: currentDict.defaultFooter,
        nif: '001616012345678',
      },
      user: { name: data?.soldBy || (selectedLang === 'fr' ? 'Caissier' : 'الكاشير') },
    };
  }, [data, selectedLang, currentDict]);

  const dynamicStyles = React.useMemo(
    () => makeStyles(colors, isDark, selectedLang),
    [colors, isDark, selectedLang]
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dynamicStyles.modalOverlay}>
        <View style={dynamicStyles.modalContent}>
          {/* Header */}
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={dynamicStyles.closeBtn}>
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={{ alignItems: selectedLang === 'ar' || selectedLang === 'ar-fr' ? 'flex-end' : 'flex-start' }}>
              <Text style={dynamicStyles.modalTitle}>
                {selectedLang === 'fr'
                  ? 'Aperçu et Impression'
                  : selectedLang === 'en'
                  ? 'Invoice Print Preview'
                  : 'معاينة وطباعة الفاتورة'}
              </Text>
              <Text style={dynamicStyles.modalSubtitle}>
                {template?.name || 'القالب الافتراضي'} • {getLocalizedDocType(sampleDocType, selectedLang)} •{' '}
                {PAPER_LABELS_AR[template?.paperSize || '80mm']}
              </Text>
            </View>
          </View>

          {/* Languages Selector */}
          <View style={dynamicStyles.langRow}>
            <Globe size={14} color={colors.text.tertiary} />
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[
                  dynamicStyles.langChip,
                  selectedLang === l.key && dynamicStyles.langChipActive,
                ]}
                onPress={() => setSelectedLang(l.key)}
                activeOpacity={0.7}
              >
                <Text style={dynamicStyles.langFlag}>{l.flag}</Text>
                <Text
                  style={[
                    dynamicStyles.langText,
                    selectedLang === l.key && dynamicStyles.langTextActive,
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Paper Sheet Preview Area */}
          <View style={dynamicStyles.previewContainer}>
            {loading ? (
              <View style={dynamicStyles.center}>
                <ActivityIndicator size="large" color={colors.primary[600]} />
                <Text style={[dynamicStyles.emptyText, { marginTop: spacing.md }]}>
                  {selectedLang === 'fr' ? 'Génération de l’aperçu...' : 'جاري تجهيز معاينة الفاتورة...'}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={dynamicStyles.previewScroll}
                contentContainerStyle={dynamicStyles.previewScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={[
                    dynamicStyles.invoiceSheet,
                    {
                      width:
                        template.paperSize === '58mm'
                          ? 230
                          : template.paperSize === '80mm'
                          ? 295
                          : '96%',
                    },
                  ]}
                >
                  {/* Header Section */}
                  {(layout.header || DEFAULT_THERMAL_80.layout.header).map((b: any, i: number) => (
                    <View key={`h-${i}`} style={{ width: '100%' }}>
                      {renderBlock(b, renderContext, template, tplStyles, selectedLang, dynamicStyles)}
                    </View>
                  ))}

                  {/* Body Section */}
                  {(layout.body || DEFAULT_THERMAL_80.layout.body).map((b: any, i: number) => (
                    <View key={`b-${i}`} style={{ width: '100%' }}>
                      {renderBlock(b, renderContext, template, tplStyles, selectedLang, dynamicStyles)}
                    </View>
                  ))}

                  {/* Footer Section */}
                  {(layout.footer || DEFAULT_THERMAL_80.layout.footer).map((b: any, i: number) => (
                    <View key={`f-${i}`} style={{ width: '100%' }}>
                      {renderBlock(b, renderContext, template, tplStyles, selectedLang, dynamicStyles)}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Footer Controls */}
          <View style={dynamicStyles.modalFooter}>
            <View style={dynamicStyles.copiesControls}>
              <TouchableOpacity
                style={dynamicStyles.copyBtn}
                onPress={() => setCopies(Math.max(1, copies - 1))}
                activeOpacity={0.7}
              >
                <Minus size={14} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={dynamicStyles.copiesCount}>{copies}</Text>
              <TouchableOpacity
                style={dynamicStyles.copyBtn}
                onPress={() => setCopies(Math.min(10, copies + 1))}
                activeOpacity={0.7}
              >
                <Plus size={14} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={dynamicStyles.copiesLabel}>
                {selectedLang === 'fr' ? 'Copies:' : selectedLang === 'en' ? 'Copies:' : 'النسخ:'}
              </Text>
            </View>

            <TouchableOpacity
              style={dynamicStyles.printActionBtn}
              onPress={handlePrint}
              disabled={printing || loading}
              activeOpacity={0.7}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Printer size={16} color="#fff" />
                  <Text style={dynamicStyles.printActionBtnText}>
                    {selectedLang === 'fr'
                      ? `Imprimer (${copies})`
                      : selectedLang === 'en'
                      ? `Print (${copies})`
                      : `طباعة (${copies})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Render Block Helper with Language Localization
function renderBlock(
  block: any,
  ctx: any,
  template: PrintTemplate,
  tplStyles: any,
  lang: TemplateLanguage,
  s: ReturnType<typeof makeStyles>
) {
  if (!block || !block.type) return null;
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRtl = lang === 'ar' || lang === 'ar-fr';

  switch (block.type) {
    case 'text': {
      const textVal = Array.isArray(block.text) ? block.text.join('\n') : block.text || '';
      let parsed = interpolateVariables(textVal, ctx);
      // Translate common static phrases
      parsed = translatePhrase(parsed, lang);

      const isHeader = block.weight === 700 || block.size === 'lg' || block.size === 'xl';
      return (
        <Text
          style={[
            s.docText,
            {
              textAlign: block.align || (isRtl ? 'center' : 'center'),
              fontWeight: isHeader ? 'bold' : 'normal',
              fontSize:
                block.size === 'xl' ? 15 : block.size === 'lg' ? 13 : block.size === 'sm' ? 10 : 11.5,
              color: block.colorVar === 'primary' ? tplStyles?.primaryColor || '#0284c7' : '#0f172a',
            },
          ]}
        >
          {parsed}
        </Text>
      );
    }
    case 'image': {
      if (block.src) {
        return (
          <View style={[s.docCenter, { width: '100%' }]}>
            <Image
              source={{ uri: block.src }}
              style={{
                width: block.width || 60,
                height: block.height || 60,
                resizeMode: 'contain',
              }}
            />
          </View>
        );
      }
      return null;
    }
    case 'separator':
      return <View style={s.docSeparator} />;
    case 'qr':
      return (
        <View style={s.docCenter}>
          <BarcodeSvg value={ctx.invoice.number || 'INV-0001'} format="qr" height={60} width={1.2} />
        </View>
      );
    case 'barcode':
      return (
        <View style={s.docCenter}>
          <BarcodeSvg
            value={ctx.invoice.number || 'INV-0001'}
            format="code128"
            height={28}
            width={1.1}
            showText
            textSize={8}
          />
        </View>
      );
    case 'table': {
      const localizedCols = getLocalizedColumns(block.columns, lang);
      return (
        <View style={s.docTable}>
          {/* Table Header Row */}
          <View style={[s.docTableRow, { backgroundColor: tplStyles?.headerColor || '#f8fafc' }]}>
            {localizedCols.map((c, cIdx) => (
              <Text
                key={cIdx}
                style={[
                  s.docTableCell,
                  s.docTableHead,
                  {
                    flex: c.key === 'name' ? 2 : 1,
                    textAlign: c.align === 'right' ? (isRtl ? 'right' : 'right') : c.align === 'left' ? (isRtl ? 'left' : 'left') : 'center',
                  },
                ]}
              >
                {c.label}
              </Text>
            ))}
          </View>

          {/* Table Data Rows */}
          {(ctx.invoice.items || []).map((it: any, idx: number) => (
            <View key={idx} style={s.docTableRow}>
              {localizedCols.map((c, cIdx) => {
                let cellVal = '';
                if (c.key === 'name') cellVal = it.name;
                else if (c.key === 'qty') cellVal = String(it.qty);
                else if (c.key === 'unitPrice' || c.key === 'price')
                  cellVal = formatCurrency(it.unitPrice || 0, lang);
                else if (c.key === 'discount')
                  cellVal = it.discount ? formatCurrency(it.discount, lang) : '-';
                else if (c.key === 'lineTotal' || c.key === 'total')
                  cellVal = formatCurrency(it.lineTotal || it.qty * it.unitPrice || 0, lang);
                else cellVal = String(it[c.key] || '');

                return (
                  <Text
                    key={cIdx}
                    style={[
                      s.docTableCell,
                      {
                        flex: c.key === 'name' ? 2 : 1,
                        textAlign: c.align === 'right' ? (isRtl ? 'right' : 'right') : c.align === 'left' ? (isRtl ? 'left' : 'left') : 'center',
                        fontWeight: c.key === 'lineTotal' || c.key === 'name' ? '600' : 'normal',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {cellVal}
                  </Text>
                );
              })}
            </View>
          ))}

          {/* Table Subtotals & Totals Rows */}
          {block.showSubtotal && (
            <View style={[s.docTableRow, { backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0' }]}>
              <Text style={[s.docTableCell, { fontWeight: 'bold', flex: 2, textAlign: isRtl ? 'right' : 'left', fontSize: 10.5 }]}>
                {dict.labels.subtotal || 'المجموع الفرعي:'}
              </Text>
              <Text style={[s.docTableCell, { fontWeight: 'bold', flex: 2, textAlign: isRtl ? 'left' : 'right', fontSize: 10.5 }]}>
                {formatCurrency(ctx.invoice.subtotal || (ctx.invoice.total - (ctx.invoice.tvaAmount || 0)), lang)}
              </Text>
            </View>
          )}

          {block.showDiscount && Number(ctx.invoice.discount) > 0 && (
            <View style={[s.docTableRow, { backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#f1f5f9' }]}>
              <Text style={[s.docTableCell, { fontWeight: '600', flex: 2, textAlign: isRtl ? 'right' : 'left', color: '#dc2626', fontSize: 10.5 }]}>
                {dict.labels.discount || 'الخصم:'}
              </Text>
              <Text style={[s.docTableCell, { fontWeight: '600', flex: 2, textAlign: isRtl ? 'left' : 'right', color: '#dc2626', fontSize: 10.5 }]}>
                -{formatCurrency(ctx.invoice.discount, lang)}
              </Text>
            </View>
          )}

          {block.showTva && (
            <View style={[s.docTableRow, { backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#f1f5f9' }]}>
              <Text style={[s.docTableCell, { fontWeight: '600', flex: 2, textAlign: isRtl ? 'right' : 'left', fontSize: 10.5 }]}>
                {dict.labels.tax || 'TVA:'}
              </Text>
              <Text style={[s.docTableCell, { fontWeight: '600', flex: 2, textAlign: isRtl ? 'left' : 'right', fontSize: 10.5 }]}>
                {formatCurrency(ctx.invoice.tvaAmount || (ctx.invoice.tax || 0), lang)}
              </Text>
            </View>
          )}

          {block.showTotal !== false && (
            <View style={[s.docTableRow, s.docTableTotalRow, { backgroundColor: tplStyles?.primaryColor || '#0284c7' }]}>
              <Text style={[s.docTableCell, { fontWeight: 'bold', flex: 2, textAlign: isRtl ? 'right' : 'left', color: '#fff', fontSize: 11.5 }]}>
                {dict.labels.total}
              </Text>
              <Text
                style={[
                  s.docTableCell,
                  {
                    fontWeight: 'bold',
                    flex: 2,
                    textAlign: isRtl ? 'left' : 'right',
                    color: '#fff',
                    fontSize: 12,
                  },
                ]}
              >
                {formatCurrency(ctx.invoice.total || 0, lang)}
              </Text>
            </View>
          )}
        </View>
      );
    }
    case 'row':
      return (
        <View
          style={[
            s.docRow,
            {
              flexDirection: isRtl ? 'row-reverse' : 'row',
              justifyContent:
                block.align === 'space-between'
                  ? 'space-between'
                  : block.align === 'center'
                  ? 'center'
                  : 'flex-start',
            },
          ]}
        >
          {block.children?.map((child: any, cIdx: number) => (
            <View key={cIdx} style={{ flexShrink: 1 }}>
              {renderBlock(child, ctx, template, tplStyles, lang, s)}
            </View>
          ))}
        </View>
      );
    case 'column':
      return (
        <View style={s.docColumn}>
          {block.children?.map((child: any, cIdx: number) => (
            <View key={cIdx} style={{ width: '100%' }}>
              {renderBlock(child, ctx, template, tplStyles, lang, s)}
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
}

const makeStyles = (colors: any, isDark: boolean, lang: TemplateLanguage) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    modalContent: {
      width: '100%',
      maxWidth: 440,
      height: '88%',
      backgroundColor: colors.surface,
      borderRadius: radii['2xl'],
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    modalSubtitle: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
      marginTop: 2,
    },

    langRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    langChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    langChipActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[600],
    },
    langFlag: {
      fontSize: 12,
    },
    langText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabic,
    },
    langTextActive: {
      color: '#fff',
      fontFamily: typography.fontFamily.arabicBold,
    },

    previewContainer: {
      flex: 1,
      marginVertical: spacing.md,
      backgroundColor: isDark ? colors.slate[950] : colors.slate[200],
      borderRadius: radii.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    previewScroll: {
      flex: 1,
    },
    previewScrollContent: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },

    invoiceSheet: {
      backgroundColor: '#ffffff',
      borderRadius: radii.sm,
      padding: spacing.md,
      ...shadows.md,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },

    docText: {
      fontFamily: typography.fontFamily.arabic,
      marginVertical: 1.5,
    },
    docCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: spacing.xs,
    },
    docSeparator: {
      height: 1,
      borderBottomWidth: 1,
      borderBottomColor: '#94a3b8',
      borderStyle: 'dashed',
      marginVertical: spacing.xs,
    },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 2,
    },
    docColumn: {
      flexDirection: 'column',
      marginVertical: 2,
    },

    docTable: {
      width: '100%',
      marginVertical: spacing.xs,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#cbd5e1',
    },
    docTableRow: {
      flexDirection: lang === 'ar' || lang === 'ar-fr' ? 'row-reverse' : 'row',
      paddingVertical: 3.5,
      paddingHorizontal: 2,
      borderBottomWidth: 0.5,
      borderBottomColor: '#e2e8f0',
      alignItems: 'center',
    },
    docTableCell: {
      fontSize: 10.5,
      color: '#1e293b',
      fontFamily: typography.fontFamily.arabic,
    },
    docTableHead: {
      fontWeight: 'bold',
      color: '#0f172a',
      fontSize: 11,
      fontFamily: typography.fontFamily.arabicBold,
    },
    docTableTotalRow: {
      borderTopWidth: 1,
      borderTopColor: '#0f172a',
      borderBottomWidth: 0,
      paddingTop: 5,
    },

    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
      gap: spacing.md,
    },
    copiesControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    copiesLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabic,
    },
    copiesCount: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
      minWidth: 16,
      textAlign: 'center',
    },
    copyBtn: {
      width: 26,
      height: 26,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    printActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary[600],
      paddingVertical: 10,
      borderRadius: radii.lg,
      ...shadows.xs,
    },
    printActionBtnText: {
      color: '#ffffff',
      fontSize: 13.5,
      fontWeight: '800',
      fontFamily: typography.fontFamily.arabicBold,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: 12,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
    },
  });

export default InvoicePrintPreviewModal;
