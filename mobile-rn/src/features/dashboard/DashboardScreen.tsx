import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { BarChart3, TrendingUp, Package, Receipt, ShoppingCart, Clock, AlertCircle } from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import type { Product, Sale } from '@/lib/apiClient';

const DashboardScreen = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      await ensureInit();
      const allProducts = await db.products.toArray();
      const mappedProducts = allProducts.map((p: any) => ({
        ...p, id: p.id || p._id, name: p.name || p.productName,
        retailPrice: p.retailPrice || p.price || 0, wholesalePrice: p.wholesalePrice || 0,
        quantity: p.quantity || p.qty || 0, unit: p.unit || 'قطعة', barcode: p.barcode || '',
        category: p.category || '', status: p.status || 'active',
        lowStockThreshold: p.lowStockThreshold || 0, taxRate: p.taxRate || 0.19,
      }));
      setProducts(mappedProducts);
      const allSales = await db.sales.toArray();
      const today = new Date().toISOString().slice(0, 10);
      setTodaySales(allSales.filter((s: any) => (s.date || s.created_at || '').startsWith(today)));
    } catch { setProducts([]); setTodaySales([]); }
    setLoading(false);
  }

  const totalSales = todaySales.reduce((sum: number, s) => sum + (s.total || 0), 0);
  const totalItems = todaySales.reduce((sum: number, s) => {
    const items = (s.items as any[]) || [];
    return sum + items.reduce((si, i) => si + (i.qty || 0), 0);
  }, 0);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={styles.grid}>
        <KPICard icon={<ShoppingCart size={20} color="#fff" />} label="مبيعات اليوم" value={totalSales.toFixed(2)} unit="دج" bg="bg-blue-500" />
        <KPICard icon={<Package size={20} color="#fff" />} label="أصناف مباعة" value={totalItems.toString()} unit="قطعة" bg="bg-green-500" />
        <KPICard icon={<BarChart3 size={20} color="#fff" />} label="إجمالي المنتجات" value={products.length.toString()} unit="منتج" bg="bg-purple-500" />
        <KPICard icon={<AlertCircle size={20} color="#fff" />} label="نفاد المخزون" value={products.filter(p => (p.quantity || 0) <= (p.lowStockThreshold || 0)).length.toString()} unit="صنف" bg="bg-red-500" />
      </View>

      <View>
        <Text style={styles.sectionTitle}>آخر العمليات اليوم</Text>
        {todaySales.length === 0 ? (
          <Text style={styles.empty}>لا توجد مبيعات اليوم</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {todaySales.slice(0, 8).map((sale) => (
              <View key={sale.id} style={styles.saleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.saleNumber}>{sale.number || '—'}</Text>
                  <Text style={styles.saleTime}>{(sale.items as any[])?.length || 0} صنف</Text>
                </View>
                <Text style={styles.saleTotal}>{(sale.total || 0).toFixed(2)} دج</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const KPICard = ({ icon, label, value, unit, bg }: any) => (
  <View style={[styles.kpiCard, { backgroundColor: '#f8fafc' }]}>
    <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
      {icon}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiUnit}>{unit}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#94a3b8', padding: 16 },
  saleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  saleNumber: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right' },
  saleTime: { fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  saleTotal: { fontSize: 14, fontWeight: 'bold', color: '#3b82f6', fontFamily: 'Cairo' },
  kpiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14 },
  kpiIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 11, color: '#94a3b8' },
  kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  kpiUnit: { fontSize: 10, color: '#94a3b8' },
});

export default DashboardScreen;
