# Merge POS + Quick Sale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the separate "Quick Sale" (بيع سريع) page into the main POS page (نقطة البيع) as a toggleable mode, eliminating code duplication and providing a single unified point-of-sale experience.

**Architecture:** Enhance POSPage with a "quick mode" toggle that shows a prominent barcode scan input and quick-products grid (from QuickSalePage). Extract shared sale completion logic into a reusable hook. Remove QuickSalePage entirely.

**Tech Stack:** React 19, TypeScript, Zustand, TanStack Query, Dexie.js, Tailwind CSS 4, Lucide icons, uuid

## Global Constraints

- All text is Arabic RTL
- Must maintain all existing POS features (discounts, returns, suspended orders, custom products, keyboard shortcuts)
- Must maintain all existing Quick Sale features (barcode scan input, quick products grid, auto-focus)
- Use Material Design 3 theme tokens (surface-container, on-surface, primary, etc.)
- The `useOpenCashSession` hook already exists and should be reused (currently only QuickSalePage uses it; POSPage has its own duplicate logic)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/features/pos/hooks/useSaleCompletion.ts` | Shared sale completion mutation (extracted from both pages) |
| Modify | `src/features/pos/POSPage.tsx` | Add quick-mode toggle, barcode scan input, quick products grid |
| Modify | `src/App.tsx` | Remove QuickSalePage route |
| Modify | `src/components/layout/Sidebar.tsx` | Remove "بيع سريع" sidebar entry |
| Delete | `src/features/pos/quickSale/QuickSalePage.tsx` | No longer needed |
| Modify | `src/features/pos/POSPage.tsx:155-172` | Fix `addNotification` bug (not in scope) |

---

### Task 1: Fix `addNotification` Bug in POSPage

**Covers:** Bug fix — `addNotification` is called at line 166 but never destructured from any store.

**Files:**
- Modify: `src/features/pos/POSPage.tsx:155-172`

**Interfaces:**
- Consumes: `useNotificationStore` (already imported at line 10)
- Produces: Fix for the missing `addNotification` reference

- [ ] **Step 1: Add the missing destructuring**

At line 36 (after the existing `useNotificationStore` line), the notifications are already destructured. But `addNotification` is not. Add it:

```tsx
// Current (line 35-36):
const notifications = useNotificationStore((s) => s.notifications);
const unreadCount = notifications.filter((n) => !n.read).length;

// Change to:
const notifications = useNotificationStore((s) => s.notifications);
const addNotification = useNotificationStore((s) => s.addNotification);
const unreadCount = notifications.filter((n) => !n.read).length;
```

- [ ] **Step 2: Verify the fix**

Run: `npx tsc --noEmit` from the project root.
Expected: No errors related to `addNotification`.

- [ ] **Step 3: Commit**

```bash
git add src/features/pos/POSPage.tsx
git commit -m "fix: add missing addNotification import in POSPage"
```

---

### Task 2: Extract Shared Sale Completion Hook

**Colves:** Code duplication — both POSPage and QuickSalePage have near-identical `completeSaleMutation` logic (~60 lines each).

**Files:**
- Create: `src/features/pos/hooks/useSaleCompletion.ts`

**Interfaces:**
- Consumes: `db` (Dexie), `SaleRepository`, `useCartStore`, `useAuthStore`, `useNotificationStore`, `calculateSaleTotal`, `createSale`, `generateReceiptHTML`, `printDocument`, `v4 as createId`
- Produces: `useSaleCompletion()` hook returning `{ completeSale, isPending }`

- [ ] **Step 1: Create the hook file**

```typescript
// src/features/pos/hooks/useSaleCompletion.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { SaleRepository } from '@/infrastructure/database/repositories/SaleRepository';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { calculateSaleTotal, createSale, generateReceiptHTML } from '@/services';
import { printDocument } from '@/services/print/printService';
import type { CartItem, Sale } from '@/types';
import { v4 as createId } from 'uuid';

interface SaleCompletionParams {
  cart: CartItem[];
  discount: number;
  discountType: 'percent' | 'amount';
  selectedCustomer: string;
  paymentMethod: 'cash' | 'credit';
  isReturn?: boolean;
  currentSession: { id: string; totalSales?: number; totalReturns?: number } | null;
  settings: {
    tvaRate: number;
    invoicePrefix: string;
    baseCurrency: string;
    shopName: string;
    phone: string;
    receiptFooter: string;
  };
  products: any[];
  packs: any[];
  customers: any[];
}

export function useSaleCompletion() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { clear: clearCart } = useCartStore();

  const completeSaleMutation = useMutation({
    mutationFn: async (params: SaleCompletionParams) => {
      const {
        cart, discount, discountType, selectedCustomer, paymentMethod,
        isReturn = false, currentSession, settings, products, packs, customers,
      } = params;

      const saleSummary = calculateSaleTotal(cart, discount, discountType, settings.tvaRate);
      const saleType = isReturn ? 'return' : 'sale';
      const nextNumber = await SaleRepository.getNextNumber(settings.invoicePrefix);

      const sale = {
        ...createSale(
          cart, saleSummary.subtotal, discount, discountType,
          saleSummary.tvaAmount, saleSummary.total,
          paymentMethod, selectedCustomer,
          paymentMethod === 'cash' ? saleSummary.total : 0,
          currentUser?.name || '', currentSession?.id || '',
          {
            tvaRate: settings.tvaRate,
            invoicePrefix: settings.invoicePrefix,
            baseCurrency: settings.baseCurrency,
            shopName: settings.shopName,
            phone: settings.phone,
            receiptFooter: settings.receiptFooter,
          },
          saleType, 'facture'
        ),
        number: nextNumber,
      };

      await db.transaction('rw', [db.sales, db.products, db.customers, db.cash_sessions, db.stock_movements], async () => {
        await db.sales.add(sale);

        for (const item of cart) {
          if (item.isPack && item.packId) {
            const pack = packs.find((p) => p.id === item.packId);
            if (pack) {
              for (const comp of pack.items) {
                const product = products.find((p) => p.id === comp.productId);
                if (product) {
                  const qtyChange = saleType === 'return'
                    ? Math.abs(comp.qty * item.qty)
                    : -(comp.qty * item.qty);
                  await db.products.update(product.id, { quantity: Math.max(0, product.quantity + qtyChange) });
                  await db.stock_movements.add({
                    id: createId(), productId: product.id,
                    type: saleType === 'return' ? 'return' : 'sale',
                    qty: qtyChange, date: new Date().toISOString(), reference: sale.number,
                    createdBy: currentUser?.name || '',
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                  });
                }
              }
            }
          } else {
            const product = products.find((p) => p.id === item.productId);
            if (product && !item.isCustom) {
              const qtyChange = saleType === 'return' ? Math.abs(item.qty) : -item.qty;
              await db.products.update(product.id, { quantity: Math.max(0, product.quantity + qtyChange) });
              await db.stock_movements.add({
                id: createId(), productId: product.id,
                type: saleType === 'return' ? 'return' : 'sale',
                qty: qtyChange, date: new Date().toISOString(), reference: sale.number,
                createdBy: currentUser?.name || '',
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
              });
            }
          }
        }

        if (selectedCustomer && paymentMethod === 'credit') {
          const customer = customers.find((c) => c.id === selectedCustomer);
          if (customer) {
            const balanceChange = isReturn ? -saleSummary.total : saleSummary.total;
            await db.customers.update(selectedCustomer, { balance: customer.balance + balanceChange });
          }
        }

        if (currentSession) {
          const updateData = isReturn
            ? { totalReturns: (currentSession.totalReturns || 0) + saleSummary.total }
            : { totalSales: (currentSession.totalSales || 0) + saleSummary.total };
          await db.cash_sessions.update(currentSession.id, updateData);
        }
      });

      return sale as Sale;
    },
    onSuccess: (sale: Sale) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });

      if (sale) {
        const printDocType = sale.type === 'return' ? 'return-invoice' : 'thermal-receipt';
        printDocument(sale.id, printDocType, {
          userId: currentUser?.id ?? '',
          userName: currentUser?.name ?? '',
          copies: 1,
        }).then((res) => {
          if (!res.success) {
            const settings = useSaleCompletion._lastSettings;
            if (settings) {
              const html = generateReceiptHTML(sale, settings);
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`<html><head><title>إيصال - ${sale.number}</title><style>@media print { body { margin: 0; } }</style></head><body>${html}</body></html>`);
                printWindow.document.close();
                printWindow.print();
              }
            }
          }
        });
      }

      clearCart();
    },
    onError: (error: any) => {
      addNotification({
        title: 'خطأ في إتمام البيع',
        message: error?.message || 'حدث خطأ غير متوقع',
        type: 'error',
      });
    },
  });

  return {
    completeSale: completeSaleMutation.mutate,
    isPending: completeSaleMutation.isPending,
  };
}

// Store last settings for print fallback
useSaleCompletion._lastSettings = null as any;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/pos/hooks/useSaleCompletion.ts
git commit -m "feat: extract shared useSaleCompletion hook from POS + QuickSale"
```

---

### Task 3: Add Quick Mode Toggle + Barcode Scan Input + Quick Products Grid to POSPage

**Covers:** Merge QuickSalePage features into POSPage — prominent barcode scan input, quick products grid, toggle between "full" and "quick" modes.

**Files:**
- Modify: `src/features/pos/POSPage.tsx` (major changes)

**Interfaces:**
- Consumes: `useSaleCompletion` (Task 2), `useOpenCashSession` (existing hook)
- Produces: Unified POS page with quick mode

- [ ] **Step 1: Add quick mode state and useSaleCompletion import**

At the top of POSPage, add the import and state:

```tsx
import { useSaleCompletion } from './hooks/useSaleCompletion';
import { useOpenCashSession } from '@/features/cash/useOpenCashSession';
import { ScanLine } from 'lucide-react'; // add to existing import
```

Inside the component, add state:

```tsx
const [quickMode, setQuickMode] = useState(false);
const [scanInput, setScanInput] = useState('');
const scanInputRef = useRef<HTMLInputElement>(null);
const { completeSale, isPending: isSalePending } = useSaleCompletion();
const { currentSession: hookSession, isOpen: isHookSessionOpen, openSession } = useOpenCashSession();
```

- [ ] **Step 2: Replace the sale mutation with useSaleCompletion**

Remove the entire `completeSaleMutation` (lines 242-353) and the `handleCompleteSale` and `handleCompleteReturn` functions. Replace with:

```tsx
const handleCompleteSale = (paymentMethod: 'cash' | 'credit') => {
  if (cart.length === 0) return;
  if (!isSessionOpen) { setShowSessionWarning(true); return; }
  completeSale({
    cart, discount, discountType, selectedCustomer, paymentMethod,
    isReturn: false, currentSession, settings: settingsOrDefault,
    products: products as any[], packs: packs as any[], customers: customers as any[],
  });
  setSelectedCustomer('');
  setDiscount(0);
  setShowPaymentModal(false);
  setReturnMode(false);
};

const handleCompleteReturn = (paymentMethod: 'cash' | 'credit') => {
  if (cart.length === 0) return;
  if (!isSessionOpen) { setShowSessionWarning(true); return; }
  completeSale({
    cart, discount, discountType, selectedCustomer, paymentMethod,
    isReturn: true, currentSession, settings: settingsOrDefault,
    products: products as any[], packs: packs as any[], customers: customers as any[],
  });
  setSelectedCustomer('');
  setDiscount(0);
  setShowPaymentModal(false);
  setReturnMode(false);
};
```

- [ ] **Step 3: Add quick mode toggle button to the header toolbar**

In the header section (around line 806-811), replace the "بيع سريع" navigation button with a toggle:

```tsx
// Replace the old navigate('/pos/quick') button:
<button
  onClick={() => {
    setQuickMode(!quickMode);
    if (!quickMode) setTimeout(() => scanInputRef.current?.focus(), 100);
  }}
  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-label-md transition-all shadow-sm ${
    quickMode
      ? 'bg-tertiary text-on-tertiary'
      : 'bg-tertiary/10 text-tertiary border border-tertiary/20 hover:bg-tertiary/20'
  }`}
>
  <Zap className="w-4 h-4" /> {quickMode ? 'بيع سريع ✓' : 'بيع سريع'}
</button>
```

- [ ] **Step 4: Add barcode scan input bar (visible in quick mode)**

After the secondary toolbar (line 833), add:

```tsx
{/* Quick Mode: Barcode Scan Input */}
{quickMode && (
  <div className="px-5 py-4 bg-surface-container-low border-b border-outline-variant/10">
    <form onSubmit={(e) => {
      e.preventDefault();
      const code = scanInput.trim();
      if (!code) return;
      // Reuse the same scan handler as external barcode
      handleExternalScan(code);
      setScanInput('');
    }}>
      <div className="relative">
        <ScanLine className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
        <input
          ref={scanInputRef}
          type="text"
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          placeholder="امسح أو اكتب الباركود ثم اضغط Enter..."
          className="w-full h-16 pr-14 pl-4 bg-surface-container-lowest border-2 border-primary/30 rounded-2xl text-body-lg text-right focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder-on-surface-variant/60 font-mono"
          autoComplete="off"
          spellCheck={false}
        />
        {scanInput && (
          <button type="button" onClick={() => setScanInput('')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <p className="text-body-xs text-on-surface-variant/70 mt-2 text-right flex items-center gap-1.5">
        <ScanLine className="w-3 h-3" />
        جاهز لاستقبال ماسحات USB/Bluetooth تلقائياً
      </p>
    </form>
  </div>
)}
```

- [ ] **Step 5: Add quick products grid (visible in quick mode, replaces full product grid)**

In the product grid section, wrap the existing grid with a quick mode alternative:

```tsx
{/* Product Area */}
<div className="flex-1 overflow-y-auto px-5 pb-5 custom-scrollbar">
  {quickMode ? (
    /* Quick Products Grid */
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {(() => {
        const recentProducts = products
          .filter((p: any) => p.status === 'active' && p.quantity > 0)
          .slice(0, 24);
        return recentProducts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <Package className="w-14 h-14 mb-4 opacity-20" />
            <p className="font-body-md">لا توجد منتجات</p>
          </div>
        ) : (
          recentProducts.map((p: any) => (
            <button key={p.id} onClick={() => handleAddProduct(p)}
              className="aspect-square flex flex-col items-center justify-center p-2 bg-surface-container-low rounded-lg border border-outline-variant/10 hover:border-primary/30 hover:bg-primary-container/5 transition-all text-center">
              <Package className="w-6 h-6 text-primary/40 mb-1" />
              <p className="text-[11px] text-on-surface truncate w-full">{p.name}</p>
              <p className="text-label-sm font-bold text-primary">{p.retailPrice?.toFixed(2)}</p>
            </button>
          ))
        );
      })()}
    </div>
  ) : (
    /* Original Full Product Grid (existing code unchanged) */
    <>
      {viewMode === 'grid' ? (
        // ... existing grid code ...
      ) : (
        // ... existing list code ...
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        // ... existing pagination ...
      )}
      {/* Footer Bar */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/10 text-body-sm text-on-surface-variant">
        <span>{filteredProducts.length} منتج</span>
        <span>صفحة {currentPage} من {totalPages || 1}</span>
      </div>
    </>
  )}
</div>
```

- [ ] **Step 6: Verify the page renders in both modes**

Run: `npx tsc --noEmit`
Expected: No errors. Then visually verify by running `npm run dev` and navigating to `/pos` — the toggle button should switch between full POS and quick mode.

- [ ] **Step 7: Commit**

```bash
git add src/features/pos/POSPage.tsx
git commit -m "feat: merge QuickSale mode into POS with toggle, scan input, and quick products grid"
```

---

### Task 4: Remove QuickSalePage Route and Sidebar Entry

**Colves:** Cleanup — remove dead code and navigation references.

**Files:**
- Modify: `src/App.tsx` — remove QuickSalePage import and route
- Modify: `src/components/layout/Sidebar.tsx` — remove "بيع سريع" nav entry
- Delete: `src/features/pos/quickSale/QuickSalePage.tsx`

**Interfaces:**
- Consumes: Nothing (cleanup task)
- Produces: Clean routing without dead QuickSalePage

- [ ] **Step 1: Remove route from App.tsx**

Remove the lazy import (line 11):
```tsx
// Remove this line:
const QuickSalePage = lazy(() => import('@/features/pos/quickSale/QuickSalePage'));
```

Remove the route (line 81):
```tsx
// Remove this line:
<Route path="pos/quick" element={<QuickSalePage />} />
```

- [ ] **Step 2: Remove sidebar entry from Sidebar.tsx**

Remove from `mainMenuItems` (line 16):
```tsx
// Remove this line:
{ path: '/pos/quick', label: 'بيع سريع', icon: Zap },
```

Remove the `Zap` import from line 9:
```tsx
// Remove Zap from the import:
import { X, Store, LayoutDashboard, ShoppingCart, Receipt, Package, Users, Truck, Settings, LogOut, DollarSign, HelpCircle, Tag, Wallet, Barcode } from 'lucide-react';
```

- [ ] **Step 3: Delete QuickSalePage.tsx**

```bash
rm src/features/pos/quickSale/QuickSalePage.tsx
# Also remove the directory if empty:
rmdir src/features/pos/quickSale
```

- [ ] **Step 4: Verify no remaining references**

Run: `grep -r "QuickSalePage\|quickSale\|pos/quick" src/ --include="*.tsx" --include="*.ts"`
Expected: No results (only POSPage.tsx internal references if any).

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove QuickSalePage, merge its features into unified POS"
```

---

### Task 5: Store Settings for Print Fallback

**Colves:** The extracted `useSaleCompletion` hook needs access to settings for the print fallback. The current approach stores them on the function, which is fragile.

**Files:**
- Modify: `src/features/pos/hooks/useSaleCompletion.ts`

- [ ] **Step 1: Refactor print fallback to accept settings in onSuccess callback**

Replace the `onSuccess` in `useSaleCompletion.ts` to accept settings via a closure. Update the hook signature:

```typescript
// In useSaleCompletion.ts, change the hook to accept settings:
export function useSaleCompletion(settings: {
  tvaRate: number; invoicePrefix: string; baseCurrency: string;
  shopName: string; phone: string; receiptFooter: string;
}) {
  // ... inside onSuccess:
  onSuccess: (sale: Sale) => {
    // ... same invalidation ...

    if (sale) {
      const printDocType = sale.type === 'return' ? 'return-invoice' : 'thermal-receipt';
      printDocument(sale.id, printDocType, {
        userId: currentUser?.id ?? '',
        userName: currentUser?.name ?? '',
        copies: 1,
      }).then((res) => {
        if (!res.success) {
          const html = generateReceiptHTML(sale, settings);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`<html><head><title>إيصال - ${sale.number}</title><style>@media print { body { margin: 0; } }</style></head><body>${html}</body></html>`);
            printWindow.document.close();
            printWindow.print();
          }
        }
      });
    }

    clearCart();
  },
```

Then in POSPage.tsx, update the usage:

```tsx
const { completeSale, isPending: isSalePending } = useSaleCompletion(settingsOrDefault);
```

- [ ] **Step 2: Remove the static _lastSettings hack**

Delete the line `useSaleCompletion._lastSettings = null as any;` from the hook file.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/features/pos/hooks/useSaleCompletion.ts src/features/pos/POSPage.tsx
git commit -m "refactor: pass settings to useSaleCompletion instead of static hack"
```

---

## Verification Checklist

After all tasks are complete:

1. `npx tsc --noEmit` — no TypeScript errors
2. `npm run dev` — app starts without errors
3. Navigate to `/pos` — full POS page loads with all features
4. Click "بيع سريع" toggle — switches to quick mode with barcode input and quick products grid
5. Click toggle again — switches back to full mode with product grid, category filters, pagination
6. Scan a barcode in quick mode — product added to cart
7. Add product from quick products grid — product added to cart
8. Complete a sale in both modes — receipt prints, stock updates
9. All existing features work: discounts, returns, suspended orders, custom products, keyboard shortcuts (F1-F8)
10. Sidebar no longer shows "بيع سريع" as a separate entry
11. `/pos/quick` route redirects to `/pos`
