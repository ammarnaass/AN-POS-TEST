import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import {
  ArrowRight,
  Printer,
  Share2,
  RotateCcw,
  Receipt,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  FileText,
  Eye,
  RotateCw,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { printInvoice, type PrintInvoiceData } from '@/lib/print';
import { ReturnModal } from './ReturnModal';
import { InvoicePrintPreviewModal } from '../print/InvoicePrintPreviewModal';
import { ReprintModal } from '../print/ReprintModal';
import type { Sale } from '@shared/types';
import { useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';

import { notify } from '@/lib/notify';

import { useI18n } from '@/store/i18nStore';
import { ArrowLeft } from 'lucide-react-native';

export const InvoiceDetailScreen = ({ route, navigation }: any) => {
  const { saleId, sale: initialSale } = route.params || {};
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [sale, setSale] = useState<Sale | null>(initialSale || null);
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(!initialSale);
  const [printing, setPrinting] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showReprintModal, setShowReprintModal] = useState(false);

  useEffect(() => {
    loadSaleDetails();
  }, [saleId, initialSale]);

  async function loadSaleDetails() {
    setLoading(true);
    try {
      await ensureInit();
      const targetId = saleId || initialSale?.id;
      if (targetId) {
        const found = await db.sales.get(targetId);
        if (found) {
          setSale(found);
        }
        // Also fetch from sale_items
        try {
          const allSaleItems = await db.saleItems.toArray();
          const matching = allSaleItems.filter(
            (si: any) => si.saleId === targetId || si.sale_id === targetId
          );
          if (matching.length > 0) {
            setDbItems(matching);
          }
        } catch (e) {
          console.warn('sale_items fetch error:', e);
        }
      }
    } catch (err) {
      console.warn('Failed to load sale details:', err);
    }
    setLoading(false);
  }

function parseSaleItems(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return Object.values(parsed);
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object') {
    return Object.values(raw);
  }
  return [];
}

  const rawItems: any[] = sale ? parseSaleItems(sale.items) : [];

  const parsedDbItems = (dbItems || []).map((si) => ({
    name: si.name || 'منتج',
    qty: Number(si.qty || si.quantity || 1),
    unitPrice: Number(si.unitPrice || si.unit_price || 0),
    lineTotal: Number(si.lineTotal || si.line_total || (si.qty || 1) * (si.unitPrice || si.unit_price || 0)),
  }));

  const items: any[] = rawItems.length > 0 ? rawItems : parsedDbItems;
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';

  const invoicePrintData: PrintInvoiceData | null = sale
    ? {
        id: sale.id,
        number: sale.number,
        date: new Date(sale.date || (sale as any).created_at || (sale as any).createdAt || Date.now()).toLocaleString(localeStr),
        items: (Array.isArray(items) ? items : []).map((i) => ({
          name: i?.name || '',
          qty: Number(i?.qty || i?.quantity || 1),
          unitPrice: Number(i?.unitPrice || i?.unit_price || 0),
          lineTotal: Number(i?.lineTotal || i?.line_total || (i?.qty || 1) * (i?.unitPrice || 0)),
        })),
        subtotal: Number(sale.subtotal || sale.total || 0),
        discount: Number(sale.discount || 0),
        tvaAmount: Number(sale.tvaAmount || (sale as any).tva_amount || 0),
        total: Number(sale.total || 0),
        paymentMethod: sale.paymentMethod === 'credit' || (sale as any).payment_method === 'credit' ? t('pos.credit') : t('pos.cash'),
        customerName: sale.customerName || (sale as any).customer_name || '',
        soldBy: sale.soldBy || (sale as any).sold_by || '',
        docType: (sale.docType as any) || 'sale-invoice',
      }
    : null;

  const handleQuickPrint = async () => {
    if (!invoicePrintData) return;
    setPrinting(true);
    try {
      const success = await printInvoice(invoicePrintData);
      if (success) {
        notify.success(t('sales.reprintSuccess'), '✓');
      } else {
        notify.warning(
          t('sales.printerConnectionWarning'),
          t('common.warning')
        );
      }
    } catch (err) {
      notify.error(err, t('sales.printJobFailed'));
    }
    setPrinting(false);
  };

  const handleShare = async () => {
    if (!sale) return;
    try {
      let text = `🧾 *${t('pos.invoice')}: ${sale.number}*\n`;
      text += `📅 ${t('sales.invoiceDate')}: ${new Date(sale.date || '').toLocaleDateString(localeStr)}\n`;
      if (sale.customerName) text += `👤 ${t('pos.customer')}: ${sale.customerName}\n`;
      text += `--------------------------\n`;
      items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.name} (${item.qty} × ${(item.unitPrice || 0).toLocaleString(localeStr)} ${currency}) = ${((item.qty || 1) * (item.unitPrice || 0)).toLocaleString(localeStr)} ${currency}\n`;
      });
      text += `--------------------------\n`;
      if (sale.discount > 0) text += `${t('common.discount')}: ${(sale.discount || 0).toLocaleString(localeStr)} ${currency}\n`;
      text += `💰 *${t('common.total')}: ${(sale.total || 0).toLocaleString(localeStr)} ${currency}*\n`;
      text += `${t('pos.paymentMethod')}: ${sale.paymentMethod === 'credit' ? t('pos.credit') : t('pos.cash')}\n`;

      await Share.share({ message: text });
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{t('sales.noInvoicesFound')}</Text>
        <Button title={t('common.back')} variant="primary" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const isReturn = sale.type === 'return';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn} activeOpacity={0.7}>
          {isRTL ? <ArrowRight size={22} color={colors.text.primary} /> : <ArrowLeft size={22} color={colors.text.primary} />}
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>{t('sales.invoiceDetails')}</Text>
          <Text style={styles.headerSubtitle}>{sale.number}</Text>
        </View>
        <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={handleShare} activeOpacity={0.7}>
            <Share2 size={18} color={colors.primary[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => setShowPreviewModal(true)}
            activeOpacity={0.7}
          >
            <Eye size={18} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Print & Reprint Toolbar */}
        <View style={[styles.printToolbar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.toolBtnSecondary, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => setShowReprintModal(true)}
            activeOpacity={0.7}
          >
            <RotateCw size={15} color={colors.slate[700]} />
            <Text style={styles.toolBtnTextSecondary}>{t('sales.reprint')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtnSecondary, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => setShowPreviewModal(true)}
            activeOpacity={0.7}
          >
            <Eye size={15} color={colors.primary[700]} />
            <Text style={[styles.toolBtnTextSecondary, { color: colors.primary[700] }]}>{t('sales.previewTemplate')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtnPrimary, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleQuickPrint}
            disabled={printing}
            activeOpacity={0.7}
          >
            {printing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Printer size={16} color="#fff" />
                <Text style={styles.toolBtnTextPrimary}>{t('sales.quickPrint')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <Card variant={isReturn ? 'subtle' : 'default'} style={[styles.card, isReturn && styles.cardReturn]}>
          <View style={[styles.statusRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Badge
              variant={
                isReturn
                  ? 'danger'
                  : sale.paymentMethod === 'credit'
                  ? 'warning'
                  : 'emerald'
              }
              size="sm"
              dot
            >
              {isReturn
                ? t('sales.returned')
                : sale.paymentMethod === 'credit'
                ? t('pos.credit')
                : t('sales.paidCash')}
            </Badge>
            <Text style={styles.docTypeBadge}>
              {sale.docType === 'devis'
                ? t('pos.quote')
                : sale.docType === 'bl'
                ? t('pos.deliveryNote')
                : sale.docType === 'proforma'
                ? t('pos.proforma')
                : t('pos.invoice')}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.infoVal}>
                {new Date(sale.date || sale.createdAt || '').toLocaleString(localeStr)}
              </Text>
              <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.infoLabel}>{t('sales.invoiceDate')}</Text>
                <Calendar size={14} color={colors.slate[400]} />
              </View>
            </View>

            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.infoVal}>{sale.customerName || t('pos.guestCustomer')}</Text>
              <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.infoLabel}>{t('pos.customer')}</Text>
                <User size={14} color={colors.slate[400]} />
              </View>
            </View>

            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.infoVal}>{sale.soldBy || t('pos.cashierDefault')}</Text>
              <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.infoLabel}>{t('sales.soldBy')}</Text>
                <FileText size={14} color={colors.slate[400]} />
              </View>
            </View>
          </View>
        </Card>

        {/* Items List */}
        <Text style={[styles.sectionHeading, { textAlign }]}>{t('sales.itemsAndProducts')} ({(Array.isArray(items) ? items : []).length})</Text>
        <Card style={styles.card}>
          {(Array.isArray(items) ? items : []).map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemRowBorder, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.itemTotal}>
                {((item.qty || 1) * (item.unitPrice || 0)).toLocaleString(localeStr)} {currency}
              </Text>
              <View style={[styles.itemInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCalc}>
                  {item.qty || 1} × {(item.unitPrice || 0).toLocaleString(localeStr)} {currency}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Financial Summary */}
        <Text style={[styles.sectionHeading, { textAlign }]}>{t('sales.financialSummary')}</Text>
        <Card style={styles.card}>
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.summaryValue}>
              {(sale.subtotal || sale.total).toLocaleString(localeStr)} {currency}
            </Text>
            <Text style={styles.summaryLabel}>{t('common.subtotal')}</Text>
          </View>
          {(sale.discount || 0) > 0 && (
            <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.summaryValue, { color: colors.danger.main }]}>
                - {(sale.discount || 0).toLocaleString(localeStr)} {currency}
              </Text>
              <Text style={styles.summaryLabel}>{t('common.discount')}</Text>
            </View>
          )}
          {(sale.tvaAmount || 0) > 0 && (
            <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.summaryValue}>
                + {(sale.tvaAmount || 0).toLocaleString(localeStr)} {currency}
              </Text>
              <Text style={styles.summaryLabel}>{t('common.tax')}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.summaryTotalValue}>
              {(sale.total || 0).toLocaleString(localeStr)} {currency}
            </Text>
            <Text style={styles.summaryTotalLabel}>{t('common.total')}</Text>
          </View>
        </Card>

        {/* Return Button if not already return */}
        {!isReturn && (
          <Button
            title={t('sales.returnItemsFromInvoice')}
            variant="outline"
            size="lg"
            icon={<RotateCcw size={18} color={colors.danger.main} />}
            onPress={() => setShowReturnModal(true)}
            style={styles.returnBtn}
          />
        )}
      </ScrollView>

      {/* Return Modal */}
      <ReturnModal
        visible={showReturnModal}
        sale={sale}
        onClose={() => setShowReturnModal(false)}
        onSuccess={() => {
          loadSaleDetails();
        }}
      />

      {/* Invoice Print Preview Modal */}
      {showPreviewModal && invoicePrintData && (
        <InvoicePrintPreviewModal
          visible={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          saleId={sale.id}
          invoiceData={invoicePrintData}
          sampleDocType={(sale.docType as any) || 'sale-invoice'}
        />
      )}

      {/* Invoice Reprint Modal */}
      {showReprintModal && invoicePrintData && (
        <ReprintModal
          visible={showReprintModal}
          onClose={() => setShowReprintModal(false)}
          saleId={sale.id}
          invoiceData={invoicePrintData}
        />
      )}
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
      marginBottom: spacing.md,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      ...shadows.xs,
    },
    headerBackBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleCol: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    headerActions: {
      flexDirection: 'row',
      gap: spacing.xs + 2,
    },
    actionIconBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.lg,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },

    printToolbar: {
      flexDirection: 'row',
      gap: spacing.xs + 2,
      marginBottom: spacing.md,
    },
    toolBtnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.xs,
    },
    toolBtnTextSecondary: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    toolBtnPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary[600],
      paddingVertical: 8,
      borderRadius: radii.xl,
      ...shadows.xs,
    },
    toolBtnTextPrimary: {
      fontSize: 12.5,
      fontWeight: '800',
      color: '#fff',
      fontFamily: 'Cairo',
    },

    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: spacing.xxxl,
    },
    card: {
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    cardReturn: {
      borderColor: colors.danger.border,
      backgroundColor: colors.danger.light,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    docTypeBadge: {
      fontSize: 12,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
      fontWeight: '700',
    },

    divider: {
      height: 1,
      backgroundColor: colors.border.subtle,
      marginVertical: spacing.md,
    },
    infoGrid: {
      gap: spacing.sm,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabelGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    infoVal: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },

    sectionHeading: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text.secondary,
      textAlign: 'right',
      marginBottom: spacing.xs,
      marginRight: 4,
      fontFamily: 'Cairo',
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    itemRowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    itemInfo: {
      alignItems: 'flex-end',
      flex: 1,
      marginRight: spacing.md,
    },
    itemName: {
      fontSize: 13.5,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
      textAlign: 'right',
    },
    itemCalc: {
      fontSize: 11.5,
      color: colors.text.secondary,
      marginTop: 2,
      fontFamily: 'Cairo',
    },
    itemTotal: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary[700],
      fontFamily: 'Cairo',
    },

    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    summaryLabel: {
      fontSize: 13,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    summaryValue: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    summaryTotalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border.default,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
    },
    summaryTotalLabel: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    summaryTotalValue: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.primary[700],
      fontFamily: 'Cairo',
    },

    returnBtn: {
      borderColor: colors.danger.main,
      marginTop: spacing.xs,
    },
  });

export default InvoiceDetailScreen;
