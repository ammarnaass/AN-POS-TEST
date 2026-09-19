import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DefaultGridPOSLayout } from '../DefaultGridPOSLayout';
import type { CartItem } from '@/types';

const baseProps = {
  paginatedProducts: [],
  showProductImages: false,
  posSettings: {
    quickSale: false,
    accountingOnly: false,
    allowNegativeStock: false,
    confirmNoStock: true,
    averagePricing: false,
    allowCardPayment: true,
    allowTransferPayment: true,
  },
  onAddProduct: vi.fn(),
  viewMode: 'grid' as const,
  onOpenAddProduct: vi.fn(),
  currentPage: 1,
  totalPages: 1,
  setCurrentPage: vi.fn(),
  posLayout: 'bottom' as const,
  cart: [] as CartItem[],
  saleSummary: { subtotal: 0, discountAmount: 0, total: 0 },
  isSessionOpen: true,
  isSalePending: false,
  suspendedCount: 0,
  autoPrintReceipt: false,
  onSettleSale: vi.fn(),
  onSuspendSale: vi.fn(),
  onOpenSuspended: vi.fn(),
  onClearCart: vi.fn(),
  onOpenReturns: vi.fn(),
  onToggleAutoPrint: vi.fn(),
  onOpenDiscount: vi.fn(),
  onSaveAsProforma: vi.fn(),
  onSaveAsOrder: vi.fn(),
  mobileTab: 'products' as const,
  setMobileTab: vi.fn(),
  selectedCustomer: '',
  setSelectedCustomer: vi.fn(),
  customers: [],
  onOpenCustomerSelect: vi.fn(),
  onOpenAddCustomer: vi.fn(),
  isWholesaleActive: false,
  selectedItemId: null,
  setSelectedItemId: vi.fn(),
  onUpdateQty: vi.fn(),
  editingPriceFor: null,
  setEditingPriceFor: vi.fn(),
  priceInput: '',
  setPriceInput: vi.fn(),
  onUpdatePrice: vi.fn(),
  onRemoveItem: vi.fn(),
  formatNumber: (v: number | null | undefined) => `${v ?? 0}`,
  formatMoney: (v: number | null | undefined) => `${v ?? 0}`,
};

describe('DefaultGridPOSLayout (شريط الخروج والتخصيص والسجل)', () => {
  it('يرسم أزرار خروج وتخصيص وسجل مبيعات ويستدعي الـ props عند الضغط', () => {
    const onNavigateBack = vi.fn();
    const onOpenSalesHistory = vi.fn();
    const onOpenCustomize = vi.fn();
    render(
      <MemoryRouter>
        <DefaultGridPOSLayout
          {...baseProps}
          standalone={true}
          onNavigateBack={onNavigateBack}
          onOpenSalesHistory={onOpenSalesHistory}
          onOpenCustomize={onOpenCustomize}
        />
      </MemoryRouter>
    );

    const exitBtn = screen.getByTitle('الخروج إلى لوحة التحكم الرئيسية (Esc)');
    const historyBtn = screen.getByTitle('سجل المبيعات (Alt+S)');
    const customizeBtn = screen.getByTitle('تخصيص الواجهة');
    expect(exitBtn).toBeInTheDocument();
    expect(historyBtn).toBeInTheDocument();
    expect(customizeBtn).toBeInTheDocument();

    fireEvent.click(exitBtn);
    expect(onNavigateBack).toHaveBeenCalledTimes(1);
    fireEvent.click(historyBtn);
    expect(onOpenSalesHistory).toHaveBeenCalledTimes(1);
    fireEvent.click(customizeBtn);
    expect(onOpenCustomize).toHaveBeenCalledTimes(1);
  });

  it('لا يرسم الشريط عند غياب الـ props', () => {
    render(
      <MemoryRouter>
        <DefaultGridPOSLayout {...baseProps} standalone={true} />
      </MemoryRouter>
    );
    expect(
      screen.queryByTitle('الخروج إلى لوحة التحكم الرئيسية (Esc)')
    ).not.toBeInTheDocument();
    expect(screen.queryByTitle('سجل المبيعات (Alt+S)')).not.toBeInTheDocument();
    expect(screen.queryByTitle('تخصيص الواجهة')).not.toBeInTheDocument();
  });
});
