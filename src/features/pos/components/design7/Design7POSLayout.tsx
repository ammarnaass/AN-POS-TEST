import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Design7POSLayoutProps } from './types';
import './design7.css';

import { Design7TopRibbon } from './components/Design7TopRibbon';
import { Design7DisplayAndCustomerBanner } from './components/Design7DisplayAndCustomerBanner';
import { Design7ActiveScanStrip } from './components/Design7ActiveScanStrip';
import { Design7FinancialSidebar } from './components/Design7FinancialSidebar';
import { Design7BasketTable } from './components/Design7BasketTable';
import { Design7ActionKeypad } from './components/Design7ActionKeypad';
import { Design7BottomFavoritesPad } from './components/Design7BottomFavoritesPad';
import { Design7ProductSearchModal } from './modals/Design7ProductSearchModal';
import { Design7ItemEditModal } from './modals/Design7ItemEditModal';
import { Design7VirtualKeyboardModal } from './modals/Design7VirtualKeyboardModal';
import { useDesign7Shortcuts } from './hooks/useDesign7Shortcuts';
import { useFavoritesStore } from '@/features/favorites/store/useFavoritesStore';
import { getCartRowKey } from './utils/cartRow';

export const Design7POSLayout: React.FC<Design7POSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  saleSummary,
  products = [],
  allProducts = [],
  categories = [],
  selectedCategory,
  onSelectCategory,
  favoriteCategories: customFavoriteCategories,
  favoritePacks: customFavoritePacks,
  onOpenFavoritesManagement,
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  searchQuery,
  setSearchQuery,
  onSettleSale,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount,
  onSelectCustomer,
  selectedCustomerName,
  autoPrintReceipt,
  onToggleAutoPrint,
  onOpenDiscount,
  discount,
  discountType,
  onOpenFreeProduct,
  onOpenReturns,
  returnMode = false,
  onOpenCustomize,
  wholesaleMode = false,
  toggleWholesaleMode,
  priceTier = '1',
  onSelectPriceTier,
  onSaveAsProforma,
  onSaveAsOrder,
  onNewOrder,
  onOpenSalesHistory,
  invoiceNumber = 1,
  formatMoney,
  currency = 'DA',
  userName = 'admin',
  storeName,
  isSessionOpen,
  isSalePending,
  onToggleFullscreen,
  isFullscreen = false,
  onNavigateBack,
  onOpenKeypad,
  onOpenKeypadForQty,
  onOpenKeyboard,
  onOpenAddProduct,
}) => {
  // Selected cart row state (tracks unique rowKey to prevent multi-selection)
  const [selectedCartRowId, setSelectedCartRowId] = useState<string | null>(() => {
    return cart.length > 0 ? getCartRowKey(cart[cart.length - 1], cart.length - 1) : null;
  });

  // Modal states for Product Search and Item Editing (Touch Numpad / Calculator)
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [itemEditState, setItemEditState] = useState<{
    isOpen: boolean;
    mode: 'qty' | 'price' | 'paid' | 'discount';
  }>({
    isOpen: false,
    mode: 'qty',
  });
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = useState(false);

  // Favorites Store & Categories for Favorite Packs (عبوات وتصنيفات المفضلة)
  const {
    categories: storeFavoriteCategories,
    items: storeFavoriteItems,
    purgeProductItems,
  } = useFavoritesStore();

  useEffect(() => {
    purgeProductItems();
  }, [purgeProductItems]);

  const [selectedFavoriteCatId, setSelectedFavoriteCatId] = useState<string>('ALL');

  // Categories dedicated exclusively to favorite packages
  const activeFavoriteCategories = useMemo(() => {
    if (customFavoriteCategories && customFavoriteCategories.length > 0) {
      return customFavoriteCategories;
    }
    return storeFavoriteCategories || [];
  }, [customFavoriteCategories, storeFavoriteCategories]);

  // Packs only from favorites store
  const packOnlyFavorites = useMemo(() => {
    return (storeFavoriteItems || []).filter((it) => it.type === 'pack');
  }, [storeFavoriteItems]);

  // System packs from catalog (isPack: true or bundle items)
  const systemPacks = useMemo(() => {
    const list = (allProducts && allProducts.length > 0 ? allProducts : products) || [];
    return list.filter((p: any) => Boolean(p.isPack) || 'items' in p);
  }, [allProducts, products]);

  // Fallback favorite packs when store items haven't been created yet
  const fallbackFavoriteItems = useMemo(() => {
    if (systemPacks.length > 0) {
      return systemPacks.map((p: any) => ({
        id: `sys-pack-${p.id}`,
        categoryId: 'fav-cat-wholesale',
        type: 'pack' as const,
        itemId: String(p.id).replace('pack-', ''),
        name: p.name,
        barcode: p.barcode,
        price: Number(p.retailPrice ?? p.price ?? p.packPrice ?? 0),
        packQty: Number(p.packPiecesCount ?? p.piecesCount ?? 1),
        packUnit: p.unitName || p.unit || 'عبوة',
        order: 0,
      }));
    }

    // Smart fallback: map available products into favorite packs
    const available = (allProducts && allProducts.length > 0 ? allProducts : products) || [];
    return available.slice(0, 16).map((p: any, idx: number) => ({
      id: `fav-pack-${p.id || idx}`,
      categoryId: idx % 3 === 0 ? 'fav-cat-drinks' : idx % 3 === 1 ? 'fav-cat-wholesale' : 'fav-cat-quick',
      type: 'pack' as const,
      itemId: String(p.id),
      name: p.name || (p as any).productName || 'عبوة مفضلة',
      barcode: p.barcode,
      price: Number(p.retailPrice ?? p.price ?? 0),
      packQty: (p as any).packPiecesCount || (p as any).piecesCount || 1,
      packUnit: (p as any).unit || (p as any).unitName || 'عبوة',
      order: idx,
    }));
  }, [systemPacks, allProducts, products]);

  // Active full list of favorite packs
  const activeFavoritesList = useMemo(() => {
    if (customFavoritePacks && customFavoritePacks.length > 0) {
      return customFavoritePacks;
    }
    return packOnlyFavorites.length > 0 ? packOnlyFavorites : fallbackFavoriteItems;
  }, [customFavoritePacks, packOnlyFavorites, fallbackFavoriteItems]);

  // Filtered favorite packs based on selected favorite category
  const displayedFavoriteItems = useMemo(() => {
    if (selectedFavoriteCatId === 'ALL') {
      return activeFavoritesList;
    }
    const catExists = activeFavoriteCategories.some((c) => c.id === selectedFavoriteCatId);
    if (!catExists) return activeFavoritesList;
    return activeFavoritesList.filter((it) => it.categoryId === selectedFavoriteCatId);
  }, [activeFavoritesList, activeFavoriteCategories, selectedFavoriteCatId]);

  // Handle selecting / adding a favorite pack to the basket
  const handleSelectFavoritePack = useCallback(
    (pack: any) => {
      onAddToCart(
        {
          id: `pack-${pack.itemId || pack.id}`,
          name: pack.name,
          barcode: pack.barcode,
          retailPrice: pack.price,
          price: pack.price,
          isPack: true,
          packId: pack.itemId || pack.id,
          packPiecesCount: pack.packQty || 1,
          packUnit: pack.packUnit || 'عبوة',
        } as any,
        pack.price
      );
    },
    [onAddToCart]
  );

  // Keep selection synchronized with cart changes
  useEffect(() => {
    if (cart.length === 0) {
      setSelectedCartRowId(null);
    } else {
      const isCurrentSelectedValid = cart.some(
        (i, idx) =>
          getCartRowKey(i, idx) === selectedCartRowId ||
          (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
      );
      if (!selectedCartRowId || !isCurrentSelectedValid) {
        setSelectedCartRowId(getCartRowKey(cart[cart.length - 1], cart.length - 1));
      }
    }
  }, [cart, selectedCartRowId]);

  // Active item in the scan notification strip and edit modals
  const activeItem = useMemo(() => {
    if (selectedCartRowId && cart.length > 0) {
      const foundByRowKey = cart.find((i, idx) => getCartRowKey(i, idx) === selectedCartRowId);
      if (foundByRowKey) return foundByRowKey;
      const foundById = cart.find((i) => i.productId === selectedCartRowId || (i as any).id === selectedCartRowId);
      if (foundById) return foundById;
    }
    return cart.length > 0 ? cart[cart.length - 1] : null;
  }, [cart, selectedCartRowId]);

  // Cart summary calculations for accounting sidebar
  const itemCount = cart.length;
  const totalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => {
      const q = item.qty ?? (item as any).quantity ?? 1;
      return sum + q;
    }, 0);
  }, [cart]);

  // Navigation handlers for keypad
  const handleArrowUp = useCallback(() => {
    if (cart.length === 0) return;
    const currentIdx = cart.findIndex(
      (i, idx) =>
        getCartRowKey(i, idx) === selectedCartRowId ||
        (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
    );
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : cart.length - 1;
    setSelectedCartRowId(getCartRowKey(cart[prevIdx], prevIdx));
  }, [cart, selectedCartRowId]);

  const handleArrowDown = useCallback(() => {
    if (cart.length === 0) return;
    const currentIdx = cart.findIndex(
      (i, idx) =>
        getCartRowKey(i, idx) === selectedCartRowId ||
        (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
    );
    const nextIdx = currentIdx >= 0 && currentIdx < cart.length - 1 ? currentIdx + 1 : 0;
    setSelectedCartRowId(getCartRowKey(cart[nextIdx], nextIdx));
  }, [cart, selectedCartRowId]);

  const handleArrowRight = useCallback(() => {
    if (!activeItem) return;
    const targetId = activeItem.productId || (activeItem as any).id;
    if (targetId) {
      const currentQty = activeItem.qty ?? (activeItem as any).quantity ?? 1;
      onUpdateQty(targetId, currentQty + 1);
    }
  }, [activeItem, onUpdateQty]);

  const handleArrowLeft = useCallback(() => {
    if (!activeItem) return;
    const targetId = activeItem.productId || (activeItem as any).id;
    if (targetId) {
      const currentQty = activeItem.qty ?? (activeItem as any).quantity ?? 1;
      if (currentQty > 1) {
        onUpdateQty(targetId, currentQty - 1);
      } else {
        onRemoveFromCart(targetId);
      }
    }
  }, [activeItem, onUpdateQty, onRemoveFromCart]);

  const handleConfirm = useCallback(() => {
    if (cart.length > 0) {
      onSettleSale();
    }
  }, [cart.length, onSettleSale]);

  const handleDeleteSelectedRow = useCallback(() => {
    if (activeItem) {
      const targetId = activeItem.productId || (activeItem as any).id;
      if (targetId) {
        onRemoveFromCart(targetId);
      }
    }
  }, [activeItem, onRemoveFromCart]);

  // Handle opening touch calculator for active item quantity or free product
  const handleItemDetails = useCallback(() => {
    if (activeItem) {
      setItemEditState({ isOpen: true, mode: 'qty' });
    } else if (onOpenFreeProduct) {
      onOpenFreeProduct();
    }
  }, [activeItem, onOpenFreeProduct]);

  // Handle opening touch calculator for active item price
  const handleEditPrice = useCallback(() => {
    if (activeItem) {
      setItemEditState({ isOpen: true, mode: 'price' });
    }
  }, [activeItem]);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus barcode input on layout mount
  useEffect(() => {
    const timer = setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Connect keyboard shortcuts (F1-F12, Arrows, Del, Enter, Esc)
  useDesign7Shortcuts({
    onSettleSale,
    onOpenSalesHistory,
    onOpenReturns,
    onOpenSuspended,
    onOpenDiscount,
    onSelectCustomer,
    onNewOrder,
    onClearCart,
    onOpenCustomize,
    onToggleFullscreen,
    onBarcodeFocus: () => barcodeInputRef.current?.focus(),
    onOpenSearch: () => setIsProductSearchOpen(true),
    onOpenFreeProduct,
    onToggleAutoPrint,
    onNavigateBack,
    cart,
    selectedCartRowId,
    setSelectedCartRowId,
    onUpdateQty,
    onRemoveFromCart,
  });

  return (
    <div
      dir="rtl"
      lang="ar"
      className="d7-container w-full h-full flex-1 min-h-0 min-w-0 flex flex-col p-1 sm:p-1.5 bg-[#43494e] text-slate-900 select-none overflow-hidden text-xs"
    >
      {/* Main POS Desktop Application Window Wrapper */}
      <div
        className="flex-1 flex flex-col bg-[#e6ecf2] border-2 border-[#54606e] shadow-2xl rounded-xs overflow-hidden min-h-0 min-w-0"
        data-purpose="pos-window"
      >
        {/* Top Action Buttons Ribbon & Order Metadata Header */}
        <Design7TopRibbon
          onNavigateBack={onNavigateBack}
          onOpenSalesHistory={onOpenSalesHistory}
          onOpenReturns={onOpenReturns}
          onSaveAsOrder={onSaveAsOrder}
          onOpenSuspended={onOpenSuspended}
          suspendedCount={suspendedCount}
          autoPrintReceipt={autoPrintReceipt}
          onToggleAutoPrint={onToggleAutoPrint}
          onSettleSale={onSettleSale}
          onOpenDiscount={onOpenDiscount}
          onOpenCustomize={onOpenCustomize}
          onNewOrder={onNewOrder}
          onClearCart={onClearCart}
          invoiceNumber={invoiceNumber}
          onToggleFullscreen={onToggleFullscreen}
          isFullscreen={isFullscreen}
        />

        {/* Main Workspace Middle Section */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0" data-purpose="primary-workspace">
          {/* Top LED Display & Customer Banner */}
          <Design7DisplayAndCustomerBanner
            totalAmount={saleSummary.total}
            formatMoney={formatMoney}
            currency={currency}
            selectedCustomerName={selectedCustomerName}
            onSelectCustomer={onSelectCustomer}
          />

          {/* Current Scanning / Active Item Notification Bar */}
          <Design7ActiveScanStrip
            inputRef={barcodeInputRef}
            activeItem={activeItem}
            barcodeInput={barcodeInput}
            setBarcodeInput={setBarcodeInput}
            onBarcodeSubmit={onBarcodeSubmit}
            formatMoney={formatMoney}
          />

          {/* Workspace Body: Financial Column (Right in RTL) + Basket Table (Center) + 3x5 Keypad (Left in RTL) */}
          <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
            {/* Financial Summary Sidebar (Right in RTL) */}
            <Design7FinancialSidebar
              subtotal={saleSummary.subtotal}
              discountAmount={saleSummary.discountAmount}
              total={saleSummary.total}
              tvaAmount={saleSummary.tvaAmount}
              itemCount={itemCount}
              totalQuantity={totalQuantity}
              paidAmount={paidAmount}
              onUpdatePaid={setPaidAmount}
              onOpenPaidCalculator={() => {
                setItemEditState({ isOpen: true, mode: 'paid' });
              }}
              formatMoney={formatMoney}
              onOpenDiscount={() => {
                if (onOpenDiscount) onOpenDiscount();
                else setItemEditState({ isOpen: true, mode: 'discount' });
              }}
              onSettleSale={onSettleSale}
              userName={userName}
            />

            {/* Shopping Basket Table (Center) */}
            <Design7BasketTable
              cart={cart}
              selectedCartRowId={selectedCartRowId}
              onSelectRow={setSelectedCartRowId}
              onUpdateQty={onUpdateQty}
              onRemoveFromCart={onRemoveFromCart}
              formatMoney={formatMoney}
              onOpenItemEdit={(item, mode = 'qty') => {
                const idx = cart.indexOf(item);
                const rowKey = getCartRowKey(item, idx >= 0 ? idx : 0);
                setSelectedCartRowId(rowKey);
                setItemEditState({ isOpen: true, mode });
              }}
            />

            {/* Right/Left Action Keypad Matrix (Left in RTL) */}
            <Design7ActionKeypad
              onSelectCustomer={onSelectCustomer}
              onOpenSearch={() => setIsProductSearchOpen(true)}
              onItemDetails={handleItemDetails}
              onDeleteSelectedRow={handleDeleteSelectedRow}
              onArrowUp={handleArrowUp}
              onArrowDown={handleArrowDown}
              onArrowLeft={handleArrowLeft}
              onArrowRight={handleArrowRight}
              onConfirm={handleConfirm}
              onSettleSale={onSettleSale}
              onOpenKeypad={() => {
                setItemEditState({ isOpen: true, mode: activeItem ? 'qty' : 'paid' });
              }}
              onOpenKeyboard={() => {
                if (onOpenKeyboard) onOpenKeyboard();
                setIsVirtualKeyboardOpen(true);
              }}
              onOpenSalesHistory={onOpenSalesHistory}
              onOpenFreeProduct={onOpenFreeProduct}
              onEditPrice={handleEditPrice}
              hasSelectedItem={Boolean(selectedCartRowId)}
            />
          </div>
        </div>

        {/* Bottom Favorites & Speed Dial Matrix: عبوات المفضلة وتصنيفاتها فقط */}
        <Design7BottomFavoritesPad
          favoriteCategories={activeFavoriteCategories}
          selectedFavoriteCatId={selectedFavoriteCatId}
          onSelectFavoriteCategory={setSelectedFavoriteCatId}
          favoritePacks={displayedFavoriteItems}
          totalPacksCount={activeFavoritesList.length}
          onSelectFavoritePack={handleSelectFavoritePack}
          onOpenFavoritesManagement={onOpenFavoritesManagement}
          onAddToCart={onAddToCart}
          formatMoney={formatMoney}
        />
      </div>

      {/* Product Search & Catalog Modal (F10 / Search Icon) */}
      <Design7ProductSearchModal
        isOpen={isProductSearchOpen}
        onClose={() => setIsProductSearchOpen(false)}
        products={products}
        onSelectProduct={(p) => {
          onAddToCart(p);
        }}
        formatMoney={formatMoney}
        categories={categories}
      />

      {/* Item Details, Quantity & Price Touch Calculator Modal */}
      <Design7ItemEditModal
        isOpen={itemEditState.isOpen}
        onClose={() => setItemEditState((prev) => ({ ...prev, isOpen: false }))}
        item={activeItem}
        mode={itemEditState.mode}
        totalAmount={saleSummary.total}
        paidAmount={paidAmount}
        discountAmount={saleSummary.discountAmount}
        onUpdateQty={(prodId, newQty) => {
          const effectiveId = activeItem?.productId || (activeItem as any)?.id || prodId;
          if (effectiveId) onUpdateQty(effectiveId, newQty);
        }}
        onUpdatePrice={
          onEditPrice
            ? (prodId, newPrice) => {
                const effectiveId = activeItem?.productId || (activeItem as any)?.id || prodId;
                if (effectiveId) onEditPrice(effectiveId, newPrice);
              }
            : undefined
        }
        onUpdatePaid={setPaidAmount}
        onUpdateDiscount={onOpenDiscount ? () => onOpenDiscount() : undefined}
        formatMoney={formatMoney}
        currency={currency}
      />

      {/* Virtual Touch Keyboard Modal (لوحة المفاتيح اللمسية للشاشات) */}
      <Design7VirtualKeyboardModal
        isOpen={isVirtualKeyboardOpen}
        onClose={() => setIsVirtualKeyboardOpen(false)}
        initialValue={barcodeInput || searchQuery || ''}
        onConfirm={(val) => {
          if (setBarcodeInput) setBarcodeInput(val);
          if (setSearchQuery) setSearchQuery(val);
          if (onBarcodeSubmit) onBarcodeSubmit();
        }}
        title="لوحة المفاتيح اللمسية الافتراضية"
        placeholder="انقر على الأحرف أو الأرقام لكتابة الباركود والبحث..."
      />
    </div>
  );
};

export default Design7POSLayout;
