export type PackType = 'wholesale' | 'bundle' | 'half_wholesale';

export interface PackItemSelection {
  productId: string;
  name: string;
  qty: number;
  costPrice?: number;
  retailPrice?: number;
  barcode?: string;
  stockQty?: number;
}

export interface PackCalculations {
  totalCost: number;
  totalRetail: number;
  margin: number;
  savings: number;
  savingsPercent: number;
}

export interface PackFormData {
  packName: string;
  packBarcode: string;
  packPrice: string;
  packType: PackType;
  unitName: string;
  minWholesaleQty: string;
  selectedItems: PackItemSelection[];
  modalError: string;
}

export type PackFilterStatus = 'all' | 'active' | 'inactive';
export type PackTypeFilter = 'all' | PackType;
export type PackViewMode = 'grid' | 'table';

export interface PackStats {
  totalPacks: number;
  bundlesCount: number;
  wholesaleCount: number;
  halfWholesaleCount: number;
  activePacks: number;
  totalProductsCount: number;
  avgMargin: number;
}
