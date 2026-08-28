import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
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
  RotateCcw,
  Receipt,
  FileSpreadsheet,
  Check,
} from 'lucide-react-native';
import {
  getAllTemplates,
  createTemplate,
  deleteTemplate,
  setTemplateAsDefault,
  duplicateTemplate,
  createEmptyTemplateData,
  importAllPresets,
  seedDefaultTemplates,
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
import { useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Badge, EmptyState } from '@/components/ui';
import { notify } from '@/lib/notify';
import { TemplateAssignmentsModal } from './TemplateAssignmentsModal';
import { InvoicePrintPreviewModal } from './InvoicePrintPreviewModal';

const THEME_OPTIONS: Array<{
  key: 'cyan' | 'blue' | 'emerald' | 'crimson' | 'amber' | 'slate';
  label: string;
  color: string;
}> = [
  { key: 'cyan', label: 'سماوي', color: '#0891b2' },
  { key: 'blue', label: 'أزرق', color: '#2563eb' },
  { key: 'emerald', label: 'زمردي', color: '#059669' },
  { key: 'crimson', label: 'عنابي', color: '#dc2626' },
  { key: 'amber', label: 'ذهبي', color: '#d97706' },
  { key: 'slate', label: 'رمادي', color: '#334155' },
];

// Memoized Template Item Card for 60fps virtualization & zero unnecessary re-renders
interface TemplateCardItemProps {
  tpl: PrintTemplate;
  colors: any;
  isDark: boolean;
  styles: any;
  onPreview: (tpl: PrintTemplate) => void;
  onEdit: (tpl: PrintTemplate) => void;
  onSetDefault: (tpl: PrintTemplate) => void;
  onDuplicate: (tpl: PrintTemplate) => void;
  onDelete: (tpl: PrintTemplate) => void;
}

const TemplateCardItem = memo(
  ({
    tpl,
    colors,
    isDark,
    styles,
    onPreview,
    onEdit,
    onSetDefault,
    onDuplicate,
    onDelete,
  }: TemplateCardItemProps) => {
    return (
      <View style={styles.templateCard}>
        <View style={styles.tplCardTop}>
          <View style={styles.tplBadges}>
            <View style={styles.paperBadge}>
              <Text style={styles.paperBadgeText}>
                {PAPER_LABELS_AR[tpl.paperSize] || tpl.paperSize}
              </Text>
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

          {/* Theme color preview dot */}
          <View style={styles.themeDots}>
            <View
              style={[
                styles.themeDot,
                { backgroundColor: tpl.styles?.primaryColor || colors.primary[600] },
              ]}
            />
            <View
              style={[
                styles.themeDot,
                { backgroundColor: tpl.styles?.headerColor || colors.primary[700] },
              ]}
            />
          </View>
        </View>

        <Text style={styles.tplName}>{tpl.name}</Text>
        <Text style={styles.tplDesc} numberOfLines={2}>
          {tpl.description || 'قالب طباعة مستندات تجارية وفواتير'}
        </Text>

        {/* Supported Documents */}
        <View style={styles.docTypesRow}>
          {(!tpl.supportedDocuments || !Array.isArray(tpl.supportedDocuments) || tpl.supportedDocuments.length === 0) ? (
            <Text style={styles.docTypeNone}>عام لجميع المستندات</Text>
          ) : (
            tpl.supportedDocuments.slice(0, 3).map((dt) => (
              <View key={dt} style={styles.docTypeChip}>
                <Text style={styles.docTypeChipText}>
                  {DOC_TYPE_LABELS_AR[dt] || dt}
                </Text>
              </View>
            ))
          )}
          {Array.isArray(tpl.supportedDocuments) && tpl.supportedDocuments.length > 3 && (
            <View style={styles.docTypeChip}>
              <Text style={styles.docTypeChipText}>
                +{tpl.supportedDocuments.length - 3}
              </Text>
            </View>
          )}
        </View>

        {/* Card Divider */}
        <View style={styles.cardDivider} />

        {/* Card Actions */}
        <View style={styles.tplActions}>
          <View style={styles.tplActionsLeft}>
            <Pressable
              style={({ pressed }) => [styles.previewBtn, pressed && { opacity: 0.75 }]}
              onPress={() => onPreview(tpl)}
            >
              <Eye size={14} color={colors.primary[600]} />
              <Text style={styles.previewBtnText}>معاينة حية</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.75 }]}
              onPress={() => onEdit(tpl)}
            >
              <Edit2 size={13} color="#fff" />
              <Text style={styles.editBtnText}>تخصيص</Text>
            </Pressable>
          </View>

          <View style={styles.tplActionsRight}>
            {!tpl.isDefault && (
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
                onPress={() => onSetDefault(tpl)}
              >
                <Star size={16} color={colors.text.tertiary} />
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
              onPress={() => onDuplicate(tpl)}
            >
              <Copy size={16} color={colors.text.tertiary} />
            </Pressable>

            {!tpl.isSystem && (
              <Pressable
                style={({ pressed }) => [
                  styles.iconBtn,
                  styles.deleteIconBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => onDelete(tpl)}
              >
                <Trash2 size={16} color={colors.danger.main} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }
);

export const PrintTemplatesScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  // Memoized dynamic styles
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const loadTemplates = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const all = await getAllTemplates(force);
      setTemplates(all);
    } catch (err) {
      console.warn('Failed to load templates:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTemplates();
    });
    loadTemplates();
    return unsubscribe;
  }, [navigation, loadTemplates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTemplates(true);
    setRefreshing(false);
  }, [loadTemplates]);

  // Stats calculation
  const stats = useMemo(() => {
    const list = Array.isArray(templates) ? templates : [];
    const total = list.length;
    const thermal = list.filter(
      (t) => t && (t.paperSize === '80mm' || t.paperSize === '58mm' || t.paperSize === '76mm')
    ).length;
    const standard = list.filter((t) => t && (t.paperSize === 'A4' || t.paperSize === 'A5')).length;
    const custom = list.filter((t) => t && !t.isSystem).length;
    return { total, thermal, standard, custom };
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (Array.isArray(templates) ? templates : []).filter((tpl) => {
      if (!tpl) return false;
      const matchSearch =
        !query ||
        (tpl.name && tpl.name.toLowerCase().includes(query)) ||
        (tpl.description && tpl.description.toLowerCase().includes(query));
      const matchPaper = selectedPaperFilter === 'all' || tpl.paperSize === selectedPaperFilter;
      return matchSearch && matchPaper;
    });
  }, [templates, searchQuery, selectedPaperFilter]);

  // Stabilized Actions Callbacks
  const handlePreview = useCallback((tpl: PrintTemplate) => {
    setPreviewTemplate(tpl);
  }, []);

  const handleEdit = useCallback(
    (tpl: PrintTemplate) => {
      navigation.navigate('TemplateEditor', { templateId: tpl.id });
    },
    [navigation]
  );

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) {
      notify.warning('يرجى إدخال اسم القالب', 'تنبيه');
      return;
    }
    setCreating(true);
    try {
      const templateData = createEmptyTemplateData(
        newName.trim(),
        newDesc.trim() || `قالب مخصص بحجم ${PAPER_LABELS_AR[newPaperSize]}`,
        newPaperSize,
        newTheme
      );
      const created = await createTemplate(templateData);
      setCreateModalVisible(false);
      setNewName('');
      setNewDesc('');
      await loadTemplates(true);
      notify.success(`تم إنشاء قالب "${created.name}" بنجاح`);
      navigation.navigate('TemplateEditor', { templateId: created.id });
    } catch (err) {
      notify.error(err, 'فشل إنشاء القالب');
    }
    setCreating(false);
  }, [newName, newDesc, newPaperSize, newTheme, loadTemplates, navigation]);

  const handleApplyPreset = useCallback(
    async (preset: PresetDef) => {
      try {
        const data = preset.build();
        const created = await createTemplate({
          ...data,
          name: `${preset.nameAr} (مخصص)`,
          isDefault: false,
          isSystem: false,
        });
        await loadTemplates(true);
        notify.success(`تم إضافة قالب "${created.name}"`);
        Alert.alert(
          '✓ تم إنشاء القالب من النموذج',
          `تمت إضافة قالب "${created.name}"، هل ترغب في تخصيصه الآن؟`,
          [
            { text: 'لاحقاً', style: 'cancel' },
            {
              text: 'تخصيص الآن',
              onPress: () => navigation.navigate('TemplateEditor', { templateId: created.id }),
            },
          ]
        );
      } catch (err) {
        notify.error(err, 'فشل تطبيق النموذج الجاهز');
      }
    },
    [loadTemplates, navigation]
  );

  const handleSetDefault = useCallback(
    async (tpl: PrintTemplate) => {
      try {
        await setTemplateAsDefault(tpl.id);
        await loadTemplates(true);
        notify.success(`تم تعيين "${tpl.name}" كقالب افتراضي`);
      } catch (err) {
        notify.error(err, 'فشل تعيين القالب كافتراضي');
      }
    },
    [loadTemplates]
  );

  const handleDelete = useCallback(
    (tpl: PrintTemplate) => {
      if (tpl.isSystem) {
        notify.warning('لا يمكن حذف قوالب النظام الأساسية', 'تنبيه');
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
              await loadTemplates(true);
              notify.success(`تم حذف قالب "${tpl.name}"`);
            } else {
              notify.error(res.error || 'تعذر حذف القالب');
            }
          },
        },
      ]);
    },
    [loadTemplates]
  );

  const handleOpenDuplicate = useCallback((tpl: PrintTemplate) => {
    setDuplicateTarget(tpl);
    setDuplicateName(`${tpl.name} (نسخة)`);
  }, []);

  const handleDuplicate = useCallback(async () => {
    if (!duplicateTarget || !duplicateName.trim()) return;
    try {
      await duplicateTemplate(duplicateTarget.id, duplicateName.trim());
      setDuplicateTarget(null);
      setDuplicateName('');
      await loadTemplates(true);
      notify.success('تم إنشاء نسخة من القالب بنجاح');
    } catch (err) {
      notify.error(err, 'فشل نسخ القالب');
    }
  }, [duplicateTarget, duplicateName, loadTemplates]);

  const handleRestoreAllDefaults = useCallback(async () => {
    Alert.alert(
      'توليد واسترجاع كافة القوالب',
      'هل ترغب في استيراد ومزامنة جميع القوالب الجاهزة وقوالب سطح المكتب (9 قوالب تشمل الإيصالات، الفواتير، عروض الأسعار، وكشوف الحسابات)؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'استرجاع وتوليد الآن',
          onPress: async () => {
            try {
              setLoading(true);
              await seedDefaultTemplates();
              const count = await importAllPresets();
              await loadTemplates(true);
              notify.success(`تم توليد وتحديث كافة القوالب الجاهزة (${count})`);
            } catch (err) {
              notify.error(err, 'فشل استيراد القوالب');
            }
            setLoading(false);
          },
        },
      ]
    );
  }, [loadTemplates]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackBtn}
          activeOpacity={0.7}
        >
          <ArrowRight size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>قوالب الطباعة والفواتير</Text>
          <Text style={styles.headerSubtitle}>تخصيص الإيصالات الحرارية، الفواتير، ونماذج الوثائق</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[600]}
          />
        }
      >
        {/* Quick Toolbar */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.assignBtn}
            onPress={() => setAssignmentsModalVisible(true)}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={15} color={colors.primary[600]} />
            <Text style={styles.assignBtnText}>تعيين الوثائق</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.assignBtn, styles.restoreBtn]}
            onPress={handleRestoreAllDefaults}
            activeOpacity={0.7}
          >
            <Sparkles size={15} color={colors.emerald[600]} />
            <Text style={[styles.assignBtnText, { color: colors.emerald[600] }]}>
              توليد كافة القوالب
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newTemplateBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.7}
          >
            <Plus size={15} color="#fff" />
            <Text style={styles.newTemplateBtnText}>قالب جديد</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: isDark ? colors.slate[800] : colors.primary[50] }]}>
              <FileText size={17} color={colors.primary[600]} />
            </View>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>إجمالي القوالب</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: isDark ? colors.slate[800] : colors.warning.light }]}>
              <Printer size={17} color={colors.warning.main} />
            </View>
            <Text style={styles.statNumber}>{stats.thermal}</Text>
            <Text style={styles.statLabel}>حراري 80/58</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: isDark ? colors.slate[800] : colors.emerald[50] }]}>
              <FileCheck size={17} color={colors.emerald[600]} />
            </View>
            <Text style={styles.statNumber}>{stats.standard}</Text>
            <Text style={styles.statLabel}>قياسي A4/A5</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: isDark ? colors.slate[800] : colors.purple[50] }]}>
              <Palette size={17} color={colors.purple[600]} />
            </View>
            <Text style={styles.statNumber}>{stats.custom}</Text>
            <Text style={styles.statLabel}>مخصص للمتجر</Text>
          </View>
        </View>

        {/* Presets Carousel */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>نماذج جاهزة للاستخدام السريع</Text>
          <Text style={styles.sectionHeaderSub}>نقرة واحدة للتطبيق</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
        >
          {TEMPLATE_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={styles.presetCard}
              onPress={() => handleApplyPreset(preset)}
              activeOpacity={0.75}
            >
              <View style={styles.presetHeader}>
                <Sparkles size={14} color={colors.primary[600]} />
                <View style={styles.presetBadge}>
                  <Text style={styles.presetSizeBadge}>{preset.paperSize}</Text>
                </View>
              </View>
              <Text style={styles.presetTitle}>{preset.nameAr}</Text>
              <Text style={styles.presetDesc} numberOfLines={2}>
                {preset.description}
              </Text>
              <View style={styles.presetFooter}>
                <Text style={styles.presetActionText}>+ استخدام النموذج</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search & Paper Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="بحث في القوالب بالاسم أو الوصف..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.text.tertiary}
              textAlign="right"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <X size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsScroll}
          >
            {['all', '80mm', '58mm', 'A4', 'A5'].map((sz) => (
              <TouchableOpacity
                key={sz}
                style={[
                  styles.filterChip,
                  selectedPaperFilter === sz && styles.filterChipActive,
                ]}
                onPress={() => setSelectedPaperFilter(sz)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedPaperFilter === sz && styles.filterChipTextActive,
                  ]}
                >
                  {sz === 'all' ? 'جميع المقاسات' : PAPER_LABELS_AR[sz as PaperSize] || sz}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Templates List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>القوالب المتاحة ({filteredTemplates.length})</Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : filteredTemplates.length === 0 ? (
          <View style={styles.emptyBox}>
            <EmptyState
              icon={<Printer size={42} color={colors.text.tertiary} />}
              title="لم يتم العثور على قوالب"
              description="يمكنك استرجاع وتوليد كافة القوالب الجاهزة بنقرة واحدة أو إنشاء قالب جديد"
              actionTitle="توليد كافة القوالب الجاهزة"
              onAction={handleRestoreAllDefaults}
            />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filteredTemplates.map((tpl) => (
              <TemplateCardItem
                key={tpl.id}
                tpl={tpl}
                colors={colors}
                isDark={isDark}
                styles={styles}
                onPreview={handlePreview}
                onEdit={handleEdit}
                onSetDefault={handleSetDefault}
                onDuplicate={handleOpenDuplicate}
                onDelete={handleDelete}
              />
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
                <X size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إنشاء قالب طباعة جديد</Text>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>اسم القالب</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="مثال: إيصال المحل السريع"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor={colors.text.tertiary}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>الوصف</Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                placeholder="وصف مختصر لمجال استخدام هذا القالب..."
                value={newDesc}
                onChangeText={setNewDesc}
                placeholderTextColor={colors.text.tertiary}
                multiline
                textAlign="right"
              />

              <Text style={styles.inputLabel}>حجم الورق والطابعة</Text>
              <View style={styles.paperOptionsRow}>
                {(['80mm', '58mm', 'A4', 'A5'] as PaperSize[]).map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[
                      styles.paperOption,
                      newPaperSize === sz && styles.paperOptionActive,
                    ]}
                    onPress={() => setNewPaperSize(sz)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.paperOptionText,
                        newPaperSize === sz && styles.paperOptionTextActive,
                      ]}
                    >
                      {PAPER_LABELS_AR[sz]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>نمط الألوان والسمة</Text>
              <View style={styles.themeOptionsRow}>
                {THEME_OPTIONS.map((th) => (
                  <TouchableOpacity
                    key={th.key}
                    style={[
                      styles.themeOption,
                      newTheme === th.key && styles.themeOptionActive,
                    ]}
                    onPress={() => setNewTheme(th.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.themeOptionDot, { backgroundColor: th.color }]} />
                    <Text style={styles.themeOptionLabel}>{th.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCreateModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreate}
                disabled={creating}
                activeOpacity={0.7}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>إنشاء ومتابعة</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Modal */}
      <Modal visible={!!duplicateTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setDuplicateTarget(null)} activeOpacity={0.7}>
                <X size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>نسخ القالب</Text>
            </View>

            <Text style={styles.inputLabel}>اسم النسخة الجديدة</Text>
            <TextInput
              style={styles.modalInput}
              value={duplicateName}
              onChangeText={setDuplicateName}
              placeholderTextColor={colors.text.tertiary}
              textAlign="right"
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDuplicateTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleDuplicate}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSubmitText}>نسخ القالب</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Template Document Assignments Modal */}
      <TemplateAssignmentsModal
        visible={assignmentsModalVisible}
        onClose={() => setAssignmentsModalVisible(false)}
        templates={templates}
      />

      {/* Invoice Live Multilingual Preview Modal */}
      {previewTemplate && (
        <InvoicePrintPreviewModal
          visible={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
          templateId={previewTemplate.id}
          sampleDocType={previewTemplate.supportedDocuments[0] || 'thermal-receipt'}
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
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      gap: spacing.sm,
    },
    headerBackBtn: {
      padding: 6,
      borderRadius: radii.md,
    },
    headerTitleCol: {
      flex: 1,
      alignItems: 'flex-end',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    headerSubtitle: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
      marginTop: 2,
    },
    headerActionBtn: {
      backgroundColor: colors.primary[600],
      padding: 8,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: spacing['3xl'],
    },

    topActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      marginBottom: spacing.md,
    },
    assignBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 9,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.xs,
    },
    restoreBtn: {
      backgroundColor: isDark ? colors.slate[800] : colors.emerald[50],
      borderColor: isDark ? colors.emerald[900] : colors.emerald[200],
    },
    assignBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamily.arabicBold,
    },
    newTemplateBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 9,
      borderRadius: radii.xl,
      backgroundColor: colors.primary[600],
      ...shadows.xs,
    },
    newTemplateBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#fff',
      fontFamily: typography.fontFamily.arabicBold,
    },

    statsGrid: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    statCard: {
      flex: 1,
      padding: spacing.sm,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
      alignItems: 'center',
      ...shadows.xs,
    },
    statIconBox: {
      padding: 6,
      borderRadius: radii.md,
      marginBottom: 4,
    },
    statNumber: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    statLabel: {
      fontSize: 9.5,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
      marginTop: 2,
    },

    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
      marginBottom: spacing.xs + 2,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    sectionHeaderSub: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
    },

    presetsScroll: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    presetCard: {
      width: 170,
      padding: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.xs,
    },
    presetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    presetBadge: {
      backgroundColor: isDark ? colors.slate[800] : colors.primary[50],
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    presetSizeBadge: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamily.arabicBold,
    },
    presetTitle: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
      marginBottom: 3,
      textAlign: 'right',
    },
    presetDesc: {
      fontSize: 10.5,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
      textAlign: 'right',
      lineHeight: 15,
      height: 30,
    },
    presetFooter: {
      marginTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
      paddingTop: 6,
      alignItems: 'flex-start',
    },
    presetActionText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamily.arabicBold,
    },

    filterSection: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
      height: 40,
      gap: spacing.xs,
      marginBottom: spacing.xs + 2,
    },
    searchInput: {
      flex: 1,
      fontSize: 12.5,
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabic,
      height: '100%',
    },
    filterChipsScroll: {
      gap: spacing.xs,
      paddingVertical: 2,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    filterChipActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[600],
    },
    filterChipText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabic,
    },
    filterChipTextActive: {
      color: '#fff',
      fontFamily: typography.fontFamily.arabicBold,
    },

    emptyBox: {
      paddingVertical: spacing.xl,
    },

    templateCard: {
      padding: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.xs,
    },
    tplCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    tplBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    paperBadge: {
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    paperBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    defaultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDark ? colors.slate[800] : colors.amber[50],
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: isDark ? colors.amber[800] : colors.amber[200],
    },
    defaultBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.amber[700],
      fontFamily: typography.fontFamily.arabicBold,
    },
    systemBadge: {
      backgroundColor: isDark ? colors.slate[800] : colors.indigo[50],
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    systemBadgeText: {
      fontSize: 10,
      color: colors.indigo[700],
      fontFamily: typography.fontFamily.arabic,
    },
    customBadge: {
      backgroundColor: isDark ? colors.slate[800] : colors.emerald[50],
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    customBadgeText: {
      fontSize: 10,
      color: colors.emerald[700],
      fontFamily: typography.fontFamily.arabic,
    },
    themeDots: {
      flexDirection: 'row',
      gap: 3,
    },
    themeDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },

    tplName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
      textAlign: 'right',
      marginBottom: 3,
    },
    tplDesc: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
      textAlign: 'right',
      lineHeight: 16,
      marginBottom: spacing.xs,
    },

    docTypesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      justifyContent: 'flex-end',
      marginBottom: spacing.xs,
    },
    docTypeNone: {
      fontSize: 10.5,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
    },
    docTypeChip: {
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    docTypeChipText: {
      fontSize: 10,
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabic,
    },

    cardDivider: {
      height: 1,
      backgroundColor: colors.border.subtle,
      marginVertical: spacing.xs + 2,
    },

    tplActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tplActionsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    previewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.slate[800] : colors.primary[50],
      borderWidth: 1,
      borderColor: colors.primary[200],
    },
    previewBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamily.arabicBold,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radii.md,
      backgroundColor: colors.primary[600],
    },
    editBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
      fontFamily: typography.fontFamily.arabicBold,
    },
    tplActionsRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    iconBtn: {
      padding: 6,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    deleteIconBtn: {
      backgroundColor: isDark ? colors.slate[800] : colors.danger.light,
      borderColor: colors.danger.main,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      borderRadius: radii['2xl'],
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
      paddingBottom: spacing.sm,
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabicBold,
      marginBottom: 4,
      marginTop: spacing.xs,
      textAlign: 'right',
    },
    modalInput: {
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[50],
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabic,
      marginBottom: spacing.xs,
    },
    paperOptionsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    paperOption: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    paperOptionActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[600],
    },
    paperOptionText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    paperOptionTextActive: {
      color: '#fff',
    },
    themeOptionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    themeOptionActive: {
      borderColor: colors.primary[600],
      backgroundColor: isDark ? colors.slate[700] : colors.primary[50],
    },
    themeOptionDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    themeOptionLabel: {
      fontSize: 11,
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabic,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
      paddingTop: spacing.sm,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: radii.xl,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
    },
    modalCancelText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    modalSubmitBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: radii.xl,
      backgroundColor: colors.primary[600],
    },
    modalSubmitText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
      fontFamily: typography.fontFamily.arabicBold,
    },
  });

export default PrintTemplatesScreen;
