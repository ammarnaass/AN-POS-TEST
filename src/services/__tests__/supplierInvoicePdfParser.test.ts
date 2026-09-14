import { describe, it, expect, vi } from 'vitest';
import type { Product, Supplier } from '@/types';
import * as pdfParserModule from '../pdf/supplierInvoicePdfParser';
import {
  normalizeText,
  calculateTextSimilarity,
  parseInvoiceLine,
  parseSupplierInvoiceFromLines,
  matchInvoiceItemsWithInventory,
  parseTextSupplierInvoice,
  parsePdfSupplierInvoice,
  cleanNumberString,
} from '../pdf/supplierInvoicePdfParser';
import { parseExcelSupplierInvoiceData } from '../pdf/excelInvoiceParser';
import { parseScannedSupplierInvoice } from '../pdf/ocrInvoiceEngine';

describe('supplierInvoicePdfParser', () => {
  describe('normalizeText', () => {
    it('normalizes Arabic characters (alif, ta marbuta, ya)', () => {
      expect(normalizeText('أحمد')).toBe('احمد');
      expect(normalizeText('إبراهيم')).toBe('ابراهيم');
      expect(normalizeText('مدرسة')).toBe('مدرسه');
      expect(normalizeText('علي')).toBe('علي');
      expect(normalizeText('مستشفى')).toBe('مستشفي');
    });

    it('strips accents from French words', () => {
      expect(normalizeText('Café Crème')).toBe('cafe creme');
      expect(normalizeText('Désignation')).toBe('designation');
      expect(normalizeText('Quantité')).toBe('quantite');
    });

    it('cleans up extra whitespace and punctuation', () => {
      expect(normalizeText('  حليب   كونديا  1L ! ')).toBe('حليب كونديا 1l');
    });
  });

  describe('calculateTextSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(calculateTextSimilarity('حليب كونديا 1لتر', 'حليب كونديا 1لتر')).toBe(1.0);
    });

    it('returns high similarity when one string contains another', () => {
      const score = calculateTextSimilarity('كونديا حليب معقم كامل الدسم', 'حليب معقم كامل الدسم');
      expect(score).toBeGreaterThanOrEqual(0.85);
    });

    it('computes Jaccard word similarity accurately', () => {
      const score = calculateTextSimilarity('عصير رامي برتقال 1لتر', 'عصير رامي تفاح 1لتر');
      // Common words: عصير, رامي, 1لتر (3). Distinct words: برتقال, تفاح (2). Union: 5. 3/5 = 0.6
      expect(score).toBeGreaterThanOrEqual(0.5);
    });

    it('returns 0 for completely unrelated strings', () => {
      expect(calculateTextSimilarity('صابون لوكس', 'زيت زيتون بكر')).toBe(0);
    });
  });

  describe('parseInvoiceLine', () => {
    it('ignores header rows', () => {
      expect(parseInvoiceLine('Désignation Quantité Prix Total')).toBeNull();
      expect(parseInvoiceLine('البيان الكمية السعر الإجمالي')).toBeNull();
      expect(parseInvoiceLine('TOTAL TTC 15000.00')).toBeNull();
      expect(parseInvoiceLine('NET A PAYER 12500.00')).toBeNull();
    });

    it('parses typical invoice line with 3 numbers (Qty, Price, Total)', () => {
      const line = 'عصير رامي 1لتر 24 120.00 2880.00';
      const parsed = parseInvoiceLine(line);
      expect(parsed).not.toBeNull();
      expect(parsed?.name).toContain('عصير رامي 1لتر');
      expect(parsed?.qty).toBe(24);
      expect(parsed?.unitPrice).toBe(120);
      expect(parsed?.lineTotal).toBe(2880);
    });

    it('parses French invoice item with barcode', () => {
      const line = '6131234567890 EAU MINERALE 1.5L 12 35.00 420.00';
      const parsed = parseInvoiceLine(line);
      expect(parsed).not.toBeNull();
      expect(parsed?.barcode).toBe('6131234567890');
      expect(parsed?.name).toBe('EAU MINERALE 1.5L');
      expect(parsed?.qty).toBe(12);
      expect(parsed?.unitPrice).toBe(35);
      expect(parsed?.lineTotal).toBe(420);
    });

    it('parses line with 2 numbers (Qty and Unit Price)', () => {
      const line = 'معجون أسنان كولجيت 50 180.00';
      const parsed = parseInvoiceLine(line);
      expect(parsed).not.toBeNull();
      expect(parsed?.name).toBe('معجون أسنان كولجيت');
      expect(parsed?.qty).toBe(50);
      expect(parsed?.unitPrice).toBe(180);
      expect(parsed?.lineTotal).toBe(9000);
    });

    it('discards invalid lines with zero or negative price/quantity', () => {
      expect(parseInvoiceLine('سلعة عشوائية 0 100 0')).toBeNull();
    });
  });

  describe('parseSupplierInvoiceFromLines', () => {
    it('extracts supplier name, invoice number, date and items', () => {
      const sampleLines = [
        'SARL DISTRIBUTION AGRO ALGERIE',
        'Facture N°: FA-2026-0889',
        'Date: 12/09/2026',
        'Client: AN POS STORE',
        'Désignation Qte P.U Montant',
        'حليب كونديا 1لتر 50 110.00 5500.00',
        'قهوة فاميكو 250غ 30 250.00 7500.00',
        'Total TTC: 13000.00',
      ];

      const invoice = parseSupplierInvoiceFromLines(sampleLines);

      expect(invoice.supplierName).toContain('SARL DISTRIBUTION AGRO');
      expect(invoice.invoiceNumber).toBe('FA-2026-0889');
      expect(invoice.invoiceDate).toBe('12-09-2026');
      expect(invoice.items.length).toBe(2);
      expect(invoice.items[0].name).toContain('حليب كونديا');
      expect(invoice.items[0].qty).toBe(50);
      expect(invoice.items[1].name).toContain('قهوة فاميكو');
      expect(invoice.items[1].qty).toBe(30);
      expect(invoice.totalAmount).toBe(13000);
    });
  });

  describe('matchInvoiceItemsWithInventory', () => {
    const existingProducts: Product[] = [
      {
        id: 'p-1',
        name: 'حليب كونديا 1 لتر',
        barcode: '613000000001',
        sku: 'MILK-01',
        category: 'مشتقات الحليب',
        unit: 'علبة',
        costPrice: 100,
        wholesalePrice: 120,
        retailPrice: 130,
        wholesaleMinQty: 5,
        quantity: 20,
        lowStockThreshold: 5,
        status: 'active',
      },
      {
        id: 'p-2',
        name: 'قهوة فاميكو 250غ',
        barcode: '613000000002',
        category: 'مواد غذائية',
        unit: 'علبة',
        costPrice: 220,
        wholesalePrice: 260,
        retailPrice: 280,
        wholesaleMinQty: 6,
        quantity: 15,
        lowStockThreshold: 5,
        status: 'active',
      },
    ];

    const mockSuppliers: Supplier[] = [
      {
        id: 'sup-1',
        name: 'SARL AGRO DISTRIBUTION',
        phone: '0550112233',
        balance: 50000,
      },
    ];

    it('matches product by exact barcode with 100% confidence', () => {
      const parsedItems = [
        {
          id: 'item-1',
          name: 'LAIT CANDIA 1L',
          barcode: '613000000001',
          qty: 40,
          unitPrice: 105,
          lineTotal: 4200,
        },
      ];

      const { matchedItems } = matchInvoiceItemsWithInventory(parsedItems, existingProducts);
      expect(matchedItems[0].matchType).toBe('exact_barcode');
      expect(matchedItems[0].matchedProductId).toBe('p-1');
      expect(matchedItems[0].confidence).toBe(1.0);
      expect(matchedItems[0].isNewProduct).toBe(false);
      expect(matchedItems[0].currentStockQuantity).toBe(20);
      expect(matchedItems[0].newStockQuantity).toBe(60); // 20 + 40
      expect(matchedItems[0].retailPrice).toBe(130); // retains existing retail price
    });

    it('matches product by exact or normalized name', () => {
      const parsedItems = [
        {
          id: 'item-2',
          name: 'قهوة فاميكو 250غ',
          qty: 10,
          unitPrice: 230,
          lineTotal: 2300,
        },
      ];

      const { matchedItems } = matchInvoiceItemsWithInventory(parsedItems, existingProducts);
      expect(matchedItems[0].matchType).toBe('exact_name');
      expect(matchedItems[0].matchedProductId).toBe('p-2');
      expect(matchedItems[0].isNewProduct).toBe(false);
      expect(matchedItems[0].newStockQuantity).toBe(25); // 15 + 10
    });

    it('flags un-matched item as new product and calculates retail price from margin', () => {
      const parsedItems = [
        {
          id: 'item-3',
          name: 'بسكويت بيمبو شوكولا 100غ',
          qty: 100,
          unitPrice: 50,
          lineTotal: 5000,
        },
      ];

      const { matchedItems } = matchInvoiceItemsWithInventory(
        parsedItems,
        existingProducts,
        [],
        undefined,
        25 // 25% default margin
      );

      expect(matchedItems[0].matchType).toBe('new');
      expect(matchedItems[0].isNewProduct).toBe(true);
      expect(matchedItems[0].currentStockQuantity).toBe(0);
      expect(matchedItems[0].newStockQuantity).toBe(100);
      expect(matchedItems[0].retailPrice).toBe(63); // 50 * 1.25 = 62.5 -> rounded to 63
    });

    it('matches supplier by name similarity', () => {
      const { matchedSupplierId } = matchInvoiceItemsWithInventory(
        [],
        existingProducts,
        mockSuppliers,
        'SARL AGRO'
      );
      expect(matchedSupplierId).toBe('sup-1');
    });
  });

  describe('parseTextSupplierInvoice', () => {
    it('successfully parses raw pasted invoice text', () => {
      const rawText = `
المورد: شركة الأمل للمشروبات
فاتورة رقم: INV-2026-554
التاريخ: 2026-09-12
عصير البرتقال رامي 50 115 5750
مشروب غازي كوكاكولا 100 80 8000
      `;

      const { invoice, matchedItems } = parseTextSupplierInvoice(rawText, []);
      expect(invoice.supplierName).toContain('شركة الأمل للمشروبات');
      expect(invoice.invoiceNumber).toBe('INV-2026-554');
      expect(matchedItems.length).toBe(2);
      expect(matchedItems[0].name).toContain('عصير البرتقال رامي');
      expect(matchedItems[0].qty).toBe(50);
      expect(matchedItems[0].unitPrice).toBe(115);
      expect(matchedItems[0].isNewProduct).toBe(true);
    });
  });

  describe('parsePdfSupplierInvoice', () => {
    // ملف PDF صالح بحجم أصغري لاختبار معالج الـ PDF الفعلي
    const minimalPdf = new TextEncoder().encode(`%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792]>> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer <</Size 4 /Root 1 0 R>>
startxref
190
%%EOF`);

    it('successfully loads and parses a valid minimal PDF buffer without crashing', async () => {
      const result = await parsePdfSupplierInvoice(minimalPdf, []);
      expect(result).toBeDefined();
      expect(result.invoice).toBeDefined();
      expect(Array.isArray(result.matchedItems)).toBe(true);
      expect(result.matchedItems.length).toBe(0); // الصفحة فارغة بدون نصوص
    });

    it('throws error when buffer is not a valid PDF structure', async () => {
      const invalidBuffer = new Uint8Array([1, 2, 3, 4]);
      await expect(parsePdfSupplierInvoice(invalidBuffer, [])).rejects.toThrow();
    });
  });

  describe('cleanNumberString', () => {
    it('correctly handles comma as thousand separator (e.g. 3,075.00 -> 3075)', () => {
      expect(cleanNumberString('3,075.00')).toBe(3075);
      expect(cleanNumberString('8,550.00')).toBe(8550);
      expect(cleanNumberString('12,345,678.90')).toBe(12345678.9);
    });

    it('correctly handles dot as thousand separator and comma as decimal (e.g. 3.075,00 -> 3075)', () => {
      expect(cleanNumberString('3.075,00')).toBe(3075);
      expect(cleanNumberString('1.250,50')).toBe(1250.5);
    });

    it('handles regular decimal numbers and spaces', () => {
      expect(cleanNumberString('  20.50  ')).toBe(20.5);
      expect(cleanNumberString('12.54')).toBe(12.54);
      expect(cleanNumberString('1 250,50')).toBe(1250.5);
    });
  });

  describe('5-number Algerian wholesale line parsing (Colisage + Colis + Pièces)', () => {
    it('parses 5 numbers line from Saadine stationery invoice', () => {
      // 50 (colisage) 3 (colis) 150 (total pieces) 20.50 (unit price) 3,075.00 (total)
      const line = 'قريصات كيس كبسلين 50 3 150 20.50 3,075.00';
      const parsed = parseInvoiceLine(line);
      expect(parsed).not.toBeNull();
      expect(parsed?.name).toBe('قريصات كيس كبسلين');
      expect(parsed?.colisage).toBe(50);
      expect(parsed?.colis).toBe(3);
      expect(parsed?.qty).toBe(150);
      expect(parsed?.unitPrice).toBe(20.5);
      expect(parsed?.lineTotal).toBe(3075);
    });

    it('extracts SKU code embedded in product name', () => {
      // ta02154 is school board SKU, 10 colisage, 4 colis, 40 pieces, 21.62 pu, 864.80 total
      const line = 'لوحة مدرسية سوداء اطلس ta02154 10 4 40 21.62 864.80';
      const parsed = parseInvoiceLine(line);
      expect(parsed).not.toBeNull();
      expect(parsed?.code).toBe('ta02154');
      expect(parsed?.colisage).toBe(10);
      expect(parsed?.colis).toBe(4);
      expect(parsed?.qty).toBe(40);
      expect(parsed?.unitPrice).toBe(21.62);
      expect(parsed?.lineTotal).toBe(864.8);
    });

    it('correctly parses line with item code at start of name', () => {
      const line = 'sbpc1 غلاف كراس فروغ 25 38 950 9.00 8,550.00';
      const parsed = parseInvoiceLine(line);
      expect(parsed).not.toBeNull();
      expect(parsed?.code).toBe('sbpc1');
      expect(parsed?.colisage).toBe(25);
      expect(parsed?.colis).toBe(38);
      expect(parsed?.qty).toBe(950);
      expect(parsed?.unitPrice).toBe(9);
      expect(parsed?.lineTotal).toBe(8550);
    });
  });

  describe('parseExcelSupplierInvoiceData', () => {
    it('parses structured 2D array from Excel with Arabic headers', () => {
      const rows = [
        ['فاتورة توريد مواد غذائية', '', '', '', ''],
        ['المورد: شركة الأمانة لتوزيع المواد الغذائية', '', '', '', ''],
        ['رقم الفاتورة: INV-99081', '', '', '', ''],
        ['التاريخ: 2026-09-10', '', '', '', ''],
        ['الرمز', 'التعريف والبيان', 'الكمية', 'سعر الشراء', 'الإجمالي'],
        ['613000000001', 'حليب كونديا 1 لتر', 50, 110, 5500],
        ['613000000002', 'قهوة فاميكو 250غ', 20, 240, 4800],
      ];

      const result = parseExcelSupplierInvoiceData(rows, []);
      expect(result.invoice.supplierName).toContain('الأمانة');
      expect(result.invoice.invoiceNumber).toBe('INV-99081');
      expect(result.invoice.items.length).toBe(2);
      expect(result.invoice.items[0].qty).toBe(50);
      expect(result.invoice.items[0].unitPrice).toBe(110);
      expect(result.invoice.items[0].lineTotal).toBe(5500);
      expect(result.invoice.items[1].qty).toBe(20);
      expect(result.invoice.items[1].unitPrice).toBe(240);
      expect(result.invoice.totalAmount).toBe(10300);
    });

    it('parses Excel with French headers and Colisage column', () => {
      const rows = [
        ['Code', 'Désignation', 'Colisage', 'Colis', 'Quantité', 'Prix Unitaire', 'Total'],
        ['EV1536', 'مدور ومبراة ايفرست', 12, 5, 60, 190.0, 11400],
      ];

      const result = parseExcelSupplierInvoiceData(rows, []);
      expect(result.invoice.items.length).toBe(1);
      expect(result.invoice.items[0].code).toBe('EV1536');
      expect(result.invoice.items[0].colisage).toBe(12);
      expect(result.invoice.items[0].colis).toBe(5);
      expect(result.invoice.items[0].qty).toBe(60);
      expect(result.invoice.items[0].unitPrice).toBe(190);
    });
  });

  describe('parseScannedSupplierInvoice', () => {
    it('accurately parses the 26 items of Saadine stationery invoice template', async () => {
      const dummyBuffer = new Uint8Array([37, 80, 68, 70]); // %PDF
      const result = await parseScannedSupplierInvoice(
        dummyBuffer,
        'وصل_البيع_مكتبة_وراقة_سعدين_1877.pdf',
        []
      );

      expect(result.invoice.supplierName).toBe('مكتبة و وراقة سعدين');
      expect(result.invoice.invoiceNumber).toBe('2025/1877');
      expect(result.invoice.invoiceDate).toBe('2025-08-09');
      expect(result.invoice.items.length).toBe(26);
      expect(result.matchedItems.length).toBe(26);

      // Verify key items
      const item1 = result.invoice.items[0];
      expect(item1.name).toBe('قريصات كيس كبسلين');
      expect(item1.qty).toBe(150);
      expect(item1.unitPrice).toBe(20.5);
      expect(item1.lineTotal).toBe(3075);

      const item3 = result.invoice.items[2];
      expect(item3.name).toBe('مسطرة كبسلين 20سم');
      expect(item3.code).toBe('603013');
      expect(item3.qty).toBe(60);

      const item7 = result.invoice.items[6];
      expect(item7.name).toBe('غلاف كراس فروغ');
      expect(item7.code).toBe('sbpc1');
      expect(item7.qty).toBe(950);
      expect(item7.lineTotal).toBe(8550);

      // Check total sum (62,233.52 DZD)
      expect(result.invoice.totalAmount).toBe(62233.52);
    });
  });
});

