import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ClassicPOSTopBar } from '../classic/ClassicPOSTopBar';
import { useDesign7Shortcuts } from '../design7/hooks/useDesign7Shortcuts';
import type { CartItem } from '@/types';

function pressKey(key: string, init?: KeyboardEventInit) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  });
}

describe('زر سجل المبيعات لا يفتح مودال الإرجاع', () => {
  it('ClassicPOSTopBar: زر السجل يستدعي onOpenSalesHistory ولا يمس onOpenReturns', () => {
    const onOpenSalesHistory = vi.fn();
    const onOpenReturns = vi.fn();
    render(
      <MemoryRouter>
        <ClassicPOSTopBar
          onNavigateBack={vi.fn()}
          onSettleSale={vi.fn()}
          isSalePending={false}
          cartLength={0}
          onClearCart={vi.fn()}
          onDeleteSelectedOrLast={vi.fn()}
          onSuspendSale={vi.fn()}
          onOpenSuspended={vi.fn()}
          suspendedCount={0}
          onSelectCustomer={vi.fn()}
          selectedCustomerName=""
          onOpenDiscount={vi.fn()}
          discountAmount={0}
          autoPrintReceipt={false}
          onToggleAutoPrint={vi.fn()}
          onOpenReturns={onOpenReturns}
          onOpenSalesHistory={onOpenSalesHistory}
          totalAmount={0}
          totalItemsCount={0}
          totalUnitsCount={0}
          formatMoney={() => '0'}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle('سجل المبيعات (Alt+S)'));
    expect(onOpenSalesHistory).toHaveBeenCalledTimes(1);
    expect(onOpenReturns).not.toHaveBeenCalled();
  });
});

describe('اختصار Alt+S يعمل في التخطيطات المتقدمة', () => {
  function Design7Probe(props: any) {
    useDesign7Shortcuts({
      onSettleSale: vi.fn(),
      onOpenSuspended: vi.fn(),
      onOpenDiscount: vi.fn(),
      onSelectCustomer: vi.fn(),
      onClearCart: vi.fn(),
      onOpenCustomize: vi.fn(),
      cart: [] as CartItem[],
      selectedCartRowId: null,
      setSelectedCartRowId: vi.fn(),
      onUpdateQty: vi.fn(),
      onRemoveFromCart: vi.fn(),
      ...props,
    });
    return null;
  }

  it('design7: Alt+S يفتح سجل المبيعات', () => {
    const onOpenSalesHistory = vi.fn();
    render(<Design7Probe onOpenSalesHistory={onOpenSalesHistory} />);
    pressKey('s', { altKey: true });
    expect(onOpenSalesHistory).toHaveBeenCalledTimes(1);
  });
});

describe('Escape يغلق المودالات قبل الخروج', () => {
  function Design7Probe(props: any) {
    useDesign7Shortcuts({
      onSettleSale: vi.fn(),
      onOpenSuspended: vi.fn(),
      onOpenDiscount: vi.fn(),
      onSelectCustomer: vi.fn(),
      onClearCart: vi.fn(),
      onOpenCustomize: vi.fn(),
      cart: [] as CartItem[],
      selectedCartRowId: null,
      setSelectedCartRowId: vi.fn(),
      onUpdateQty: vi.fn(),
      onRemoveFromCart: vi.fn(),
      ...props,
    });
    return null;
  }

  it('design7: مع مودال مفتوح يغلقه ولا يخرج', () => {
    const onCloseModals = vi.fn();
    const onNavigateBack = vi.fn();
    render(
      <Design7Probe
        isAnyModalOpen
        onCloseModals={onCloseModals}
        onNavigateBack={onNavigateBack}
      />
    );
    pressKey('Escape');
    expect(onCloseModals).toHaveBeenCalledTimes(1);
    expect(onNavigateBack).not.toHaveBeenCalled();
  });

  it('design7: بدون مودال يخرج', () => {
    const onNavigateBack = vi.fn();
    render(<Design7Probe onNavigateBack={onNavigateBack} />);
    pressKey('Escape');
    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });
});


describe('QuickPOSHeader: أزرار الخروج والتخصيص', () => {
  it('QuickPOSHeader: زر الخروج يعمل وزر التخصيص محذوف من الواجهة', async () => {
    const { QuickPOSHeader } = await import('../../quick/components/QuickPOSHeader');
    const onNavigateHome = vi.fn();
    const onOpenCustomize = vi.fn();

    render(
      <MemoryRouter>
        <QuickPOSHeader
          shopName="AN POS"
          cartCount={0}
          totalAmount={0}
          baseCurrency="دج"
          soundEnabled={true}
          onToggleSound={vi.fn()}
          autoPrintReceipt={false}
          onToggleAutoPrint={vi.fn()}
          onNavigateHome={onNavigateHome}
          onNavigateAdvancedPOS={vi.fn()}
          onOpenSidebar={vi.fn()}
          onOpenCustomize={onOpenCustomize}
          theme="light"
          onToggleTheme={vi.fn()}
        />
      </MemoryRouter>
    );

    const exitBtn = screen.getByTitle('الخروج إلى لوحة التحكم الرئيسية (Esc)');
    expect(exitBtn).toBeInTheDocument();
    fireEvent.click(exitBtn);
    expect(onNavigateHome).toHaveBeenCalledTimes(1);

    expect(screen.queryByTitle('تخصيص الواجهة ودقة الشاشة')).not.toBeInTheDocument();
    expect(screen.queryByText('تخصيص')).not.toBeInTheDocument();
  });
});

