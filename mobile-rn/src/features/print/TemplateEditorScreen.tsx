import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import {
  ArrowRight,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  Image as ImageIcon,
  Grid3x3,
  SeparatorHorizontal,
  QrCode,
  Barcode as BarcodeIcon,
  Palette,
  Eye,
  Settings as SettingsIcon,
  Check,
  X,
  Sparkles,
} from 'lucide-react-native';
import {
  getTemplateById,
  updateTemplate,
  interpolateVariables,
} from '@/lib/templateService';
import type {
  PrintTemplate,
  Block,
  TextBlock,
  TableBlock,
  SeparatorBlock,
  QrBlock,
  BarcodeBlock,
  VisibilityMap,
  TemplateStyles,
  PaperSize,
  DocTypeKey,
} from '@shared/types/invoicePrint';
import { PAPER_LABELS_AR, DOC_TYPE_LABELS_AR, ALL_DOC_TYPES } from '@shared/types/invoicePrint';
import { useTheme } from '@/theme';
import { radii, spacing, shadows, typography } from '@/theme/tokens';
import { BarcodeSvg } from '@/lib/barcodeSvg';

type ActiveTab = 'blocks' | 'visibility' | 'styles' | 'settings' | 'preview';
type SectionKey = 'header' | 'body' | 'footer';

const THEME_PRESETS: Array<{ name: string; primary: string; header: string; footer: string; table: string }> = [
  { name: 'سماوي قياسي', primary: '#0891b2', header: '#0e7490', footer: '#475569', table: '#e2e8f0' },
  { name: 'أزرق احترافي', primary: '#2563eb', header: '#1d4ed8', footer: '#64748b', table: '#dbeafe' },
  { name: 'زمردي أنيق', primary: '#059669', header: '#047857', footer: '#64748b', table: '#d1fae5' },
  { name: 'عنابي فاخر', primary: '#dc2626', header: '#b91c1c', footer: '#57534e', table: '#fee2e2' },
  { name: 'ذهبي تجاري', primary: '#d97706', header: '#b45309', footer: '#44403c', table: '#fef3c7' },
  { name: 'رمادي كلاسيك', primary: '#334155', header: '#1e293b', footer: '#94a3b8', table: '#f1f5f9' },
];

export const TemplateEditorScreen = ({ route, navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { templateId } = route.params || {};

  const [template, setTemplate] = useState<PrintTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('blocks');
  const [activeSection, setActiveSection] = useState<SectionKey>('header');

  // Block editing modal
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [addBlockModalVisible, setAddBlockModalVisible] = useState(false);

  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  async function loadTemplate() {
    setLoading(true);
    try {
      const found = await getTemplateById(templateId);
      if (found) {
        setTemplate(found);
      }
    } catch (err) {
      console.warn('Failed to load template:', err);
    }
    setLoading(false);
  }

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      await updateTemplate(template.id, template);
      setDirty(false);
      Alert.alert('✓ تم الحفظ', 'تم حفظ تعديلات القالب بنجاح');
    } catch {
      Alert.alert('خطأ', 'فشل حفظ التعديلات');
    }
    setSaving(false);
  };

  // Section Blocks manipulation
  const getSectionBlocks = (section: SectionKey): Block[] => {
    if (!template || !template.layout) return [];
    return template.layout[section] || [];
  };

  const updateSectionBlocks = (section: SectionKey, blocks: Block[]) => {
    if (!template) return;
    setTemplate({
      ...template,
      layout: {
        ...template.layout,
        [section]: blocks,
      },
    });
    setDirty(true);
  };

  const handleMoveBlock = (section: SectionKey, index: number, direction: 'up' | 'down') => {
    const blocks = [...getSectionBlocks(section)];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const temp = blocks[index];
    blocks[index] = blocks[targetIdx];
    blocks[targetIdx] = temp;
    updateSectionBlocks(section, blocks);
  };

  const handleDeleteBlock = (section: SectionKey, id: string) => {
    const blocks = getSectionBlocks(section).filter((b) => b.id !== id);
    updateSectionBlocks(section, blocks);
  };

  const handleAddBlock = (type: Block['type']) => {
    const id = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let newBlock: Block;

    switch (type) {
      case 'text':
        newBlock = {
          id,
          type: 'text',
          text: 'نص مخصص {{shopLegal.name}}',
          align: 'center',
          size: 'md',
          weight: 400,
        };
        break;
      case 'separator':
        newBlock = { id, type: 'separator', style: 'dashed', thickness: 1 };
        break;
      case 'qr':
        newBlock = { id, type: 'qr', payload: 'invoiceNumber:date:total', size: 100 };
        break;
      case 'barcode':
        newBlock = { id, type: 'barcode', source: 'invoiceNumber', format: 'CODE128', width: 180, height: 40 };
        break;
      case 'image':
        newBlock = { id, type: 'image', src: '', width: 60, height: 60, align: 'center' };
        break;
      case 'table':
        newBlock = {
          id,
          type: 'table',
          source: 'items',
          columns: [
            { key: 'name', label: 'المنتج', align: 'right' },
            { key: 'qty', label: 'الكمية', align: 'center', format: 'number' },
            { key: 'unitPrice', label: 'السعر', align: 'left', format: 'currency' },
            { key: 'lineTotal', label: 'الإجمالي', align: 'left', format: 'currency' },
          ],
          showTotal: true,
          showDiscount: true,
          showTva: false,
        };
        break;
      default:
        newBlock = { id, type: 'text', text: 'عنصر جديد' };
    }

    updateSectionBlocks(activeSection, [...getSectionBlocks(activeSection), newBlock]);
    setAddBlockModalVisible(false);
  };

  const handleUpdateEditingBlock = (updated: Block) => {
    const blocks = getSectionBlocks(activeSection).map((b) => (b.id === updated.id ? updated : b));
    updateSectionBlocks(activeSection, blocks);
    setEditingBlock(null);
  };

  // Visibility toggle
  const handleToggleVisibility = (key: keyof VisibilityMap) => {
    if (!template) return;
    setTemplate({
      ...template,
      visibility: {
        ...template.visibility,
        [key]: !template.visibility[key],
      },
    });
    setDirty(true);
  };

  // Styles update
  const handleApplyThemePreset = (preset: (typeof THEME_PRESETS)[0]) => {
    if (!template) return;
    setTemplate({
      ...template,
      styles: {
        ...template.styles,
        primaryColor: preset.primary,
        headerColor: preset.header,
        footerColor: preset.footer,
        tableColor: preset.table,
        logoColor: preset.primary,
      },
    });
    setDirty(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>لم يتم العثور على القالب</Text>
      </View>
    );
  }

  const currentSectionBlocks = getSectionBlocks(activeSection);

  // Mock invoice data for live preview
  const mockContext = {
    invoice: {
      number: 'INV-2026-0042',
      date: new Date().toLocaleDateString('ar-DZ'),
      customerName: 'كريم بن علي',
      customerPhone: '0550 12 34 56',
      customerAddress: 'الجزائر العاصمة',
      paymentMethod: 'نقداً',
      subtotal: 3500,
      discount: 200,
      tvaAmount: 0,
      total: 3300,
      items: [
        { name: 'زيت زيتون بكر ممتاز 1 لتر', qty: 2, unitPrice: 950, lineTotal: 1900 },
        { name: 'عسل جبلي طبيعي 500 غ', qty: 1, unitPrice: 1400, lineTotal: 1400 },
      ],
    },
    shopLegal: {
      name: 'سوبرماركت البركة',
      phone: '023 45 67 89',
      address: 'شارع فلسطين، الجزائر',
      footer: 'شكراً لزيارتكم ونتمنى عودتكم قريباً',
      nif: '001616012345678',
    },
    user: { name: 'أحمد (الكاشير)' },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn} activeOpacity={0.7}>
          <ArrowRight size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>{template.name}</Text>
          <Text style={styles.headerSubtitle}>
            {PAPER_LABELS_AR[template.paperSize]} {dirty ? '• تغييرات غير محفوظة' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, !dirty && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving || !dirty}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={16} color="#fff" />
              <Text style={styles.saveBtnText}>حفظ</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Mode Tabs */}
      <View style={styles.modeTabsRow}>
        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'blocks' && styles.modeTabActive]}
          onPress={() => setActiveTab('blocks')}
          activeOpacity={0.7}
        >
          <Grid3x3 size={16} color={activeTab === 'blocks' ? colors.primary[700] : colors.slate[400]} />
          <Text style={[styles.modeTabText, activeTab === 'blocks' && styles.modeTabTextActive]}>العناصر</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'visibility' && styles.modeTabActive]}
          onPress={() => setActiveTab('visibility')}
          activeOpacity={0.7}
        >
          <Eye size={16} color={activeTab === 'visibility' ? colors.primary[700] : colors.slate[400]} />
          <Text style={[styles.modeTabText, activeTab === 'visibility' && styles.modeTabTextActive]}>العرض</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'styles' && styles.modeTabActive]}
          onPress={() => setActiveTab('styles')}
          activeOpacity={0.7}
        >
          <Palette size={16} color={activeTab === 'styles' ? colors.primary[700] : colors.slate[400]} />
          <Text style={[styles.modeTabText, activeTab === 'styles' && styles.modeTabTextActive]}>المظهر</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'settings' && styles.modeTabActive]}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}
        >
          <SettingsIcon size={16} color={activeTab === 'settings' ? colors.primary[700] : colors.slate[400]} />
          <Text style={[styles.modeTabText, activeTab === 'settings' && styles.modeTabTextActive]}>الإعدادات</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'preview' && styles.modeTabActive]}
          onPress={() => setActiveTab('preview')}
          activeOpacity={0.7}
        >
          <Sparkles size={16} color={activeTab === 'preview' ? colors.primary[700] : colors.slate[400]} />
          <Text style={[styles.modeTabText, activeTab === 'preview' && styles.modeTabTextActive]}>المعاينة</Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Blocks Canvas */}
      {activeTab === 'blocks' && (
        <View style={{ flex: 1 }}>
          {/* Section Selector */}
          <View style={styles.sectionTabsRow}>
            {(['header', 'body', 'footer'] as SectionKey[]).map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.sectionTab, activeSection === sec && styles.sectionTabActive]}
                onPress={() => setActiveSection(sec)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionTabText, activeSection === sec && styles.sectionTabTextActive]}>
                  {sec === 'header' ? '⬆ الرأس' : sec === 'body' ? '☰ المتن' : '⬇ التذييل'}
                  {' '}({getSectionBlocks(sec).length})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeaderRow}>
              <TouchableOpacity
                style={styles.addBlockBtn}
                onPress={() => setAddBlockModalVisible(true)}
                activeOpacity={0.7}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.addBlockBtnText}>+ إضافة عنصر للقسم</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>
                عناصر {activeSection === 'header' ? 'الرأس' : activeSection === 'body' ? 'المتن' : 'التذييل'}
              </Text>
            </View>

            {currentSectionBlocks.length === 0 ? (
              <View style={styles.emptyBlocksBox}>
                <Text style={styles.emptyBlocksText}>القسم فارغ حالياً</Text>
                <Text style={styles.emptyBlocksSub}>انقر على "إضافة عنصر للقسم" لإضافة نصوص، جداول، فواصل أو باركود</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {currentSectionBlocks.map((block, index) => (
                  <View key={block.id} style={styles.blockCard}>
                    <View style={styles.blockCardLeft}>
                      <TouchableOpacity
                        style={styles.blockActionIcon}
                        onPress={() => handleMoveBlock(activeSection, index, 'up')}
                        disabled={index === 0}
                        activeOpacity={0.7}
                      >
                        <ChevronUp size={16} color={index === 0 ? colors.slate[300] : colors.slate[600]} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.blockActionIcon}
                        onPress={() => handleMoveBlock(activeSection, index, 'down')}
                        disabled={index === currentSectionBlocks.length - 1}
                        activeOpacity={0.7}
                      >
                        <ChevronDown size={16} color={index === currentSectionBlocks.length - 1 ? colors.slate[300] : colors.slate[600]} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.blockActionIcon, styles.deleteBlockIcon]}
                        onPress={() => handleDeleteBlock(activeSection, block.id)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={15} color={colors.danger.main} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.blockCardRight}
                      onPress={() => setEditingBlock(block)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.blockTypeBadge}>
                        <Text style={styles.blockTypeBadgeText}>
                          {block.type === 'text'
                            ? 'نص'
                            : block.type === 'table'
                            ? 'جدول'
                            : block.type === 'separator'
                            ? 'فاصل'
                            : block.type === 'qr'
                            ? 'رمز QR'
                            : block.type === 'barcode'
                            ? 'باركود'
                            : block.type === 'image'
                            ? 'شعار'
                            : 'صف'}
                        </Text>
                      </View>

                      <Text style={styles.blockSummary} numberOfLines={1}>
                        {block.type === 'text'
                          ? Array.isArray(block.text) ? block.text.join(' • ') : block.text
                          : block.type === 'table'
                          ? `${block.columns?.length || 4} أعمدة منتجات`
                          : block.type === 'separator'
                          ? `خط فاصل (${(block as SeparatorBlock).style || 'dashed'})`
                          : block.type === 'qr'
                          ? 'رمز QR ديناميكي'
                          : block.type === 'barcode'
                          ? 'باركود الفاتورة'
                          : 'عنصر مرئي'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Tab 2: Visibility Settings */}
      {activeTab === 'visibility' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionHeader}>حقول وعناصر الوثيقة الظاهرة (17 عنصراً)</Text>

          <View style={styles.optionsCard}>
            {[
              { k: 'shopName' as const, label: 'اسم المتجر / الشركة' },
              { k: 'logo' as const, label: 'الشعار واللوجو' },
              { k: 'invoiceNumber' as const, label: 'رقم الفاتورة' },
              { k: 'customerName' as const, label: 'اسم الزبون' },
              { k: 'customerPhone' as const, label: 'هاتف الزبون' },
              { k: 'customerAddress' as const, label: 'عنوان الزبون' },
              { k: 'unitPrice' as const, label: 'سعر الوحدة' },
              { k: 'discount' as const, label: 'مبلغ الخصم' },
              { k: 'tva' as const, label: 'ضريبة القيمة المضافة (TVA)' },
              { k: 'sellerName' as const, label: 'اسم البائع' },
              { k: 'cashierName' as const, label: 'اسم الكاشير' },
              { k: 'paymentMethod' as const, label: 'طريقة الدفع' },
              { k: 'barcode' as const, label: 'باركود الفاتورة' },
              { k: 'qr' as const, label: 'رمز الاستجابة السريعة (QR Code)' },
              { k: 'signature' as const, label: 'خانة التوقيع' },
              { k: 'stamp' as const, label: 'خانة الختم' },
            ].map((item, idx) => (
              <View key={item.k} style={[styles.toggleRow, idx > 0 && styles.toggleRowBorder]}>
                <Switch
                  value={Boolean(template.visibility[item.k])}
                  onValueChange={() => handleToggleVisibility(item.k)}
                  trackColor={{ true: colors.primary[600], false: colors.slate[300] }}
                />
                <Text style={styles.toggleText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Tab 3: Styles & Appearance */}
      {activeTab === 'styles' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionHeader}>الثيمات اللونية الجاهزة</Text>
          <View style={styles.themesGrid}>
            {THEME_PRESETS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.themePresetCard}
                onPress={() => handleApplyThemePreset(preset)}
                activeOpacity={0.75}
              >
                <View style={styles.themePresetColors}>
                  <View style={[styles.themePColor, { backgroundColor: preset.primary }]} />
                  <View style={[styles.themePColor, { backgroundColor: preset.header }]} />
                  <View style={[styles.themePColor, { backgroundColor: preset.table }]} />
                </View>
                <Text style={styles.themePresetName}>{preset.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionHeader, { marginTop: spacing.md }]}>الألوان المعتمدة للقالب</Text>
          <View style={styles.optionsCard}>
            <View style={styles.colorRow}>
              <View style={[styles.colorPreviewBox, { backgroundColor: template.styles.primaryColor }]} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.colorLabel}>اللون الأساسي (Primary)</Text>
                <Text style={styles.colorHex}>{template.styles.primaryColor}</Text>
              </View>
            </View>

            <View style={[styles.colorRow, styles.toggleRowBorder]}>
              <View style={[styles.colorPreviewBox, { backgroundColor: template.styles.headerColor }]} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.colorLabel}>لون الرأس والجداول (Header)</Text>
                <Text style={styles.colorHex}>{template.styles.headerColor}</Text>
              </View>
            </View>

            <View style={[styles.colorRow, styles.toggleRowBorder]}>
              <View style={[styles.colorPreviewBox, { backgroundColor: template.styles.footerColor }]} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.colorLabel}>لون التذييل والنصوص الفرعية</Text>
                <Text style={styles.colorHex}>{template.styles.footerColor}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionHeader, { marginTop: spacing.md }]}>حجم ووزن الخط</Text>
          <View style={styles.optionsCard}>
            <View style={styles.fontSizeRow}>
              <View style={styles.fontControls}>
                <TouchableOpacity
                  style={styles.fontStepBtn}
                  onPress={() => {
                    const next = Math.max(8, (template.styles.font.size || 11) - 1);
                    setTemplate({ ...template, styles: { ...template.styles, font: { ...template.styles.font, size: next } } });
                    setDirty(true);
                  }}
                >
                  <Text style={styles.fontStepText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.fontSizeVal}>{template.styles.font.size || 11} px</Text>
                <TouchableOpacity
                  style={styles.fontStepBtn}
                  onPress={() => {
                    const next = Math.min(20, (template.styles.font.size || 11) + 1);
                    setTemplate({ ...template, styles: { ...template.styles, font: { ...template.styles.font, size: next } } });
                    setDirty(true);
                  }}
                >
                  <Text style={styles.fontStepText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fontSizeLabel}>حجم الخط الأساسي</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Tab 4: General Settings */}
      {activeTab === 'settings' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionHeader}>معلومات القالب والمقاس</Text>

          <View style={styles.optionsCard}>
            <Text style={styles.inputLabel}>اسم القالب</Text>
            <TextInput
              style={styles.modalInput}
              value={template.name}
              onChangeText={(v) => {
                setTemplate({ ...template, name: v });
                setDirty(true);
              }}
              textAlign="right"
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>الوصف</Text>
            <TextInput
              style={styles.modalInput}
              value={template.description}
              onChangeText={(v) => {
                setTemplate({ ...template, description: v });
                setDirty(true);
              }}
              textAlign="right"
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>مقاس الورق</Text>
            <View style={styles.modalSizesGrid}>
              {(['80mm', '58mm', 'A4', 'A5'] as PaperSize[]).map((sz) => (
                <TouchableOpacity
                  key={sz}
                  style={[styles.modalSizeBtn, template.paperSize === sz && styles.modalSizeBtnActive]}
                  onPress={() => {
                    setTemplate({ ...template, paperSize: sz });
                    setDirty(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalSizeText, template.paperSize === sz && styles.modalSizeTextActive]}>
                    {PAPER_LABELS_AR[sz]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Tab 5: Interactive Live Preview */}
      {activeTab === 'preview' && (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}>
          <Text style={styles.sectionHeader}>معاينة حية للقالب</Text>
          <View style={[styles.liveDocBox, { width: template.paperSize === '58mm' ? 240 : template.paperSize === '80mm' ? 300 : '95%' }]}>
            {/* Header section */}
            {getSectionBlocks('header').map((b, i) => (
              <View key={`prev-h-${i}`} style={{ width: '100%' }}>
                {renderPreviewBlock(b, mockContext, template, styles)}
              </View>
            ))}

            {/* Body section */}
            {getSectionBlocks('body').map((b, i) => (
              <View key={`prev-b-${i}`} style={{ width: '100%' }}>
                {renderPreviewBlock(b, mockContext, template, styles)}
              </View>
            ))}

            {/* Footer section */}
            {getSectionBlocks('footer').map((b, i) => (
              <View key={`prev-f-${i}`} style={{ width: '100%' }}>
                {renderPreviewBlock(b, mockContext, template, styles)}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Add Block Modal */}
      <Modal visible={addBlockModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setAddBlockModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إضافة عنصر جديد</Text>
            </View>

            <View style={styles.paletteGrid}>
              <TouchableOpacity style={styles.paletteItem} onPress={() => handleAddBlock('text')} activeOpacity={0.7}>
                <Type size={22} color={colors.primary[600]} />
                <Text style={styles.paletteLabel}>نص / متغيرات</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.paletteItem} onPress={() => handleAddBlock('table')} activeOpacity={0.7}>
                <Grid3x3 size={22} color={colors.emerald[700]} />
                <Text style={styles.paletteLabel}>جدول أصناف</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.paletteItem} onPress={() => handleAddBlock('separator')} activeOpacity={0.7}>
                <SeparatorHorizontal size={22} color={colors.slate[600]} />
                <Text style={styles.paletteLabel}>فاصل خطي</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.paletteItem} onPress={() => handleAddBlock('qr')} activeOpacity={0.7}>
                <QrCode size={22} color={colors.purple[600]} />
                <Text style={styles.paletteLabel}>رمز QR</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.paletteItem} onPress={() => handleAddBlock('barcode')} activeOpacity={0.7}>
                <BarcodeIcon size={22} color={colors.indigo[600]} />
                <Text style={styles.paletteLabel}>باركود</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.paletteItem} onPress={() => handleAddBlock('image')} activeOpacity={0.7}>
                <ImageIcon size={22} color={colors.warning.dark} />
                <Text style={styles.paletteLabel}>شعار / صورة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Block Modal */}
      {editingBlock && (
        <Modal visible={!!editingBlock} transparent animationType="slide" onRequestClose={() => setEditingBlock(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setEditingBlock(null)} activeOpacity={0.7} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.modalTitle}>تعديل خصائص العنصر</Text>
                  <Text style={styles.modalSubtitle}>نوع العنصر: {editingBlock.type}</Text>
                </View>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* تعديل عنصر النص (Text Block) */}
                {editingBlock.type === 'text' && (
                  <View style={{ gap: spacing.md }}>
                    <View>
                      <Text style={styles.inputLabel}>المحتوى النصي أو القالب</Text>
                      <TextInput
                        style={[styles.modalInput, { minHeight: 70, textAlignVertical: 'top' }]}
                        value={Array.isArray(editingBlock.text) ? editingBlock.text.join('\n') : editingBlock.text}
                        onChangeText={(t) => setEditingBlock({ ...editingBlock, text: t } as TextBlock)}
                        multiline
                        textAlign="right"
                        placeholder="اكتب النص هنا..."
                      />
                    </View>

                    {/* رقائق المتغيرات السريعة */}
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6, justifyContent: 'flex-end' }}>
                        <Text style={styles.inputLabel}>إدراج متغير ذكي:</Text>
                        <Sparkles size={14} color={colors.primary[600]} />
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                        {[
                          { tag: '{{shopLegal.name}}', label: 'المتجر' },
                          { tag: '{{shopLegal.phone}}', label: 'الهاتف' },
                          { tag: '{{shopLegal.address}}', label: 'العنوان' },
                          { tag: '{{shopLegal.nif}}', label: 'NIF' },
                          { tag: '{{shopLegal.rc}}', label: 'RC' },
                          { tag: '{{invoice.number}}', label: 'رقم الفاتورة' },
                          { tag: '{{invoice.date}}', label: 'التاريخ' },
                          { tag: '{{invoice.total}}', label: 'الإجمالي' },
                          { tag: '{{invoice.subtotal}}', label: 'المجموع' },
                          { tag: '{{user.name}}', label: 'الكاشير' },
                          { tag: '{{customer.name}}', label: 'العميل' },
                        ].map((v) => (
                          <TouchableOpacity
                            key={v.tag}
                            style={styles.variableChip}
                            activeOpacity={0.7}
                            onPress={() => {
                              const cur = Array.isArray(editingBlock.text) ? editingBlock.text.join('\n') : editingBlock.text || '';
                              const updated = cur ? `${cur} ${v.tag}` : v.tag;
                              setEditingBlock({ ...editingBlock, text: updated } as TextBlock);
                            }}
                          >
                            <Text style={styles.variableChipText}>+{v.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* المحاذاة */}
                    <View>
                      <Text style={styles.inputLabel}>المحاذاة</Text>
                      <View style={styles.segmentedRow}>
                        {[
                          { key: 'right', label: 'يمين' },
                          { key: 'center', label: 'وسط' },
                          { key: 'left', label: 'يسار' },
                        ].map((a) => (
                          <TouchableOpacity
                            key={a.key}
                            style={[styles.segmentedBtn, (editingBlock.align || 'center') === a.key && styles.segmentedBtnActive]}
                            onPress={() => setEditingBlock({ ...editingBlock, align: a.key as any } as TextBlock)}
                          >
                            <Text style={[styles.segmentedBtnText, (editingBlock.align || 'center') === a.key && styles.segmentedBtnTextActive]}>
                              {a.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* الحجم والسماكة */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>الحجم</Text>
                        <View style={styles.segmentedRow}>
                          {[
                            { key: 'sm', label: 'صغير' },
                            { key: 'md', label: 'عادي' },
                            { key: 'lg', label: 'كبير' },
                            { key: 'xl', label: 'عريض' },
                          ].map((sz) => (
                            <TouchableOpacity
                              key={sz.key}
                              style={[styles.segmentedBtn, (editingBlock.size || 'md') === sz.key && styles.segmentedBtnActive]}
                              onPress={() => setEditingBlock({ ...editingBlock, size: sz.key as any } as TextBlock)}
                            >
                              <Text style={[styles.segmentedBtnText, (editingBlock.size || 'md') === sz.key && styles.segmentedBtnTextActive]}>
                                {sz.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={{ flex: 0.8 }}>
                        <Text style={styles.inputLabel}>السماكة</Text>
                        <View style={styles.segmentedRow}>
                          {[
                            { key: 400, label: 'عادي' },
                            { key: 700, label: 'عريض' },
                          ].map((w) => (
                            <TouchableOpacity
                              key={w.key}
                              style={[styles.segmentedBtn, (editingBlock.weight || 400) === w.key && styles.segmentedBtnActive]}
                              onPress={() => setEditingBlock({ ...editingBlock, weight: w.key as any } as TextBlock)}
                            >
                              <Text style={[styles.segmentedBtnText, (editingBlock.weight || 400) === w.key && styles.segmentedBtnTextActive]}>
                                {w.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* تعديل الخط الفاصل (Separator Block) */}
                {editingBlock.type === 'separator' && (
                  <View style={{ gap: spacing.md }}>
                    <Text style={styles.inputLabel}>نمط الخط الفاصل</Text>
                    <View style={styles.modalSizesGrid}>
                      {[
                        { key: 'dashed', label: 'متقطع' },
                        { key: 'solid', label: 'متصل' },
                        { key: 'dotted', label: 'منقط' },
                      ].map((st) => (
                        <TouchableOpacity
                          key={st.key}
                          style={[styles.modalSizeBtn, (editingBlock as SeparatorBlock).style === st.key && styles.modalSizeBtnActive]}
                          onPress={() => setEditingBlock({ ...editingBlock, style: st.key as any } as SeparatorBlock)}
                        >
                          <Text style={[styles.modalSizeText, (editingBlock as SeparatorBlock).style === st.key && styles.modalSizeTextActive]}>
                            {st.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* تعديل رمز QR (QR Block) */}
                {editingBlock.type === 'qr' && (
                  <View style={{ gap: spacing.md }}>
                    <Text style={styles.inputLabel}>محتوى رمز QR</Text>
                    {[
                      { key: 'invoiceNumber', label: 'رقم الفاتورة فقط' },
                      { key: 'invoiceNumber:date:total', label: 'رقم الفاتورة + التاريخ + الإجمالي (ضريبي)' },
                      { key: 'invoiceUrl', label: 'رابط الفاتورة الإلكتروني' },
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.key}
                        style={[styles.optionSelectBtn, (editingBlock as QrBlock).payload === p.key && styles.optionSelectBtnActive]}
                        onPress={() => setEditingBlock({ ...editingBlock, payload: p.key as any } as QrBlock)}
                      >
                        <Text style={[styles.optionSelectBtnText, (editingBlock as QrBlock).payload === p.key && styles.optionSelectBtnTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* تعديل الباركود (Barcode Block) */}
                {editingBlock.type === 'barcode' && (
                  <View style={{ gap: spacing.md }}>
                    <Text style={styles.inputLabel}>صيغة الباركود</Text>
                    <View style={styles.modalSizesGrid}>
                      {[
                        { key: 'CODE128', label: 'CODE128 (قياسي شامل)' },
                        { key: 'EAN13', label: 'EAN-13 (أرقام فقط)' },
                      ].map((f) => (
                        <TouchableOpacity
                          key={f.key}
                          style={[styles.modalSizeBtn, ((editingBlock as BarcodeBlock).format || 'CODE128') === f.key && styles.modalSizeBtnActive]}
                          onPress={() => setEditingBlock({ ...editingBlock, format: f.key as any } as BarcodeBlock)}
                        >
                          <Text style={[styles.modalSizeText, ((editingBlock as BarcodeBlock).format || 'CODE128') === f.key && styles.modalSizeTextActive]}>
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* تعديل جدول المنتجات (Table Block) */}
                {editingBlock.type === 'table' && (
                  <View style={{ gap: spacing.sm }}>
                    <Text style={styles.inputLabel}>خيارات الإجماليات في أسفل الجدول:</Text>
                    {[
                      { key: 'showSubtotal', label: 'عرض المجموع الفرعي' },
                      { key: 'showDiscount', label: 'عرض حقل الخصم (إن وجد)' },
                      { key: 'showTva', label: 'عرض ضريبة القيمة المضافة TVA' },
                      { key: 'showTotal', label: 'عرض الإجمالي النهائي البارز' },
                    ].map((opt) => {
                      const active = (editingBlock as TableBlock)[opt.key as keyof TableBlock] ?? false;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.toggleCardRow, active && styles.toggleCardRowActive]}
                          onPress={() =>
                            setEditingBlock({
                              ...editingBlock,
                              [opt.key]: !active,
                            } as TableBlock)
                          }
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkboxBox, active && styles.checkboxBoxActive]}>
                            {active && <Check size={14} color="#fff" />}
                          </View>
                          <Text style={[styles.toggleCardLabel, active && styles.toggleCardLabelActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={() => handleUpdateEditingBlock(editingBlock)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSubmitBtnText}>تطبيق التعديلات</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

// Live Block Renderer Helper
function renderPreviewBlock(block: Block, ctx: any, template: PrintTemplate, styles: any) {
  switch (block.type) {
    case 'text': {
      const textVal = Array.isArray(block.text) ? block.text.join('\n') : block.text;
      const parsed = interpolateVariables(textVal, ctx);
      const isHeader = block.weight === 700 || block.size === 'lg' || block.size === 'xl';
      return (
        <Text
          style={[
            styles.previewText,
            {
              textAlign: block.align || 'center',
              fontWeight: isHeader ? 'bold' : 'normal',
              fontSize: block.size === 'xl' ? 17 : block.size === 'lg' ? 14 : block.size === 'sm' ? 10 : 12,
              color: block.colorVar === 'primary' ? template.styles.primaryColor : '#0f172a',
            },
          ]}
        >
          {parsed}
        </Text>
      );
    }
    case 'separator':
      return <View style={styles.previewSeparator} />;
    case 'qr':
      return (
        <View style={styles.previewCenter}>
          <BarcodeSvg value={ctx.invoice.number} format="qr" height={70} width={1.2} />
        </View>
      );
    case 'barcode':
      return (
        <View style={styles.previewCenter}>
          <BarcodeSvg value={ctx.invoice.number} format="code128" height={36} width={1.1} showText textSize={8} />
        </View>
      );
    case 'table':
      return (
        <View style={styles.previewTable}>
          <View style={[styles.previewTableRow, { backgroundColor: template.styles.headerColor }]}>
            <Text style={[styles.previewTableCell, styles.previewTableHead, { flex: 2, textAlign: 'right' }]}>المنتج</Text>
            <Text style={[styles.previewTableCell, styles.previewTableHead, { flex: 1, textAlign: 'center' }]}>الكمية</Text>
            <Text style={[styles.previewTableCell, styles.previewTableHead, { flex: 1.2, textAlign: 'left' }]}>الإجمالي</Text>
          </View>
          {ctx.invoice.items.map((it: any, idx: number) => (
            <View key={idx} style={styles.previewTableRow}>
              <Text style={[styles.previewTableCell, { flex: 2, textAlign: 'right' }]}>{it.name}</Text>
              <Text style={[styles.previewTableCell, { flex: 1, textAlign: 'center' }]}>{it.qty}</Text>
              <Text style={[styles.previewTableCell, { flex: 1.2, textAlign: 'left' }]}>{it.lineTotal.toLocaleString('ar-DZ')} دج</Text>
            </View>
          ))}
          <View style={[styles.previewTableRow, styles.previewTableTotalRow]}>
            <Text style={[styles.previewTableCell, { fontWeight: 'bold', flex: 2, textAlign: 'right' }]}>المجموع النهائي</Text>
            <Text style={[styles.previewTableCell, { fontWeight: 'bold', flex: 2.2, textAlign: 'left', color: template.styles.primaryColor }]}>
              {ctx.invoice.total.toLocaleString('ar-DZ')} دج
            </Text>
          </View>
        </View>
      );
    default:
      return null;
  }
}

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    emptyText: { fontSize: 15, color: colors.text.secondary, fontFamily: typography.fontFamily.arabic },

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
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleCol: { alignItems: 'center', flex: 1, marginHorizontal: spacing.sm },
    headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text.primary, fontFamily: typography.fontFamily.arabicBold },
    headerSubtitle: { fontSize: 11, color: colors.text.tertiary, fontFamily: typography.fontFamily.arabic },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.emerald[600], paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.lg },
    saveBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '700', fontFamily: typography.fontFamily.arabicBold },

    modeTabsRow: { flexDirection: 'row', backgroundColor: colors.surface, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, gap: 4 },
    modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: radii.md },
    modeTabActive: { backgroundColor: isDark ? colors.slate[800] : colors.primary[50] },
    modeTabText: { fontSize: 11.5, fontWeight: '600', color: colors.text.secondary, fontFamily: typography.fontFamily.arabic },
    modeTabTextActive: { color: colors.primary[600], fontWeight: '800' },

    sectionTabsRow: { flexDirection: 'row', backgroundColor: isDark ? colors.slate[800] : colors.slate[100], padding: 4, marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radii.lg, gap: 4 },
    sectionTab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: radii.md },
    sectionTabActive: { backgroundColor: colors.surface, ...shadows.xs },
    sectionTabText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, fontFamily: typography.fontFamily.arabic },
    sectionTabTextActive: { color: colors.primary[600], fontWeight: '800' },

    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: spacing.xxxl },

    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.text.secondary, fontFamily: typography.fontFamily.arabicBold },
    addBlockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary[600], paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.md },
    addBlockBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: typography.fontFamily.arabicBold },

    emptyBlocksBox: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border.default, borderStyle: 'dashed' },
    emptyBlocksText: { fontSize: 14, fontWeight: '700', color: colors.text.primary, fontFamily: typography.fontFamily.arabicBold },
    emptyBlocksSub: { fontSize: 11.5, color: colors.text.tertiary, fontFamily: typography.fontFamily.arabic, textAlign: 'center', marginTop: 4 },

    blockCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.sm + 2, borderWidth: 1, borderColor: colors.border.default, ...shadows.xs },
    blockCardLeft: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    blockActionIcon: { width: 28, height: 28, borderRadius: radii.sm, backgroundColor: isDark ? colors.slate[800] : colors.slate[100], alignItems: 'center', justifyContent: 'center' },
    deleteBlockIcon: { backgroundColor: isDark ? colors.slate[800] : colors.danger.light },
    blockCardRight: { flex: 1, alignItems: 'flex-end', marginLeft: spacing.sm },
    blockTypeBadge: { backgroundColor: isDark ? colors.slate[800] : colors.primary[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm, marginBottom: 2 },
    blockTypeBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary[600], fontFamily: typography.fontFamily.arabicBold },
    blockSummary: { fontSize: 12.5, fontWeight: '700', color: colors.text.primary, fontFamily: typography.fontFamily.arabicBold },

    sectionHeader: { fontSize: 13, fontWeight: '800', color: colors.text.secondary, textAlign: 'right', marginBottom: spacing.xs, marginRight: 4, fontFamily: typography.fontFamily.arabicBold },
    optionsCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border.default, ...shadows.xs },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
    toggleRowBorder: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
    toggleText: { fontSize: 13, fontWeight: '600', color: colors.text.primary, fontFamily: typography.fontFamily.arabic },

    themesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    themePresetCard: { width: '48.5%', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.sm + 2, borderWidth: 1, borderColor: colors.border.default, alignItems: 'flex-end', ...shadows.xs },
    themePresetColors: { flexDirection: 'row', gap: 4, marginBottom: 4 },
    themePColor: { width: 14, height: 14, borderRadius: 7 },
    themePresetName: { fontSize: 12, fontWeight: '700', color: colors.text.primary, fontFamily: typography.fontFamily.arabicBold },

    colorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
    colorPreviewBox: { width: 28, height: 28, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default },
    colorLabel: { fontSize: 12.5, fontWeight: '700', color: colors.text.primary, fontFamily: typography.fontFamily.arabicBold },
    colorHex: { fontSize: 11, color: colors.text.tertiary, fontFamily: 'monospace' },

    fontSizeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
    fontSizeLabel: { fontSize: 13, fontWeight: '700', color: colors.text.primary, fontFamily: typography.fontFamily.arabicBold },
    fontControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fontStepBtn: { width: 32, height: 32, borderRadius: radii.md, backgroundColor: isDark ? colors.slate[800] : colors.slate[100], alignItems: 'center', justifyContent: 'center' },
    fontStepText: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
    fontSizeVal: { fontSize: 13, fontWeight: '800', color: colors.primary[600], fontFamily: typography.fontFamily.arabicBold },

    inputLabel: { fontSize: 12, fontWeight: '700', color: colors.text.secondary, textAlign: 'right', marginBottom: 4, fontFamily: typography.fontFamily.arabicBold },
    modalInput: { backgroundColor: isDark ? colors.slate[800] : colors.slate[50], borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 13, color: colors.text.primary, fontFamily: typography.fontFamily.arabic },
    helperText: { fontSize: 10.5, color: colors.text.tertiary, textAlign: 'right', marginTop: 4, fontFamily: typography.fontFamily.arabic },

    modalSizesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    modalSizeBtn: { flex: 1, minWidth: '45%', paddingVertical: 8, alignItems: 'center', borderRadius: radii.md, backgroundColor: isDark ? colors.slate[800] : colors.slate[50], borderWidth: 1, borderColor: colors.border.default },
    modalSizeBtnActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    modalSizeText: { fontSize: 11.5, fontWeight: '700', color: colors.text.secondary, fontFamily: typography.fontFamily.arabicBold },
    modalSizeTextActive: { color: '#fff' },

    // Live preview styles
    liveDocBox: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', padding: 14, gap: 6, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 },
    previewText: { fontFamily: typography.fontFamily.arabic, marginVertical: 1 },
    previewSeparator: { height: 1, borderTopWidth: 1, borderTopColor: '#cbd5e1', borderStyle: 'dashed', marginVertical: 4 },
    previewCenter: { alignItems: 'center', marginVertical: 4 },
    previewTable: { marginVertical: 4, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
    previewTableRow: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    previewTableHead: { color: '#fff', fontWeight: 'bold' },
    previewTableCell: { fontSize: 10.5, fontFamily: typography.fontFamily.arabic, color: '#0f172a' },
    previewTableTotalRow: { backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#cbd5e1' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, marginBottom: spacing.md },
    modalCloseBtn: { width: 32, height: 32, borderRadius: radii.full, backgroundColor: isDark ? colors.slate[800] : colors.slate[100], alignItems: 'center', justifyContent: 'center' },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, fontFamily: typography.fontFamily.arabicBold },
    modalSubtitle: { fontSize: 11, color: colors.text.tertiary, fontFamily: typography.fontFamily.arabic },
    paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    paletteItem: { width: '30%', backgroundColor: isDark ? colors.slate[800] : colors.slate[50], borderRadius: radii.xl, padding: spacing.md, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border.default },
    paletteLabel: { fontSize: 11, fontWeight: '700', color: colors.text.primary, fontFamily: typography.fontFamily.arabicBold },

    variableChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.md, backgroundColor: isDark ? colors.slate[800] : colors.slate[100], borderWidth: 1, borderColor: colors.border.default },
    variableChipText: { fontSize: 10.5, fontWeight: '700', color: colors.primary[600], fontFamily: typography.fontFamily.arabicBold },

    segmentedRow: { flexDirection: 'row', backgroundColor: isDark ? colors.slate[800] : colors.slate[100], padding: 3, borderRadius: radii.lg, gap: 4, marginTop: 4 },
    segmentedBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: radii.md },
    segmentedBtnActive: { backgroundColor: colors.primary[600], ...shadows.xs },
    segmentedBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.text.secondary, fontFamily: typography.fontFamily.arabicBold },
    segmentedBtnTextActive: { color: '#fff' },

    optionSelectBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: radii.xl, backgroundColor: isDark ? colors.slate[800] : colors.slate[50], borderWidth: 1, borderColor: colors.border.default, alignItems: 'flex-end' },
    optionSelectBtnActive: { backgroundColor: isDark ? colors.slate[700] : colors.primary[50], borderColor: colors.primary[600] },
    optionSelectBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.text.primary, fontFamily: typography.fontFamily.arabicBold },
    optionSelectBtnTextActive: { color: colors.primary[600] },

    toggleCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: radii.xl, backgroundColor: isDark ? colors.slate[800] : colors.slate[50], borderWidth: 1, borderColor: colors.border.default },
    toggleCardRowActive: { borderColor: colors.primary[600], backgroundColor: isDark ? colors.slate[750] || colors.slate[800] : colors.primary[50] },
    toggleCardLabel: { fontSize: 12.5, fontWeight: '700', color: colors.text.secondary, fontFamily: typography.fontFamily.arabicBold, flex: 1, textAlign: 'right' },
    toggleCardLabelActive: { color: colors.text.primary },
    checkboxBox: { width: 22, height: 22, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    checkboxBoxActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },

    modalSubmitBtn: { backgroundColor: colors.primary[600], paddingVertical: 12, borderRadius: radii.xl, alignItems: 'center', marginTop: spacing.lg },
    modalSubmitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: typography.fontFamily.arabicBold },
  });

export default TemplateEditorScreen;

