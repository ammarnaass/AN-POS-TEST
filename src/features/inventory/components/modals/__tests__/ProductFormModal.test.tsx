import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductFormModal } from '../ProductFormModal';
import { BrowserRouter } from 'react-router-dom';

describe('ProductFormModal', () => {
  const createMockFormState = (overrides = {}) => {
    let currentSection = 'basic';
    const formState = {
      showForm: true,
      editingProduct: null,
      formData: {
        name: 'منتج تجريبي',
        barcode: '6131111111111',
        sku: 'SKU-1',
        category: 'عصائر',
        unit: 'قطعة',
        costPrice: 50,
        wholesalePrice: 80,
        retailPrice: 100,
        wholesaleMinQty: 5,
        quantity: 20,
        lowStockThreshold: 5,
        status: 'active',
      },
      formErrors: {},
      isSubmitted: false,
      touchedFields: {},
      barcodeDuplicate: null,
      activeFormSection: 'basic',
      setActiveFormSection: vi.fn((sec: string) => {
        formState.activeFormSection = sec;
      }),
      closeFormModal: vi.fn(),
      handleSubmit: vi.fn(),
      linkedBarcodes: [
        {
          id: 'lb-1',
          barcode: '6132222222222',
          type: 'variant' as const,
          variantLabel: 'نكهة برتقال',
        },
      ],
      handleAddLinkedBarcode: vi.fn(),
      handleUpdateLinkedBarcode: vi.fn(),
      handleRemoveLinkedBarcode: vi.fn(),
      handleGenerateBarcode: vi.fn(),
      barcodeScanMode: false,
      setBarcodeScanMode: vi.fn(),
      barcodeInputRef: { current: null },
      profitMargin: 100,
      openCreateForm: vi.fn(),
      openEditForm: vi.fn(),
      validateForm: vi.fn(() => ({})),
      showNewCategory: false,
      setShowNewCategory: vi.fn(),
      newCategory: '',
      setNewCategory: vi.fn(),
      handleAddNewCategory: vi.fn(),
      setFormData: vi.fn(),
      setFormErrors: vi.fn(),
      setIsSubmitted: vi.fn(),
      setTouchedFields: vi.fn(),
      setBarcodeDuplicate: vi.fn(),
      setEditingProduct: vi.fn(),
      setShowForm: vi.fn(),
      setLinkedBarcodes: vi.fn(),
      ...overrides,
    };
    return formState;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يعرض تبويب الباركود المتعدد مع شارة عدد الباركودات المرتبطة', () => {
    const mockFormState = createMockFormState() as any;

    render(
      <BrowserRouter>
        <ProductFormModal formState={mockFormState} categories={[]} />
      </BrowserRouter>
    );

    expect(screen.getByText('الباركود المتعدد')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('يحتوي تبويب البيانات الأساسية على زر سريع للانتقال إلى قسم الباركود المتعدد', () => {
    const mockFormState = createMockFormState() as any;

    render(
      <BrowserRouter>
        <ProductFormModal formState={mockFormState} categories={[]} />
      </BrowserRouter>
    );

    const shortcutBtn = screen.getByRole('button', { name: /إدارة الباركود المتعدد/ });
    expect(shortcutBtn).toBeInTheDocument();

    fireEvent.click(shortcutBtn);
    expect(mockFormState.setActiveFormSection).toHaveBeenCalledWith('barcodes');
  });

  it('يعرض قسم إدارة الباركود المتعدد عند تحديد تبويب barcodes', () => {
    const mockFormState = createMockFormState({
      activeFormSection: 'barcodes',
    }) as any;

    render(
      <BrowserRouter>
        <ProductFormModal formState={mockFormState} categories={[]} />
      </BrowserRouter>
    );

    expect(screen.getByText('محرك الباركود المتعدد الذكي لنقطة البيع')).toBeInTheDocument();
    expect(screen.getByText('الباركود الرئيسي للمنتج')).toBeInTheDocument();
    expect(screen.getByText('6132222222222')).toBeInTheDocument();
    expect(screen.getByText('نكهة برتقال')).toBeInTheDocument();
  });
});
