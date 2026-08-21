import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useNavigate } from 'react-router-dom';
import { Edit2 as EditIcon, Printer as PrintIcon } from 'lucide-react';
import type { Product } from '@/types';
import { generateId } from '@/utils';
import { findDuplicateBarcodes, findMissingBarcodes, type DuplicateBarcode } from '@/services/barcode';
import BulkAssignBarcodesModal from '@/features/barcode/BulkAssignBarcodesModal';
import { useBarcodeScanner } from '@/features/barcode/useBarcodeScanner';
import ImageUpload from '@/components/products/ImageUpload';
import {
  Plus, Search, Trash2, Upload, X, Package,
  ToggleLeft, ToggleRight, Filter, DollarSign, Barcode, AlertTriangle, Zap,
  Box, ChevronLeft, ChevronRight, ScanLine, Tag, Settings, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

const emptyProduct: Omit<Product, 'id'> = {
  name: '', barcode: '', sku: '', category: '', unit: 'قطعة',
  costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
  quantity: 0, lowStockThreshold: 0, reorderPoint: 0, maxStock: 0, variant: '', expiryDate: '',
  batchNumber: '', highlighted: false, status: 'active',
  image: '',
};

const commonUnits = ['قطعة', 'كرتونة', 'علبة', 'كيلو', 'لتر', 'متر', 'متر مربع', 'حزمة', 'دزينة'];

interface FormErrors {
  name?: string;
  retailPrice?: string;
  barcode?: string;
  quantity?: string;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const r = await db.products.toArray(); return r as unknown as Product[]; },
  });

  useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<Product, 'id'>) =>
      db.products.add({
        id: generateId(),
        ...data,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      db.products.update(id, { ...data, updatedAt: new Date().toISOString() } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.products.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const importMutation = useMutation({
    mutationFn: (products: Product[]) => {
      const now = new Date().toISOString();
      return db.products.bulkAdd(
        products.map(p => ({
          ...p,
          id: p.id || generateId(),
          createdAt: p.createdAt || now,
          updatedAt: now,
        })) as any
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct);
  const [currentPage, setCurrentPage] = useState(1);
  const [inventoryTab, setInventoryTab] = useState<'products' | 'barcode-report'>('products');
  const [showBulkGenerate, setShowBulkGenerate] = useState(false);
  const [barcodeScanMode, setBarcodeScanMode] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [barcodeDuplicate, setBarcodeDuplicate] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [activeFormSection, setActiveFormSection] = useState<string>('basic');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  useBarcodeScanner({
    onScan: (code) => {
      if (showForm) {
        setFormData((prev) => ({ ...prev, barcode: code }));
      }
    },
    enabled: true,
    respectInputFocus: true,
    beepOnSuccess: true,
    beepOnFailure: false,
  });

  const ITEMS_PER_PAGE = 12;

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats);
  }, [products]);

  const getStockStatus = (product: Product) => {
    if (product.quantity <= 0) return 'out_of_stock';
    if (product.lowStockThreshold > 0 && product.quantity <= product.lowStockThreshold) return 'low_stock';
    return 'in_stock';
  };

  const isExpiringSoon = (product: Product) => {
    if (!product.expiryDate) return false;
    const expiry = new Date(product.expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 30 && days >= 0;
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q));
    }
    if (filterCategory) filtered = filtered.filter((p) => p.category === filterCategory);
    if (filterStockStatus !== 'all') filtered = filtered.filter((p) => getStockStatus(p) === filterStockStatus);
    return filtered;
  }, [products, searchQuery, filterCategory, filterStockStatus]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterCategory, filterStockStatus]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => p.lowStockThreshold > 0 && p.quantity <= p.lowStockThreshold && p.quantity > 0).length;
    const outOfStock = products.filter(p => p.quantity <= 0).length;
    const stockValue = products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);
    return { totalProducts, lowStock, outOfStock, stockValue };
  }, [products]);

  // Profit margin calculation
  const profitMargin = useMemo(() => {
    if (formData.costPrice <= 0 || formData.retailPrice <= 0) return null;
    const margin = ((formData.retailPrice - formData.costPrice) / formData.costPrice) * 100;
    return margin;
  }, [formData.costPrice, formData.retailPrice]);

  // Barcode duplicate detection
  useEffect(() => {
    if (!formData.barcode || formData.barcode.length < 3) {
      setBarcodeDuplicate(null);
      return;
    }
    const existing = products.find(p => p.barcode === formData.barcode && p.id !== editingProduct?.id);
    if (existing) {
      setBarcodeDuplicate(existing.name);
    } else {
      setBarcodeDuplicate(null);
    }
  }, [formData.barcode, products, editingProduct]);

  // Form validation
  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.name.trim()) {
      errors.name = 'اسم المنتج مطلوب';
    }
    if (formData.retailPrice <= 0) {
      errors.retailPrice = 'سعر البيع يجب أن يكون أكبر من صفر';
    }
    if (barcodeDuplicate) {
      errors.barcode = `الباركود مستخدم بالفعل في: ${barcodeDuplicate}`;
    }
    return errors;
  }, [formData.name, formData.retailPrice, barcodeDuplicate]);

  // Update errors in real-time
  useEffect(() => {
    if (showForm) {
      setFormErrors(validateForm());
    }
  }, [formData.name, formData.retailPrice, barcodeDuplicate, showForm, validateForm]);

  const handleSubmit = () => {
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      addMutation.mutate(formData);
    }
    setFormData(emptyProduct);
    setEditingProduct(null);
    setShowForm(false);
    setFormErrors({});
    setBarcodeDuplicate(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!showForm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowForm(false);
        setEditingProduct(null);
        setFormData(emptyProduct);
        setFormErrors({});
        setBarcodeDuplicate(null);
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, formData, editingProduct]);

  const handleToggleStatus = (product: Product) => {
    updateMutation.mutate({
      id: product.id,
      data: { status: product.status === 'active' ? 'inactive' : 'active' },
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const wb = XLSX.read(event.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
      const imported: Product[] = data.map((row) => ({
        id: generateId(), name: row['الاسم'] || row['name'] || '', barcode: String(row['الباركود'] || row['barcode'] || ''),
        category: row['الفئة'] || row['category'] || '', unit: row['الوحدة'] || row['unit'] || 'قطعة',
        costPrice: Number(row['سعر التكلفة'] || row['costPrice'] || 0), wholesalePrice: Number(row['سعر الجملة'] || row['wholesalePrice'] || 0),
        retailPrice: Number(row['سعر التجزئة'] || row['retailPrice'] || 0), wholesaleMinQty: Number(row['الحد الأدنى للجملة'] || row['wholesaleMinQty'] || 0),
        quantity: Number(row['الكمية'] || row['quantity'] || 0), lowStockThreshold: Number(row['حد التنبيه'] || row['lowStockThreshold'] || 0),
        variant: row['المقاس'] || row['variant'] || '', expiryDate: row['تاريخ الصلاحية'] || row['expiryDate'] || '',
        batchNumber: row['رقم الدفعة'] || row['batchNumber'] || '', highlighted: false, status: 'active' as const,
      }));
      importMutation.mutate(imported);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim()) {
      setFormData({ ...formData, category: newCategory.trim() });
      setNewCategory('');
      setShowNewCategory(false);
    }
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      costPrice: product.costPrice,
      wholesalePrice: product.wholesalePrice,
      retailPrice: product.retailPrice,
      wholesaleMinQty: product.wholesaleMinQty,
      quantity: product.quantity,
      lowStockThreshold: product.lowStockThreshold,
      reorderPoint: product.reorderPoint,
      maxStock: product.maxStock,
      variant: product.variant,
      expiryDate: product.expiryDate,
      batchNumber: product.batchNumber,
      highlighted: product.highlighted,
      status: product.status,
      image: product.image,
    });
    setShowForm(true);
  };

  const formSections = [
    { id: 'basic', label: 'المنتج', icon: <Package className="w-4 h-4" /> },
    { id: 'category', label: 'الفئة والوحدة', icon: <Tag className="w-4 h-4" /> },
    { id: 'pricing', label: 'الأسعار', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'stock', label: 'المخزون', icon: <Box className="w-4 h-4" /> },
    { id: 'settings', label: 'إعدادات', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-row-reverse gap-2 mb-2">
        <button onClick={() => setInventoryTab('products')}
          className={`px-4 py-2 rounded-lg text-label-md transition-all flex items-center gap-2 ${inventoryTab === 'products' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
          <Package className="w-4 h-4" /> المنتجات
        </button>
        <button onClick={() => setInventoryTab('barcode-report')}
          className={`px-4 py-2 rounded-lg text-label-md transition-all flex items-center gap-2 ${inventoryTab === 'barcode-report' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
          <Barcode className="w-4 h-4" /> تقرير الباركود
        </button>
      </div>

      {inventoryTab === 'barcode-report' && (
        <BarcodeReportSection setShowBulkGenerate={setShowBulkGenerate} />
      )}

      {inventoryTab === 'products' && (
        <div>
          <div className="flex flex-row-reverse justify-between items-center">
            <div>
              <h2 className="font-cairo text-headline-sm font-bold text-on-surface">إدارة المخزون</h2>
              <p className="text-body-md text-on-surface-variant">إدارة المنتجات، الأصناف، والأرصدة</p>
            </div>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-5 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer text-label-md">
                <Upload className="w-4 h-4" /> استيراد
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={() => { setShowForm(true); setEditingProduct(null); setFormData(emptyProduct); }}
                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg shadow-md hover:bg-primary-container transition-all active:scale-95 text-label-md">
                <Plus className="w-5 h-5" /> منتج جديد
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/10 p-2 rounded-lg text-primary"><Package className="w-5 h-5" /></div>
                <span className="text-tertiary text-label-sm">+1.2%</span>
              </div>
              <p className="text-on-surface-variant text-label-sm">إجمالي المنتجات</p>
              <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.totalProducts}</h3>
            </div>
            <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-amber-500/10 p-2 rounded-lg text-amber-600"><AlertTriangle className="w-5 h-5" /></div>
                <span className="text-amber-600 text-label-sm">تحتاج عناية</span>
              </div>
              <p className="text-on-surface-variant text-label-sm">مخزون منخفض</p>
              <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.lowStock}</h3>
            </div>
            <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-error/10 p-2 rounded-lg text-error"><Box className="w-5 h-5" /></div>
                <span className="text-error text-label-sm">-{stats.outOfStock}</span>
              </div>
              <p className="text-on-surface-variant text-label-sm">منتجات نافذة</p>
              <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.outOfStock}</h3>
            </div>
            <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-tertiary/10 p-2 rounded-lg text-tertiary"><DollarSign className="w-5 h-5" /></div>
                <span className="text-on-surface-variant text-label-sm">بالتكلفة</span>
              </div>
              <p className="text-on-surface-variant text-label-sm">قيمة المخزون</p>
              <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.stockValue.toFixed(2)} دج</h3>
            </div>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 space-y-4 mt-6">
            <div className="flex items-center gap-4 flex-row-reverse">
              <div className="flex-1 relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو الباركود..."
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-lg py-2.5 pr-10 pl-4 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              </div>
              <button className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-4 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all">
                <Filter className="w-4 h-4" />
                <span className="text-label-md">تصفية</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterCategory('')}
                className={`px-4 py-2 rounded-full text-body-sm text-label-sm transition-all ${filterCategory === '' ? 'bg-primary text-on-primary' : 'bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'}`}>
                الكل
              </button>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                  className={`px-4 py-2 rounded-full text-body-sm text-label-sm transition-all ${filterCategory === cat ? 'bg-primary text-on-primary' : 'bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'all' as const, label: 'كل المخزون' },
                { value: 'in_stock' as const, label: 'متوفر' },
                { value: 'low_stock' as const, label: 'منخفض' },
                { value: 'out_of_stock' as const, label: 'نافذ' },
              ]).map((opt) => (
                <button key={opt.value} onClick={() => setFilterStockStatus(opt.value)}
                  className={`px-4 py-2 rounded-full text-body-sm text-label-sm transition-all ${filterStockStatus === opt.value ? 'bg-primary text-on-primary' : 'bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-surface-container text-on-surface-variant text-label-sm border-b border-outline-variant/20">
                  <tr>
                    <th className="px-5 py-4 text-label-md text-on-surface-variant">المنتج</th>
                    <th className="px-5 py-4 text-label-md text-on-surface-variant">SKU</th>
                    <th className="px-5 py-4 text-label-md text-on-surface-variant">الباركود</th>
                    <th className="px-5 py-4 text-label-md text-on-surface-variant">الفئة</th>
                    <th className="px-5 py-4 text-label-md text-on-surface-variant text-center">سعر البيع</th>
                    <th className="px-5 py-4 text-label-md text-on-surface-variant text-center">الكمية</th>
                    <th className="px-5 py-4 text-label-md text-on-surface-variant text-center">الحالة</th>
                    <th className="px-5 py-4 text-label-md text-on-surface-variant text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const expiringSoon = isExpiringSoon(product);
                    return (
                      <tr key={product.id} className={`hover:bg-surface-container-low/50 transition-colors ${expiringSoon ? 'bg-amber-500/5' : ''}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden ${product.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="text-label-md text-on-surface">{product.name}</p>
                              {product.variant && <p className="text-body-sm text-on-surface-variant">{product.variant}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-body-sm font-mono text-on-surface-variant">{product.sku || '—'}</td>
                        <td className="px-5 py-4 text-body-sm font-mono text-on-surface-variant">{product.barcode || '—'}</td>
                        <td className="px-5 py-4">
                          {product.category ? (
                            <span className="bg-surface-container text-on-surface-variant px-3 py-1 rounded-full text-body-sm">{product.category}</span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="space-y-0.5">
                            <p className="text-label-md text-on-surface">{product.retailPrice.toFixed(2)} دج</p>
                            <p className="text-body-sm text-on-surface-variant">تكلفة: {product.costPrice.toFixed(2)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <span className={`font-cairo text-headline-sm font-bold ${stockStatus === 'low_stock' ? 'text-amber-600' : stockStatus === 'out_of_stock' ? 'text-error' : 'text-on-surface'}`}>
                              {product.quantity}
                            </span>
                            <span className="text-body-sm text-on-surface-variant">{product.unit}</span>
                          </div>
                          {product.lowStockThreshold > 0 && (
                            <div className="w-20 h-1 bg-outline-variant/20 rounded-full overflow-hidden mx-auto mt-1">
                              <div className={`h-full rounded-full ${stockStatus === 'low_stock' ? 'bg-amber-500' : stockStatus === 'out_of_stock' ? 'bg-error' : 'bg-tertiary'}`}
                                style={{ width: `${Math.min(100, (product.quantity / (product.lowStockThreshold * 3)) * 100)}%` }} />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {product.status === 'inactive' && (
                              <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-body-sm text-label-sm">غير نشط</span>
                            )}
                            {stockStatus === 'out_of_stock' ? (
                              <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-body-sm text-label-sm">نافذ</span>
                            ) : stockStatus === 'low_stock' ? (
                              <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-body-sm text-label-sm">منخفض</span>
                            ) : (
                              <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-body-sm text-label-sm">متوفر</span>
                            )}
                            {expiringSoon && (
                              <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-body-sm text-label-sm">قريب الصلاحية</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => openEditForm(product)}
                              className="p-2 rounded-lg text-primary hover:bg-primary-container/20 transition-all"
                              title="تعديل كامل">
                              <EditIcon className="w-[18px] h-[18px]" />
                            </button>
                            <button onClick={() => navigate(`/barcode/labels?productId=${product.id}`)}
                              className="p-2 rounded-lg text-on-surface-variant hover:bg-primary-container/20 transition-all"
                              title="طباعة باركود">
                              <PrintIcon className="w-[18px] h-[18px]" />
                            </button>
                            <button onClick={() => handleToggleStatus(product)}
                              className={`p-2 rounded-lg transition-all ${product.status === 'active' ? 'text-tertiary hover:bg-tertiary/10' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                              title="تفعيل/إلغاء">
                              {product.status === 'active' ? <ToggleRight className="w-[18px] h-[18px]" /> : <ToggleLeft className="w-[18px] h-[18px]" />}
                            </button>
                            <button onClick={() => deleteMutation.mutate(product.id)}
                              className="p-2 rounded-lg text-error hover:bg-error-container/20 transition-all"
                              title="حذف">
                              <Trash2 className="w-[18px] h-[18px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center text-outline-variant mb-4">
                  <Package className="w-12 h-12" />
                </div>
                <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-2">لا توجد منتجات</h3>
                <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-xs">أضف منتجاتك الأولى أو استوردها من Excel</p>
                <button onClick={() => { setShowForm(true); setEditingProduct(null); setFormData(emptyProduct); }}
                  className="bg-primary text-on-primary px-8 py-3 rounded-lg shadow-sm text-label-md hover:bg-primary-container transition-all">
                  إضافة أول منتج
                </button>
              </div>
            )}

            <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center border-t border-outline-variant/20">
              <p className="text-body-sm text-on-surface-variant">عرض {paginatedProducts.length > 0 ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}` : '0'} من أصل {filteredProducts.length} منتج</p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 7) p = i + 1;
                    else if (currentPage <= 4) p = i + 1;
                    else if (currentPage >= totalPages - 3) p = totalPages - 6 + i;
                    else p = currentPage - 3 + i;
                    return (
                      <button key={p} onClick={() => setCurrentPage(p)}
                        className={`w-9 h-9 rounded-lg text-label-md transition-all ${currentPage === p ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: إضافة/تعديل منتج ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-xl border border-outline-variant/20 w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cairo text-headline-sm font-bold text-on-surface">
                    {editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant">
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high rounded text-xs">Ctrl+Enter</kbd> للحفظ
                    {' · '}
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high rounded text-xs">Esc</kbd> للإلغاء
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setEditingProduct(null); setFormData(emptyProduct); setFormErrors({}); setBarcodeDuplicate(null); }}
                className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container-high transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-1 px-4 pt-3 border-b border-outline-variant/20 overflow-x-auto">
              {formSections.map((sec) => (
                <button key={sec.id} onClick={() => setActiveFormSection(sec.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-label-md transition-all whitespace-nowrap ${
                    activeFormSection === sec.id
                      ? 'bg-surface-container text-on-surface border-b-2 border-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}>
                  {sec.icon}
                  {sec.label}
                </button>
              ))}
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">

                {/* === Section: المنتج === */}
                {activeFormSection === 'basic' && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">اسم المنتج *</label>
                      <input placeholder="مثال: بيبسي 1 لتر"
                        value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-lg text-right bg-surface-container transition-all ${
                          formErrors.name ? 'border-error focus:border-error focus:ring-1 focus:ring-error' : 'border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary'
                        }`} />
                      {formErrors.name && <p className="text-error text-body-xs mt-1">{formErrors.name}</p>}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">صورة المنتج</label>
                      <ImageUpload value={formData.image || ''} onChange={(image) => setFormData({ ...formData, image })} />
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">الباركود</label>
                      <div className="relative">
                        <input ref={barcodeInputRef} placeholder="امسح أو اكتب الباركود"
                          value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                          className={`w-full px-4 py-3 pl-12 border rounded-lg text-right bg-surface-container transition-all font-mono ${
                            formErrors.barcode || barcodeDuplicate ? 'border-error focus:border-error focus:ring-1 focus:ring-error' : 'border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary'
                          }`} />
                        <button type="button" onClick={() => { setBarcodeScanMode(true); barcodeInputRef.current?.focus(); }}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${barcodeScanMode ? 'bg-primary text-on-primary animate-pulse' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                          title="امسح الباركود بالجهاز">
                          <ScanLine className="w-5 h-5" />
                        </button>
                      </div>
                      {formErrors.barcode && <p className="text-error text-body-xs mt-1">{formErrors.barcode}</p>}
                      {barcodeDuplicate && !formErrors.barcode && (
                        <p className="text-amber-500 text-body-xs mt-1">الباركود مستخدم بالفعل في: {barcodeDuplicate}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">رقم الصنف (SKU)</label>
                      <input placeholder="رقم الصنف"
                        value={formData.sku || ''} onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                    </div>
                  </>
                )}

                {/* === Section: الفئة والوحدة === */}
                {activeFormSection === 'category' && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">الفئة</label>
                      {!showNewCategory ? (
                        <div className="flex gap-2">
                          <select value={formData.category}
                            onChange={(e) => {
                              if (e.target.value === '__new__') {
                                setShowNewCategory(true);
                              } else {
                                setFormData({ ...formData, category: e.target.value });
                              }
                            }}
                            className="flex-1 px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer">
                            <option value="">اختر فئة...</option>
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="__new__">+ إضافة فئة جديدة</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input autoFocus placeholder="اسم الفئة الجديدة"
                            value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewCategory(); if (e.key === 'Escape') { setShowNewCategory(false); setNewCategory(''); } }}
                            className="flex-1 px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                          <button onClick={handleAddNewCategory}
                            className="px-4 py-3 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container transition-all">
                            إضافة
                          </button>
                          <button onClick={() => { setShowNewCategory(false); setNewCategory(''); }}
                            className="px-4 py-3 border border-outline-variant/20 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">الوحدة</label>
                      <select value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer">
                        {commonUnits.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">المقاس / اللون</label>
                      <input placeholder="مثال: أحمر / XL"
                        value={formData.variant || ''} onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                        className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                    </div>
                  </>
                )}

                {/* === Section: الأسعار === */}
                {activeFormSection === 'pricing' && (
                  <>
                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">سعر التكلفة</label>
                      <div className="relative">
                        <input type="number" placeholder="0.00"
                          value={formData.costPrice || ''} onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">دج</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">سعر الجملة</label>
                      <div className="relative">
                        <input type="number" placeholder="0.00"
                          value={formData.wholesalePrice || ''} onChange={(e) => setFormData({ ...formData, wholesalePrice: Number(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">دج</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">سعر التجزئة *</label>
                      <div className="relative">
                        <input type="number" placeholder="0.00"
                          value={formData.retailPrice || ''} onChange={(e) => setFormData({ ...formData, retailPrice: Number(e.target.value) || 0 })}
                          className={`w-full px-4 py-3 border rounded-lg text-right bg-surface-container transition-all ${
                            formErrors.retailPrice ? 'border-error focus:border-error focus:ring-1 focus:ring-error' : 'border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary'
                          }`} />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">دج</span>
                      </div>
                      {formErrors.retailPrice && <p className="text-error text-body-xs mt-1">{formErrors.retailPrice}</p>}
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">الحد الأدنى للجملة</label>
                      <input type="number" placeholder="0"
                        value={formData.wholesaleMinQty || ''} onChange={(e) => setFormData({ ...formData, wholesaleMinQty: Number(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                    </div>

                    {/* Profit Margin Calculator */}
                    <div className="col-span-2">
                      <div className={`p-4 rounded-lg border ${
                        profitMargin === null ? 'bg-surface-container-low border-outline-variant/20' :
                        profitMargin < 0 ? 'bg-error/5 border-error/20' :
                        profitMargin < 10 ? 'bg-amber-500/5 border-amber-500/20' :
                        'bg-tertiary/5 border-tertiary/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-label-md text-on-surface-variant">هامش الربح</span>
                          {profitMargin !== null ? (
                            <span className={`font-cairo text-headline-sm font-bold ${
                              profitMargin < 0 ? 'text-error' : profitMargin < 10 ? 'text-amber-500' : 'text-tertiary'
                            }`}>
                              {profitMargin > 0 ? '+' : ''}{profitMargin.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-on-surface-variant text-body-sm">أدخل الأسعار</span>
                          )}
                        </div>
                        {profitMargin !== null && (
                          <div className="flex items-center justify-between mt-2 text-body-sm text-on-surface-variant">
                            <span>ربح: {Math.max(0, formData.retailPrice - formData.costPrice).toFixed(2)} دج</span>
                            <span>من كل 100 دج بيع</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* === Section: المخزون === */}
                {activeFormSection === 'stock' && (
                  <>
                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">الكمية الحالية</label>
                      <div className="relative">
                        <input type="number" placeholder="0"
                          value={formData.quantity || ''} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">{formData.unit}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">حد التنبيه</label>
                      <input type="number" placeholder="يتنبه عند وصول الكمية لهذا العدد"
                        value={formData.lowStockThreshold || ''} onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">نقطة إعادة الطلب</label>
                      <input type="number" placeholder="يتم طلب جديد عند هذا الحد"
                        value={formData.reorderPoint || ''} onChange={(e) => setFormData({ ...formData, reorderPoint: Number(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">الحد الأعلى للمخزون</label>
                      <input type="number" placeholder="الحد الأقصى المسموح"
                        value={formData.maxStock || ''} onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                    </div>

                    {/* Stock Visual Indicator */}
                    <div className="col-span-2">
                      <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-label-md text-on-surface-variant">حالة المخزون المتوقعة</span>
                          {formData.quantity > 0 && formData.lowStockThreshold > 0 && (
                            <span className={`text-body-sm font-bold ${
                              formData.quantity <= formData.lowStockThreshold ? 'text-amber-500' : 'text-tertiary'
                            }`}>
                              {formData.quantity <= formData.lowStockThreshold ? 'منخفض' : 'متوفر'}
                            </span>
                          )}
                          {formData.quantity <= 0 && (
                            <span className="text-body-sm font-bold text-error">نافذ</span>
                          )}
                        </div>
                        {formData.lowStockThreshold > 0 && (
                          <div className="w-full h-3 bg-outline-variant/20 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                formData.quantity <= 0 ? 'bg-error' :
                                formData.quantity <= formData.lowStockThreshold ? 'bg-amber-500' : 'bg-tertiary'
                              }`}
                              style={{ width: `${Math.min(100, (formData.quantity / (formData.lowStockThreshold * 3)) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* === Section: إعدادات === */}
                {activeFormSection === 'settings' && (
                  <>
                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">تاريخ الصلاحية</label>
                      <input type="date" value={formData.expiryDate || ''} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">رقم الدفعة</label>
                      <input placeholder="رقم الدفعة"
                        value={formData.batchNumber || ''} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                        className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">حالة المنتج</label>
                      <button type="button" onClick={() => setFormData({ ...formData, status: formData.status === 'active' ? 'inactive' : 'active' })}
                        className={`flex items-center gap-2 px-5 py-3 rounded-lg text-label-md transition-all ${
                          formData.status === 'active'
                            ? 'bg-tertiary-container text-on-tertiary-container border border-tertiary/20'
                            : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/20'
                        }`}>
                        {formData.status === 'active' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {formData.status === 'active' ? 'نشط - يظهر في نقاط البيع' : 'غير نشط - مخفي من نقاط البيع'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20">
              <button onClick={() => { setShowForm(false); setEditingProduct(null); setFormData(emptyProduct); setFormErrors({}); setBarcodeDuplicate(null); }}
                className="flex-1 py-3 border border-outline-variant/20 rounded-lg text-on-surface-variant text-label-md hover:bg-surface-container-low transition-all">
                إلغاء
              </button>
              <button onClick={handleSubmit}
                disabled={Object.keys(formErrors).length > 0}
                className="flex-1 py-3 bg-primary text-on-primary rounded-lg text-label-md shadow-sm hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkGenerate && (
        <BulkAssignBarcodesModalWrapper onClose={() => setShowBulkGenerate(false)} />
      )}
    </div>
  );
}

// ============ BARCODE-MGMT-001: تقرير الباركود ============

function BarcodeReportSection({ setShowBulkGenerate }: { setShowBulkGenerate: (v: boolean) => void }) {
  const [duplicates, setDuplicates] = useState<{ barcode: string; productIds: string[]; count: number; sources: string[] }[]>([]);
  const [missing, setMissing] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [d, m] = await Promise.all([findDuplicateBarcodes(), findMissingBarcodes()]);
        if (!active) return;
        setDuplicates(d as any);
        setMissing(m as Product[]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-on-surface-variant">جارٍ تحليل الباركودات...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-row-reverse items-center justify-between">
        <div>
          <h2 className="font-cairo text-headline-sm font-bold text-on-surface">تقرير الباركودات</h2>
          <p className="text-body-sm text-on-surface-variant">كشف المكرّرة والناقصة</p>
        </div>
        <button onClick={() => setShowBulkGenerate(true)} disabled={missing.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-tertiary text-on-tertiary rounded-lg text-label-md hover:opacity-80 transition-all disabled:opacity-40">
          <Zap className="w-4 h-4" /> توليد باركودات للناقصة ({missing.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl border border-error/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-error" />
            <h3 className="font-cairo text-headline-sm font-bold text-on-surface">باركودات مكرّرة</h3>
            <span className="bg-error/15 text-error px-2 py-0.5 rounded-full text-label-sm">{duplicates.length}</span>
          </div>
          {duplicates.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant text-center py-6">لا تكرار</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {duplicates.map((d) => (
                <div key={d.barcode} className="p-3 bg-error/5 rounded-lg border border-error/10">
                  <div className="flex flex-row-reverse items-center justify-between">
                    <span className="font-mono text-body-md text-on-surface" dir="ltr">{d.barcode}</span>
                    <span className="text-label-sm text-error">{d.count} منتج</span>
                  </div>
                  <p className="text-body-xs text-on-surface-variant mt-1 text-right">
                    المصادر: {d.sources.join(' + ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl border border-warning/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Barcode className="w-5 h-5 text-warning" />
            <h3 className="font-cairo text-headline-sm font-bold text-on-surface">منتجات بدون باركود</h3>
            <span className="bg-warning/15 text-warning px-2 py-0.5 rounded-full text-label-sm">{missing.length}</span>
          </div>
          {missing.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant text-center py-6">كل المنتجات لها باركود</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar">
              {missing.slice(0, 50).map((p) => (
                <div key={p.id} className="flex flex-row-reverse items-center justify-between p-2 bg-warning/5 rounded-md">
                  <Package className="w-4 h-4 text-outline" />
                  <span className="text-body-sm text-on-surface flex-1 truncate text-right">{p.name}</span>
                  <span className="text-body-xs text-on-surface-variant">{p.category || '—'}</span>
                </div>
              ))}
              {missing.length > 50 && (
                <p className="text-body-xs text-on-surface-variant text-center mt-2">+{missing.length - 50} منتج آخر...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BulkAssignBarcodesModalWrapper({ onClose }: { onClose: () => void }) {
  const [missing, setMissing] = useState<Product[]>([]);

  useEffect(() => {
    findMissingBarcodes().then((m) => setMissing(m as Product[]));
  }, []);

  return <BulkAssignBarcodesModal products={missing as any} open={true} onClose={onClose} />;
}
