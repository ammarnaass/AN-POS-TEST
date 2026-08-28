import React, { useState, useEffect, useMemo } from 'react';
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
  History,
  RotateCw,
  Plus,
  Minus,
  CheckCircle2,
  FileText,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { reprintInvoice, type PrintInvoiceData } from '@/lib/print';
import {
  getAllTemplates,
  getPrintHistory,
} from '@/lib/templateService';
import type { PrintTemplate } from '@shared/types/invoicePrint';
import { useTheme } from '@/theme';
import { radii, spacing, shadows } from '@/theme/tokens';

interface ReprintModalProps {
  visible: boolean;
  onClose: () => void;
  saleId: string;
  invoiceData: PrintInvoiceData;
}

export const ReprintModal = ({
  visible,
  onClose,
  saleId,
  invoiceData,
}: ReprintModalProps) => {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [copies, setCopies] = useState(1);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (visible && saleId) {
      loadData();
    }
  }, [visible, saleId]);

  async function loadData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allTemplates, historyRecords] = await Promise.all([
        getAllTemplates(),
        getPrintHistory(saleId),
      ]);
      setTemplates(allTemplates);
      setHistory(historyRecords);
      if (allTemplates.length > 0) {
        const def = allTemplates.find((t) => t.isDefault) || allTemplates[0];
        setSelectedTemplateId(def.id);
      }
    } catch (err) {
      console.warn('Failed to load reprint data:', err);
    }
    setLoading(false);
  }

  const handleReprint = async () => {
    setPrinting(true);
    try {
      const ok = await reprintInvoice(
        saleId,
        invoiceData,
        selectedTemplateId || undefined,
        copies,
      );

      if (ok) {
        Alert.alert('✓ تمت إعادة الطباعة', 'تم إرسال نسخة إضافية من الفاتورة إلى الطابعة');
        onClose();
      } else {
        Alert.alert('تنبيه الطباعة', 'تعذر إرسال أمر الطباعة. يرجى مراجعة حالة الطابعة.');
      }
    } catch {
      Alert.alert('خطأ', 'فشلت عملية إعادة الطباعة');
    }
    setPrinting(false);
  };

  if (!visible) return null;

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
              <Text style={styles.modalTitle}>إعادة طباعة الفاتورة</Text>
              <Text style={styles.modalSubtitle}>فاتورة #{invoiceData.number}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary[600]} />
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Template Picker */}
              <Text style={styles.inputLabel}>اختر قالب الطباعة</Text>
              <View style={styles.tplList}>
                {templates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[styles.tplOption, isSelected && styles.tplOptionSelected]}
                      onPress={() => setSelectedTemplateId(tpl.id)}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <View style={styles.checkDot}>
                          <CheckCircle2 size={16} color={colors.primary[600]} />
                        </View>
                      )}
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={[styles.tplName, isSelected && styles.tplNameSelected]}>{tpl.name}</Text>
                        <Text style={styles.tplSub}>{tpl.paperSize} • {tpl.isSystem ? 'نظامي' : 'مخصص'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Copies */}
              <View style={styles.copiesCard}>
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
                </View>
                <Text style={styles.inputLabel}>عدد النسخ المراد طباعتها</Text>
              </View>

              {/* Print History */}
              <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>سجل الطباعة السابق ({history.length})</Text>
                  <History size={16} color={colors.slate[400]} />
                </View>

                {history.length === 0 ? (
                  <Text style={styles.emptyHistory}>لا توجد سجلات طباعة سابقة لهذه الفاتورة</Text>
                ) : (
                  <View style={{ gap: 6 }}>
                    {history.map((record, idx) => (
                      <View key={idx} style={styles.historyItem}>
                        <View style={styles.reprintBadge}>
                          <Text style={styles.reprintBadgeText}>
                            {record.isReprint ? 'إعادة طباعة' : 'طباعة أولى'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', flex: 1 }}>
                          <Text style={styles.historyDate}>
                            {new Date(record.printedAt).toLocaleString('ar-DZ')}
                          </Text>
                          <Text style={styles.historyMeta}>
                            بواسطة: {record.printedBy || 'المستخدم'} • {record.copies || 1} نسخة
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <Text style={styles.reprintNote}>
                ℹ️ ملاحظة: إعادة الطباعة لا تغير أي بيانات في الفاتورة أو الحسابات المالية، وإنما ترسل نسخة إضافية للطابعة.
              </Text>
            </ScrollView>
          )}

          {/* Footer Submit */}
          <TouchableOpacity
            style={styles.reprintSubmitBtn}
            onPress={handleReprint}
            disabled={printing || loading}
            activeOpacity={0.7}
          >
            {printing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Printer size={16} color="#fff" />
                <Text style={styles.reprintSubmitBtnText}>إعادة الطباعة الآن ({copies} نسخ)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', padding: spacing.lg },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, marginBottom: spacing.sm },
    closeBtn: { width: 34, height: 34, borderRadius: radii.md, backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100], alignItems: 'center', justifyContent: 'center' },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo' },
    modalSubtitle: { fontSize: 11.5, color: colors.text.tertiary, fontFamily: 'Cairo', marginTop: 1 },
    center: { padding: spacing.xxl, alignItems: 'center', justifyContent: 'center' },

    scroll: { maxHeight: 420 },
    scrollContent: { paddingVertical: spacing.xs, gap: spacing.sm },

    inputLabel: { fontSize: 12.5, fontWeight: '700', color: colors.text.secondary, textAlign: 'right', fontFamily: 'Cairo' },

    tplList: { gap: 6, marginBottom: spacing.xs },
    tplOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderRadius: radii.xl,
      padding: spacing.sm + 2,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    tplOptionSelected: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50],
      borderColor: colors.primary[400],
    },
    checkDot: { marginRight: spacing.sm },
    tplName: { fontSize: 13, fontWeight: '700', color: colors.text.primary, fontFamily: 'Cairo' },
    tplNameSelected: { color: colors.primary[600], fontWeight: '800' },
    tplSub: { fontSize: 10.5, color: colors.text.tertiary, fontFamily: 'Cairo', marginTop: 1 },

    copiesCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderRadius: radii.xl,
      padding: spacing.sm + 2,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    copiesControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    copyBtn: {
      width: 30,
      height: 30,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    copiesCount: { fontSize: 14, fontWeight: '800', color: colors.text.primary, minWidth: 20, textAlign: 'center', fontFamily: 'Cairo' },

    historyCard: {
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      marginTop: spacing.xs,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
      paddingBottom: 6,
    },
    historyTitle: { fontSize: 12, fontWeight: '800', color: colors.text.secondary, fontFamily: 'Cairo' },
    emptyHistory: { fontSize: 11.5, color: colors.text.tertiary, textAlign: 'center', paddingVertical: 8, fontFamily: 'Cairo' },
    historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    reprintBadge: { backgroundColor: colors.warning.light, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
    reprintBadgeText: { fontSize: 10, fontWeight: '700', color: colors.warning.text, fontFamily: 'Cairo' },
    historyDate: { fontSize: 11.5, fontWeight: '700', color: colors.text.primary, fontFamily: 'Cairo' },
    historyMeta: { fontSize: 10, color: colors.text.tertiary, fontFamily: 'Cairo' },

    reprintNote: { fontSize: 11, color: colors.text.tertiary, fontFamily: 'Cairo', textAlign: 'right', marginTop: 4 },

    reprintSubmitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary[600],
      paddingVertical: 12,
      borderRadius: radii.xl,
      marginTop: spacing.md,
    },
    reprintSubmitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: 'Cairo' },
  });

export default ReprintModal;
