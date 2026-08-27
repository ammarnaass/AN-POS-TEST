import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
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
} from '@/lib/templateService';
import type {
  DocTypeKey,
  PrintTemplate,
  Block,
} from '@shared/types/invoicePrint';
import { PAPER_LABELS_AR, DOC_TYPE_LABELS_AR } from '@shared/types/invoicePrint';
import { colors, radii, spacing, shadows } from '@/theme';
import { BarcodeSvg } from '@/lib/barcodeSvg';

interface InvoicePrintPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  saleId?: string;
  invoiceData?: PrintInvoiceData;
  templateId?: string;
  sampleDocType?: DocTypeKey;
}

const LANGUAGES: Array<{ key: 'ar' | 'ar-fr' | 'fr' | 'en'; label: string; flag: string }> = [
  { key: 'ar', label: 'العربية', flag: '🇩🇿' },
  { key: 'ar-fr', label: 'عربي / FR', flag: '🌐' },
  { key: 'fr', label: 'Français', flag: '🇫🇷' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
];

export const InvoicePrintPreviewModal = ({
  visible,
  onClose,
  saleId,
  invoiceData: customInvoiceData,
  templateId: initialTemplateId,
  sampleDocType = 'sale-invoice',
}: InvoicePrintPreviewModalProps) => {
  const [template, setTemplate] = useState<PrintTemplate | null>(null);
  const [data, setData] = useState<PrintInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [copies, setCopies] = useState(1);
  const [selectedLang, setSelectedLang] = useState<'ar' | 'ar-fr' | 'fr' | 'en'>('ar');

  useEffect(() => {
    if (visible) {
      loadPreviewData();
    }
  }, [visible, saleId, customInvoiceData, initialTemplateId, sampleDocType]);

  async function loadPreviewData() {
    setLoading(true);
    try {
      await ensureInit();

      // Resolve template
      let tpl: PrintTemplate | undefined;
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
      setTemplate(tpl || null);

      // Resolve invoice data
      if (customInvoiceData) {
        setData(customInvoiceData);
      } else if (saleId) {
        const sale = await db.sales.get(saleId);
        if (sale) {
          const rawItems = Array.isArray(sale.items)
            ? sale.items
            : typeof sale.items === 'string'
            ? JSON.parse(sale.items || '[]')
            : [];

          setData({
            id: sale.id,
            number: sale.number || '0000',
            date: new Date(sale.date || sale.createdAt || '').toLocaleString('ar-DZ'),
            items: rawItems.map((i: any) => ({
              name: i.name,
              qty: i.qty || 1,
              unitPrice: i.unitPrice || 0,
              lineTotal: (i.qty || 1) * (i.unitPrice || 0),
            })),
            subtotal: sale.subtotal || sale.total,
            discount: sale.discount || 0,
            tvaAmount: sale.tvaAmount || 0,
            total: sale.total || 0,
            paymentMethod: sale.paymentMethod === 'credit' ? 'آجل (كريدي)' : 'نقداً',
            customerName: sale.customerName || 'زبون عام',
            soldBy: sale.soldBy || 'المسؤول',
            docType: sampleDocType,
          });
        }
      } else {
        // Sample mock invoice
        setData({
          number: 'INV-2026-0099',
          date: new Date().toLocaleString('ar-DZ'),
          items: [
            { name: 'زيت زيتون بكر ممتاز 1 لتر', qty: 2, unitPrice: 950, lineTotal: 1900 },
            { name: 'عسل جبلي طبيعي 500 غ', qty: 1, unitPrice: 1400, lineTotal: 1400 },
            { name: 'تمور دقلة نور فاخرة 1 كغ', qty: 3, unitPrice: 450, lineTotal: 1350 },
          ],
          subtotal: 4650,
          discount: 150,
          tvaAmount: 0,
          total: 4500,
          paymentMethod: 'نقداً',
          customerName: 'كريم بن علي',
          customerPhone: '0550 12 34 56',
          customerAddress: 'الجزائر العاصمة',
          soldBy: 'أحمد (الكاشير)',
          docType: sampleDocType,
        });
      }
    } catch (err) {
      console.warn('Failed to load invoice preview:', err);
    }
    setLoading(false);
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
        Alert.alert('✓ تمت الطباعة', 'تم إرسال الفاتورة إلى الطابعة بنجاح');
        onClose();
      } else {
        Alert.alert('تنبيه الطباعة', 'تعذر إرسال أمر الطباعة المباشر. يرجى مراجعة إعدادات الطابعة.');
      }
    } catch {
      Alert.alert('خطأ', 'فشل تنفيذ عملية الطباعة');
    }
    setPrinting(false);
  };

  if (!visible) return null;

  // Assembly of context for rendering
  const renderContext = {
    invoice: data || {},
    shopLegal: {
      name: 'سوبرماركت البركة',
      phone: '023 45 67 89',
      address: 'شارع فلسطين، الجزائر',
      footer: 'شكراً لزيارتكم ونتمنى عودتكم قريباً',
      nif: '001616012345678',
    },
    user: { name: data?.soldBy || 'المسؤول' },
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <X size={20} color={colors.slate[400]} />
            </TouchableOpacity>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.modalTitle}>معاينة وطباعة الفاتورة</Text>
              <Text style={styles.modalSubtitle}>
                {template?.name || 'القالب الافتراضي'} • {DOC_TYPE_LABELS_AR[sampleDocType] || sampleDocType}
              </Text>
            </View>
          </View>

          {/* Languages Selector */}
          <View style={styles.langRow}>
            <Globe size={14} color={colors.slate[400]} />
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[styles.langChip, selectedLang === l.key && styles.langChipActive]}
                onPress={() => setSelectedLang(l.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langText, selectedLang === l.key && styles.langTextActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rendered Live Invoice View */}
          <View style={styles.previewContainer}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary[600]} />
              </View>
            ) : !data || !template ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>تعذر تجهيز معاينة الفاتورة</Text>
              </View>
            ) : (
              <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent} showsVerticalScrollIndicator={false}>
                <View
                  style={[
                    styles.invoiceSheet,
                    {
                      width: template.paperSize === '58mm' ? 240 : template.paperSize === '80mm' ? 290 : '98%',
                    },
                  ]}
                >
                  {/* Header Section */}
                  {template.layout.header?.map((b, i) => (
                    <View key={`h-${i}`} style={{ width: '100%' }}>
                      {renderBlock(b, renderContext, template)}
                    </View>
                  ))}

                  {/* Body Section */}
                  {template.layout.body?.map((b, i) => (
                    <View key={`b-${i}`} style={{ width: '100%' }}>
                      {renderBlock(b, renderContext, template)}
                    </View>
                  ))}

                  {/* Footer Section */}
                  {template.layout.footer?.map((b, i) => (
                    <View key={`f-${i}`} style={{ width: '100%' }}>
                      {renderBlock(b, renderContext, template)}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Footer Controls */}
          <View style={styles.modalFooter}>
            <View style={styles.copiesControls}>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => setCopies(Math.max(1, copies - 1))}
                activeOpacity={0.7}
              >
                <Minus size={14} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.copiesCount}>{copies}</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => setCopies(Math.min(10, copies + 1))}
                activeOpacity={0.7}
              >
                <Plus size={14} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.copiesLabel}>النسخ:</Text>
            </View>

            <TouchableOpacity
              style={styles.printActionBtn}
              onPress={handlePrint}
              disabled={printing || loading}
              activeOpacity={0.7}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Printer size={16} color="#fff" />
                  <Text style={styles.printActionBtnText}>طباعة ({copies})</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Render Block Helper
function renderBlock(block: Block, ctx: any, template: PrintTemplate) {
  switch (block.type) {
    case 'text': {
      const textVal = Array.isArray(block.text) ? block.text.join('\n') : block.text;
      const parsed = interpolateVariables(textVal, ctx);
      const isHeader = block.weight === 700 || block.size === 'lg' || block.size === 'xl';
      return (
        <Text
          style={[
            styles.docText,
            {
              textAlign: block.align || 'center',
              fontWeight: isHeader ? 'bold' : 'normal',
              fontSize: block.size === 'xl' ? 16 : block.size === 'lg' ? 13.5 : block.size === 'sm' ? 10 : 11.5,
              color: block.colorVar === 'primary' ? template.styles.primaryColor : '#0f172a',
            },
          ]}
        >
          {parsed}
        </Text>
      );
    }
    case 'separator':
      return <View style={styles.docSeparator} />;
    case 'qr':
      return (
        <View style={styles.docCenter}>
          <BarcodeSvg value={ctx.invoice.number} format="qr" height={65} width={1.2} />
        </View>
      );
    case 'barcode':
      return (
        <View style={styles.docCenter}>
          <BarcodeSvg value={ctx.invoice.number} format="code128" height={32} width={1.1} showText textSize={8} />
        </View>
      );
    case 'table':
      return (
        <View style={styles.docTable}>
          <View style={[styles.docTableRow, { backgroundColor: template.styles.headerColor }]}>
            <Text style={[styles.docTableCell, styles.docTableHead, { flex: 2, textAlign: 'right' }]}>المنتج</Text>
            <Text style={[styles.docTableCell, styles.docTableHead, { flex: 1, textAlign: 'center' }]}>الكمية</Text>
            <Text style={[styles.docTableCell, styles.docTableHead, { flex: 1.2, textAlign: 'left' }]}>الإجمالي</Text>
          </View>
          {ctx.invoice.items?.map((it: any, idx: number) => (
            <View key={idx} style={styles.docTableRow}>
              <Text style={[styles.docTableCell, { flex: 2, textAlign: 'right' }]}>{it.name}</Text>
              <Text style={[styles.docTableCell, { flex: 1, textAlign: 'center' }]}>{it.qty}</Text>
              <Text style={[styles.docTableCell, { flex: 1.2, textAlign: 'left' }]}>
                {it.lineTotal?.toLocaleString('ar-DZ')} دج
              </Text>
            </View>
          ))}
          <View style={[styles.docTableRow, styles.docTableTotalRow]}>
            <Text style={[styles.docTableCell, { fontWeight: 'bold', flex: 2, textAlign: 'right' }]}>المجموع النهائي</Text>
            <Text style={[styles.docTableCell, { fontWeight: 'bold', flex: 2.2, textAlign: 'left', color: template.styles.primaryColor }]}>
              {ctx.invoice.total?.toLocaleString('ar-DZ')} دج
            </Text>
          </View>
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%', padding: spacing.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  closeBtn: { width: 34, height: 34, borderRadius: radii.md, backgroundColor: colors.slate[100], alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo' },
  modalSubtitle: { fontSize: 11, color: colors.text.tertiary, fontFamily: 'Cairo', marginTop: 1 },

  langRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: spacing.xs + 2, justifyContent: 'flex-end' },
  langChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.slate[100] },
  langChipActive: { backgroundColor: colors.primary[600] },
  langFlag: { fontSize: 11 },
  langText: { fontSize: 10.5, fontWeight: '700', color: colors.slate[600], fontFamily: 'Cairo' },
  langTextActive: { color: '#fff' },

  previewContainer: { flex: 1, backgroundColor: colors.slate[100], borderRadius: radii.xl, overflow: 'hidden', padding: 8 },
  previewScroll: { flex: 1 },
  previewScrollContent: { alignItems: 'center', paddingVertical: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontSize: 13, color: colors.text.secondary, fontFamily: 'Cairo' },

  invoiceSheet: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    gap: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  docText: { fontFamily: 'Cairo', marginVertical: 1 },
  docSeparator: { height: 1, borderTopWidth: 1, borderTopColor: '#cbd5e1', borderStyle: 'dashed', marginVertical: 4 },
  docCenter: { alignItems: 'center', marginVertical: 4 },
  docTable: { marginVertical: 4, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  docTableRow: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  docTableHead: { color: '#fff', fontWeight: 'bold' },
  docTableCell: { fontSize: 10, fontFamily: 'Cairo', color: '#0f172a' },
  docTableTotalRow: { backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#cbd5e1' },

  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    marginTop: spacing.xs,
  },
  copiesControls: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.slate[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border.default },
  copiesLabel: { fontSize: 11, fontWeight: '700', color: colors.text.secondary, fontFamily: 'Cairo' },
  copiesCount: { fontSize: 13, fontWeight: '800', color: colors.text.primary, minWidth: 18, textAlign: 'center', fontFamily: 'Cairo' },
  copyBtn: { width: 26, height: 26, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.default },

  printActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.xl,
    ...shadows.xs,
  },
  printActionBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: 'Cairo' },
});

export default InvoicePrintPreviewModal;
