import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/types';
import { generateId } from '@/utils';
import { findDuplicateBarcodes, findMissingBarcodes } from '@/services/barcode';
import BulkAssignBarcodesModal from '@/features/barcode/BulkAssignBarcodesModal';
import { useBarcodeScanner } from '@/features/barcode/useBarcodeScanner';
import { categoriesApi, type Category } from '@/services/api/categoriesApi';
import ImageUpload from '@/components/products/ImageUpload';
import {
  Plus, Search, Trash2, Upload, Download, X, Package,
  ToggleLeft, ToggleRight, Filter, DollarSign, Barcode, AlertTriangle, Zap,
  Box, ChevronLeft, ChevronRight, ScanLine, Tag, Settings,
  LayoutGrid, List as ListIcon, TrendingUp,
  Clock, ArrowUpDown, Sparkles, CheckCircle2, ShieldAlert,
  Edit2 as EditIcon, Printer as PrintIcon, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

const emptyProduct: Omit<Product, 'id'> = {
  name: '', barcode: '', sku: '', category: '', unit: 'قطعة',
  costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
  quantity: 0, lowStockThreshold: 5, reorderPoint: 10, maxStock: 100, variant: '', expiryDate: '',
  batchNumber: '', highlighted: false, status: 'active',
  image: '',
};

const commonUnits = ['قطعة', 'كرتونة', 'علبة', 'كيلو', 'لتر', 'متر', 'حزمة', 'دزينة'];

type SortOption = 'newest' | 'price_desc' | 'price_asc' | 'qty_asc' | 'qty_desc' | 'name_asc';
type ViewMode = 'table' | 'grid';

interface FormErrors {
  name?: string;
  retailPrice?: string;
  barcode?: string;
  quantity?: string;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: products = [], isFetching, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await db.products.toArray();
      return r as unknown as Product[];
    },
    refetchInterval: 3000, // تحديث دوري كل 3 ثوانٍ للمزامنة الفورية في وضع الاتصال
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
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
    mutationFn: (importedProducts: Product[]) => {
      const now = new Date().toISOString();
      return db.products.bulkAdd(
        importedProducts.map(p => ({
          ...p,
          id: p.id || generateId(),
          createdAt: p.createdAt || now,
          updatedAt: now,
        })) as any
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock' | 'expiring'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Form & Modals State
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct);
  const [inventoryTab, setInventoryTab] = useState<'products' | 'barcode-report'>('products');
  const [showBulkGenerate, setShowBulkGenerate] = useState(false);
  const [barcodeScanMode, setBarcodeScanMode] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [barcodeDuplicate, setBarcodeDuplicate] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [activeFormSection, setActiveFormSection] = useState<string>('basic');
  const [quickAdjustProduct, setQuickAdjustProduct] = useState<Product | null>(null);
  const [adjustQtyInput, setAdjustQtyInput] = useState<string>('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useBarcodeScanner({
    onScan: (code) => {
      if (showForm) {
        setFormData((prev) => ({ ...prev, barcode: code }));
      } else {
        setSearchQuery(code);
      }
    },
    enabled: true,
    respectInputFocus: true,
    beepOnSuccess: true,
    beepOnFailure: false,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const list = await categoriesApi.list();
        return (list || []).filter((c) => c && c.name && c.name.trim());
      } catch {
        const fallback = await db.categories.toArray();
        return (fallback || []).map((c: any) => ({
          id: c.id,
          name: typeof c === 'object' && c !== null ? c.name : String(c),
          color: c.color || '#3B82F6',
          icon: c.icon || 'FolderTree',
          description: c.description || '',
          productCount: 0,
        }));
      }
    },
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

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

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => p.lowStockThreshold > 0 && p.quantity <= p.lowStockThreshold && p.quantity > 0).length;
    const outOfStock = products.filter(p => p.quantity <= 0).length;
    const expiringSoonCount = products.filter(p => isExpiringSoon(p)).length;
    const stockValue = products.reduce((sum, p) => sum + (Number(p.costPrice) || 0) * (Number(p.quantity) || 0), 0);
    const retailValue = products.reduce((sum, p) => sum + (Number(p.retailPrice) || 0) * (Number(p.quantity) || 0), 0);
    const avgMargin = stockValue > 0 ? ((retailValue - stockValue) / stockValue) * 100 : 0;

    return { totalProducts, lowStock, outOfStock, expiringSoonCount, stockValue, retailValue, avgMargin };
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    if (filterCategory) {
      filtered = filtered.filter((p) => {
        const catName = typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category;
        return catName === filterCategory || p.categoryId === filterCategory;
      });
    }

    if (filterStockStatus === 'in_stock') filtered = filtered.filter((p) => getStockStatus(p) === 'in_stock');
    if (filterStockStatus === 'low_stock') filtered = filtered.filter((p) => getStockStatus(p) === 'low_stock');
    if (filterStockStatus === 'out_of_stock') filtered = filtered.filter((p) => getStockStatus(p) === 'out_of_stock');
    if (filterStockStatus === 'expiring') filtered = filtered.filter((p) => isExpiringSoon(p));

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt || '').localeCompare(a.createdAt || '');
      if (sortBy === 'price_desc') return (b.retailPrice || 0) - (a.retailPrice || 0);
      if (sortBy === 'price_asc') return (a.retailPrice || 0) - (b.retailPrice || 0);
      if (sortBy === 'qty_asc') return (a.quantity || 0) - (b.quantity || 0);
      if (sortBy === 'qty_desc') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
      return 0;
    });

    return filtered;
  }, [products, searchQuery, filterCategory, filterStockStatus, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterCategory, filterStockStatus, sortBy, itemsPerPage]);

  // Profit margin calculation in form
  const profitMargin = useMemo(() => {
    if (formData.costPrice <= 0 || formData.retailPrice <= 0) return null;
    return ((formData.retailPrice - formData.costPrice) / formData.costPrice) * 100;
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
    if (!formData.name.trim()) errors.name = 'اسم المنتج مطلوب';
    if (formData.retailPrice <= 0) errors.retailPrice = 'سعر البيع يجب أن يكون أكبر من 0';
    if (barcodeDuplicate) errors.barcode = `الباركود مستخدم بالفعل في: ${barcodeDuplicate}`;
    return errors;
  }, [formData.name, formData.retailPrice, barcodeDuplicate]);

  useEffect(() => {
    if (showForm) setFormErrors(validateForm());
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

  const handleQuickAdjust = (product: Product, delta: number) => {
    const newQty = Math.max(0, (product.quantity || 0) + delta);
    updateMutation.mutate({ id: product.id, data: { quantity: newQty } });
  };

  const handleSaveCustomAdjust = () => {
    if (!quickAdjustProduct) return;
    const val = Number(adjustQtyInput);
    if (isNaN(val) || val < 0) return;
    updateMutation.mutate({ id: quickAdjustProduct.id, data: { quantity: val } });
    setQuickAdjustProduct(null);
    setAdjustQtyInput('');
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
        id: generateId(),
        name: row['الاسم'] || row['name'] || '',
        barcode: String(row['الباركود'] || row['barcode'] || ''),
        category: row['الفئة'] || row['category'] || '',
        unit: row['الوحدة'] || row['unit'] || 'قطعة',
        costPrice: Number(row['سعر التكلفة'] || row['costPrice'] || 0),
        wholesalePrice: Number(row['سعر الجملة'] || row['wholesalePrice'] || 0),
        retailPrice: Number(row['سعر التجزئة'] || row['retailPrice'] || 0),
        wholesaleMinQty: Number(row['الحد الأدنى للجملة'] || row['wholesaleMinQty'] || 0),
        quantity: Number(row['الكمية'] || row['quantity'] || 0),
        lowStockThreshold: Number(row['حد التنبيه'] || row['lowStockThreshold'] || 0),
        variant: row['المقاس'] || row['variant'] || '',
        expiryDate: row['تاريخ الصلاحية'] || row['expiryDate'] || '',
        batchNumber: row['رقم الدفعة'] || row['batchNumber'] || '',
        highlighted: false,
        status: 'active' as const,
      }));
      importMutation.mutate(imported);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExport = () => {
    const exportData = filteredProducts.map((p) => ({
      'الاسم': p.name,
      'الباركود': p.barcode || '',
      'SKU': p.sku || '',
      'الفئة': typeof p.category === 'object' && p.category !== null ? (p.category as any).name : (p.category || ''),
      'الوحدة': p.unit || 'قطعة',
      'سعر التكلفة': p.costPrice || 0,
      'سعر التجزئة': p.retailPrice || 0,
      'سعر الجملة': p.wholesalePrice || 0,
      'الكمية': p.quantity || 0,
      'حد التنبيه': p.lowStockThreshold || 0,
      'الحالة': p.status === 'active' ? 'نشط' : 'غير نشط',
      'تاريخ الصلاحية': p.expiryDate || '',
      'رقم الدفعة': p.batchNumber || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المخزون');
    XLSX.writeFile(wb, `AN_POS_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleAddNewCategory = async () => {
    const trimmed = newCategory.trim();
    if (trimmed) {
      try {
        const created = await categoriesApi.create({
          name: trimmed,
          description: '',
          icon: 'ShoppingBag',
          color: '#3B82F6',
        });
        await queryClient.invalidateQueries({ queryKey: ['categories'] });
        setFormData((prev) => ({ ...prev, category: trimmed, categoryId: created?.id }));
      } catch (err) {
        console.warn('Failed to create category via categoriesApi, trying direct db:', err);
        const newId = generateId();
        try {
          await db.categories.add({
            id: newId,
            name: trimmed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          await queryClient.invalidateQueries({ queryKey: ['categories'] });
          setFormData((prev) => ({ ...prev, category: trimmed, categoryId: newId }));
        } catch {
          /* ignore if exists */
        }
      }
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
    { id: 'basic', label: 'البيانات الأساسية', icon: <Package className="w-4 h-4" /> },
    { id: 'category', label: 'الفئة والوحدة', icon: <Tag className="w-4 h-4" /> },
    { id: 'pricing', label: 'الأسعار والربحية', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'stock', label: 'المخزون والتنبيهات', icon: <Box className="w-4 h-4" /> },
    { id: 'settings', label: 'الصلاحية والخيارات', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Top Bar Tabs Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/15">
        <div className="flex items-center gap-2 p-1 bg-surface-container rounded-2xl border border-outline-variant/20 w-fit">
          <button
            onClick={() => setInventoryTab('products')}
            className={`px-5 py-2.5 rounded-xl font-medium text-body-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              inventoryTab === 'products'
                ? 'bg-primary text-on-primary shadow-md shadow-primary/20 scale-[1.02]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>قائمة المنتجات</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              inventoryTab === 'products' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'
            }`}>
              {products.length}
            </span>
          </button>
          <button
            onClick={() => setInventoryTab('barcode-report')}
            className={`px-5 py-2.5 rounded-xl font-medium text-body-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              inventoryTab === 'barcode-report'
                ? 'bg-primary text-on-primary shadow-md shadow-primary/20 scale-[1.02]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Barcode className="w-4 h-4" />
            <span>تقرير الباركود</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        {inventoryTab === 'products' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-3.5 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface hover:border-outline-variant/40 transition-all text-body-sm font-medium active:scale-95 shadow-sm cursor-pointer"
              title="تحديث فوري لبيانات المخزون"
            >
              <RefreshCw className={`w-4 h-4 text-primary ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث فوري</span>
            </button>

            <label className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:border-outline-variant/40 transition-all cursor-pointer text-body-sm font-medium active:scale-95 shadow-sm">
              <Upload className="w-4 h-4 text-primary" />
              <span>استيراد Excel</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:border-outline-variant/40 transition-all text-body-sm font-medium active:scale-95 shadow-sm cursor-pointer"
              title="تصدير القائمة الحالية إلى ملف Excel"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={() => { setShowForm(true); setEditingProduct(null); setFormData(emptyProduct); }}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl shadow-md hover:shadow-primary/30 hover:opacity-95 transition-all active:scale-95 text-body-sm font-bold cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>منتج جديد</span>
            </button>
          </div>
        )}
      </div>

      {inventoryTab === 'barcode-report' && (
        <BarcodeReportSection setShowBulkGenerate={setShowBulkGenerate} />
      )}

      {inventoryTab === 'products' && (
        <div className="space-y-6">
          {/* Interactive Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Products */}
            <div
              onClick={() => { setFilterStockStatus('all'); setFilterCategory(''); }}
              className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                filterStockStatus === 'all' && filterCategory === ''
                  ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/30'
                  : 'bg-surface-container border-outline-variant/20 hover:border-outline-variant/40 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold">
                  المخزون الكلي
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant">إجمالي الأصناف</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="font-cairo text-2xl font-bold text-on-surface">{stats.totalProducts}</h3>
                <span className="text-xs text-on-surface-variant">صنف مسجل</span>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/10 flex justify-between items-center text-xs text-on-surface-variant">
                <span>النشطة: {products.filter(p => p.status === 'active').length}</span>
                <span>المعطلة: {products.filter(p => p.status === 'inactive').length}</span>
              </div>
            </div>

            {/* Card 2: Low Stock Warning */}
            <div
              onClick={() => setFilterStockStatus('low_stock')}
              className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                filterStockStatus === 'low_stock'
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-sm ring-1 ring-amber-500/40'
                  : 'bg-surface-container border-outline-variant/20 hover:border-amber-500/30 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  stats.lowStock > 0 ? 'bg-amber-500/15 text-amber-500 animate-pulse' : 'bg-surface-container-highest text-on-surface-variant'
                }`}>
                  {stats.lowStock > 0 ? 'يتطلب إعادة طلب' : 'مستقر'}
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant">مخزون منخفض</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className={`font-cairo text-2xl font-bold ${stats.lowStock > 0 ? 'text-amber-500' : 'text-on-surface'}`}>
                  {stats.lowStock}
                </h3>
                <span className="text-xs text-on-surface-variant">منتج تحت حد الأمان</span>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/10 text-xs text-amber-600 dark:text-amber-400 font-medium">
                اضغط للتصفية السريعة
              </div>
            </div>

            {/* Card 3: Out of Stock */}
            <div
              onClick={() => setFilterStockStatus('out_of_stock')}
              className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                filterStockStatus === 'out_of_stock'
                  ? 'bg-rose-500/10 border-rose-500/50 shadow-sm ring-1 ring-rose-500/40'
                  : 'bg-surface-container border-outline-variant/20 hover:border-rose-500/30 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  stats.outOfStock > 0 ? 'bg-rose-500/15 text-rose-500' : 'bg-surface-container-highest text-on-surface-variant'
                }`}>
                  {stats.outOfStock > 0 ? 'نفاد الكمية' : 'مكتمل'}
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant">منتجات نافذة (0)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className={`font-cairo text-2xl font-bold ${stats.outOfStock > 0 ? 'text-rose-500' : 'text-on-surface'}`}>
                  {stats.outOfStock}
                </h3>
                <span className="text-xs text-on-surface-variant">منتج غير متوفر للبيع</span>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/10 text-xs text-rose-600 dark:text-rose-400 font-medium">
                اضغط لتحديد النواقص
              </div>
            </div>

            {/* Card 4: Inventory Valuation */}
            <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/20 hover:border-outline-variant/40 transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                  هامش متوقع: +{stats.avgMargin.toFixed(0)}%
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant">القيمة الإجمالية (بالتكلفة)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="font-cairo text-xl font-bold text-on-surface truncate">
                  {stats.stockValue.toLocaleString('ar-DZ')} <span className="text-xs font-normal">دج</span>
                </h3>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/10 flex justify-between items-center text-xs text-on-surface-variant">
                <span>قيمة البيع:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {stats.retailValue.toLocaleString('ar-DZ')} دج
                </span>
              </div>
            </div>
          </div>

          {/* Filtering, Search & View Controls Bar */}
          <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 space-y-3.5 shadow-sm">
            {/* Search, Sort & View Mode Row */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search Box */}
              <div className="flex-1 w-full relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، الباركود، أو رقم الصنف SKU..."
                  className="w-full bg-surface-container-high/60 border border-outline-variant/30 rounded-xl py-2.5 pr-10 pl-9 text-body-sm focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-highest transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full bg-surface-container-high/60 border border-outline-variant/30 rounded-xl py-2.5 pr-9 pl-3 text-body-sm appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium text-on-surface"
                  >
                    <option value="newest">الأحدث إضافة</option>
                    <option value="name_asc">الاسم (أ - ي)</option>
                    <option value="qty_asc">الكمية: من الأقل</option>
                    <option value="qty_desc">الكمية: من الأعلى</option>
                    <option value="price_desc">السعر: من الأعلى</option>
                    <option value="price_asc">السعر: من الأقل</option>
                  </select>
                  <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-surface-container-high/60 p-1 rounded-xl border border-outline-variant/30">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'table' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="عرض جدولي"
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'grid' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="عرض بطاقات"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-outline-variant/10">
              <span className="text-xs font-semibold text-on-surface-variant ml-2">الحالة:</span>
              {[
                { value: 'all' as const, label: 'الكل' },
                { value: 'in_stock' as const, label: 'متوفر', count: products.filter(p => getStockStatus(p) === 'in_stock').length },
                { value: 'low_stock' as const, label: 'منخفض', count: stats.lowStock, alert: stats.lowStock > 0 },
                { value: 'out_of_stock' as const, label: 'نافذ', count: stats.outOfStock, alert: stats.outOfStock > 0 },
                { value: 'expiring' as const, label: 'قريب الصلاحية', count: stats.expiringSoonCount, alert: stats.expiringSoonCount > 0 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStockStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                    filterStockStatus === opt.value
                      ? 'bg-primary text-on-primary shadow-sm font-bold'
                      : 'bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                      filterStockStatus === opt.value
                        ? 'bg-white/20 text-white'
                        : opt.alert
                        ? 'bg-rose-500/20 text-rose-500 font-bold'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      {opt.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Category Filter Pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-outline-variant/10">
                <span className="text-xs font-semibold text-on-surface-variant ml-2">العائلات / التصنيفات:</span>
                <button
                  onClick={() => setFilterCategory('')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    filterCategory === ''
                      ? 'bg-on-surface text-surface font-bold shadow-sm'
                      : 'bg-surface-container-high/50 text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  جميع التصنيفات ({products.length})
                </button>
                {categories.map((cat) => {
                  const count = products.filter(p => {
                    const cName = typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category;
                    return cName === cat.name || p.categoryId === cat.id;
                  }).length;
                  const isSelected = filterCategory === cat.name || filterCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(isSelected ? '' : cat.name)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-on-primary font-bold shadow-sm'
                          : 'bg-surface-container-high/50 text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#3B82F6' }}
                      />
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-surface-container rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-surface-container-high/50 text-on-surface-variant text-xs font-semibold border-b border-outline-variant/20">
                      <th className="px-5 py-3.5">المنتج</th>
                      <th className="px-4 py-3.5">الباركود / SKU</th>
                      <th className="px-4 py-3.5">الفئة</th>
                      <th className="px-4 py-3.5 text-center">سعر البيع</th>
                      <th className="px-4 py-3.5 text-center">الكمية والحالة</th>
                      <th className="px-4 py-3.5 text-center">تعديل سريع</th>
                      <th className="px-5 py-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-body-sm">
                    {paginatedProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      const expiringSoon = isExpiringSoon(product);
                      const marginVal = product.costPrice > 0
                        ? ((product.retailPrice - product.costPrice) / product.costPrice) * 100
                        : 0;

                      return (
                        <tr
                          key={product.id}
                          className={`hover:bg-surface-container-high/40 transition-colors group ${
                            expiringSoon ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          {/* Product Info with Avatar */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/20 shrink-0">
                                {product.image ? (
                                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-5 h-5 text-on-surface-variant/60" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                                    {product.name}
                                  </p>
                                  {product.status === 'inactive' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-container-highest text-on-surface-variant">
                                      معطل
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant">
                                  {product.variant && <span>المقاس/اللون: {product.variant}</span>}
                                  {product.unit && <span>· الوحدة: {product.unit}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Barcode & SKU */}
                          <td className="px-4 py-3.5 font-mono text-xs text-on-surface-variant">
                            {product.barcode ? (
                              <div className="flex items-center gap-1">
                                <Barcode className="w-3.5 h-3.5 text-primary/70" />
                                <span>{product.barcode}</span>
                              </div>
                            ) : (
                              <span className="text-on-surface-variant/40">—</span>
                            )}
                            {product.sku && (
                              <div className="text-[11px] text-on-surface-variant/70 mt-0.5">
                                SKU: {product.sku}
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3.5">
                            {product.category ? (
                              <span className="inline-flex items-center gap-1 bg-surface-container-high px-2.5 py-1 rounded-lg text-xs font-medium text-on-surface-variant">
                                <Tag className="w-3 h-3 text-primary" />
                                {typeof product.category === 'object' && product.category !== null ? (product.category as any).name : String(product.category)}
                              </span>
                            ) : (
                              <span className="text-on-surface-variant/40">—</span>
                            )}
                          </td>

                          {/* Price & Cost */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="font-bold text-on-surface text-sm">
                              {Number(product.retailPrice || 0).toFixed(2)} <span className="text-xs font-normal">دج</span>
                            </div>
                            <div className="text-xs text-on-surface-variant/70 mt-0.5 flex items-center justify-center gap-1">
                              <span>تكلفة: {Number(product.costPrice || 0).toFixed(0)}</span>
                              {marginVal > 0 && (
                                <span className="text-emerald-500 text-[10px] font-semibold">
                                  (+{marginVal.toFixed(0)}%)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Quantity & Visual Stock Gauge */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className={`font-cairo text-lg font-bold ${
                                stockStatus === 'out_of_stock'
                                  ? 'text-rose-500'
                                  : stockStatus === 'low_stock'
                                  ? 'text-amber-500'
                                  : 'text-on-surface'
                              }`}>
                                {product.quantity}
                              </span>
                              <span className="text-xs text-on-surface-variant">{product.unit || 'قطعة'}</span>
                            </div>

                            {/* Mini Stock Gauge */}
                            <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden mx-auto mt-1">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  stockStatus === 'out_of_stock'
                                    ? 'bg-rose-500 w-full'
                                    : stockStatus === 'low_stock'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{
                                  width: stockStatus === 'out_of_stock' ? '100%' : `${Math.min(100, (product.quantity / Math.max(1, (product.lowStockThreshold || 5) * 3)) * 100)}%`
                                }}
                              />
                            </div>
                            <div className="mt-1">
                              {stockStatus === 'out_of_stock' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500">
                                  نافذ
                                </span>
                              ) : stockStatus === 'low_stock' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500">
                                  منخفض
                                </span>
                              ) : expiringSoon ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500">
                                  صلاحية قريبة
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  متوفر
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Quick Adjust Buttons */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleQuickAdjust(product, -1)}
                                className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-rose-500/20 hover:text-rose-500 flex items-center justify-center text-on-surface-variant font-bold transition-all active:scale-90"
                                title="إنقاص 1"
                              >
                                -
                              </button>
                              <button
                                onClick={() => {
                                  setQuickAdjustProduct(product);
                                  setAdjustQtyInput(String(product.quantity || 0));
                                }}
                                className="px-2 py-1 rounded-lg bg-surface-container-high hover:bg-primary/20 hover:text-primary text-xs font-semibold text-on-surface-variant transition-all"
                                title="تحديد يدوي"
                              >
                                ضبط
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(product, 1)}
                                className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-emerald-500/20 hover:text-emerald-500 flex items-center justify-center text-on-surface-variant font-bold transition-all active:scale-90"
                                title="زيادة 1"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEditForm(product)}
                                className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all active:scale-95"
                                title="تعديل تفاصيل المنتج"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/barcode/labels?productId=${product.id}`)}
                                className="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
                                title="طباعة ملصق باركود"
                              >
                                <PrintIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(product)}
                                className={`p-2 rounded-xl transition-all active:scale-95 ${
                                  product.status === 'active' ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-on-surface-variant/60 hover:bg-surface-container-high'
                                }`}
                                title={product.status === 'active' ? 'تعطيل المنتج' : 'تفعيل المنتج'}
                              >
                                {product.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
                                    deleteMutation.mutate(product.id);
                                  }
                                }}
                                className="p-2 rounded-xl text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95"
                                title="حذف المنتج"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GRID CARDS VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                const expiringSoon = isExpiringSoon(product);

                return (
                  <div
                    key={product.id}
                    className="bg-surface-container rounded-2xl border border-outline-variant/20 p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Image & Status Badges */}
                      <div className="relative w-full h-40 bg-surface-container-high rounded-xl overflow-hidden mb-3.5 border border-outline-variant/15 flex items-center justify-center">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <Package className="w-12 h-12 text-on-surface-variant/40" />
                        )}
                        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
                          {stockStatus === 'out_of_stock' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm">نافذ</span>
                          ) : stockStatus === 'low_stock' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">مخزون منخفض</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">متوفر</span>
                          )}
                          {expiringSoon && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-sm">قريب الصلاحية</span>
                          )}
                        </div>
                      </div>

                      {/* Product Details */}
                      <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors line-clamp-1">
                        {product.name}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-on-surface-variant mt-1">
                        <span>{product.category ? (typeof product.category === 'object' && product.category !== null ? (product.category as any).name : String(product.category)) : 'غير مصنف'}</span>
                        <span className="font-mono">{product.barcode || '—'}</span>
                      </div>

                      {/* Pricing & Stock Metrics */}
                      <div className="mt-3 p-3 bg-surface-container-high/50 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-on-surface-variant">سعر البيع</p>
                          <p className="font-cairo font-bold text-base text-primary">
                            {Number(product.retailPrice || 0).toFixed(2)} <span className="text-xs font-normal">دج</span>
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] text-on-surface-variant">الكمية الحالية</p>
                          <p className="font-cairo font-bold text-base text-on-surface">
                            {product.quantity} <span className="text-xs font-normal text-on-surface-variant">{product.unit}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleQuickAdjust(product, -1)}
                          className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-rose-500/20 hover:text-rose-500 flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleQuickAdjust(product, 1)}
                          className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-emerald-500/20 hover:text-emerald-500 flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/barcode/labels?productId=${product.id}`)}
                          className="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
                          title="طباعة باركود"
                        >
                          <PrintIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditForm(product)}
                          className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all"
                          title="تعديل"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
                              deleteMutation.mutate(product.id);
                            }
                          }}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-container rounded-2xl border border-outline-variant/20 p-8 text-center">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-4 shadow-inner">
                <Package className="w-10 h-10" />
              </div>
              <h3 className="font-cairo text-xl font-bold text-on-surface mb-2">لا توجد منتجات مطابقة</h3>
              <p className="text-body-sm text-on-surface-variant mb-6 max-w-sm">
                لم يتم العثور على أية منتجات مطابقة للبحث أو التصفية الحالية. جرب تغيير معايير البحث أو إضافة صنف جديد.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterStockStatus('all'); }}
                  className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-on-surface text-body-sm font-medium transition-all"
                >
                  إعادة ضبط التصفية
                </button>
                <button
                  onClick={() => { setShowForm(true); setEditingProduct(null); setFormData(emptyProduct); }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-body-sm font-bold shadow-md hover:bg-primary-container transition-all"
                >
                  إضافة منتج جديد
                </button>
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <p className="text-xs text-on-surface-variant">
                عرض {paginatedProducts.length > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredProducts.length)}` : '0'} من أصل {filteredProducts.length} منتج
              </p>
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant border-r border-outline-variant/20 pr-3 mr-1">
                <span>عرض في الصفحة:</span>
                {[10, 25, 50].map((size) => (
                  <button
                    key={size}
                    onClick={() => setItemsPerPage(size)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      itemsPerPage === size ? 'bg-primary text-on-primary' : 'bg-surface-container-high hover:bg-surface-container-highest'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 7) p = i + 1;
                  else if (currentPage <= 4) p = i + 1;
                  else if (currentPage >= totalPages - 3) p = totalPages - 6 + i;
                  else p = currentPage - 3 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Adjust Modal */}
      {quickAdjustProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <h3 className="font-bold text-on-surface text-base">تعديل كمية المخزون</h3>
              <button onClick={() => setQuickAdjustProduct(null)} className="text-on-surface-variant p-1 rounded-lg hover:bg-surface-container-high">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">المنتج</p>
              <p className="font-bold text-on-surface text-sm truncate">{quickAdjustProduct.name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">الكمية الجديدة الفعلية ({quickAdjustProduct.unit || 'قطعة'})</label>
              <input
                type="number"
                autoFocus
                value={adjustQtyInput}
                onChange={(e) => setAdjustQtyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomAdjust(); }}
                className="w-full px-4 py-2.5 bg-surface-container-high border border-outline-variant/30 rounded-xl text-center font-cairo text-xl font-bold focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setQuickAdjustProduct(null)}
                className="flex-1 py-2.5 bg-surface-container-high text-on-surface-variant rounded-xl text-xs font-semibold hover:bg-surface-container-highest transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveCustomAdjust}
                className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary-container transition-colors shadow-sm"
              >
                تحديث الكمية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: إضافة/تعديل منتج ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-3xl border border-outline-variant/30 w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15 bg-surface-container-high/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cairo text-lg font-bold text-on-surface">
                    {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة صنف جديد للمخزون'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    <kbd className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] font-mono">Ctrl+Enter</kbd> للحفظ السريع
                    {' · '}
                    <kbd className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] font-mono">Esc</kbd> للإغلاق
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingProduct(null); setFormData(emptyProduct); setFormErrors({}); setBarcodeDuplicate(null); }}
                className="text-on-surface-variant hover:text-on-surface p-2 rounded-xl hover:bg-surface-container-highest transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-1 px-5 pt-3 border-b border-outline-variant/15 bg-surface-container-high/20 overflow-x-auto">
              {formSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveFormSection(sec.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeFormSection === sec.id
                      ? 'bg-surface-container text-primary border-b-2 border-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
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
                          <select
                            value={formData.category || ''}
                            onChange={(e) => {
                              if (e.target.value === '__new__') {
                                setShowNewCategory(true);
                              } else {
                                const found = categories.find((c) => c.name === e.target.value);
                                setFormData({
                                  ...formData,
                                  category: e.target.value,
                                  categoryId: found?.id || undefined,
                                });
                              }
                            }}
                            className="flex-1 px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer text-on-surface"
                          >
                            <option value="">اختر التصنيف / العائلة...</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                            <option value="__new__">+ إضافة تصنيف جديد</option>
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
                  <span className="text-body-xs text-on-surface-variant">
                    {typeof p.category === 'object' && p.category !== null ? (p.category as any).name : (p.category || '—')}
                  </span>
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
