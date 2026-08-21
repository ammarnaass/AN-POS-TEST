// Barcode Prints API client — persisted through Electron IPC.
// The legacy HTTP API was removed during the Electron + SQLite migration.

function getBarcodePrintsApi() {
  const api = window.electronAPI?.barcodePrints;
  if (!api) {
    throw new Error('Barcode print history is unavailable outside the Electron application.');
  }
  return api;
}

export interface BarcodePrint {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  barcode: string;
  labelSize: string;
  copies: number;
  barcodeType: string;
  showCompany: boolean;
  showProduct: boolean;
  showSku: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  enlargePrice: boolean;
  printOptions?: Record<string, unknown>;
  createdAt: string;
}

export interface BarcodePrintWrite {
  productId: string;
  barcode: string;
  labelSize: string;
  copies?: number;
  barcodeType?: string;
  showCompany?: boolean;
  showProduct?: boolean;
  showSku?: boolean;
  showPrice?: boolean;
  showBarcode?: boolean;
  enlargePrice?: boolean;
  printOptions?: Record<string, unknown>;
}

export const barcodePrintsApi = {
  list: async (opts: { productId?: string; from?: string; to?: string; limit?: number } = {}) => {
    const response = await getBarcodePrintsApi().list({ productId: opts.productId });
    return response.data as BarcodePrint[];
  },

  create: async (body: BarcodePrintWrite) => {
    const response = await getBarcodePrintsApi().create(body);
    return response.data as BarcodePrint;
  },

  remove: async (id: string) => {
    await getBarcodePrintsApi().remove(id);
  },
};
