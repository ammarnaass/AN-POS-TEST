export type PackType = 'wholesale' | 'bundle' | 'half_wholesale';

export interface MobilePackItem {
  productId: string;
  name: string;
  qty: number;
}

export type PackFilterStatus = 'all' | 'active' | 'inactive';

export interface PackMetrics {
  totalCost: number;
  retailTotal: number;
  availablePacks: number;
  margin: number;
  buyerSavings: number;
}
