---
feature: merge-pos-quick-sale
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-07-18-merge-pos-quick-sale.md
branch: main
commits: pending
---

# Merge POS + Quick Sale — Final Report

## What Was Built

The separate "Quick Sale" (بيع سريع) page was merged into the main POS page (نقطة البيع) as a toggleable mode. Users can now switch between full POS mode (product grid with categories, pagination, list/grid view, discounts, returns, suspended orders, custom products, keyboard shortcuts) and quick mode (prominent barcode scan input, 24-item quick products grid for one-tap adding) via a single toggle button in the toolbar.

The duplicate sale completion logic (~60 lines) that existed in both pages was extracted into a shared `useSaleCompletion` hook, eliminating code duplication. The old QuickSalePage was deleted along with its route (`/pos/quick`) and sidebar/mobile-nav entries.

## Architecture

### Files Changed

| File | Change |
|------|--------|
| `src/features/pos/POSPage.tsx` | Added quick mode toggle, barcode scan input, quick products grid, integrated `useSaleCompletion` |
| `src/features/pos/hooks/useSaleCompletion.ts` | **New** — shared sale completion mutation (stock update, customer balance, cash session, print) |
| `src/App.tsx` | Removed QuickSalePage import and `/pos/quick` route |
| `src/components/layout/Sidebar.tsx` | Removed "بيع سريع" nav entry and Zap import |
| `src/components/layout/MobileNav.tsx` | Removed "سريع" nav entry and Zap import |
| `src/features/pos/quickSale/QuickSalePage.tsx` | **Deleted** |

### Data Flow

```
POSPage
  ├─ quickMode state (boolean toggle)
  ├─ scanInput state (barcode text input)
  ├─ useSaleCompletion(settings) → { completeSale, isPending }
  │   ├─ Creates sale record in Dexie
  │   ├─ Updates product stock
  │   ├─ Records stock movements
  │   ├─ Updates customer balance (credit sales)
  │   ├─ Updates cash session totals
  │   └─ Prints receipt (template engine + fallback)
  └─ useOpenCashSession() → { currentSession, isOpen, openSession }
```

### Design Decisions

- **Toggle instead of separate page:** Quick mode is a boolean toggle within POSPage rather than a separate route. This keeps all POS logic in one place and allows seamless switching without losing cart state.
- **Settings via hook parameter:** `useSaleCompletion` receives settings as a constructor parameter rather than using a static reference or reading from Dexie inside the mutation. This keeps the hook pure and testable.
- **Quick products grid shows 24 items:** Matches the original QuickSalePage behavior of showing recent active products with stock > 0.

## Usage

1. Navigate to `/pos` — full POS loads by default
2. Click "بيع سريع" button in the toolbar — switches to quick mode
3. In quick mode: scan barcode or tap a product from the quick grid → product added to cart
4. Click "بيع سريع ✓" again — switches back to full mode (cart preserved)
5. All existing features work in both modes: discounts (F1), returns, suspended orders (F2/F3), custom products (F8), keyboard shortcuts

## Verification

- TypeScript compilation: `npx tsc --noEmit` — clean (0 errors)
- Dev server: `npm run dev` — starts successfully on port 3001
- No remaining references to `QuickSalePage` or `/pos/quick` in functional code (only comments)
- QuickSalePage directory deleted

## Journey Log

- [lesson] POSPage had an `addNotification` bug — function called but never destructured from the store. Fixed as part of the merge.
- [lesson] Both pages had near-identical sale completion mutations (~60 lines each). Extracting to a shared hook was the cleanest deduplication approach.
- [pivot] Original plan had a "store settings on function" hack for print fallback. Simplified to passing settings as a hook parameter instead.
