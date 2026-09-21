import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductMultipleBarcodesSection, {
  type LinkedBarcodeItem,
} from '../ProductMultipleBarcodesSection';
import { ProductBarcodeRepository } from '@/infrastructure/database/repositories/ProductBarcodeRepository';

describe('ProductMultipleBarcodesSection', () => {
  const defaultProps = {
    primaryBarcode: '6130000000001',
    linkedBarcodes: [
      {
        id: 'b-1',
        barcode: '6130000000002',
        type: 'variant' as const,
        variantLabel: 'نكهة فراولة',
      },
      {
        id: 'b-2',
        barcode: '6130000000003',
        type: 'batch' as const,
        batchNumber: 'LOT-99',
        expiryDate: '2027-01-01',
      },
    ],
    onAddBarcode: vi.fn(),
    onUpdateBarcode: vi.fn(),
    onDeleteBarcode: vi.fn(),
    productId: 'p-100',
    productName: 'عصير طبيعي',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يعرض الباركود الرئيسي والباركودات المرتبطة بشكل صحيح', () => {
    render(<ProductMultipleBarcodesSection {...defaultProps} />);

    expect(screen.getByText('الباركود الرئيسي للمنتج')).toBeInTheDocument();
    expect(screen.getByText('6130000000001')).toBeInTheDocument();
    expect(screen.getByText('الباركودات المرتبطة المسجلة')).toBeInTheDocument();
    expect(screen.getByText('6130000000002')).toBeInTheDocument();
    expect(screen.getByText('نكهة فراولة')).toBeInTheDocument();
    expect(screen.getByText('6130000000003')).toBeInTheDocument();
    expect(screen.getByText('دفعة: LOT-99')).toBeInTheDocument();
  });

  it('يضيف باركود جديد بنجاح عند ملء الحقول والضغط على زر الإضافة', () => {
    render(<ProductMultipleBarcodesSection {...defaultProps} />);

    const input = screen.getByPlaceholderText('امسح بالماسح الضوئي أو اكتب الرقم');
    fireEvent.change(input, { target: { value: '6130000000004' } });

    const labelInput = screen.getByPlaceholderText(/نكهة الفراولة/);
    fireEvent.change(labelInput, { target: { value: 'حجم عائلي 1 لتر' } });

    const submitBtn = screen.getByText('إضافة الباركود للقائمة');
    fireEvent.click(submitBtn);

    expect(defaultProps.onAddBarcode).toHaveBeenCalledWith({
      barcode: '6130000000004',
      type: 'variant',
      variantLabel: 'حجم عائلي 1 لتر',
      batchNumber: undefined,
      expiryDate: undefined,
    });
  });

  it('يمنع إضافة الباركود إذا كان مطابقاً للباركود الرئيسي', () => {
    render(<ProductMultipleBarcodesSection {...defaultProps} />);

    const input = screen.getByPlaceholderText('امسح بالماسح الضوئي أو اكتب الرقم');
    fireEvent.change(input, { target: { value: '6130000000001' } });

    const submitBtn = screen.getByText('إضافة الباركود للقائمة');
    fireEvent.click(submitBtn);

    expect(defaultProps.onAddBarcode).not.toHaveBeenCalled();
    expect(screen.getByText('لا يمكن إضافة الباركود الرئيسي كباركود إضافي.')).toBeInTheDocument();
  });

  it('يمنع إضافة باركود مضاف مسبقاً في القائمة المحلية', () => {
    render(<ProductMultipleBarcodesSection {...defaultProps} />);

    const input = screen.getByPlaceholderText('امسح بالماسح الضوئي أو اكتب الرقم');
    fireEvent.change(input, { target: { value: '6130000000002' } });

    const submitBtn = screen.getByText('إضافة الباركود للقائمة');
    fireEvent.click(submitBtn);

    expect(defaultProps.onAddBarcode).not.toHaveBeenCalled();
    expect(screen.getByText('هذا الباركود مضاف بالفعل لهذا المنتج.')).toBeInTheDocument();
  });

  it('يستدعي onDeleteBarcode عند النقر على زر حذف الباركود', () => {
    render(<ProductMultipleBarcodesSection {...defaultProps} />);

    const deleteButtons = screen.getAllByTitle('حذف هذا الباركود');
    fireEvent.click(deleteButtons[0]);

    expect(defaultProps.onDeleteBarcode).toHaveBeenCalledWith(0);
  });

  it('يدعم التوليد التلقائي لباركود EAN-13', () => {
    render(<ProductMultipleBarcodesSection {...defaultProps} />);

    const genBtn = screen.getByText('توليد EAN-13');
    fireEvent.click(genBtn);

    const input = screen.getByPlaceholderText('امسح بالماسح الضوئي أو اكتب الرقم') as HTMLInputElement;
    expect(input.value).toMatch(/^22\d{11}$/);
  });
});
