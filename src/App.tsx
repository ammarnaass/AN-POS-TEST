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
        <div style={{ padding: 20, direction: 'rtl', fontFamily: 'monospace', background: '#fff', minHeight: '100vh' }}>
          <h1 style={{ color: 'red' }}>خطأ في الصفحة</h1>
          <pre style={{ background: '#f5f5f5', padding: 10, whiteSpace: 'pre-wrap' }}>{this.state.error?.message}</pre>
          <button onClick={() => { localStorage.clear(); window.location.reload() }} style={{ marginTop: 20, padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            مسح البيانات وإعادة المحاولة
          </button>
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
