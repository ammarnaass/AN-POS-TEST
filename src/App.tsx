import { lazy, Suspense, Component, useEffect } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';
import AuthLayout from '@/app/layouts/AuthLayout';
import DashboardLayout from '@/app/layouts/DashboardLayout';
import PosLayout from '@/app/layouts/PosLayout';
import FirstRunGuard from '@/app/guards/FirstRunGuard';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const POSPage = lazy(() => import('@/features/pos/POSPage'));
const QuickPOSPage = lazy(() => import('@/features/pos/QuickPOSPage'));
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage'));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage'));
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage'));
const SalesPage = lazy(() => import('@/features/sales/SalesPage'));
const CashPage = lazy(() => import('@/features/cash/CashPage'));
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'));
const PromotionsPage = lazy(() => import('@/features/promotions/PromotionsPage'));
const PacksPage = lazy(() => import('@/features/promotions/PacksPage'));
const FavoritesPage = lazy(() => import('@/features/favorites/FavoritesPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const Dashboard = lazy(() => import('@/pages/dashboard/DashboardPage'));
const DeliveryOrders = lazy(() => import('@/features/orders/DeliveryOrdersPage'));
const SupportPage = lazy(() => import('@/features/support/SupportPage'));
const PrintTemplatesPage = lazy(() => import('@/features/print/PrintTemplatesPage'));
const BarcodeLabelsPage = lazy(() => import('@/features/barcode/BarcodeLabelsPage'));
// PRD: شاشات إدارة المنتجات والعائلات
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage'));
const ProductFormPage = lazy(() => import('@/features/products/ProductFormPage'));

const Loading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

interface EBState { hasError: boolean; error: Error | null }
class RouteErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Route error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 30, direction: 'rtl', fontFamily: 'Cairo, sans-serif', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, maxWidth: 520, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <h2 style={{ color: '#0f172a', fontWeight: 900, marginBottom: 8, fontSize: 20 }}>تعذر تحميل الصفحة</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>حدث خطأ مؤقت أثناء استدعاء محتوى الصفحة. يرجى إعادة التحميل.</p>
            <pre style={{ background: '#f1f5f9', color: '#dc2626', padding: 12, borderRadius: 12, fontSize: 11, textAlign: 'left', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', marginBottom: 24 }}>{this.state.error?.message}</pre>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}
              >
                إعادة تحميل الصفحة (F5)
              </button>
              <button
                onClick={() => { window.location.hash = '#/'; window.location.reload(); }}
                style={{ padding: '10px 20px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 12, fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}
              >
                الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    seedDefaultTemplates().catch((err) => console.warn('Failed to seed print templates:', err));
  }, []);

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* صفحة تسجيل الدخول + التسجيل (النقطة البداية) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* الصفحات الرئيسية - تتطلب تسجيل دخول أو تجربة */}
          <Route element={<FirstRunGuard />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="inventory" element={<InventoryPage />} />
              {/* PRD: مسارات إدارة المنتجات والعائلات */}
              <Route path="products/new" element={<ProductFormPage />} />
              <Route path="products/:id/edit" element={<ProductFormPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="cash" element={<CashPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="promotions" element={<PromotionsPage />} />
              <Route path="packs" element={<PacksPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/print-templates" element={<PrintTemplatesPage />} />
              <Route path="delivery-orders" element={<DeliveryOrders />} />
              <Route path="support" element={<SupportPage />} />
            </Route>
            <Route element={<PosLayout />}>
              <Route path="pos" element={<POSPage />} />
              <Route path="pos/advanced" element={<POSPage />} />
              <Route path="pos/quick" element={<QuickPOSPage />} />
            </Route>
          </Route>

          {/* BARCODE-MGMT-001: مسار طباعة ملصقات الباركود */}
          <Route element={<FirstRunGuard />}>
            <Route element={<DashboardLayout />}>
              <Route path="barcode/labels" element={<BarcodeLabelsPage />} />
            </Route>
          </Route>

          {/* POS-PRINT-001 / D: مسارات الطباعة مُدمجة في /sales — إعادة التوجيه للتوافق */}
          <Route path="settings/print-queue" element={<Navigate to="/sales" replace state={{ tab: 'queue' }} />} />
          <Route path="settings/printers" element={<Navigate to="/sales" replace state={{ tab: 'printers' }} />} />

          {/* أي مسار آخر → تسجيل الدخول */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
