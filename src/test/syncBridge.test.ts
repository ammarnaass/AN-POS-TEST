import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/infrastructure/database/dexie/db";
import { syncProductCreate, syncProductUpdate, syncProductDelete, syncProductBulkCreate } from "@/lib/products-sync";
import { searchByBarcode } from "@/services/barcode/searchByBarcode";
import type { Product } from "@/types";

describe("AN POS Sync Bridge & Barcode Resolution", () => {
  beforeEach(async () => {
    // تنظيف كاش Dexie و SQLite mock
    await db.products.clear();
    await db.packs.clear();
    const api = (window as any).electronAPI;
    if (api?.db?.clearAll) {
      await api.db.clearAll();
    }
  });

  describe("Product Write-Through Bridge", () => {
    it("syncProductCreate writes to both Dexie and SQLite mock", async () => {
      const p: Product = {
        id: "prod-test-1",
        name: "عصير برتقال 1 لتر",
        barcode: "6130001001",
        retailPrice: 150,
        costPrice: 100,
        quantity: 50,
        unit: "قطعة",
        category: "مشروبات",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.products.add(p);
      await syncProductCreate(p);

      // تأكيد وجود المنتج في Dexie
      const dexieProduct = await db.products.get("prod-test-1");
      expect(dexieProduct).toBeDefined();
      expect(dexieProduct?.name).toBe("عصير برتقال 1 لتر");

      // تأكيد وجود المنتج في SQLite mock
      const api = (window as any).electronAPI;
      const res = await api.products.get("prod-test-1");
      expect(res.data).toBeDefined();
      expect(res.data.name).toBe("عصير برتقال 1 لتر");
    });

    it("syncProductUpdate updates product in SQLite mock", async () => {
      const p: Product = {
        id: "prod-test-2",
        name: "حليب معقم 1 لتر",
        barcode: "6130001002",
        retailPrice: 120,
        costPrice: 90,
        quantity: 30,
        unit: "قطعة",
        category: "ألبان",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.products.add(p);
      await syncProductCreate(p);

      // تحديث السعر والكمية
      await db.products.update(p.id, { retailPrice: 130, quantity: 25 });
      await syncProductUpdate(p.id, { retailPrice: 130, quantity: 25 });

      const api = (window as any).electronAPI;
      const res = await api.products.get(p.id);
      expect(res.data.retailPrice).toBe(130);
    });

    it("syncProductDelete removes product from SQLite mock", async () => {
      const p: Product = {
        id: "prod-test-3",
        name: "منتج للحذف",
        barcode: "6130001003",
        retailPrice: 50,
        costPrice: 30,
        quantity: 10,
        unit: "قطعة",
        category: "عام",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.products.add(p);
      await syncProductCreate(p);
      await db.products.delete(p.id);
      await syncProductDelete(p.id);

      const api = (window as any).electronAPI;
      const res = await api.products.get(p.id);
      expect(res.data).toBeNull();
    });

    it("syncProductBulkCreate adds multiple products to SQLite mock", async () => {
      const list: Product[] = [
        {
          id: "bulk-1",
          name: "بسكويت شاي",
          barcode: "6130002001",
          retailPrice: 40,
          costPrice: 25,
          quantity: 100,
          unit: "قطعة",
          category: "بسكويت",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "bulk-2",
          name: "شوكولاتة",
          barcode: "6130002002",
          retailPrice: 80,
          costPrice: 50,
          quantity: 60,
          unit: "قطعة",
          category: "حلويات",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];

      await db.products.bulkAdd(list);
      await syncProductBulkCreate(list);

      const api = (window as any).electronAPI;
      const p1 = await api.db.get("products", "bulk-1");
      const p2 = await api.db.get("products", "bulk-2");
      expect(p1.data).toBeDefined();
      expect(p2.data).toBeDefined();
    });
  });

  describe("Barcode Resolution (searchByBarcode)", () => {
    it("resolves product by barcode from SQLite first", async () => {
      const api = (window as any).electronAPI;
      await api.products.create({
        id: "prod-barcode-1",
        name: "زيت طعام 5 لتر",
        barcode: "6139999001",
        retailPrice: 650,
        costPrice: 550,
        status: "active",
      });

      const result = await searchByBarcode("6139999001");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("product");
      expect(result?.product.id).toBe("prod-barcode-1");
      expect(result?.product.name).toBe("زيت طعام 5 لتر");
    });

    it("resolves pack by barcode from SQLite first", async () => {
      const api = (window as any).electronAPI;
      await api.packs.create({
        id: "pack-barcode-1",
        name: "علبة عصير (كرتونة 12 حبة)",
        barcode: "6139999002",
        packPrice: 1500,
        items: [{ productId: "prod-barcode-1", qty: 12 }],
        status: "active",
      });

      const result = await searchByBarcode("6139999002");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("pack");
      expect(result?.pack.id).toBe("pack-barcode-1");
      expect(result?.pack.name).toBe("علبة عصير (كرتونة 12 حبة)");
    });
  });
});
