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
  RefreshControl,
} from 'react-native';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  X,
  Check,
  Tag,
  ArrowRight,
  Sparkles,
  ArrowLeft,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Category } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#64748b',
];

export const CategoriesScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, alignItems } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      await ensureInit();
      const [allCats, allProds] = await Promise.all([
        db.categories.toArray(),
        db.products.toArray(),
      ]);

      const counts: Record<string, number> = {};
      for (const p of allProds as any[]) {
        const catId = p.categoryId || p.category_id || p.category;
        if (catId) {
          counts[catId] = (counts[catId] || 0) + 1;
        }
        if (p.category) {
          counts[p.category] = (counts[p.category] || 0) + 1;
        }
      }

      setCategories(allCats);
      setProductCounts(counts);
    } catch (err) {
      console.warn('Failed to load categories:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const openAdd = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setSelectedColor('#3b82f6');
    setModalVisible(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || '');
    setSelectedColor((category as any).color || '#3b82f6');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.warning'), t('categories.categoryName'));
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();

      if (editingCategory) {
        await db.categories.update(editingCategory.id, {
          name: name.trim(),
          description: description.trim(),
          color: selectedColor,
          updated_at: nowIso,
        });
      } else {
        await db.categories.add({
          id: generateId(),
          name: name.trim(),
          description: description.trim(),
          color: selectedColor,
          icon: 'FolderTree',
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      setModalVisible(false);
      await loadCategories();
    } catch (err) {
      Alert.alert(t('common.error'), `${err instanceof Error ? err.message : t('common.error')}`);
    }
    setSaving(false);
  };

  const handleDelete = (category: Category) => {
    const count = productCounts[category.id] || productCounts[category.name] || 0;
    if (count > 0) {
      Alert.alert(
        t('common.warning'),
        t('categories.cannotDeleteWithProducts')
      );
      return;
    }

    Alert.alert(t('common.delete'), `${t('categories.deleteCategoryConfirm')} "${category.name}"?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await db.categories.delete(category.id);
            await loadCategories();
          } catch {
            Alert.alert(t('common.error'), t('common.error'));
          }
        },
      },
    ]);
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border.default }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
            <BackIcon size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.text.primary }]}>{t('categories.title')}</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary[600] }]} onPress={openAdd}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>{t('categories.addCategory')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100], borderColor: colors.border.default }]}>
          <Search size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary, textAlign }]}
            placeholder={t('categories.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      </View>

      {/* Grid of Categories */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <FolderTree size={48} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('categories.noCategories')}</Text>
            <Text style={[styles.emptySub, { color: colors.text.secondary }]}>{t('categories.noCategoriesDesc')}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((c) => {
              const count = productCounts[c.id] || productCounts[c.name] || 0;
              const color = (c as any).color || '#3b82f6';

              return (
                <View key={c.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => openEdit(c)} style={styles.iconActionBtn}>
                        <Edit2 size={13} color={colors.text.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(c)} style={styles.iconActionBtn}>
                        <Trash2 size={13} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.catIconBox, { backgroundColor: `${color}15` }]}>
                      <Tag size={20} color={color} />
                    </View>
                  </View>

                  <Text style={[styles.catName, { color: colors.text.primary, textAlign }]}>{c.name}</Text>
                  {c.description ? (
                    <Text style={[styles.catDesc, { color: colors.text.secondary, textAlign }]} numberOfLines={1}>
                      {c.description}
                    </Text>
                  ) : null}

                  <View style={[styles.catFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.countBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.countText}>{count} {t('inventory.products')}</Text>
                      <Package size={12} color="#64748b" />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Category Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {editingCategory ? t('categories.editCategory') : t('categories.addCategory')}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('categories.categoryName')} *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', textAlign }]}
                placeholder={t('categories.categoryName')}
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('inventory.description')}</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', textAlign }]}
                placeholder={t('inventory.description')}
                placeholderTextColor={colors.text.tertiary}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('categories.color')}</Text>
              <View style={[styles.colorPalette, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {COLORS.map((col) => (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: col },
                      selectedColor === col && styles.colorCircleActive,
                    ]}
                    onPress={() => setSelectedColor(col)}
                  >
                    {selectedColor === col ? <Check size={14} color="#fff" /> : null}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary[600], flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.modalSaveBtnText}>{t('common.save')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  screenTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', fontFamily: 'Cairo' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Cairo',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  scroll: { flex: 1, padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right', marginTop: 10 },
  catDesc: { fontSize: 11, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'right', marginTop: 2 },
  catFooter: { marginTop: 12, alignItems: 'flex-start' },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  countText: { fontSize: 11, color: '#64748b', fontWeight: 'bold', fontFamily: 'Cairo' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 30 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#64748b', fontFamily: 'Cairo', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'center', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },

  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Cairo', marginBottom: 6, textAlign: 'right' },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Cairo',
  },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  colorCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  colorCircleActive: { borderWidth: 3, borderColor: '#0f172a' },

  modalConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', fontFamily: 'Cairo' },
});

export default CategoriesScreen;
