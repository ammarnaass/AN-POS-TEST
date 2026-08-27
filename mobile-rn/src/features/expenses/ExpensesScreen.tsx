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
import { colors, radii, spacing, typography, shadows } from '@/theme';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, EmptyState } from '@/components/ui';

const CATEGORIES = [
  'إيجار',
  'رواتب',
  'نقل',
  'فواتير',
  'صيانة',
  'تسويق',
  'تغليف',
  'أخرى',
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; variant: any }> = {
  إيجار: { bg: colors.primary[50], text: colors.primary[700], variant: 'primary' },
  رواتب: { bg: colors.emerald[50], text: colors.emerald[700], variant: 'emerald' },
  نقل: { bg: colors.purple[50], text: colors.purple[700], variant: 'purple' },
  فواتير: { bg: colors.warning.light, text: colors.warning.text, variant: 'warning' },
  صيانة: { bg: colors.danger.light, text: colors.danger.text, variant: 'danger' },
  تسويق: { bg: colors.indigo[50], text: colors.indigo[700], variant: 'indigo' },
  تغليف: { bg: colors.primary[50], text: colors.primary[700], variant: 'primary' },
  أخرى: { bg: colors.slate[100], text: colors.slate[700], variant: 'neutral' },
};

export const ExpensesScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();

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
    category: 'أخرى',
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
    setForm({ label: '', category: 'أخرى', amount: '', notes: '' });
    setModalVisible(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      label: expense.label || (expense as any).description || '',
      category: expense.category || 'أخرى',
      amount: String(expense.amount || ''),
      notes: expense.note || (expense as any).notes || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amountNum = parseFloat(form.amount);
    if (!form.label.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة وصف أو بيان المصروف');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال مبلغ المصروف');
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
          created_by: user?.name || 'مستخدم',
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      setModalVisible(false);
      await loadExpenses();
    } catch (err) {
      Alert.alert('خطأ', `فشل حفظ المصروف: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setSaving(false);
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert('حذف المصروف', `هل تريد حذف مصروف "${expense.label || (expense as any).description}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.expenses.delete(expense.id);
            await loadExpenses();
          } catch {
            Alert.alert('خطأ', 'فشل حذف المصروف');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Button
            title="مصروف جديد"
            variant="destructive"
            size="sm"
            icon={<Plus size={16} color="#fff" />}
            onPress={openAdd}
          />
          <Text style={styles.screenTitle}>إدارة المصاريف</Text>
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث بالوصف أو الفئة..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.slate[400]}
            textAlign="right"
          />
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <TouchableOpacity
            style={[styles.chip, selectedCategory === 'all' && styles.chipActive]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selectedCategory === 'all' && styles.chipTextActive]}>الكل</Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Total KPI Card */}
      <Card variant="elevated" style={styles.kpiCard}>
        <View style={styles.kpiIconBox}>
          <TrendingDown size={22} color={colors.danger.main} />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.kpiLabel}>إجمالي المصاريف المسجلة</Text>
          <Text style={styles.kpiVal}>{totalExpenses.toLocaleString('ar-DZ')} دج</Text>
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
            title="لا توجد مصاريف مسجلة"
            description="سجل المصاريف اليومية لمتابعة التكاليف والربح الصافي"
            actionTitle="تسجيل أول مصروف"
            onAction={openAdd}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filteredExpenses.map((expense) => {
              const catConfig = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS['أخرى'];

              return (
                <Card key={expense.id} style={styles.expenseCard}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.expenseAmount}>
                      {(expense.amount || 0).toLocaleString('ar-DZ')} دج
                    </Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => openEdit(expense)} style={styles.actionBtn} activeOpacity={0.7}>
                        <Edit2 size={13} color={colors.slate[600]} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(expense)} style={[styles.actionBtn, styles.deleteBtn]} activeOpacity={0.7}>
                        <Trash2 size={13} color={colors.danger.main} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <View style={styles.labelRow}>
                      <Text style={styles.expenseLabel}>
                        {expense.label || (expense as any).description}
                      </Text>
                      <Badge variant={catConfig.variant} size="xs">
                        {expense.category}
                      </Badge>
                    </View>

                    <Text style={styles.expenseDate}>
                      {new Date(expense.date || (expense as any).createdAt || '').toLocaleDateString('ar-DZ')}
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
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingExpense ? 'تعديل المصروف' : 'تسجيل مصروف جديد'}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Input
                  label="بيان / وصف المصروف *"
                  placeholder="مثال: فاتورة كهرباء شهرية، بنزين، كراء..."
                  value={form.label}
                  onChangeText={(v) => setForm((f) => ({ ...f, label: v }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>المبلغ (دج) *</Text>
                <TextInput
                  style={styles.formInputAmount}
                  placeholder="0"
                  value={form.amount}
                  onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>تصنيف المصروف</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catSelectBtn,
                        form.category === cat && styles.catSelectBtnActive,
                      ]}
                      onPress={() => setForm((f) => ({ ...f, category: cat }))}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.catSelectBtnText,
                          form.category === cat && styles.catSelectBtnTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Input
                  label="ملاحظات"
                  placeholder="ملاحظة اختيارية..."
                  value={form.notes}
                  onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                />
              </View>
            </ScrollView>

            <Button
              title="حفظ المصروف"
              variant="destructive"
              size="lg"
              loading={saving}
              icon={<Check size={18} color="#fff" />}
              onPress={handleSave}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: colors.slate[50],
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
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  chipActive: {
    backgroundColor: colors.danger.main,
    borderColor: colors.danger.dark,
  },
  chipText: {
    fontSize: 12,
    color: colors.slate[600],
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
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: colors.danger.light,
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
    color: colors.slate[700],
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  formInputAmount: {
    backgroundColor: colors.slate[50],
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
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  catSelectBtnActive: {
    backgroundColor: colors.danger.main,
    borderColor: colors.danger.dark,
  },
  catSelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
    fontFamily: 'Cairo',
  },
  catSelectBtnTextActive: {
    color: '#ffffff',
  },
});

export default ExpensesScreen;

