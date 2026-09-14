import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TerminalPOSFavoritesGrid } from '../terminal/TerminalPOSFavoritesGrid';
import type { Product } from '@/types';

const mockProduct1: Product = {
  id: 'prod-1',
  name: 'عصير برتقال طبيعي',
  barcode: '6130001112223',
  category: 'مشروبات',
  unit: 'علبة',
  costPrice: 80,
  wholesalePrice: 100,
  retailPrice: 120,
  quantity: 50,
  lowStockThreshold: 5,
  wholesaleMinQty: 10,
  status: 'active',
};

const mockProduct2: Product = {
  id: 'prod-2',
  name: 'بسكويت الشوكولاتة الفاخر',
  barcode: '6130009998887',
  category: 'حلويات',
  unit: 'علبة',
  costPrice: 40,
  wholesalePrice: 50,
  retailPrice: 60,
  quantity: 20,
  lowStockThreshold: 5,
  wholesaleMinQty: 5,
  status: 'active',
};

describe('TerminalPOSFavoritesGrid (تصميم 5 - عرض منتجات التجزئة والمفضلة)', () => {
  const defaultProps = {
    terminalCategoryMode: 'products' as const,
    setTerminalCategoryMode: vi.fn(),
    displayedFavoriteItems: [
      {
        id: 'fav-1',
        itemId: 'pack-101',
        name: 'كرتونة عصير 24 علبة',
        barcode: '6130001119999',
        price: 2400,
        packQty: 24,
        packUnit: 'كرتونة',
        categoryId: 'fav-cat-wholesale',
      },
    ],
    onAddToCart: vi.fn(),
    formatMoney: (amount?: number) => `${amount ?? 0}`,
    currency: 'دج',
    quickProducts: [mockProduct1, mockProduct2],
    priceTier: '1' as const,
    getProductPriceByTier: (prod: Product) => prod.retailPrice,
    favoriteCategories: [{ id: 'fav-cat-wholesale', name: 'كراتين وباقات شائعة' }],
    selectedFavoriteCatId: 'ALL',
    setSelectedFavoriteCatId: vi.fn(),
    activeFavoritesList: [],
    categories: [
      { id: 'cat-drinks', name: 'مشروبات' },
      { id: 'cat-sweets', name: 'حلويات' },
    ],
    selectedCategory: 'ALL',
    onSelectCategory: vi.fn(),
    allProducts: [mockProduct1, mockProduct2],
    products: [mockProduct1, mockProduct2],
    barcodeInputRef: { current: null },
    searchQuery: '',
    setSearchQuery: vi.fn(),
    onOpenCustomize: vi.fn(),
  };

  it('renders retail product names clearly and correctly', () => {
    render(
      <MemoryRouter>
        <TerminalPOSFavoritesGrid {...defaultProps} />
      </MemoryRouter>
    );

    // Both product names must be in the document and visible
    expect(screen.getByText('عصير برتقال طبيعي')).toBeInTheDocument();
    expect(screen.getByText('بسكويت الشوكولاتة الفاخر')).toBeInTheDocument();
    expect(screen.getByText('120 دج')).toBeInTheDocument();
    expect(screen.getByText('60 دج')).toBeInTheDocument();
  });

  it('triggers onAddToCart when a retail product card is clicked', () => {
    const handleAddToCart = vi.fn();
    render(
      <MemoryRouter>
        <TerminalPOSFavoritesGrid {...defaultProps} onAddToCart={handleAddToCart} />
      </MemoryRouter>
    );

    const productCard = screen.getByText('عصير برتقال طبيعي').closest('button');
    expect(productCard).not.toBeNull();
    if (productCard) {
      fireEvent.click(productCard);
      expect(handleAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'prod-1', name: 'عصير برتقال طبيعي' }),
        120
      );
    }
  });

  it('renders favorite items with pack quantities and correct name in favorites mode', () => {
    render(
      <MemoryRouter>
        <TerminalPOSFavoritesGrid {...defaultProps} terminalCategoryMode="favorites" />
      </MemoryRouter>
    );

    expect(screen.getByText('كرتونة عصير 24 علبة')).toBeInTheDocument();
    expect(screen.getByText('×24 كرتونة')).toBeInTheDocument();
    expect(screen.getByText('2400 دج')).toBeInTheDocument();
  });

  it('displays category count badges and allows category switching', () => {
    const handleSelectCategory = vi.fn();
    render(
      <MemoryRouter>
        <TerminalPOSFavoritesGrid {...defaultProps} onSelectCategory={handleSelectCategory} />
      </MemoryRouter>
    );

    const drinksCategoryBtn = screen.getByText('مشروبات').closest('button');
    expect(drinksCategoryBtn).not.toBeNull();
    if (drinksCategoryBtn) {
      fireEvent.click(drinksCategoryBtn);
      expect(handleSelectCategory).toHaveBeenCalledWith('cat-drinks');
    }
  });
});
