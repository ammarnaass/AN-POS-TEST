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
} from 'react-native';
import {
  Printer,
  Bluetooth,
  RefreshCw,
  Check,
  ArrowRight,
  Wifi,
  Usb,
  Plus,
  Edit2,
  Trash2,
  Star,
  Zap,
  CheckCircle2,
  X,
  SlidersHorizontal,
} from 'lucide-react-native';
import {
  listPrinters,
  createPrinter,
  updatePrinter,
  deletePrinter,
  setDefaultPrinter,
  discoverBluetoothPrinters,
  testPrinter,
  listPrinterMappings,
  setPrinterTemplateMapping,
  type MobilePrinter,
} from '@/lib/printerService';
import { getAllTemplates } from '@/lib/templateService';
import {
  ALL_DOC_TYPES,
  DOC_TYPE_LABELS_AR,
  PAPER_LABELS_AR,
  type DocTypeKey,
  type PrintTemplate,
} from '@shared/types/invoicePrint';
import type { BluetoothPrinter } from '@/modules/AnposPrinter';
import { colors, radii, spacing, shadows } from '@/theme';

export const PrinterSettingsScreen = ({ navigation }: any) => {
  const [printers, setPrinters] = useState<MobilePrinter[]>([]);
  const [discovered, setDiscovered] = useState<BluetoothPrinter[]>([]);
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Add / Edit Modal
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<MobilePrinter | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'thermal' | 'standard' | 'label'>('thermal');
  const [formConnection, setFormConnection] = useState<'bluetooth' | 'lan' | 'usb'>('bluetooth');
  const [formAddress, setFormAddress] = useState('');
  const [formPort, setFormPort] = useState('9100');
  const [formPaperSize, setFormPaperSize] = useState<MobilePrinter['paperSize']>('80mm');
  const [formDriver, setFormDriver] = useState<'esc_pos' | 'browser' | 'pdf'>('esc_pos');

  // Mappings Modal
  const [mappingsModalPrinter, setMappingsModalPrinter] = useState<MobilePrinter | null>(null);
  const [currentMappings, setCurrentMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPrintersData();
  }, []);

  async function loadPrintersData() {
    setLoading(true);
    try {
      const [allPrinters, allTemplates] = await Promise.all([
        listPrinters(),
        getAllTemplates(),
      ]);
      setPrinters(allPrinters);
      setTemplates(allTemplates);
    } catch (err) {
      console.warn('Failed to load printers:', err);
    }
    setLoading(false);
  }

  const handleScanBluetooth = async () => {
    setScanning(true);
    try {
      const list = await discoverBluetoothPrinters();
      setDiscovered(list);
      if (list.length === 0) {
        Alert.alert('البحث عن طابعات', 'لم يتم العثور على أجهزة بلوتوث مقترنة. تأكد من إتاحة وضع الاقتران في طابعة البلوتوث.');
      }
    } catch {
      Alert.alert('خطأ', 'فشل فحص أجهزة البلوتوث');
    }
    setScanning(false);
  };

  const handleSelectDiscovered = (dev: BluetoothPrinter) => {
    setEditingPrinter(null);
    setFormName(dev.name || 'طابعة بلوتوث');
    setFormType('thermal');
    setFormConnection('bluetooth');
    setFormAddress(dev.address);
    setFormPaperSize('80mm');
    setFormDriver('esc_pos');
    setFormModalVisible(true);
  };

  const handleOpenCreate = () => {
    setEditingPrinter(null);
    setFormName('');
    setFormType('thermal');
    setFormConnection('bluetooth');
    setFormAddress('');
    setFormPort('9100');
    setFormPaperSize('80mm');
    setFormDriver('esc_pos');
    setFormModalVisible(true);
  };

  const handleOpenEdit = (printer: MobilePrinter) => {
    setEditingPrinter(printer);
    setFormName(printer.name);
    setFormType(printer.type);
    setFormConnection(printer.connection as any);
    setFormAddress(printer.address || '');
    setFormPort(printer.port ? String(printer.port) : '9100');
    setFormPaperSize(printer.paperSize);
    setFormDriver(printer.driver);
    setFormModalVisible(true);
  };

  const handleSavePrinter = async () => {
    if (!formName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الطابعة');
      return;
    }
    try {
      if (editingPrinter) {
        await updatePrinter(editingPrinter.id, {
          name: formName.trim(),
          type: formType,
          connection: formConnection,
          address: formAddress.trim() || undefined,
          port: formPort ? Number(formPort) : undefined,
          paperSize: formPaperSize,
          driver: formDriver,
        });
      } else {
        await createPrinter({
          name: formName.trim(),
          type: formType,
          connection: formConnection,
          address: formAddress.trim() || undefined,
          port: formPort ? Number(formPort) : undefined,
          paperSize: formPaperSize,
          driver: formDriver,
          isDefault: printers.length === 0,
        });
      }
      setFormModalVisible(false);
      await loadPrintersData();
    } catch {
      Alert.alert('خطأ', 'فشل حفظ إعدادات الطابعة');
    }
  };

  const handleSetDefault = async (printer: MobilePrinter) => {
    try {
      await setDefaultPrinter(printer.id);
      await loadPrintersData();
      Alert.alert('✓ تم التعيين', `تم تعيين "${printer.name}" كطابعة افتراضية للنظام`);
    } catch {
      Alert.alert('خطأ', 'فشل تعيين الطابعة الافتراضية');
    }
  };

  const handleDelete = (printer: MobilePrinter) => {
    if (printer.isDefault && printers.length > 1) {
      Alert.alert('تنبيه', 'يرجى تعيين طابعة افتراضية أخرى قبل حذف هذه الطابعة');
      return;
    }
    Alert.alert('تأكيد الحذف', `هل أنت متأكد من حذف طابعة "${printer.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await deletePrinter(printer.id);
          await loadPrintersData();
        },
      },
    ]);
  };

  const handleTestPrint = async (printer: MobilePrinter) => {
    setTestingId(printer.id);
    try {
      const res = await testPrinter(printer);
      Alert.alert(res.success ? '✓ نجاح' : 'تنبيه', res.message);
    } catch (err) {
      Alert.alert('خطأ', String(err));
    }
    setTestingId(null);
  };

  const handleOpenMappings = async (printer: MobilePrinter) => {
    setMappingsModalPrinter(printer);
    const mappings = await listPrinterMappings(printer.id);
    const map: Record<string, string> = {};
    for (const m of mappings) {
      map[m.docType] = m.templateId;
    }
    setCurrentMappings(map);
  };

  const handleSaveMapping = async (docType: DocTypeKey, templateId: string | null) => {
    if (!mappingsModalPrinter) return;
    try {
      await setPrinterTemplateMapping(mappingsModalPrinter.id, docType, templateId);
      setCurrentMappings((prev) => ({
        ...prev,
        [docType]: templateId || '',
      }));
    } catch {
      Alert.alert('خطأ', 'فشل حفظ تعيين القالب للطابعة');
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
          <Text style={styles.headerTitle}>إدارة الطابعات الحرارية</Text>
          <Text style={styles.headerSubtitle}>{printers.length} طابعة معرفة في النظام</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={handleOpenCreate}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Toolbar */}
        <View style={styles.toolbarRow}>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={handleScanBluetooth}
            disabled={scanning}
            activeOpacity={0.7}
          >
            {scanning ? (
              <ActivityIndicator size="small" color={colors.primary[700]} />
            ) : (
              <>
                <Bluetooth size={16} color={colors.primary[700]} />
                <Text style={styles.scanBtnText}>بحث عن أجهزة بلوتوث</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addPrinterBtn}
            onPress={handleOpenCreate}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.addPrinterBtnText}>إضافة طابعة</Text>
          </TouchableOpacity>
        </View>

        {/* Discovered Bluetooth Devices Carousel */}
        {discovered.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.sectionHeader}>الأجهزة المكتشفة بالبلوتوث ({discovered.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {discovered.map((dev, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.discoveredCard}
                  onPress={() => handleSelectDiscovered(dev)}
                  activeOpacity={0.7}
                >
                  <Bluetooth size={18} color={colors.primary[600]} />
                  <Text style={styles.discoveredName} numberOfLines={1}>{dev.name || 'طابعة غير معروفة'}</Text>
                  <Text style={styles.discoveredAddr}>{dev.address}</Text>
                  <Text style={styles.discoveredAction}>+ ربط كطابعة</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Configured Printers List */}
        <Text style={styles.sectionHeader}>الطابعات المعرفة في التطبيق</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : printers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Printer size={40} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>لا توجد طابعات معرفة</Text>
            <Text style={styles.emptySubtitle}>قم بإجراء بحث عن أجهزة بلوتوث أو اضغط على "إضافة طابعة"</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {printers.map((p) => (
              <View key={p.id} style={[styles.printerCard, p.isDefault && styles.printerCardDefault]}>
                <View style={styles.printerCardTop}>
                  <View style={styles.printerBadges}>
                    <View style={styles.connBadge}>
                      {p.connection === 'bluetooth' ? (
                        <Bluetooth size={12} color={colors.primary[700]} />
                      ) : p.connection === 'lan' ? (
                        <Wifi size={12} color={colors.emerald[700]} />
                      ) : (
                        <Usb size={12} color={colors.indigo[700]} />
                      )}
                      <Text style={styles.connBadgeText}>
                        {p.connection === 'bluetooth' ? 'بلوتوث' : p.connection === 'lan' ? 'شبكة LAN' : 'USB'}
                      </Text>
                    </View>

                    {p.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Star size={10} color="#d97706" fill="#d97706" />
                        <Text style={styles.defaultBadgeText}>افتراضية</Text>
                      </View>
                    )}

                    <View style={styles.sizeBadge}>
                      <Text style={styles.sizeBadgeText}>{p.paperSize}</Text>
                    </View>
                  </View>

                  <View style={styles.statusDotRow}>
                    <Text style={styles.statusText}>متصل</Text>
                    <View style={styles.statusDot} />
                  </View>
                </View>

                <Text style={styles.printerName}>{p.name}</Text>
                <Text style={styles.printerAddr}>
                  {p.address ? `العنوان: ${p.address}${p.port ? `:${p.port}` : ''}` : 'بدون عنوان ثابت'}
                </Text>

                {/* Printer Actions */}
                <View style={styles.printerActions}>
                  <View style={styles.printerActionsLeft}>
                    <TouchableOpacity
                      style={styles.testBtn}
                      onPress={() => handleTestPrint(p)}
                      disabled={testingId === p.id}
                      activeOpacity={0.7}
                    >
                      {testingId === p.id ? (
                        <ActivityIndicator size="small" color={colors.primary[700]} />
                      ) : (
                        <>
                          <Zap size={14} color={colors.primary[700]} />
                          <Text style={styles.testBtnText}>اختبار</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mappingsBtn}
                      onPress={() => handleOpenMappings(p)}
                      activeOpacity={0.7}
                    >
                      <SlidersHorizontal size={14} color={colors.slate[600]} />
                      <Text style={styles.mappingsBtnText}>التعيينات</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.printerActionsRight}>
                    {!p.isDefault && (
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => handleSetDefault(p)}
                        activeOpacity={0.7}
                      >
                        <Star size={16} color={colors.slate[400]} />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleOpenEdit(p)}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={16} color={colors.slate[400]} />
                    </TouchableOpacity>

                    {!p.isDefault && (
                      <TouchableOpacity
                        style={[styles.iconBtn, styles.deleteIconBtn]}
                        onPress={() => handleDelete(p)}
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

      {/* Add / Edit Printer Modal */}
      <Modal visible={formModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setFormModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color={colors.slate[400]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingPrinter ? 'تعديل الطابعة' : 'إضافة طابعة جديدة'}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>اسم الطابعة</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="مثال: طابعة الكاشير بلوتوث"
                value={formName}
                onChangeText={setFormName}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>نوع الاتصال</Text>
              <View style={styles.segmentedRow}>
                {[
                  { k: 'bluetooth' as const, label: 'بلوتوث' },
                  { k: 'lan' as const, label: 'شبكة IP' },
                  { k: 'usb' as const, label: 'USB' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.k}
                    style={[styles.segmentBtn, formConnection === c.k && styles.segmentBtnActive]}
                    onPress={() => setFormConnection(c.k)}
                  >
                    <Text style={[styles.segmentText, formConnection === c.k && styles.segmentTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>
                {formConnection === 'lan' ? 'عنوان IP للطابعة' : 'عنوان MAC أو معرف الجهاز'}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder={formConnection === 'lan' ? '192.168.1.100' : '00:11:22:33:44:55'}
                value={formAddress}
                onChangeText={setFormAddress}
                textAlign="right"
              />

              {formConnection === 'lan' && (
                <>
                  <Text style={styles.inputLabel}>المنفذ (Port)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="9100"
                    value={formPort}
                    onChangeText={setFormPort}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>مقاس الورق</Text>
              <View style={styles.segmentedRow}>
                {[
                  { k: '80mm' as const, label: '80 ملم' },
                  { k: '58mm' as const, label: '58 ملم' },
                  { k: 'A4' as const, label: 'A4' },
                  { k: 'A5' as const, label: 'A5' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.k}
                    style={[styles.segmentBtn, formPaperSize === s.k && styles.segmentBtnActive]}
                    onPress={() => setFormPaperSize(s.k)}
                  >
                    <Text style={[styles.segmentText, formPaperSize === s.k && styles.segmentTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSavePrinter} activeOpacity={0.7}>
              <Text style={styles.modalSubmitBtnText}>حفظ إعدادات الطابعة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Printer Template Mappings Modal */}
      {mappingsModalPrinter && (
        <Modal visible={!!mappingsModalPrinter} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setMappingsModalPrinter(null)} activeOpacity={0.7}>
                  <X size={20} color={colors.slate[400]} />
                </TouchableOpacity>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.modalTitle}>تعيينات «{mappingsModalPrinter.name}»</Text>
                  <Text style={styles.modalSubtitle}>اختر القالب المستخدم لكل نوع وثيقة مع هذه الطابعة</Text>
                </View>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                {ALL_DOC_TYPES.map((docType) => {
                  const assignedTplId = currentMappings[docType] || '';
                  const assignedTpl = templates.find((t) => t.id === assignedTplId);

                  return (
                    <View key={docType} style={styles.mappingRow}>
                      <View style={{ flex: 1, alignItems: 'flex-start' }}>
                        <Text style={styles.mappingTplName}>
                          {assignedTpl ? assignedTpl.name : '— الافتراضي —'}
                        </Text>
                      </View>
                      <Text style={styles.mappingDocName}>{DOC_TYPE_LABELS_AR[docType]}</Text>
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={() => setMappingsModalPrinter(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSubmitBtnText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  headerBackBtn: { width: 38, height: 38, borderRadius: radii.lg, backgroundColor: colors.slate[100], alignItems: 'center', justifyContent: 'center' },
  headerTitleCol: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo' },
  headerSubtitle: { fontSize: 11, color: colors.text.tertiary, fontFamily: 'Cairo' },
  headerActionBtn: { width: 38, height: 38, borderRadius: radii.lg, backgroundColor: colors.primary[600], alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxxl },

  toolbarRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  scanBtn: {
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
  scanBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.primary[700], fontFamily: 'Cairo' },
  addPrinterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary[600],
    paddingVertical: 10,
    borderRadius: radii.xl,
  },
  addPrinterBtnText: { fontSize: 12.5, fontWeight: '700', color: '#fff', fontFamily: 'Cairo' },

  sectionHeader: { fontSize: 13, fontWeight: '800', color: colors.text.secondary, textAlign: 'right', marginBottom: spacing.xs, marginRight: 4, fontFamily: 'Cairo' },

  discoveredCard: { width: 140, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.sm + 2, borderWidth: 1, borderColor: colors.border.default, alignItems: 'flex-end', gap: 2, ...shadows.xs },
  discoveredName: { fontSize: 12, fontWeight: '700', color: colors.text.primary, fontFamily: 'Cairo' },
  discoveredAddr: { fontSize: 9.5, color: colors.text.tertiary, fontFamily: 'monospace' },
  discoveredAction: { fontSize: 10.5, fontWeight: '700', color: colors.primary[700], fontFamily: 'Cairo', marginTop: 4 },

  emptyBox: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xxl, alignItems: 'center', borderWidth: 1, borderColor: colors.border.default },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo', marginTop: spacing.sm },
  emptySubtitle: { fontSize: 12, color: colors.text.tertiary, fontFamily: 'Cairo', marginTop: 4, textAlign: 'center' },

  printerCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border.default, ...shadows.xs },
  printerCardDefault: { borderColor: colors.primary[300], backgroundColor: '#fdfefe' },
  printerCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  printerBadges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  connBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  connBadgeText: { fontSize: 10.5, fontWeight: '700', color: colors.primary[700], fontFamily: 'Cairo' },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.warning.light, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  defaultBadgeText: { fontSize: 10.5, fontWeight: '700', color: colors.warning.dark, fontFamily: 'Cairo' },
  sizeBadge: { backgroundColor: colors.slate[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  sizeBadgeText: { fontSize: 10.5, fontWeight: '600', color: colors.slate[600], fontFamily: 'Cairo' },
  statusDotRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 10.5, color: colors.emerald[700], fontWeight: '700', fontFamily: 'Cairo' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.emerald[600] },

  printerName: { fontSize: 15, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo', textAlign: 'right', marginTop: 2 },
  printerAddr: { fontSize: 11, color: colors.text.tertiary, fontFamily: 'Cairo', textAlign: 'right', marginTop: 2, marginBottom: spacing.sm },

  printerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border.subtle, paddingTop: spacing.sm },
  printerActionsLeft: { flexDirection: 'row', gap: 6 },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary[50], paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.md },
  testBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary[700], fontFamily: 'Cairo' },
  mappingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.slate[100], paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.md },
  mappingsBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate[700], fontFamily: 'Cairo' },

  printerActionsRight: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 32, height: 32, borderRadius: radii.md, backgroundColor: colors.slate[50], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.default },
  deleteIconBtn: { backgroundColor: colors.danger.light, borderColor: colors.danger.border },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, marginBottom: spacing.md },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo' },
  modalSubtitle: { fontSize: 11, color: colors.text.tertiary, fontFamily: 'Cairo', marginTop: 2 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.text.secondary, textAlign: 'right', marginBottom: 4, marginTop: spacing.sm, fontFamily: 'Cairo' },
  modalInput: { backgroundColor: colors.slate[50], borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 13, color: colors.text.primary, fontFamily: 'Cairo' },

  segmentedRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radii.md, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.border.default },
  segmentBtnActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  segmentText: { fontSize: 11.5, fontWeight: '700', color: colors.text.secondary, fontFamily: 'Cairo' },
  segmentTextActive: { color: '#fff' },

  modalSubmitBtn: { backgroundColor: colors.primary[600], paddingVertical: 12, borderRadius: radii.xl, alignItems: 'center', marginTop: spacing.lg },
  modalSubmitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: 'Cairo' },

  mappingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  mappingDocName: { fontSize: 13, fontWeight: '700', color: colors.text.primary, fontFamily: 'Cairo' },
  mappingTplName: { fontSize: 12, color: colors.primary[700], fontWeight: '600', fontFamily: 'Cairo' },
});

export default PrinterSettingsScreen;
