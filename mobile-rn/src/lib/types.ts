export interface Types {
  Product: {
    id: string;
    name: string;
    productName?: string;
    price?: number;
    retailPrice?: number;
    wholesalePrice?: number;
    quantity?: number;
    qty?: number;
    unit?: string;
    barcode?: string;
    category?: string;
    status?: string;
    lowStockThreshold?: number;
    costPrice?: number;
    taxRate?: number;
  };
  Sale: {
    id: string;
    number: string;
    date: string;
    docType: string;
    type: string;
    items: any[];
    subtotal: number;
    discount: number;
    discountType: string;
    tvaAmount: number;
    total: number;
    paymentMethod: string;
    customerId: string;
    customerName: string;
    amountPaid: number;
    status: string;
    soldBy: string;
  };
  Customer: {
    id: string;
    name: string;
    phone: string;
    credit_limit?: number;
    creditLimit?: number;
    balance: number;
  };
  Supplier: { id: string; name: string; phone: string; balance: number };
  User: { id: string; username: string; name: string; pin: string; role: string; status: string };
}

export type Product = Types['Product'];
export type Sale = Types['Sale'];
export type Customer = Types['Customer'];
export type Supplier = Types['Supplier'];
export type User = Types['User'];
export type CartItem = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  promoName?: string;
};
