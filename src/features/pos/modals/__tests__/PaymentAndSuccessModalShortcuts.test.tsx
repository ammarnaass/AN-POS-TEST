import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentModal } from '../PaymentModal';
import { SuccessModal } from '../SuccessModal';
import * as printService from '@/services/print/printService';

vi.mock('@/services/print/printService', () => ({
  printDocument: vi.fn(),
}));

describe('PaymentModal and SuccessModal Keyboard Shortcuts (إتمام الدفع)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PaymentModal Shortcuts', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      total: 1500,
      paymentMethod: 'cash' as const,
      setPaymentMethod: vi.fn(),
      paidAmount: 1500,
      setPaidAmount: vi.fn(),
      selectedCustomer: '',
      setSelectedCustomer: vi.fn(),
      customers: [{ id: 'c1', name: 'زبون تجريبي' }],
      onOpenAddCustomer: vi.fn(),
      onConfirmPayment: vi.fn(),
      isPending: false,
      allowCardPayment: true,
      allowTransferPayment: true,
    };

    it('triggers onConfirmPayment when Enter is pressed anywhere in PaymentModal', () => {
      render(<PaymentModal {...defaultProps} />);

      // Press Enter on window
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(defaultProps.onConfirmPayment).toHaveBeenCalledTimes(1);
    });

    it('triggers onConfirmPayment when Enter is pressed directly inside the paid input', () => {
      render(<PaymentModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('1500');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(defaultProps.onConfirmPayment).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when Escape is pressed in PaymentModal', () => {
      render(<PaymentModal {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('switches payment methods via F1-F4 and Alt+1-4', () => {
      render(<PaymentModal {...defaultProps} />);

      // F1 -> cash
      fireEvent.keyDown(window, { key: 'F1' });
      expect(defaultProps.setPaymentMethod).toHaveBeenCalledWith('cash');

      // F2 -> card
      fireEvent.keyDown(window, { key: 'F2' });
      expect(defaultProps.setPaymentMethod).toHaveBeenCalledWith('card');

      // F3 -> transfer
      fireEvent.keyDown(window, { key: 'F3' });
      expect(defaultProps.setPaymentMethod).toHaveBeenCalledWith('transfer');

      // F4 -> credit
      fireEvent.keyDown(window, { key: 'F4' });
      expect(defaultProps.setPaymentMethod).toHaveBeenCalledWith('credit');

      // Alt+1 -> cash
      fireEvent.keyDown(window, { key: '1', altKey: true });
      expect(defaultProps.setPaymentMethod).toHaveBeenCalledWith('cash');
    });

    it('applies quick cash presets on F5-F8 in cash mode', () => {
      render(<PaymentModal {...defaultProps} />);

      // F5 -> exact
      fireEvent.keyDown(window, { key: 'F5' });
      expect(defaultProps.setPaidAmount).toHaveBeenCalledWith(1500);

      // F6 -> +500
      fireEvent.keyDown(window, { key: 'F6' });
      expect(defaultProps.setPaidAmount).toHaveBeenCalledWith(2000);

      // F7 -> +1000
      fireEvent.keyDown(window, { key: 'F7' });
      expect(defaultProps.setPaidAmount).toHaveBeenCalledWith(2500);

      // F8 -> +2000
      fireEvent.keyDown(window, { key: 'F8' });
      expect(defaultProps.setPaidAmount).toHaveBeenCalledWith(3500);
    });

    it('blocks Enter confirmation if credit payment is chosen without a customer', () => {
      render(<PaymentModal {...defaultProps} paymentMethod="credit" selectedCustomer="" />);

      fireEvent.keyDown(window, { key: 'Enter' });
      expect(defaultProps.onConfirmPayment).not.toHaveBeenCalled();
    });
  });

  describe('SuccessModal Shortcuts', () => {
    const mockSale: any = {
      id: 'sale-123',
      number: 101,
      total: 1500,
      paymentMethod: 'cash',
      docType: 'facture',
    };

    it('closes SuccessModal on Enter or Escape', () => {
      const onClose = vi.fn();
      render(<SuccessModal isOpen={true} onClose={onClose} completedSale={mockSale} />);

      fireEvent.keyDown(window, { key: 'Enter' });
      expect(onClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('triggers receipt print on P or F1 in SuccessModal', () => {
      const onClose = vi.fn();
      render(<SuccessModal isOpen={true} onClose={onClose} completedSale={mockSale} />);

      fireEvent.keyDown(window, { key: 'p' });
      expect(printService.printDocument).toHaveBeenCalledWith(
        'sale-123',
        'thermal-receipt',
        expect.any(Object)
      );

      fireEvent.keyDown(window, { key: 'F1' });
      expect(printService.printDocument).toHaveBeenCalledWith(
        'sale-123',
        'thermal-receipt',
        expect.any(Object)
      );
    });

    it('triggers invoice print on F2 in SuccessModal', () => {
      const onClose = vi.fn();
      render(<SuccessModal isOpen={true} onClose={onClose} completedSale={mockSale} />);

      fireEvent.keyDown(window, { key: 'F2' });
      expect(printService.printDocument).toHaveBeenCalledWith(
        'sale-123',
        'sale-invoice',
        expect.any(Object)
      );
    });

    it('triggers wholesale-invoice on F1/P and thermal-receipt on F2 for wholesale sale', () => {
      const onClose = vi.fn();
      const wholesaleSale: any = {
        id: 'sale-wholesale-99',
        number: 102,
        total: 50000,
        paymentMethod: 'cash',
        docType: 'wholesale',
      };
      render(<SuccessModal isOpen={true} onClose={onClose} completedSale={wholesaleSale} />);

      fireEvent.keyDown(window, { key: 'F1' });
      expect(printService.printDocument).toHaveBeenCalledWith(
        'sale-wholesale-99',
        'wholesale-invoice',
        expect.any(Object)
      );

      fireEvent.keyDown(window, { key: 'F2' });
      expect(printService.printDocument).toHaveBeenCalledWith(
        'sale-wholesale-99',
        'thermal-receipt',
        expect.any(Object)
      );
    });

    it('renders paid amount and customer change badge when paidAmount exceeds total', () => {
      const saleWithChange: any = {
        id: 'sale-change-1',
        number: 105,
        total: 1200,
        paidAmount: 2000,
        paymentMethod: 'cash',
        docType: 'facture',
      };
      const { getByText } = render(
        <SuccessModal isOpen={true} onClose={vi.fn()} completedSale={saleWithChange} />
      );

      expect(getByText(/المبلغ المستلم \(المدفوع\):/)).toBeInTheDocument();
      expect(getByText(/الباقي للزبون \(الفكة\):/)).toBeInTheDocument();
      expect(getByText(/\+800/)).toBeInTheDocument();
    });
  });
});

