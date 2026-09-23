import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { usePOSSessionStore } from '@/features/pos/store/usePOSSessionStore';
import { usePOSReturnButton } from '../hooks/usePOSReturnButton';
import { POSReturnButton } from '../components/POSReturnButton';
import type { CartItem } from '@/types';

describe('usePOSReturnButton — وحدة إدارة زر الإرجاع الموحد', () => {
  beforeEach(() => {
    // Reset Zustand store to clean state
    act(() => {
      usePOSSessionStore.setState({
        returnMode: false,
        returnContext: null,
        cart: [],
      });
    });
  });

  it('يعيد الحالة الافتراضية بدقة عندما يكون وضع الإرجاع غير مفعّل', () => {
    const onOpenReturnsModal = vi.fn();
    const { result } = renderHook(() => usePOSReturnButton({ onOpenReturnsModal }));

    expect(result.current.isReturnActive).toBe(false);
    expect(result.current.returnItemsCount).toBe(0);
    expect(result.current.returnLinesCount).toBe(0);
    expect(result.current.originalInvoiceNumber).toBeUndefined();
  });

  it('handlePrimaryClick يستدعي onOpenReturnsModal عند نقر الزر في الوضع العادي', () => {
    const onOpenReturnsModal = vi.fn();
    const { result } = renderHook(() => usePOSReturnButton({ onOpenReturnsModal }));

    act(() => {
      result.current.handlePrimaryClick();
    });

    expect(onOpenReturnsModal).toHaveBeenCalledTimes(1);
  });

  it('يحسب عدد القطع والبنود المرجعة ورقم الفاتورة الأصلية عند تفعيل وضع الإرجاع', () => {
    const mockCart: CartItem[] = [
      {
        productId: 'prod-1',
        productName: 'حليب كامل الدسم',
        unitPrice: 120,
        qty: 3,
        itemDiscount: 0,
        barcode: '111111',
      },
      {
        productId: 'prod-2',
        productName: 'جبنة مثلثات',
        unitPrice: 200,
        qty: 2,
        itemDiscount: 0,
        barcode: '222222',
      },
    ];

    act(() => {
      usePOSSessionStore.setState({
        returnMode: true,
        returnContext: {
          originalSaleId: 'sale-999',
          originalInvoiceNumber: 'INV-2026-0042',
          items: [],
          returnType: 'invoice_based',
        },
        cart: mockCart,
      });
    });

    const { result } = renderHook(() => usePOSReturnButton());

    expect(result.current.isReturnActive).toBe(true);
    expect(result.current.returnLinesCount).toBe(2);
    expect(result.current.returnItemsCount).toBe(5);
    expect(result.current.originalInvoiceNumber).toBe('INV-2026-0042');
  });

  it('handleExitReturnMode يلغي وضع الإرجاع ويصفر السياق والسلة عند الطلب', () => {
    act(() => {
      usePOSSessionStore.setState({
        returnMode: true,
        returnContext: {
          originalSaleId: 'sale-1',
          originalInvoiceNumber: 'INV-100',
          items: [],
          returnType: 'invoice_based',
        },
        cart: [{ productId: 'p1', productName: 'item', unitPrice: 10, qty: 1, itemDiscount: 0 }],
      });
    });

    const { result } = renderHook(() => usePOSReturnButton());

    act(() => {
      result.current.handleExitReturnMode(true);
    });

    const storeState = usePOSSessionStore.getState();
    expect(storeState.returnMode).toBe(false);
    expect(storeState.returnContext).toBeNull();
    expect(storeState.cart).toEqual([]);
  });

  it('handleToggleManualReturn يفعل الإرجاع المباشر الحر بالباركود', () => {
    const { result } = renderHook(() => usePOSReturnButton());

    act(() => {
      result.current.handleToggleManualReturn();
    });

    const storeState = usePOSSessionStore.getState();
    expect(storeState.returnMode).toBe(true);
    expect(storeState.returnContext).toBeNull();
  });
});

describe('POSReturnButton — المكون المرئي بجميع الأنماط (Polymorphic Component)', () => {
  beforeEach(() => {
    act(() => {
      usePOSSessionStore.setState({
        returnMode: false,
        returnContext: null,
        cart: [],
      });
    });
  });

  it('يرندر النمط الافتراضي topbar مع اختصار F9 ويفتح المودال عند النقر', () => {
    const onOpenReturns = vi.fn();
    render(<POSReturnButton variant="topbar" onOpenReturns={onOpenReturns} />);

    const button = screen.getByRole('button', { name: /الإرجاع/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('F9')).toBeInTheDocument();

    fireEvent.click(button);
    expect(onOpenReturns).toHaveBeenCalledTimes(1);
  });

  it('يرندر نمط topbar بحالة النشاط (Active State) مع شارة عدد العناصر وزر الإنهاء', () => {
    act(() => {
      usePOSSessionStore.setState({
        returnMode: true,
        cart: [{ productId: 'p1', productName: 'سلعة', unitPrice: 50, qty: 3, itemDiscount: 0 }],
      });
    });

    render(<POSReturnButton variant="topbar" />);

    expect(screen.getByText('إرجاع (مفعّل)')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByTitle('إنهاء وضع الإرجاع')).toBeInTheDocument();
  });

  it('يرندر نمط terminal التيرمينال فائق الكثافة', () => {
    const onOpenReturns = vi.fn();
    render(<POSReturnButton variant="terminal" onOpenReturns={onOpenReturns} />);

    const button = screen.getByRole('button', { name: /مرتجع مبيعات/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onOpenReturns).toHaveBeenCalledTimes(1);
  });

  it('يرندر نمط ribbon المخصص لشريط Design7TopRibbon مع السمة data-purpose', () => {
    const onOpenReturns = vi.fn();
    render(<POSReturnButton variant="ribbon" onOpenReturns={onOpenReturns} />);

    const button = document.querySelector('[data-purpose="open-returns-button"]');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('الإرجاع');

    fireEvent.click(button!);
    expect(onOpenReturns).toHaveBeenCalledTimes(1);
  });

  it('يرندر نمط actionbar للأشرطة السفلية والجانبية مع نص مرتجع بدلاً من سجل المربك', () => {
    const onOpenReturns = vi.fn();
    render(<POSReturnButton variant="actionbar" onOpenReturns={onOpenReturns} />);

    const button = screen.getByRole('button', { name: /مرتجع/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('مرتجع');

    fireEvent.click(button);
    expect(onOpenReturns).toHaveBeenCalledTimes(1);
  });

  it('يرندر نمط compact لشريط البحث والباركود', () => {
    const onOpenReturns = vi.fn();
    render(<POSReturnButton variant="compact" onOpenReturns={onOpenReturns} />);

    const button = screen.getByRole('button', { name: /إرجاع \(F9\)/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onOpenReturns).toHaveBeenCalledTimes(1);
  });

  it('نمط banner لا يظهر إذا كان وضع الإرجاع غير نشط، ويظهر لافتة تحذيرية حمراء/عنبرية عند التفعيل', () => {
    const { container, rerender } = render(<POSReturnButton variant="banner" />);
    expect(container.firstChild).toBeNull();

    act(() => {
      usePOSSessionStore.setState({
        returnMode: true,
        returnContext: {
          originalSaleId: 'sale-77',
          originalInvoiceNumber: 'INV-2026-99',
          items: [],
          returnType: 'invoice_based',
        },
        cart: [{ productId: 'p1', productName: 'سلعة', unitPrice: 100, qty: 1, itemDiscount: 0 }],
      });
    });

    rerender(<POSReturnButton variant="banner" />);

    expect(screen.getByText('وضع مرتجع المبيعات مفعّل')).toBeInTheDocument();
    expect(screen.getByText('#INV-2026-99')).toBeInTheDocument();
    expect(screen.getByText('إنهاء الإرجاع')).toBeInTheDocument();
  });

  it('يدعم النقر بالزر الأيمن لفتح قائمة الخيارات المتقدمة للإرجاع', () => {
    render(<POSReturnButton variant="topbar" />);

    const button = screen.getByRole('button', { name: /الإرجاع/i });
    fireEvent.contextMenu(button);

    expect(screen.getByText('وضع الإرجاع المباشر (بالباركود)')).toBeInTheDocument();
    expect(screen.getAllByText('F9').length).toBeGreaterThanOrEqual(2);
  });
});
