import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, SlidersHorizontal, Check, FileText } from 'lucide-react-native';
import {
  getAllAssignments,
  assignTemplateToDocType,
} from '@/lib/templateService';
import {
  ALL_DOC_TYPES,
  DOC_TYPE_LABELS_AR,
  PAPER_LABELS_AR,
  type DocTypeKey,
  type PrintTemplate,
  type TemplateAssignment,
} from '@shared/types/invoicePrint';
import { useTheme } from '@/theme';
import { radii, spacing, shadows, typography } from '@/theme/tokens';

interface TemplateAssignmentsModalProps {
  visible: boolean;
  onClose: () => void;
  templates: PrintTemplate[];
}

export const TemplateAssignmentsModal = ({
  visible,
  onClose,
  templates,
}: TemplateAssignmentsModalProps) => {
  const { isDark, colors } = useTheme();
  const [assignments, setAssignments] = useState<Record<DocTypeKey, string>>({} as any);
  const [loading, setLoading] = useState(true);
  const [savingDoc, setSavingDoc] = useState<string | null>(null);

  // Picker modal state
  const [pickingDocType, setPickingDocType] = useState<DocTypeKey | null>(null);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    if (visible) {
      loadAssignments();
    }
  }, [visible]);

  async function loadAssignments() {
    setLoading(true);
    try {
      const list = await getAllAssignments();
      const map: Partial<Record<DocTypeKey, string>> = {};
      for (const item of list) {
        if (item.docType) {
          map[item.docType] = item.templateId;
        }
      }
      setAssignments(map as Record<DocTypeKey, string>);
    } catch (err) {
      console.warn('Failed to load template assignments:', err);
    }
    setLoading(false);
  }

  const handleSelectTemplate = useCallback(
    async (docType: DocTypeKey, templateId: string) => {
      setSavingDoc(docType);
      try {
        await assignTemplateToDocType(docType, templateId);
        setAssignments((prev) => ({ ...prev, [docType]: templateId }));
        setPickingDocType(null);
      } catch {
        Alert.alert('خطأ', 'فشل حفظ تعيين القالب');
      }
      setSavingDoc(null);
    },
    []
  );

  const getTemplateName = useCallback(
    (templateId: string): string => {
      const found = templates.find((t) => t.id === templateId);
      return found ? `${found.name} (${PAPER_LABELS_AR[found.paperSize] || found.paperSize})` : '— القالب الافتراضي —';
    },
    [templates]
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <X size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.modalTitle}>تعيين القوالب للوثائق</Text>
              <Text style={styles.modalSubtitle}>حدد القالب التلقائي لكل نوع من المستندات التجارية</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary[600]} />
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {ALL_DOC_TYPES.map((docType) => {
                const assignedTplId = assignments[docType];
                const isSaving = savingDoc === docType;

                return (
                  <View key={docType} style={styles.docRow}>
                    <Pressable
                      style={({ pressed }) => [styles.chooseTplBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => setPickingDocType(docType)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color={colors.primary[600]} />
                      ) : (
                        <Text style={styles.chooseTplText} numberOfLines={1}>
                          {getTemplateName(assignedTplId)}
                        </Text>
                      )}
                    </Pressable>

                    <View style={styles.docInfo}>
                      <Text style={styles.docLabel}>{DOC_TYPE_LABELS_AR[docType]}</Text>
                      <Text style={styles.docKey}>{docType}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.doneBtnText}>تم وإغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Picker Modal */}
      {pickingDocType && (
        <Modal visible={!!pickingDocType} transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setPickingDocType(null)} activeOpacity={0.7}>
                  <X size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>
                  اختر قالباً لـ «{DOC_TYPE_LABELS_AR[pickingDocType]}»
                </Text>
              </View>

              <ScrollView style={{ maxHeight: 350 }}>
                {templates.map((tpl) => {
                  const isSelected = assignments[pickingDocType] === tpl.id;

                  return (
                    <Pressable
                      key={tpl.id}
                      style={({ pressed }) => [
                        styles.tplPickItem,
                        isSelected && styles.tplPickItemSelected,
                        pressed && { opacity: 0.75 },
                      ]}
                      onPress={() => handleSelectTemplate(pickingDocType, tpl.id)}
                    >
                      {isSelected ? (
                        <View style={styles.checkCircle}>
                          <Check size={14} color="#fff" />
                        </View>
                      ) : (
                        <View style={{ width: 20 }} />
                      )}

                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.tplPickName}>{tpl.name}</Text>
                        <Text style={styles.tplPickSub}>
                          {PAPER_LABELS_AR[tpl.paperSize]} • {tpl.isSystem ? 'نظامي' : 'مخصص'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii['2xl'],
      borderTopRightRadius: radii['2xl'],
      maxHeight: '85%',
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
      marginBottom: spacing.sm,
    },
    closeBtn: {
      width: 34,
      height: 34,
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
    center: { padding: spacing.xxl, alignItems: 'center', justifyContent: 'center' },

    scroll: { maxHeight: 420 },
    scrollContent: { gap: spacing.xs + 2, paddingVertical: spacing.xs },

    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? colors.slate[800] : colors.slate[50],
      borderRadius: radii.xl,
      padding: spacing.sm + 2,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    docInfo: { alignItems: 'flex-end', flex: 1, marginLeft: spacing.sm },
    docLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    docKey: {
      fontSize: 10,
      color: colors.text.tertiary,
      fontFamily: 'monospace',
      marginTop: 1,
    },

    chooseTplBtn: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: isDark ? colors.primary[700] : colors.primary[200],
      maxWidth: '55%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chooseTplText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamily.arabicBold,
    },

    doneBtn: {
      backgroundColor: colors.primary[600],
      paddingVertical: 12,
      borderRadius: radii.xl,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    doneBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
      fontFamily: typography.fontFamily.arabicBold,
    },

    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    pickerContent: {
      backgroundColor: colors.surface,
      borderRadius: radii['2xl'],
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.lg,
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
      marginBottom: spacing.sm,
    },
    pickerTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
      textAlign: 'right',
      flex: 1,
    },

    tplPickItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    tplPickItemSelected: {
      backgroundColor: isDark ? colors.slate[700] : colors.primary[50],
      borderRadius: radii.lg,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },
    tplPickName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    tplPickSub: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
      marginTop: 2,
    },
  });

export default TemplateAssignmentsModal;
