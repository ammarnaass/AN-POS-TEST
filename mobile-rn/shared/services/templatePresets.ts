// Print Template Presets — Pre-made templates for quick start
import type {
  PrintTemplate, PaperSize, DocTypeKey, Block,
  TextBlock, ImageBlock, RowBlock, ColumnBlock,
  TableBlock, SeparatorBlock, QrBlock, BarcodeBlock,
} from '../types/invoicePrint';

export interface PresetDef {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  paperSize: PaperSize;
  category: 'receipt' | 'invoice' | 'document';
  build: () => Omit<PrintTemplate, 'id' | 'createdAt' | 'updatedAt'>;
}

let _seq = 0;
function uid(): string { return `blk-${Date.now()}-${++_seq}`; }

function txt(text: string, opts?: Partial<TextBlock>): TextBlock {
  return { id: uid(), type: 'text', text, align: 'center', size: 'md', weight: 400, ...opts };
}

function img(src: string, w = 60, h = 60): ImageBlock {
  return { id: uid(), type: 'image', src, width: w, height: h, align: 'center' };
}

function row(children: Block[], align: RowBlock['align'] = 'space-between'): RowBlock {
  return { id: uid(), type: 'row', children, gap: 4, align };
}

function col(children: Block[]): ColumnBlock {
  return { id: uid(), type: 'column', children, gap: 4 };
}

function sep(style: SeparatorBlock['style'] = 'dashed', thickness: SeparatorBlock['thickness'] = 1): SeparatorBlock {
  return { id: uid(), type: 'separator', style, thickness };
}

function tbl(opts?: Partial<TableBlock>): TableBlock {
  return {
    id: uid(), type: 'table', source: 'items',
    columns: [
      { key: 'name', label: 'Produit' },
      { key: 'qty', label: 'Qte', format: 'number', align: 'center' },
      { key: 'unitPrice', label: 'Prix', format: 'currency', align: 'left' },
      { key: 'lineTotal', label: 'Total', format: 'currency', align: 'left' },
    ],
    showSubtotal: true, showDiscount: true, showTva: true, showTotal: true,
    ...opts,
  };
}

function qr(payload: QrBlock['payload'] = 'invoiceNumber', size = 110): QrBlock {
  return { id: uid(), type: 'qr', payload, size };
}

function barcode(source: BarcodeBlock['source'] = 'invoiceNumber', w = 200, h = 50): BarcodeBlock {
  return { id: uid(), type: 'barcode', source, format: 'CODE128', width: w, height: h };
}

// ═══════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════

export const TEMPLATE_PRESETS: PresetDef[] = [
  // ─── 1. Thermal 80mm (standard receipt) ───
  {
    id: 'preset-thermal-80',
    name: 'Recu thermique 80mm',
    nameAr: 'إيصال حراري 80 ملم',
    description: 'Recu standard avec logo, tableau, total et QR code',
    paperSize: '80mm',
    category: 'receipt',
    build: () => ({
      name: 'Recu thermique 80mm',
      description: 'Recu standard 80mm',
      paperSize: '80mm',
      orientation: 'portrait',
      widthMm: 80,
      supportedDocuments: ['thermal-receipt', 'sale-invoice'],
      visibility: {
        logo: true, shopName: true, invoiceNumber: true,
        customerName: true, customerPhone: false, customerAddress: false,
        barcode: false, unitPrice: true, discount: true,
        tva: false, sellerName: false, cashierName: true,
        paymentMethod: true, qr: true, signature: false, stamp: false,
      },
      layout: {
        header: [
          img('{{shopLegal.logo}}', 50, 50),
          txt('{{shopLegal.name}}', { weight: 700, size: 'lg' }),
          txt('{{shopLegal.address}}', { size: 'sm', weight: 300 }),
          txt('{{shopLegal.phone}}', { size: 'sm', weight: 300 }),
          sep('dashed', 1),
        ],
        body: [
          txt('Facture {{invoice.number}}', { weight: 600 }),
          txt('{{invoice.date}}', { size: 'sm' }),
          txt('Client: {{invoice.customerName}}', { size: 'sm' }),
          sep('dashed', 1),
          tbl(),
          sep('dashed', 1),
        ],
        footer: [
          qr('invoiceNumber', 100),
          txt('{{shopLegal.footer}}', { size: 'sm', weight: 300 }),
          txt('{{user.name}}', { size: 'sm' }),
        ],
      },
      styles: {
        primaryColor: '#0891b2', headerColor: '#0e7490',
        footerColor: '#475569', tableColor: '#e2e8f0', logoColor: '#0891b2',
        font: { family: 'Cairo', size: 11, weight: 400 },
      },
      qr: { enabled: true, payload: 'invoiceNumber' },
      barcode: { enabled: false, source: 'invoiceNumber' },
      isDefault: false, isSystem: false, createdBy: 'preset',
    }),
  },

  // ─── 2. Thermal 58mm (compact) ───
  {
    id: 'preset-thermal-58',
    name: 'Recu thermique 58mm',
    nameAr: 'إيصال حراري 58 ملم',
    description: 'Recu compact pour impression thermique etroite',
    paperSize: '58mm',
    category: 'receipt',
    build: () => ({
      name: 'Recu thermique 58mm',
      description: 'Recu compact 58mm',
      paperSize: '58mm',
      orientation: 'portrait',
      widthMm: 58,
      supportedDocuments: ['thermal-receipt'],
      visibility: {
        logo: false, shopName: true, invoiceNumber: true,
        customerName: false, customerPhone: false, customerAddress: false,
        barcode: false, unitPrice: true, discount: false,
        tva: false, sellerName: false, cashierName: false,
        paymentMethod: true, qr: false, signature: false, stamp: false,
      },
      layout: {
        header: [
          txt('{{shopLegal.name}}', { weight: 700, size: 'md' }),
          txt('{{shopLegal.phone}}', { size: 'sm', weight: 300 }),
          sep('solid', 1),
        ],
        body: [
          txt('#{{invoice.number}}', { weight: 600, size: 'sm' }),
          txt('{{invoice.date}}', { size: 'sm' }),
          sep('solid', 1),
          tbl({
            columns: [
              { key: 'name', label: 'Produit' },
              { key: 'qty', label: 'x', format: 'number', align: 'center' },
              { key: 'lineTotal', label: 'Total', format: 'currency', align: 'left' },
            ],
            showSubtotal: false, showDiscount: false, showTva: false, showTotal: true,
          }),
          sep('solid', 1),
        ],
        footer: [
          txt('Total: {{invoice.total}} دج', { weight: 700 }),
          txt('{{invoice.paymentMethod}}', { size: 'sm' }),
          txt('{{shopLegal.footer}}', { size: 'sm', weight: 300 }),
        ],
      },
      styles: {
        primaryColor: '#000000', headerColor: '#333333',
        footerColor: '#666666', tableColor: '#f0f0f0', logoColor: '#000000',
        font: { family: 'Cairo', size: 9, weight: 400 },
      },
      qr: { enabled: false, payload: 'invoiceNumber' },
      barcode: { enabled: false, source: 'invoiceNumber' },
      isDefault: false, isSystem: false, createdBy: 'preset',
    }),
  },

  // ─── 3. A4 Sale Invoice ───
  {
    id: 'preset-a4-invoice',
    name: 'Facture de vente A4',
    nameAr: 'فاتورة بيع A4',
    description: 'Facture complete avec en-tete, client, tableau, totaux et signature',
    paperSize: 'A4',
    category: 'invoice',
    build: () => ({
      name: 'Facture de vente A4',
      description: 'Facture complete A4',
      paperSize: 'A4',
      orientation: 'portrait',
      widthMm: 210,
      heightMm: 297,
      supportedDocuments: ['sale-invoice', 'return-invoice'],
      visibility: {
        logo: true, shopName: true, invoiceNumber: true,
        customerName: true, customerPhone: true, customerAddress: true,
        barcode: true, unitPrice: true, discount: true,
        tva: true, sellerName: true, cashierName: true,
        paymentMethod: true, qr: true, signature: true, stamp: false,
      },
      layout: {
        header: [
          row([img('{{shopLegal.logo}}', 70, 70), col([
            txt('{{shopLegal.name}}', { weight: 700, size: 'lg', align: 'right' }),
            txt('{{shopLegal.address}}', { size: 'sm', align: 'right' }),
            txt('Tel: {{shopLegal.phone}} | NIF: {{shopLegal.nif}}', { size: 'sm', align: 'right' }),
          ])]),
          sep('solid', 2),
          row([
            col([
              txt('Facture N° {{invoice.number}}', { weight: 600, align: 'right' }),
              txt('Date: {{invoice.date}}', { size: 'sm', align: 'right' }),
            ]),
            col([
              txt('Client: {{invoice.customerName}}', { weight: 500, align: 'left' }),
              txt('Tel: {{invoice.customerPhone}}', { size: 'sm', align: 'left' }),
            ]),
          ]),
          sep('dashed', 1),
        ],
        body: [
          tbl({
            columns: [
              { key: 'name', label: 'Designation' },
              { key: 'qty', label: 'Qte', format: 'number', align: 'center' },
              { key: 'unitPrice', label: 'Prix U.', format: 'currency', align: 'left' },
              { key: 'discount', label: 'Remise', format: 'currency', align: 'left' },
              { key: 'lineTotal', label: 'Total', format: 'currency', align: 'left' },
            ],
            showSubtotal: true, showDiscount: true, showTva: true, showTotal: true,
          }),
          sep('solid', 1),
          row([
            txt('Vendeur: {{invoice.soldBy}}', { size: 'sm', align: 'right' }),
            txt('Mode: {{invoice.paymentMethod}}', { size: 'sm', align: 'left' }),
          ]),
        ],
        footer: [
          sep('dashed', 1),
          row([
            txt('Signature client', { size: 'sm' }),
            txt('Cachet et signature', { size: 'sm' }),
          ]),
          barcode('invoiceNumber', 200, 40),
          txt('{{shopLegal.footer}}', { size: 'sm', weight: 300 }),
        ],
      },
      styles: {
        primaryColor: '#1d4ed8', headerColor: '#1e40af',
        footerColor: '#64748b', tableColor: '#dbeafe', logoColor: '#1d4ed8',
        font: { family: 'Cairo', size: 13, weight: 400 },
      },
      qr: { enabled: true, payload: 'invoiceNumber' },
      barcode: { enabled: true, source: 'invoiceNumber' },
      isDefault: false, isSystem: false, createdBy: 'preset',
    }),
  },

  // ─── 4. A5 Proforma ───
  {
    id: 'preset-a5-proforma',
    name: 'Facture proforma A5',
    nameAr: 'فاتورة أولية A5',
    description: 'Facture proforma pour devis et estimations',
    paperSize: 'A5',
    category: 'invoice',
    build: () => ({
      name: 'Facture proforma A5',
      description: 'Proforma A5',
      paperSize: 'A5',
      orientation: 'portrait',
      widthMm: 148,
      heightMm: 210,
      supportedDocuments: ['proforma', 'devis'],
      visibility: {
        logo: true, shopName: true, invoiceNumber: true,
        customerName: true, customerPhone: true, customerAddress: false,
        barcode: false, unitPrice: true, discount: true,
        tva: true, sellerName: false, cashierName: false,
        paymentMethod: false, qr: false, signature: false, stamp: false,
      },
      layout: {
        header: [
          row([img('{{shopLegal.logo}}', 50, 50), col([
            txt('{{shopLegal.name}}', { weight: 700, size: 'lg', align: 'right' }),
            txt('{{shopLegal.phone}}', { size: 'sm', align: 'right' }),
          ])]),
          sep('solid', 1),
          txt('FACTURE PROFORMA', { weight: 700, size: 'lg' }),
          row([
            txt('N° {{invoice.number}}', { size: 'sm', align: 'right' }),
            txt('{{invoice.date}}', { size: 'sm', align: 'left' }),
          ]),
          txt('Client: {{invoice.customerName}}', { size: 'sm', align: 'right' }),
          sep('dashed', 1),
        ],
        body: [
          tbl({
            columns: [
              { key: 'name', label: 'Designation' },
              { key: 'qty', label: 'Qte', format: 'number', align: 'center' },
              { key: 'unitPrice', label: 'Prix U.', format: 'currency', align: 'left' },
              { key: 'lineTotal', label: 'Total', format: 'currency', align: 'left' },
            ],
            showSubtotal: true, showDiscount: true, showTva: true, showTotal: true,
          }),
        ],
        footer: [
          sep('dashed', 1),
          txt('Conditions de paiement: a definir', { size: 'sm', weight: 300 }),
          txt('{{shopLegal.footer}}', { size: 'sm', weight: 300 }),
        ],
      },
      styles: {
        primaryColor: '#059669', headerColor: '#047857',
        footerColor: '#64748b', tableColor: '#d1fae5', logoColor: '#059669',
        font: { family: 'Cairo', size: 12, weight: 400 },
      },
      qr: { enabled: false, payload: 'invoiceNumber' },
      barcode: { enabled: false, source: 'invoiceNumber' },
      isDefault: false, isSystem: false, createdBy: 'preset',
    }),
  },

  // ─── 5. Devis / Quote A4 ───
  {
    id: 'preset-a4-devis',
    name: 'Devis A4',
    nameAr: 'عرض سعر A4',
    description: 'Devis et estimation pour client',
    paperSize: 'A4',
    category: 'document',
    build: () => ({
      name: 'Devis A4',
      description: 'Devis A4',
      paperSize: 'A4',
      orientation: 'portrait',
      widthMm: 210,
      heightMm: 297,
      supportedDocuments: ['devis'],
      visibility: {
        logo: true, shopName: true, invoiceNumber: true,
        customerName: true, customerPhone: true, customerAddress: true,
        barcode: false, unitPrice: true, discount: true,
        tva: true, sellerName: true, cashierName: false,
        paymentMethod: false, qr: false, signature: true, stamp: false,
      },
      layout: {
        header: [
          row([img('{{shopLegal.logo}}', 60, 60), col([
            txt('{{shopLegal.name}}', { weight: 700, size: 'lg', align: 'right' }),
            txt('{{shopLegal.address}}', { size: 'sm', align: 'right' }),
          ])]),
          sep('solid', 2),
          txt('DEVIS / QUOTATION', { weight: 700, size: 'lg' }),
          row([
            col([
              txt('N° {{invoice.number}}', { weight: 500, align: 'right' }),
              txt('Date: {{invoice.date}}', { size: 'sm', align: 'right' }),
            ]),
            col([
              txt('Client: {{invoice.customerName}}', { weight: 500, align: 'left' }),
              txt('Tel: {{invoice.customerPhone}}', { size: 'sm', align: 'left' }),
            ]),
          ]),
          sep('dashed', 1),
        ],
        body: [
          tbl({
            columns: [
              { key: 'name', label: 'Designation' },
              { key: 'qty', label: 'Qte', format: 'number', align: 'center' },
              { key: 'unitPrice', label: 'Prix U.', format: 'currency', align: 'left' },
              { key: 'lineTotal', label: 'Total', format: 'currency', align: 'left' },
            ],
            showSubtotal: true, showDiscount: true, showTva: true, showTotal: true,
          }),
        ],
        footer: [
          sep('dashed', 1),
          txt('Ce devis est valable 30 jours', { size: 'sm', weight: 300 }),
          row([
            txt('Signature client', { size: 'sm' }),
            txt('Cachet', { size: 'sm' }),
          ]),
          txt('{{shopLegal.footer}}', { size: 'sm', weight: 300 }),
        ],
      },
      styles: {
        primaryColor: '#a16207', headerColor: '#854d0e',
        footerColor: '#44403c', tableColor: '#fef3c7', logoColor: '#a16207',
        font: { family: 'Cairo', size: 13, weight: 400 },
      },
      qr: { enabled: false, payload: 'invoiceNumber' },
      barcode: { enabled: false, source: 'invoiceNumber' },
      isDefault: false, isSystem: false, createdBy: 'preset',
    }),
  },

  // ─── 6. Customer Statement A4 ───
  {
    id: 'preset-a4-statement',
    name: 'Releve de compte A4',
    nameAr: 'كشف حساب A4',
    description: 'Releve de compte client avec historique',
    paperSize: 'A4',
    category: 'document',
    build: () => ({
      name: 'Releve de compte A4',
      description: 'Releve client A4',
      paperSize: 'A4',
      orientation: 'portrait',
      widthMm: 210,
      heightMm: 297,
      supportedDocuments: ['customer-statement', 'supplier-statement'],
      visibility: {
        logo: true, shopName: true, invoiceNumber: true,
        customerName: true, customerPhone: true, customerAddress: false,
        barcode: false, unitPrice: false, discount: false,
        tva: false, sellerName: false, cashierName: false,
        paymentMethod: false, qr: false, signature: false, stamp: false,
      },
      layout: {
        header: [
          row([img('{{shopLegal.logo}}', 50, 50), col([
            txt('{{shopLegal.name}}', { weight: 700, size: 'lg', align: 'right' }),
            txt('{{shopLegal.phone}}', { size: 'sm', align: 'right' }),
          ])]),
          sep('solid', 1),
          txt('RELEVE DE COMPTE', { weight: 700, size: 'lg' }),
          row([
            txt('Client: {{invoice.customerName}}', { weight: 500, align: 'right' }),
            txt('Date: {{invoice.date}}', { size: 'sm', align: 'left' }),
          ]),
          sep('dashed', 1),
        ],
        body: [
          tbl({
            columns: [
              { key: 'name', label: 'Reference' },
              { key: 'qty', label: 'Details', format: 'number', align: 'center' },
              { key: 'lineTotal', label: 'Montant', format: 'currency', align: 'left' },
            ],
            showSubtotal: true, showDiscount: false, showTva: false, showTotal: true,
          }),
          sep('solid', 1),
          txt('Solde: {{invoice.total}} دج', { weight: 700, size: 'lg' }),
        ],
        footer: [
          sep('dashed', 1),
          txt('{{shopLegal.footer}}', { size: 'sm', weight: 300 }),
        ],
      },
      styles: {
        primaryColor: '#475569', headerColor: '#334155',
        footerColor: '#64748b', tableColor: '#e2e8f0', logoColor: '#475569',
        font: { family: 'Cairo', size: 13, weight: 400 },
      },
      qr: { enabled: false, payload: 'invoiceNumber' },
      barcode: { enabled: false, source: 'invoiceNumber' },
      isDefault: false, isSystem: false, createdBy: 'preset',
    }),
  },
];

export function getPresetById(id: string): PresetDef | undefined {
  return TEMPLATE_PRESETS.find((p) => p.id === id);
}

export function getPresetTemplateData(id: string): Omit<PrintTemplate, 'id' | 'createdAt' | 'updatedAt'> | undefined {
  const preset = getPresetById(id);
  return preset?.build();
}
