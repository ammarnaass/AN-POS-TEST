import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import {
  Printer,
  ArrowRight,
  Plus,
  Edit2,
  Trash2,
  Star,
  Copy,
  FileText,
  Eye,
  Search,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  X,
  Layers,
  Palette,
  FileCheck,
} from 'lucide-react-native';
import {
  getAllTemplates,
  createTemplate,
  deleteTemplate,
  setTemplateAsDefault,
  duplicateTemplate,
  createEmptyTemplateData,
  TEMPLATE_PRESETS,
  type PresetDef,
} from '@/lib/templateService';
import {
  PAPER_LABELS_AR,
  DOC_TYPE_LABELS_AR,
  type PrintTemplate,
  type PaperSize,
  type DocTypeKey,
} from '@shared/types/invoicePrint';
import { colors, radii, spacing, shadows } from '@/theme';
import { TemplateAssignmentsModal } from './TemplateAssignmentsModal';
import { InvoicePrintPreviewModal } from './InvoicePrintPreviewModal';

const THEME_OPTIONS: Array<{ key: 'cyan' | 'blue' | 'emerald' | 'crimson' | 'amber' | 'slate'; label: string; color: string }> = [
  { key: 'cyan', label: 'سماوي', color: '#0891b2' },
  { key: 'blue', label: 'أزرق', color: '#2563eb' },
  { key: 'emerald', label: 'زمردي', color: '#059669' },
  { key: 'crimson', label: 'عنابي', color: '#dc2626' },
  { key: 'amber', label: 'ذهبي', color: '#d97706' },
  { key: 'slate', label: 'رمادي', color: '#334155' },
];

export const PrintTemplatesScreen = ({ navigation }: any) => {
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('all');

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [assignmentsModalVisible, setAssignmentsModalVisible] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PrintTemplate | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<PrintTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPaperSize, setNewPaperSize] = useState<PaperSize>('80mm');
  const [newTheme, setNewTheme] = useState<'cyan' | 'blue' | 'emerald' | 'crimson' | 'amber' | 'slate'>('cyan');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTemplates();
    });
    loadTemplates();
    return unsubscribe;
  }, [navigation]);

  async function loadTemplates() {
    setLoading(true);
    try {
      const all = await getAllTemplates();
      setTemplates(all);
    } catch (err) {
      console.warn('Failed to load templates:', err);
    }
    setLoading(false);
  }

  // Stats calculation
  const stats = useMemo(() => {
    const total = templates.length;
    const thermal = templates.filter((t) => t.paperSize === '80mm' || t.paperSize === '58mm' || t.paperSize === '76mm').length;
    const standard = templates.filter((t) => t.paperSize === 'A4' || t.paperSize === 'A5').length;
    const custom = templates.filter((t) => !t.isSystem).length;
    return { total, thermal, standard, custom };
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchSearch =
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tpl.description && tpl.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPaper = selectedPaperFilter === 'all' || tpl.paperSize === selectedPaperFilter;
      return matchSearch && matchPaper;
    });
  }, [templates, searchQuery, selectedPaperFilter]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم القالب');
      return;
    }
    setCreating(true);
    try {
      const templateData = createEmptyTemplateData(
        newName.trim(),
        newDesc.trim() || `قالب مخصص بحجم ${PAPER_LABELS_AR[newPaperSize]}`,
        newPaperSize,
        newTheme,
      );
      const created = await createTemplate(templateData);
      setCreateModalVisible(false);
      setNewName('');
      setNewDesc('');
      await loadTemplates();
      navigation.navigate('TemplateEditor', { templateId: created.id });
    } catch {
      Alert.alert('خطأ', 'فشل إنشاء القالب');
    }
    setCreating(false);
  };

  const handleApplyPreset = async (preset: PresetDef) => {
    try {
      const data = preset.build();
      const created = await createTemplate({
        ...data,
        name: `${preset.nameAr} (مخصص)`,
        isDefault: false,
        isSystem: false,
      });
      await loadTemplates();
      Alert.alert(
        '✓ تم إنشاء القالب من النموذج',
        `تمت إضافة قالب "${created.name}"، هل ترغب في تخصيصه الآن؟`,
        [
          { text: 'لاحقاً', style: 'cancel' },
          { text: 'تخصيص الآن', onPress: () => navigation.navigate('TemplateEditor', { templateId: created.id }) },
        ],
      );
    } catch {
      Alert.alert('خطأ', 'فشل تطبيق النموذج الجاهز');
    }
  };

  const handleSetDefault = async (tpl: PrintTemplate) => {
    try {
      await setTemplateAsDefault(tpl.id);
      await loadTemplates();
      Alert.alert('✓ تم التعيين', `تم تعيين "${tpl.name}" كقالب افتراضي`);
    } catch {
      Alert.alert('خطأ', 'فشل تعيين القالب كافتراضي');
    }
  };

  const handleDelete = (tpl: PrintTemplate) => {
    if (tpl.isSystem) {
      Alert.alert('تنبيه', 'لا يمكن حذف قوالب النظام الأساسية');
      return;
    }
    Alert.alert('تأكيد الحذف', `هل أنت متأكد من حذف قالب "${tpl.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteTemplate(tpl.id);
          if (res.success) {
            await loadTemplates();
          } else {
            Alert.alert('خطأ', res.error || 'تعذر حذف القالب');
          }
        },
      },
    ]);
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget || !duplicateName.trim()) return;
    try {
      await duplicateTemplate(duplicateTarget.id, duplicateName.trim());
      setDuplicateTarget(null);
      setDuplicateName('');
      await loadTemplates();
    } catch {
      Alert.alert('خطأ', 'فشل نسخ القالب');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn} activeOpacity={0.7}>
          <ArrowRight size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>إدارة قوالب الطباعة</Text>
          <Text style={styles.headerSubtitle}>تخصيص الإيصالات والفواتير والمستندات</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Toolbar */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.assignBtn}
            onPress={() => setAssignmentsModalVisible(true)}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={16} color={colors.primary[700]} />
            <Text style={styles.assignBtnText}>تعيين القوالب للوثائق</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newTemplateBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.newTemplateBtnText}>إنشاء قالب جديد</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: colors.primary[50] }]}>
              <FileText size={18} color={colors.primary[600]} />
            </View>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>إجمالي القوالب</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: colors.warning.light }]}>
              <Printer size={18} color={colors.warning.dark} />
            </View>
            <Text style={styles.statNumber}>{stats.thermal}</Text>
            <Text style={styles.statLabel}>حراري (80/58mm)</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: colors.emerald[50] }]}>
              <FileCheck size={18} color={colors.emerald[700]} />
            </View>
            <Text style={styles.statNumber}>{stats.standard}</Text>
            <Text style={styles.statLabel}>قياسي (A4/A5)</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: colors.purple[50] }]}>
              <Palette size={18} color={colors.purple[700]} />
            </View>
            <Text style={styles.statNumber}>{stats.custom}</Text>
            <Text style={styles.statLabel}>مخصص للمتجر</Text>
          </View>
        </View>

        {/* Presets Carousel */}
        <Text style={styles.sectionHeader}>نماذج جاهزة للاستخدام السريع</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
          {TEMPLATE_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={styles.presetCard}
              onPress={() => handleApplyPreset(preset)}
              activeOpacity={0.75}
            >
              <View style={styles.presetHeader}>
                <Sparkles size={14} color={colors.primary[600]} />
                <Text style={styles.presetSizeBadge}>{preset.paperSize}</Text>
              </View>
              <Text style={styles.presetTitle}>{preset.nameAr}</Text>
              <Text style={styles.presetDesc} numberOfLines={2}>{preset.description}</Text>
              <View style={styles.presetFooter}>
                <Text style={styles.presetActionText}>+ استخدام النموذج</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search & Paper Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.slate[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="بحث في القوالب..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.slate[400]}
              textAlign="right"
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            {['all', '80mm', '58mm', 'A4', 'A5'].map((sz) => (
              <TouchableOpacity
                key={sz}
                style={[styles.filterChip, selectedPaperFilter === sz && styles.filterChipActive]}
                onPress={() => setSelectedPaperFilter(sz)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, selectedPaperFilter === sz && styles.filterChipTextActive]}>
                  {sz === 'all' ? 'جميع المقاسات' : PAPER_LABELS_AR[sz as PaperSize] || sz}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Templates List */}
        <Text style={styles.sectionHeader}>القوالب المتاحة ({filteredTemplates.length})</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : filteredTemplates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Printer size={40} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>لم يتم العثور على قوالب</Text>
            <Text style={styles.emptySubtitle}>جرب تغيير خيارات البحث أو قم بإنشاء قالب جديد</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filteredTemplates.map((tpl) => (
              <View key={tpl.id} style={styles.templateCard}>
                <View style={styles.tplCardTop}>
                  <View style={styles.tplBadges}>
                    <View style={styles.paperBadge}>
                      <Text style={styles.paperBadgeText}>{PAPER_LABELS_AR[tpl.paperSize] || tpl.paperSize}</Text>
                    </View>
                    {tpl.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Star size={10} color="#d97706" fill="#d97706" />
                        <Text style={styles.defaultBadgeText}>افتراضي</Text>
                      </View>
                    )}
                    {tpl.isSystem ? (
                      <View style={styles.systemBadge}>
                        <Text style={styles.systemBadgeText}>نظامي</Text>
                      </View>
                    ) : (
                      <View style={styles.customBadge}>
                        <Text style={styles.customBadgeText}>مخصص</Text>
                      </View>
                    )}
                  </View>

                  {/* Theme color dots */}
                  <View style={styles.themeDots}>
                    <View style={[styles.themeDot, { backgroundColor: tpl.styles.primaryColor }]} />
                    <View style={[styles.themeDot, { backgroundColor: tpl.styles.headerColor }]} />
                  </View>
                </View>

                <Text style={styles.tplName}>{tpl.name}</Text>
                <Text style={styles.tplDesc} numberOfLines={2}>
                  {tpl.description || 'قالب طباعة مستندات تجارية'}
                </Text>

                {/* Supported Documents */}
                <View style={styles.docTypesRow}>
                  {tpl.supportedDocuments.length === 0 ? (
                    <Text style={styles.docTypeNone}>عام لجميع المستندات</Text>
                  ) : (
                    tpl.supportedDocuments.slice(0, 3).map((dt) => (
                      <View key={dt} style={styles.docTypeChip}>
                        <Text style={styles.docTypeChipText}>{DOC_TYPE_LABELS_AR[dt] || dt}</Text>
                      </View>
                    ))
                  )}
                  {tpl.supportedDocuments.length > 3 && (
                    <View style={styles.docTypeChip}>
                      <Text style={styles.docTypeChipText}>+{tpl.supportedDocuments.length - 3}</Text>
                    </View>
                  )}
                </View>

                {/* Card Actions */}
                <View style={styles.tplActions}>
                  <View style={styles.tplActionsLeft}>
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={() => setPreviewTemplate(tpl)}
                      activeOpacity={0.7}
                    >
                      <Eye size={14} color={colors.primary[700]} />
                      <Text style={styles.previewBtnText}>معاينة</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => navigation.navigate('TemplateEditor', { templateId: tpl.id })}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={14} color="#fff" />
                      <Text style={styles.editBtnText}>تخصيص</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.tplActionsRight}>
                    {!tpl.isDefault && (
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => handleSetDefault(tpl)}
                        activeOpacity={0.7}
                      >
                        <Star size={16} color={colors.slate[400]} />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        setDuplicateTarget(tpl);
                        setDuplicateName(`${tpl.name} (نسخة)`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Copy size={16} color={colors.slate[400]} />
                    </TouchableOpacity>

                    {!tpl.isSystem && (
                      <TouchableOpacity
                        style={[styles.iconBtn, styles.deleteIconBtn]}
                        onPress={() => handleDelete(tpl)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={16} color={colors.danger.main} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Template Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color={colors.slate[400]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إنشاء قالب جديد</Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel}>اسم القالب</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="مثال: إيصال المحل السريع"
                value={newName}
                onChangeText={setNewName}
                textAlign="right"
                placeholderTextColor={colors.slate[400]}
              />

              <Text style={styles.inputLabel}>الوصف (اختياري)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="وصف مختصر لمجال استخدام القالب"
                value={newDesc}
                onChangeText={setNewDesc}
                textAlign="right"
                placeholderTextColor={colors.slate[400]}
              />

              <Text style={styles.inputLabel}>مقاس الورق</Text>
              <View style={styles.modalSizesGrid}>
                {(['80mm', '58mm', 'A4', 'A5'] as PaperSize[]).map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[styles.modalSizeBtn, newPaperSize === sz && styles.modalSizeBtnActive]}
                    onPress={() => setNewPaperSize(sz)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalSizeText, newPaperSize === sz && styles.modalSizeTextActive]}>
                      {PAPER_LABELS_AR[sz] || sz}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>الثيم اللوني الأساسي</Text>
              <View style={styles.themeGrid}>
                {THEME_OPTIONS.map((th) => (
                  <TouchableOpacity
                    key={th.key}
                    style={[styles.themeOptionBtn, newTheme === th.key && styles.themeOptionBtnActive]}
                    onPress={() => setNewTheme(th.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.themeSwatch, { backgroundColor: th.color }]} />
                    <Text style={styles.themeLabel}>{th.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.7}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>إنشاء ومتابعة التخصيص</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Duplicate Template Modal */}
      <Modal visible={!!duplicateTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: spacing.lg }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setDuplicateTarget(null)} activeOpacity={0.7}>
                <X size={20} color={colors.slate[400]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>نسخ القالب</Text>
            </View>

            <Text style={styles.inputLabel}>اسم النسخة الجديدة</Text>
            <TextInput
              style={styles.modalInput}
              value={duplicateName}
              onChangeText={setDuplicateName}
              textAlign="right"
              placeholderTextColor={colors.slate[400]}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDuplicateTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleDuplicate}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmBtnText}>تأكيد النسخ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Template Assignments Modal */}
      <TemplateAssignmentsModal
        visible={assignmentsModalVisible}
        onClose={() => setAssignmentsModalVisible(false)}
        templates={templates}
      />

      {/* Invoice Live Preview Modal */}
      {previewTemplate && (
        <InvoicePrintPreviewModal
          visible={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          templateId={previewTemplate.id}
          sampleDocType={previewTemplate.supportedDocuments[0] || 'thermal-receipt'}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo' },
  headerSubtitle: { fontSize: 11.5, color: colors.text.tertiary, fontFamily: 'Cairo' },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxxl },

  topActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  assignBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    paddingVertical: 10,
    borderRadius: radii.xl,
  },
  assignBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.primary[700], fontFamily: 'Cairo' },
  newTemplateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary[600],
    paddingVertical: 10,
    borderRadius: radii.xl,
  },
  newTemplateBtnText: { fontSize: 12.5, fontWeight: '700', color: '#fff', fontFamily: 'Cairo' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'flex-end',
    ...shadows.xs,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: { fontSize: 18, fontWeight: '900', color: colors.text.primary, fontFamily: 'Cairo' },
  statLabel: { fontSize: 11, color: colors.text.secondary, fontFamily: 'Cairo' },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text.secondary,
    textAlign: 'right',
    marginBottom: spacing.xs,
    marginRight: 4,
    fontFamily: 'Cairo',
  },

  presetsScroll: { gap: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: 2, marginBottom: spacing.md },
  presetCard: {
    width: 170,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'flex-end',
    ...shadows.xs,
  },
  presetHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 4 },
  presetSizeBadge: { fontSize: 10, fontWeight: '800', color: colors.primary[700], backgroundColor: colors.primary[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  presetTitle: { fontSize: 13, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo', textAlign: 'right' },
  presetDesc: { fontSize: 10.5, color: colors.text.tertiary, fontFamily: 'Cairo', textAlign: 'right', marginTop: 2, height: 30 },
  presetFooter: { marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border.subtle, paddingTop: 6, width: '100%', alignItems: 'center' },
  presetActionText: { fontSize: 11, fontWeight: '700', color: colors.primary[700], fontFamily: 'Cairo' },

  filterSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
  filterChipsScroll: { gap: spacing.xs + 2 },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[700] },
  filterChipText: { fontSize: 11.5, color: colors.slate[600], fontWeight: '700', fontFamily: 'Cairo' },
  filterChipTextActive: { color: '#fff' },

  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo', marginTop: spacing.sm },
  emptySubtitle: { fontSize: 12, color: colors.text.tertiary, fontFamily: 'Cairo', marginTop: 4 },

  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.xs,
  },
  tplCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  tplBadges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  paperBadge: { backgroundColor: colors.primary[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.primary[200] },
  paperBadgeText: { fontSize: 11, fontWeight: '800', color: colors.primary[700], fontFamily: 'Cairo' },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.warning.light, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  defaultBadgeText: { fontSize: 10.5, fontWeight: '700', color: colors.warning.dark, fontFamily: 'Cairo' },
  systemBadge: { backgroundColor: colors.slate[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  systemBadgeText: { fontSize: 10.5, fontWeight: '600', color: colors.slate[600], fontFamily: 'Cairo' },
  customBadge: { backgroundColor: colors.purple[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  customBadgeText: { fontSize: 10.5, fontWeight: '600', color: colors.purple[700], fontFamily: 'Cairo' },

  themeDots: { flexDirection: 'row', gap: 4 },
  themeDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: '#fff' },

  tplName: { fontSize: 15, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo', textAlign: 'right', marginTop: 4 },
  tplDesc: { fontSize: 11.5, color: colors.text.tertiary, fontFamily: 'Cairo', textAlign: 'right', marginTop: 2, marginBottom: spacing.sm },

  docTypesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', marginBottom: spacing.md },
  docTypeNone: { fontSize: 11, color: colors.slate[400], fontStyle: 'italic', fontFamily: 'Cairo' },
  docTypeChip: { backgroundColor: colors.slate[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  docTypeChipText: { fontSize: 10.5, color: colors.text.secondary, fontFamily: 'Cairo' },

  tplActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing.sm,
  },
  tplActionsLeft: { flexDirection: 'row', gap: 6 },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  previewBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary[700], fontFamily: 'Cairo' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: 'Cairo' },

  tplActionsRight: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.slate[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  deleteIconBtn: { backgroundColor: colors.danger.light, borderColor: colors.danger.border },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, marginBottom: spacing.md },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.text.secondary, textAlign: 'right', marginBottom: 4, marginTop: spacing.sm, fontFamily: 'Cairo' },
  modalInput: { backgroundColor: colors.slate[50], borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 13, color: colors.text.primary, fontFamily: 'Cairo' },
  modalSizesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  modalSizeBtn: { flex: 1, minWidth: '45%', paddingVertical: 8, alignItems: 'center', borderRadius: radii.md, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.border.default },
  modalSizeBtnActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  modalSizeText: { fontSize: 11.5, fontWeight: '700', color: colors.text.secondary, fontFamily: 'Cairo' },
  modalSizeTextActive: { color: '#fff' },

  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  themeOptionBtn: { width: '31%', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.slate[50], borderRadius: radii.md, padding: 6, borderWidth: 1, borderColor: colors.border.default },
  themeOptionBtnActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  themeSwatch: { width: 14, height: 14, borderRadius: 7 },
  themeLabel: { fontSize: 11, fontWeight: '600', color: colors.text.primary, fontFamily: 'Cairo' },

  modalSubmitBtn: { backgroundColor: colors.primary[600], paddingVertical: 12, borderRadius: radii.xl, alignItems: 'center', marginTop: spacing.lg },
  modalSubmitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: 'Cairo' },

  modalActionsRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  modalCancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radii.lg, backgroundColor: colors.slate[100] },
  modalCancelBtnText: { fontSize: 13, fontWeight: '700', color: colors.slate[600], fontFamily: 'Cairo' },
  modalConfirmBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radii.lg, backgroundColor: colors.primary[600] },
  modalConfirmBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Cairo' },
});

export default PrintTemplatesScreen;
