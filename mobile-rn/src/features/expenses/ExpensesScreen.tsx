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
  RefreshControl,
} from 'react-native';
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  Tag,
  Trash2,
  Edit2,
  X,
  Check,
  TrendingDown,
  ChevronLeft,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Expense } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, EmptyState } from '@/components/ui';

const CATEGORY_KEYS = [
  { key: 'rent', labelKey: 'expenses.catRent' as const },
  { key: 'salaries', labelKey: 'expenses.catSalaries' as const },
  { key: 'transport', labelKey: 'expenses.catTransport' as const },
  { key: 'bills', labelKey: 'expenses.catBills' as const },
  { key: 'maintenance', labelKey: 'expenses.catMaintenance' as const },
  { key: 'marketing', labelKey: 'expenses.catMarketing' as const },
  { key: 'packaging', labelKey: 'expenses.catPackaging' as const },
  { key: 'other', labelKey: 'expenses.catOther' as const },
];

const getCategoryConfig = (
  cat: string,
  colors: any,
  isDark: boolean
): { bg: string; text: string; variant: 'primary' | 'emerald' | 'purple' | 'warning' | 'danger' | 'indigo' | 'neutral' } => {
  switch (cat) {
    case 'إيجار':
    case 'rent':
      return { bg: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50], text: colors.primary[600], variant: 'primary' };
    case 'رواتب':
    case 'salaries':
      return { bg: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.emerald[50], text: isDark ? '#34d399' : colors.emerald[700], variant: 'emerald' };
    case 'نقل':
    case 'transport':
      return { bg: isDark ? 'rgba(168, 85, 247, 0.15)' : colors.purple[50], text: isDark ? '#c084fc' : colors.purple[700], variant: 'purple' };
    case 'فواتير':
    case 'bills':
      return { bg: colors.warning.light, text: colors.warning.text, variant: 'warning' };
    case 'صيانة':
    case 'maintenance':
      return { bg: colors.danger.light, text: colors.danger.text, variant: 'danger' };
    case 'تسويق':
    case 'marketing':
      return { bg: isDark ? 'rgba(99, 102, 241, 0.15)' : colors.indigo[50], text: isDark ? '#818cf8' : colors.indigo[700], variant: 'indigo' };
    case 'تغليف':
    case 'packaging':
      return { bg: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50], text: colors.primary[600], variant: 'primary' };
    default:
      return { bg: isDark ? colors.surfaceElevated : colors.slate[100], text: colors.text.secondary, variant: 'neutral' };
  }
};

export const ExpensesScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    label: '',
    category: 'other',
    amount: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    try {
      await ensureInit();
      const all = await db.expenses.toArray();
      all.sort(
        (a: any, b: any) =>
          new Date(b.date || b.createdAt || 0).getTime() -
          new Date(a.date || a.createdAt || 0).getTime()
      );
      setExpenses(all);
    } catch (err) {
      console.warn('Failed to load expenses:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  const getCategoryLabel = (cat: string) => {
    const found = CATEGORY_KEYS.find((c) => c.key === cat || c.labelKey === cat);
    if (found) return t(found.labelKey);
    return cat;
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat =
        selectedCategory === 'all' || e.category === selectedCategory;
      const matchSearch =
        !search.trim() ||
        (e.label || (e as any).description || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.category || '').toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [expenses, selectedCategory, search]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const openAdd = () => {
    setEditingExpense(null);
    setForm({ label: '', category: 'other', amount: '', notes: '' });
    setModalVisible(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      label: expense.label || (expense as any).description || '',
      category: expense.category || 'other',
      amount: String(expense.amount || ''),
      notes: expense.note || (expense as any).notes || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amountNum = parseFloat(form.amount);
    if (!form.label.trim()) {
      Alert.alert(t('common.warning'), t('expenses.expenseName'));
      return;
    }
    if (!amountNum || amountNum <= 0) {
      Alert.alert(t('common.warning'), t('expenses.amount'));
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();

      if (editingExpense) {
        await db.expenses.update(editingExpense.id, {
          label: form.label.trim(),
          description: form.label.trim(),
          category: form.category,
          amount: amountNum,
          notes: form.notes.trim(),
          updated_at: nowIso,
        });
      } else {
        await db.expenses.add({
          id: generateId(),
          date: nowIso,
          label: form.label.trim(),
          description: form.label.trim(),
          category: form.category,
          amount: amountNum,
          payment_method: 'cash',
          notes: form.notes.trim(),
          created_by: user?.name || t('pos.cashierDefault'),
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      setModalVisible(false);
      await loadExpenses();
    } catch (err) {
      Alert.alert(t('common.error'), `${t('common.error')}: ${err instanceof Error ? err.message : ''}`);
    }
    setSaving(false);
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      t('common.delete'),
      `${t('expenses.deleteExpenseConfirm')} "${expense.label || (expense as any).description}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await db.expenses.delete(expense.id);
              await loadExpenses();
            } catch {
              Alert.alert(t('common.error'), t('common.error'));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Button
            title={t('expenses.addExpense')}
            variant="destructive"
            size="sm"
            icon={<Plus size={16} color="#fff" />}
            onPress={openAdd}
          />
          <Text style={styles.screenTitle}>{t('expenses.title')}</Text>
        </View>

        <View style={[styles.searchBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput
            style={[styles.searchInput, { textAlign }]}
            placeholder={t('common.search')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.slate[400]}
          />
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <TouchableOpacity
            style={[styles.chip, selectedCategory === 'all' && styles.chipActive]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selectedCategory === 'all' && styles.chipTextActive]}>
              {t('common.all')}
            </Text>
          </TouchableOpacity>
          {CATEGORY_KEYS.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, selectedCategory === cat.key && styles.chipActive]}
              onPress={() => setSelectedCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedCategory === cat.key && styles.chipTextActive]}>
                {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Total KPI Card */}
      <Card variant="elevated" style={styles.kpiCard}>
        <View style={styles.kpiIconBox}>
          <TrendingDown size={22} color={colors.danger.main} />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={styles.kpiLabel}>{t('expenses.totalExpenses')}</Text>
          <Text style={styles.kpiVal}>{totalExpenses.toLocaleString(localeStr)} {currency}</Text>
        </View>
      </Card>

      {/* Expenses List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            icon={<DollarSign size={32} color={colors.danger.main} />}
            title={t('expenses.noExpensesFound')}
            description={t('expenses.noExpensesDesc')}
            actionTitle={t('expenses.addExpense')}
            onAction={openAdd}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filteredExpenses.map((expense) => {
              const catConfig = getCategoryConfig(expense.category, colors, isDark);

              return (
                <Card key={expense.id} style={[styles.expenseCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.expenseAmount}>
                      {(expense.amount || 0).toLocaleString(localeStr)} {currency}
                    </Text>
                    <View style={[styles.cardActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity onPress={() => openEdit(expense)} style={styles.actionBtn} activeOpacity={0.7}>
                        <Edit2 size={13} color={colors.text.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(expense)} style={[styles.actionBtn, styles.deleteBtn]} activeOpacity={0.7}>
                        <Trash2 size={13} color={colors.danger.main} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.cardRight, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.labelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.expenseLabel}>
                        {expense.label || (expense as any).description}
                      </Text>
                      <Badge variant={catConfig.variant} size="xs">
                        {getCategoryLabel(expense.category)}
                      </Badge>
                    </View>

                    <Text style={styles.expenseDate}>
                      {new Date(expense.date || (expense as any).createdAt || '').toLocaleDateString(localeStr)}
                      {expense.note ? ` • ${expense.note}` : ''}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Expense Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingExpense ? t('expenses.editExpense') : t('expenses.addExpense')}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign }]}>{t('expenses.amount')} ({currency})</Text>
                <TextInput
                  style={[styles.formInputAmount, { textAlign: 'center' }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  value={form.amount}
                  onChangeText={(textVal) => setForm({ ...form, amount: textVal })}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign }]}>{t('expenses.expenseName')}</Text>
                <Input
                  placeholder={t('expenses.expenseName')}
                  value={form.label}
                  onChangeText={(textVal) => setForm({ ...form, label: textVal })}
                  textAlign={textAlign}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign }]}>{t('expenses.category')}</Text>
                <View style={[styles.categoryGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {CATEGORY_KEYS.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.catSelectBtn,
                        form.category === cat.key && styles.catSelectBtnActive,
                      ]}
                      onPress={() => setForm({ ...form, category: cat.key })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.catSelectBtnText,
                          form.category === cat.key && styles.catSelectBtnTextActive,
                        ]}
                      >
                        {t(cat.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign }]}>{t('common.notes')}</Text>
                <Input
                  placeholder={t('common.optional')}
                  value={form.notes}
                  onChangeText={(textVal) => setForm({ ...form, notes: textVal })}
                  textAlign={textAlign}
                />
              </View>
            </ScrollView>

            <Button
              title={saving ? t('common.loading') : editingExpense ? t('expenses.editExpense') : t('common.save')}
              onPress={handleSave}
              loading={saving}
              fullWidth
              size="lg"
              style={{ marginTop: spacing.xs }}
            />
          </View>
        </View>
      </Modal>
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

    header: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    screenTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    searchInput: {
      flex: 1,
      fontSize: 13.5,
      color: colors.text.primary,
      fontFamily: 'Cairo',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },

    chipsRow: {
      backgroundColor: colors.surface,
      paddingVertical: spacing.xs + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    chipsScroll: {
      paddingHorizontal: spacing.lg,
      gap: spacing.xs + 2,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    chipActive: {
      backgroundColor: colors.danger.main,
      borderColor: colors.danger.dark,
    },
    chipText: {
      fontSize: 12,
      color: colors.text.secondary,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    chipTextActive: {
      color: '#ffffff',
    },

    kpiCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      padding: spacing.md,
      gap: spacing.md,
    },
    kpiIconBox: {
      width: 44,
      height: 44,
      borderRadius: radii.lg,
      backgroundColor: colors.danger.light,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiLabel: {
      fontSize: 11.5,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    kpiVal: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.danger.text,
      fontFamily: 'Cairo',
      marginTop: 2,
    },

    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: spacing.xxxl,
    },

    expenseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    cardLeft: {
      alignItems: 'flex-start',
      gap: spacing.xs,
    },
    expenseAmount: {
      fontSize: 14.5,
      fontWeight: '800',
      color: colors.danger.text,
      fontFamily: 'Cairo',
    },
    cardActions: {
      flexDirection: 'row',
      gap: 6,
    },
    actionBtn: {
      width: 28,
      height: 28,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtn: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : colors.danger.light,
    },

    cardRight: {
      flex: 1,
      alignItems: 'flex-end',
      marginRight: spacing.md,
      gap: 3,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    expenseLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    expenseDate: {
      fontSize: 11.5,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    closeModalBtn: {
      padding: 4,
    },
    modalTitle: {
      fontSize: 16.5,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },

    formGroup: {
      marginBottom: spacing.sm,
      gap: spacing.xs,
    },
    formLabel: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
      textAlign: 'right',
    },
    formInputAmount: {
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: colors.danger.main,
      padding: spacing.md,
      fontSize: 24,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    catSelectBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    catSelectBtnActive: {
      backgroundColor: colors.danger.main,
      borderColor: colors.danger.dark,
    },
    catSelectBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    catSelectBtnTextActive: {
      color: '#ffffff',
    },
  });

export default ExpensesScreen;

