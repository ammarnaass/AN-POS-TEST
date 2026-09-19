import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ClassicPOSTopBar } from '../classic/ClassicPOSTopBar';
import { useDesign6Shortcuts } from '../advanced-terminal/hooks/useDesign6Shortcuts';
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
  function Design6Probe(props: any) {
    useDesign6Shortcuts({ ...props });
    return null;
  }

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

  it('advanced: Alt+S يفتح سجل المبيعات', () => {
    const onOpenSalesHistory = vi.fn();
    render(<Design6Probe onOpenSalesHistory={onOpenSalesHistory} />);
    pressKey('s', { altKey: true });
    expect(onOpenSalesHistory).toHaveBeenCalledTimes(1);
  });

  it('design7: Alt+S يفتح سجل المبيعات', () => {
    const onOpenSalesHistory = vi.fn();
    render(<Design7Probe onOpenSalesHistory={onOpenSalesHistory} />);
    pressKey('s', { altKey: true });
    expect(onOpenSalesHistory).toHaveBeenCalledTimes(1);
  });
});

describe('Escape يغلق المودالات قبل الخروج', () => {
  function Design6Probe(props: any) {
    useDesign6Shortcuts({ ...props });
    return null;
  }

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

  it('advanced: مع مودال مفتوح يغلقه ولا يخرج', () => {
    const onCloseModals = vi.fn();
    const onNavigateBack = vi.fn();
    render(
      <Design6Probe
        isAnyModalOpen
        onCloseModals={onCloseModals}
        onNavigateBack={onNavigateBack}
      />
    );
    pressKey('Escape');
    expect(onCloseModals).toHaveBeenCalledTimes(1);
    expect(onNavigateBack).not.toHaveBeenCalled();
  });

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

describe('TerminalPOSTopBar: أزرار الخروج وسجل المبيعات', () => {
  it('TerminalPOSTopBar: زر الخروج وزر سجل المبيعات يعملان بالنقر المباشر', async () => {
    const { TerminalPOSTopBar } = await import('../terminal/TerminalPOSTopBar');
    const onNavigateBack = vi.fn();
    const onOpenSalesHistory = vi.fn();

    render(
      <MemoryRouter>
        <TerminalPOSTopBar
          onNavigateBack={onNavigateBack}
          onOpenSalesHistory={onOpenSalesHistory}
          onSettleSale={vi.fn()}
          cart={[]}
          isSalePending={false}
          onClearCart={vi.fn()}
          selectedCartRowId={null}
          setSelectedCartRowId={vi.fn()}
          onRemoveFromCart={vi.fn()}
          onOpenReturns={vi.fn()}
          returnMode={false}
          onSuspendSale={vi.fn()}
          onOpenSuspended={vi.fn()}
          suspendedCount={0}
          onSelectCustomer={vi.fn()}
          selectedCustomerName=""
          onOpenCustomize={vi.fn()}
          isPriceCheckerMode={false}
          onTogglePriceChecker={vi.fn()}
          onOpenFreeProduct={vi.fn()}
          onOpenDiscount={vi.fn()}
          theme="light"
          toggleTheme={vi.fn()}
          isFullscreen={false}
          onToggleFullscreen={vi.fn()}
        />
      </MemoryRouter>
    );

    const exitBtn = screen.getByTitle('الخروج إلى لوحة التحكم الرئيسية (Esc)');
    fireEvent.click(exitBtn);
    expect(onNavigateBack).toHaveBeenCalledTimes(1);

    const salesBtn = screen.getByTitle('سجل المبيعات والفواتير (Alt+S)');
    fireEvent.click(salesBtn);
    expect(onOpenSalesHistory).toHaveBeenCalledTimes(1);
  });
});

describe('Design6TopActionsBar: أزرار الخروج وسجل المبيعات', () => {
  it('Design6TopActionsBar: زر الخروج وزر سجل المبيعات يعملان بالنقر المباشر', async () => {
    const { Design6TopActionsBar } = await import('../advanced-terminal/components/Design6TopActionsBar');
    const onNavigateBack = vi.fn();
    const onOpenSalesHistory = vi.fn();

    render(
      <MemoryRouter>
        <Design6TopActionsBar
          onNavigateBack={onNavigateBack}
          onOpenSalesHistory={onOpenSalesHistory}
          onOpenReturns={vi.fn()}
          onSettleSale={vi.fn()}
          onQuickSettle={vi.fn()}
          cartLength={0}
          onFocusQuantity={vi.fn()}
          onFocusPrice={vi.fn()}
          onOpenMiscProduct={vi.fn()}
          onOpenDiscount={vi.fn()}
          discountAmount={0}
          formatMoney={() => '0'}
          storeName="Store"
          isSessionOpen={true}
          isFullscreen={false}
          theme="light"
          toggleTheme={vi.fn()}
        />
      </MemoryRouter>
    );

    const exitBtn = screen.getByTitle('الخروج إلى لوحة التحكم الرئيسية (Esc)');
    fireEvent.click(exitBtn);
    expect(onNavigateBack).toHaveBeenCalledTimes(1);

    const salesBtn = screen.getByTitle(/سجل المبيعات/);
    fireEvent.click(salesBtn);
    expect(onOpenSalesHistory).toHaveBeenCalledTimes(1);
  });
});

describe('Design7TopRibbon: أزرار الخروج وسجل المبيعات', () => {
  it('Design7TopRibbon: زر الخروج وزر سجل المبيعات يعملان بالنقر المباشر', async () => {
    const { Design7TopRibbon } = await import('../design7/components/Design7TopRibbon');
    const onNavigateBack = vi.fn();
    const onOpenSalesHistory = vi.fn();

    render(
      <MemoryRouter>
        <Design7TopRibbon
          onNavigateBack={onNavigateBack}
          onOpenSalesHistory={onOpenSalesHistory}
          onOpenReturns={vi.fn()}
          onSaveAsOrder={vi.fn()}
          onOpenSuspended={vi.fn()}
          suspendedCount={0}
          autoPrintReceipt={false}
          onToggleAutoPrint={vi.fn()}
          onSettleSale={vi.fn()}
          onOpenDiscount={vi.fn()}
          onOpenCustomize={vi.fn()}
          onNewOrder={vi.fn()}
          onClearCart={vi.fn()}
        />
      </MemoryRouter>
    );

    const exitBtn = screen.getByTitle('الخروج إلى لوحة التحكم الرئيسية (Esc)');
    fireEvent.click(exitBtn);
    expect(onNavigateBack).toHaveBeenCalledTimes(1);

    const salesBtn = screen.getByTitle('سجل الفواتير والمبيعات (Alt+S)');
    fireEvent.click(salesBtn);
    expect(onOpenSalesHistory).toHaveBeenCalledTimes(1);
  });
});

describe('TerminalPOSTopBar: أزرار الخروج والتخصيص', () => {
  it('TerminalPOSTopBar: زر الخروج وزر التخصيص يعملان بالنقر المباشر', async () => {
    const { TerminalPOSTopBar } = await import('../terminal/TerminalPOSTopBar');
    const onNavigateBack = vi.fn();
    const onOpenCustomize = vi.fn();

    render(
      <MemoryRouter>
        <TerminalPOSTopBar
          onNavigateBack={onNavigateBack}
          onOpenCustomize={onOpenCustomize}
          onSettleSale={vi.fn()}
          cart={[]}
          isSalePending={false}
          onClearCart={vi.fn()}
          selectedCartRowId={null}
          setSelectedCartRowId={vi.fn()}
          onRemoveFromCart={vi.fn()}
          onOpenReturns={vi.fn()}
          returnMode={false}
          onSuspendSale={vi.fn()}
          onOpenSuspended={vi.fn()}
          suspendedCount={0}
          onSelectCustomer={vi.fn()}
          selectedCustomerName=""
          isPriceCheckerMode={false}
          onTogglePriceChecker={vi.fn()}
          onOpenFreeProduct={vi.fn()}
          onOpenDiscount={vi.fn()}
          theme="light"
          toggleTheme={vi.fn()}
          isFullscreen={false}
          onToggleFullscreen={vi.fn()}
        />
      </MemoryRouter>
    );

    const exitBtn = screen.getByTitle('الخروج إلى لوحة التحكم الرئيسية (Esc)');
    fireEvent.click(exitBtn);
    expect(onNavigateBack).toHaveBeenCalledTimes(1);

    const customizeBtn = screen.getByTitle('تخصيص الواجهة ودقة الشاشة (F10)');
    expect(customizeBtn).toBeInTheDocument();
    fireEvent.click(customizeBtn);
    expect(onOpenCustomize).toHaveBeenCalledTimes(1);
  });
});

describe('QuickPOSHeader: أزرار الخروج والتخصيص', () => {
  it('QuickPOSHeader: زر الخروج وزر التخصيص يستدعيان الـ callbacks المقابلة', async () => {
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

    const customizeBtn = screen.getByTitle('تخصيص الواجهة ودقة الشاشة');
    expect(customizeBtn).toBeInTheDocument();
    fireEvent.click(customizeBtn);
    expect(onOpenCustomize).toHaveBeenCalledTimes(1);
  });
});

