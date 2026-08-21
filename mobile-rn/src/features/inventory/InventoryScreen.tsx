import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Search, Package, AlertCircle, Edit3, RefreshCw, Check, X, Plus } from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import type { Product, Category } from '@/lib/apiClient';

const InventoryScreen = ({ navigation }: any) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allProducts, allCategories] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
      ]);
      const mappedProducts: Product[] = allProducts.map((p: any) => ({
        ...p, id: p.id || p._id, name: p.name || p.productName,
        retailPrice: p.retailPrice || p.price || 0, wholesalePrice: p.wholesalePrice || 0,
        quantity: p.quantity || p.qty || 0, unit: p.unit || 'قطعة', barcode: p.barcode || '',
        category: p.category || '', status: p.status || 'active',
        lowStockThreshold: p.lowStockThreshold || 0, taxRate: p.taxRate || 0.19,
      }));
      setProducts(mappedProducts);
      setCategories(allCategories);
    } catch {}
    setLoading(false);
  }

  const filtered = products.filter((p) => {
    const matchesSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleProductStatus = async (product: Product) => {
    try {
      await db.products.update(product.id, { status: product.status === 'active' ? 'inactive' : 'active' });
      setProducts(products.map((p) =>
        p.id === product.id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
      ));
    } catch (e) {
      Alert.alert('خطأ', `فشل التحديث: ${e instanceof Error ? e.message : 'خطأ'}`);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>إدارة المخزون</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Products')}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>إضافة</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث بالاسم أو الباركود..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
          textAlign="right"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar}>
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>الكل</Text>
        </TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.categoryChip, selectedCategory === c.id && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(c.id)}
          >
            <Text style={[styles.categoryText, selectedCategory === c.id && styles.categoryTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Package size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>لا توجد منتجات</Text>
          </View>
        ) : (
          <View style={{ gap: 8, paddingBottom: 16 }}>
            {filtered.map(p => (
              <ProductRow
                key={p.id}
                product={p}
                onToggle={() => { toggleProductStatus(p); }}
                navigation={navigation}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const ProductRow = ({ product, onToggle, navigation }: any) => {
  const stockLevel = (product.quantity || 0) <= (product.lowStockThreshold || 0);
  return (
    <View style={styles.productRow}>
      <View style={styles.productStatus}>
        <View style={[styles.statusDot, { backgroundColor: product.status === 'active' ? '#22c55e' : '#94a3b8' }]} />
        <TouchableOpacity onPress={onToggle} style={styles.statusBtn}>
          {product.status === 'active' ? <Check size={14} color="#22c55e" /> : <X size={14} color="#94a3b8" />}
        </TouchableOpacity>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <View style={styles.productMeta}>
          <View style={[styles.stockBadge, stockLevel && styles.stockBadgeLow]}>
            <Text style={[styles.stockText, stockLevel && styles.stockTextLow]}>{product.quantity ?? 0} {product.unit}</Text>
          </View>
          {stockLevel && <AlertCircle size={12} color="#ef4444" />}
        </View>
      </View>
      <View style={styles.productPriceCol}>
        <Text style={styles.productPrice}>{(product.retailPrice || 0).toLocaleString('ar-DZ')} دج</Text>
        <Text style={styles.productUnit}>د.ج</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('ProductForm', { id: product.id })} style={styles.editBtn}>
        <Edit3 size={16} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { position: 'absolute', right: 8, zIndex: 1 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#0f172a', textAlign: 'right' },
  categoryBar: { marginBottom: 12 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 6 },
  categoryChipActive: { backgroundColor: '#3b82f6' },
  categoryText: { fontSize: 11, color: '#64748b', fontFamily: 'Cairo' },
  categoryTextActive: { color: '#fff', fontWeight: 'bold' },
  empty: { alignItems: 'center', padding: 32, gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, gap: 8 },
  productStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBtn: { padding: 4 },
  productInfo: { flex: 1 },
  productName: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right' },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  stockBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  stockBadgeLow: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  stockText: { fontSize: 10, color: '#22c55e' },
  stockTextLow: { color: '#ef4444' },
  productPriceCol: { alignItems: 'flex-end', minWidth: 50 },
  productPrice: { fontSize: 13, fontWeight: 'bold', color: '#3b82f6' },
  productUnit: { fontSize: 10, color: '#94a3b8' },
  editBtn: { padding: 6 },
});

export default InventoryScreen;
