// Print Template Engine — POS-PRINT-001
// يدعم:
// 1. اتجاه RTL التام للغة العربية وثنائية اللغة (Arabic / Bilingual)
// 2. اتجاه LTR التام للغات الأجنبية (French / English)
// 3. محاذاة مرنة وتلقائية للنصوص والتسميات والأعمدة والأرقام
// 4. توليد QR Code و Barcode فوري 0ms بدون إنترنت

import QRCode from 'qrcode';
import type {
  Block,
  DocumentContext,
  PrintTemplate,
  QrBlock,
  BarcodeBlock,
  TableBlock,
  TextBlock,
  RowBlock,
  ColumnBlock,
  ImageBlock,
  SeparatorBlock,
  PrintLanguage,
} from '@/types/invoicePrint';
import { paperSpec } from './paperSizes';

// قاموس الترجمة الشامل لطباعة الفواتير
export const PRINT_TRANSLATIONS: Record<string, Record<PrintLanguage, string>> = {
  invoice: { ar: 'فاتورة', fr: 'Facture', en: 'Invoice', 'ar-fr': 'فاتورة / Facture' },
  receipt: { ar: 'وصل شراء', fr: 'Ticket de Caisse', en: 'Receipt', 'ar-fr': 'وصل / Ticket' },
  invoiceNumber: { ar: 'رقم الفاتورة', fr: 'N° Facture', en: 'Invoice No', 'ar-fr': 'رقم / N°' },
  date: { ar: 'التاريخ', fr: 'Date', en: 'Date', 'ar-fr': 'التاريخ / Date' },
  customer: { ar: 'الزبون', fr: 'Client', en: 'Customer', 'ar-fr': 'الزبون / Client' },
  phone: { ar: 'الهاتف', fr: 'Tél', en: 'Phone', 'ar-fr': 'الهاتف / Tél' },
  cashier: { ar: 'الكاشير', fr: 'Caissier', en: 'Cashier', 'ar-fr': 'الكاشير / Caissier' },
  paymentMethod: { ar: 'طريقة الدفع', fr: 'Paiement', en: 'Payment', 'ar-fr': 'الدفع / Paiement' },
  item: { ar: 'المنتج', fr: 'Désignation', en: 'Item', 'ar-fr': 'المنتج / Désignation' },
  qty: { ar: 'الكمية', fr: 'Qté', en: 'Qty', 'ar-fr': 'الكمية / Qté' },
  unitPrice: { ar: 'السعر', fr: 'P.U', en: 'Price', 'ar-fr': 'السعر / P.U' },
  total: { ar: 'الإجمالي', fr: 'Total', en: 'Total', 'ar-fr': 'الإجمالي / Total' },
  subtotal: { ar: 'المجموع الفرعي', fr: 'Sous-Total', en: 'Subtotal', 'ar-fr': 'المجموع الفرعي / S-Total' },
  discount: { ar: 'الخصم', fr: 'Remise', en: 'Discount', 'ar-fr': 'الخصم / Remise' },
  tva: { ar: 'TVA', fr: 'TVA', en: 'VAT', 'ar-fr': 'TVA' },
  netToPay: { ar: 'الصافي للدفع', fr: 'Net à Payer', en: 'Net to Pay', 'ar-fr': 'الصافي / Net à Payer' },
  paid: { ar: 'المدفوع', fr: 'Payé', en: 'Paid', 'ar-fr': 'المدفوع / Payé' },
  change: { ar: 'المتبقي', fr: 'Rendu', en: 'Change', 'ar-fr': 'المتبقي / Rendu' },
  thankYou: { ar: 'شكراً لتسوقكم معنا', fr: 'Merci pour votre visite', en: 'Thank you for your visit', 'ar-fr': 'شكراً لتسوقكم معنا / Merci' },
  cash: { ar: 'نقداً', fr: 'Espèces', en: 'Cash', 'ar-fr': 'نقداً / Espèces' },
  credit: { ar: 'آجل (دين)', fr: 'À terme (Crédit)', en: 'Credit', 'ar-fr': 'آجل / Crédit' },
  currency: { ar: 'دج', fr: 'DA', en: 'DZD', 'ar-fr': 'دج / DA' },
};

export function t(key: string, lang: PrintLanguage = 'ar'): string {
  const item = PRINT_TRANSLATIONS[key];
  if (!item) return key;
  return item[lang] ?? item.ar ?? key;
}

function translateStaticLabel(text: string, lang: PrintLanguage): string {
  if (lang === 'ar') return text;
  const trimmed = text.trim();
  const labelMap: Record<string, string> = {
    'رقم الفاتورة': t('invoiceNumber', lang),
    'رقم الفاتورة:': t('invoiceNumber', lang) + ':',
    'فاتورة': t('invoice', lang),
    'فاتورة:': t('invoice', lang) + ':',
    'التاريخ': t('date', lang),
    'التاريخ:': t('date', lang) + ':',
    'الزبون': t('customer', lang),
    'الزبون:': t('customer', lang) + ':',
    'الهاتف': t('phone', lang),
    'الهاتف:': t('phone', lang) + ':',
    'الكاشير': t('cashier', lang),
    'الكاشير:': t('cashier', lang) + ':',
    'البائع': t('cashier', lang),
    'البائع:': t('cashier', lang) + ':',
    'طريقة الدفع': t('paymentMethod', lang),
    'طريقة الدفع:': t('paymentMethod', lang) + ':',
    'المجموع الفرعي': t('subtotal', lang),
    'المجموع الفرعي:': t('subtotal', lang) + ':',
    'الخصم': t('discount', lang),
    'الخصم:': t('discount', lang) + ':',
    'TVA': t('tva', lang),
    'TVA:': t('tva', lang) + ':',
    'الإجمالي': t('total', lang),
    'الإجمالي:': t('total', lang) + ':',
    'شكراً لتسوقكم معنا': t('thankYou', lang),
    'شكراً لزيارتكم': t('thankYou', lang),
  };
  return labelMap[trimmed] ?? text;
}

function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

// عرض الأرقام والحسابات بدقة كاملة
export function formatFullNumber(v: unknown, minDecimals: number = 0, maxDecimals: number = 2): string {
  if (v === null || v === undefined) return '0';
  const num = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(num)) return String(v);

  if (Number.isInteger(num) && minDecimals === 0) {
    return num.toLocaleString('en-US');
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatFullCurrency(v: unknown, lang: PrintLanguage = 'ar'): string {
  const formattedNum = formatFullNumber(v, 2, 2);
  const curSymbol = t('currency', lang);
  return `${formattedNum} ${curSymbol}`;
}

function formatValue(v: unknown, lang: PrintLanguage = 'ar'): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    return formatFullNumber(v, 2, 2);
  }
  if (v instanceof Date) {
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'ar-DZ';
    return v.toLocaleDateString(locale);
  }
  return String(v);
}

function interpolate(text: string, ctx: DocumentContext): string {
  const lang = ctx.lang || 'ar';
  const translatedText = translateStaticLabel(text, lang);

  return translatedText.replace(/\{\{\s*([\w.]+)\s*(?::\s*(\w+)\s*)?\}\}/g, (_m, path: string, fmtKind: string | undefined) => {
    const aliasMap: Record<string, string> = {
      store_name: 'shopLegal.name',
      shop_name: 'shopLegal.name',
      store_phone: 'shopLegal.phone',
      store_address: 'shopLegal.address',
      store_email: 'shopLegal.email',
      tax_number: 'shopLegal.taxNumber',
      nif: 'shopLegal.nif',
      invoice_number: 'invoice.number',
      invoice_date: 'invoice.date',
      invoice_total: 'invoice.total',
      total: 'invoice.total',
      subtotal: 'invoice.subtotal',
      tax_amount: 'invoice.tvaAmount',
      cashier_name: 'user.name',
      cashier: 'user.name',
    };
    const resolvedPath = aliasMap[path] ?? path;
    let value: unknown;
    if (resolvedPath.includes('.')) {
      const [root, ...rest] = resolvedPath.split('.');
      const rootKey = root as 'invoice' | 'settings' | 'shopLegal' | 'user';
      const rootNode = ctx[rootKey];
      if (rootNode && typeof rootNode === 'object') {
        value = getPath(rootNode as Record<string, unknown>, rest.join('.'));
      } else {
        value = undefined;
      }
    } else {
      value = (ctx as unknown as Record<string, unknown>)[resolvedPath];
    }

    if (fmtKind === 'currency') return formatFullCurrency(value, lang);
    if (fmtKind === 'number') return formatFullNumber(value, 0, 2);
    return formatValue(value, lang);
  });
}

function colorVar(
  name: string | undefined,
  fallback: string,
  vars: Record<string, string>,
  customColor?: string,
): string {
  if (!name || name === 'none' || !vars) return fallback;
  if (name === 'custom') {
    return customColor && /^#?[0-9a-fA-F]{3,8}$/.test(customColor)
      ? customColor.startsWith('#')
        ? customColor
        : '#' + customColor
      : fallback;
  }
  const v = vars[name];
  return v ?? fallback;
}

function styleVars(styles: PrintTemplate['styles']): Record<string, string> {
  return {
    primary: styles.primaryColor,
    header: styles.headerColor,
    footer: styles.footerColor,
    table: styles.tableColor,
    logo: styles.logoColor,
  };
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: '11px',
  md: '13px',
  lg: '16px',
  xl: '22px',
};

// حل ذكي لمحاذاة النص متوافق مع RTL / LTR
function resolveTextAlign(align: 'right' | 'center' | 'left' | undefined, isRtl: boolean): string {
  if (!align || align === 'center') return align || (isRtl ? 'right' : 'left');
  if (isRtl) {
    return align; // في RTL: right هو البداية و left هو النهاية
  } else {
    // في LTR (الفرنسية / الإنجليزية): عكس right و left لتكون التسمية في البداية والقيمة في النهاية
    return align === 'right' ? 'left' : 'right';
  }
}

function renderText(b: TextBlock, ctx: DocumentContext, vars: Record<string, string>): string {
  const sizeKey = b.size ?? 'md';
  const size = SIZE_MAP[sizeKey] ?? SIZE_MAP.md;
  const isRtl = ctx.lang === 'ar' || ctx.lang === 'ar-fr';
  const align = resolveTextAlign(b.align, isRtl);
  const color = b.colorVar ? colorVar(b.colorVar, '#000', vars, b.customColor) : 'inherit';
  const weight = b.weight ?? 400;
  const lines = Array.isArray(b.text) ? b.text : [b.text];

  return lines
    .map((l) => {
      const interpolated = interpolate(l, ctx);
      return (
        '<div style="font-size:' +
        size +
        ';text-align:' +
        align +
        ';font-weight:' +
        weight +
        ';color:' +
        color +
        ';line-height:1.5;word-break:break-word;">' +
        esc(interpolated) +
        '</div>'
      );
    })
    .join('');
}

function renderImage(b: ImageBlock, ctx: DocumentContext): string {
  const align = b.align ?? 'center';
  const w = b.width ?? 80;
  const h = b.height ?? 80;
  const src = b.src || ctx.shopLegal.logo || '';
  if (!src) return '';
  const style = 'width:' + w + 'px;height:' + h + 'px;object-fit:contain;display:inline-block;';
  return (
    '<div style="text-align:' +
    align +
    ';margin:6px 0;">' +
    '<img src="' +
    esc(src) +
    '" alt="logo" style="' +
    style +
    '" />' +
    '</div>'
  );
}

function renderSeparator(b: SeparatorBlock, vars: Record<string, string>): string {
  const s = b.style ?? 'dashed';
  const thickness = b.thickness ?? 1;
  const color = b.colorVar ? colorVar(b.colorVar, '#cbd5e1', vars, b.customColor) : '#cbd5e1';
  return '<hr style="border:none;border-top:' + thickness + 'px ' + s + ' ' + color + ';margin:6px 0;" />';
}

function renderRow(b: RowBlock, ctx: DocumentContext, vars: Record<string, string>): string {
  const gap = b.gap ?? 8;
  const justify = b.align ?? 'space-between';
  const inner = b.children.map((c) => renderBlock(c, ctx, vars)).join('');
  const style =
    'display:flex;flex-direction:row;justify-content:' +
    justify +
    ';gap:' +
    gap +
    'px;align-items:center;width:100%;';
  return '<div style="' + style + '">' + inner + '</div>';
}

function renderColumn(b: ColumnBlock, ctx: DocumentContext, vars: Record<string, string>): string {
  const gap = b.gap ?? 8;
  const inner = b.children.map((c) => renderBlock(c, ctx, vars)).join('');
  return '<div style="display:flex;flex-direction:column;gap:' + gap + 'px;width:100%;">' + inner + '</div>';
}

function formatCol(
  item: Record<string, unknown>,
  c: { key: string; format?: 'text' | 'number' | 'currency' },
  lang: PrintLanguage = 'ar',
): string {
  const v = (item as Record<string, unknown>)[c.key];
  if (c.format === 'currency') return formatFullNumber(v, 2, 2);
  if (c.format === 'number') return formatFullNumber(v, 0, 2);
  return v === undefined || v === null ? '' : String(v);
}

function renderTable(b: TableBlock, ctx: DocumentContext, vars: Record<string, string>): string {
  const inv = ctx.invoice as { items?: Array<Record<string, unknown>> };
  const items = inv?.items ?? [];
  const colCount = b.columns.length;
  const tableColor = vars.table ?? '#e2e8f0';
  const tank = vars.header ?? '#0e7490';
  const primary = vars.primary ?? '#0891b2';
  const lang = ctx.lang || 'ar';
  const isRtl = lang === 'ar' || lang === 'ar-fr';

  let html = '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;">';

  // الرأس (Header)
  html += '<thead><tr style="background:' + tank + ';color:#fff;">';
  for (const c of b.columns) {
    const isNum = c.format === 'currency' || c.format === 'number';
    const a = c.align === 'center' ? 'center' : isNum ? (isRtl ? 'left' : 'right') : (isRtl ? 'right' : 'left');

    let label = c.label;
    if (c.key === 'name') label = t('item', lang);
    else if (c.key === 'qty') label = t('qty', lang);
    else if (c.key === 'unitPrice') label = t('unitPrice', lang);
    else if (c.key === 'lineTotal') label = t('total', lang);

    const thStyle =
      'text-align:' +
      a +
      ';padding:5px 6px;font-weight:700;border:1px solid ' +
      tableColor +
      ';white-space:nowrap;';
    html += '<th style="' + thStyle + '">' + esc(label) + '</th>';
  }
  html += '</tr></thead>';

  // جسم الجدول (Items Body)
  html += '<tbody>';
  for (const it of items) {
    html += '<tr>';
    for (const c of b.columns) {
      const isNumeric = c.format === 'currency' || c.format === 'number';
      const a = c.align === 'center' ? 'center' : isNumeric ? (isRtl ? 'left' : 'right') : (isRtl ? 'right' : 'left');
      const tdStyle =
        'text-align:' +
        a +
        ';padding:4px 6px;border:1px solid ' +
        tableColor +
        ';' +
        (isNumeric ? 'font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:600;' : 'word-break:break-word;');
      html += '<td style="' + tdStyle + '">' + esc(formatCol(it, c, lang)) + '</td>';
    }
    html += '</tr>';
  }
  html += '</tbody>';

  // التذييل والإجماليات (Totals Footer)
  if (b.showSubtotal || b.showTotal || b.showDiscount || b.showTva) {
    const alignLabel = isRtl ? 'right' : 'left';
    const alignVal = isRtl ? 'left' : 'right';
    html += '<tfoot>';

    if (b.showSubtotal) {
      const subtotalVal = formatFullNumber(getPath(ctx.invoice as Record<string, unknown>, 'subtotal'), 2, 2);
      html +=
        '<tr><td colspan="' +
        (colCount - 1) +
        '" style="text-align:' +
        alignLabel +
        ';padding:3px 6px;font-weight:bold;">' +
        t('subtotal', lang) +
        ':</td>';
      html +=
        '<td style="text-align:' +
        alignVal +
        ';padding:3px 6px;font-weight:bold;font-variant-numeric:tabular-nums;white-space:nowrap;">' +
        subtotalVal +
        '</td></tr>';
    }

    if (b.showDiscount && Number((ctx.invoice as Record<string, unknown>)?.discount) > 0) {
      const discVal = formatFullNumber(getPath(ctx.invoice as Record<string, unknown>, 'discount'), 2, 2);
      html +=
        '<tr><td colspan="' +
        (colCount - 1) +
        '" style="text-align:' +
        alignLabel +
        ';padding:3px 6px;color:#dc2626;">' +
        t('discount', lang) +
        ':</td>';
      html +=
        '<td style="text-align:' +
        alignVal +
        ';padding:3px 6px;color:#dc2626;font-variant-numeric:tabular-nums;white-space:nowrap;">-' +
        discVal +
        '</td></tr>';
    }

    if (b.showTva) {
      const tvaVal = formatFullNumber(getPath(ctx.invoice as Record<string, unknown>, 'tvaAmount'), 2, 2);
      html +=
        '<tr><td colspan="' +
        (colCount - 1) +
        '" style="text-align:' +
        alignLabel +
        ';padding:3px 6px;">' +
        t('tva', lang) +
        ':</td>';
      html +=
        '<td style="text-align:' +
        alignVal +
        ';padding:3px 6px;font-variant-numeric:tabular-nums;white-space:nowrap;">' +
        tvaVal +
        '</td></tr>';
    }

    if (b.showTotal) {
      const totalVal = formatFullNumber(getPath(ctx.invoice as Record<string, unknown>, 'total'), 2, 2);
      const curSymbol = t('currency', lang);
      html += '<tr style="background:' + primary + ';color:#fff;font-size:13px;">';
      html +=
        '<td colspan="' +
        (colCount - 1) +
        '" style="text-align:' +
        alignLabel +
        ';padding:6px;font-weight:900;">' +
        t('total', lang) +
        ':</td>';
      html +=
        '<td style="text-align:' +
        alignVal +
        ';padding:6px;font-weight:900;font-variant-numeric:tabular-nums;white-space:nowrap;">' +
        totalVal +
        ' ' +
        curSymbol +
        '</td></tr>';
    }

    html += '</tfoot>';
  }

  html += '</table>';
  return html;
}

// توليد QR Code كـ SVG نقي فوري (0ms Instant Synchronous Generation)
export function generateQrSvg(value: string, size: number = 110): string {
  try {
    const qr = QRCode.create(value || 'AN-POS', { errorCorrectionLevel: 'M' });
    const count = qr.modules.size;
    const scale = size / count;
    let paths = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.modules.get(r, c)) {
          paths += `M${(c * scale).toFixed(2)},${(r * scale).toFixed(2)}h${scale.toFixed(2)}v${scale.toFixed(2)}h-${scale.toFixed(2)}z `;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:inline-block;vertical-align:middle;"><rect width="${size}" height="${size}" fill="#ffffff"/><path d="${paths}" fill="#000000"/></svg>`;
  } catch (err) {
    return `<div style="width:${size}px;height:${size}px;border:1px dashed #cbd5e1;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;">QR</div>`;
  }
}

function renderQr(b: QrBlock, ctx: DocumentContext): string {
  const size = b.size ?? 110;
  let value = '';
  switch (b.payload) {
    case 'invoiceNumber':
      value = String(getPath(ctx.invoice as Record<string, unknown>, 'number') ?? '');
      break;
    case 'invoiceUrl':
      value = ctx.invoiceUrl ?? String(getPath(ctx.invoice as Record<string, unknown>, 'number') ?? '');
      break;
    case 'invoiceNumber:date:total': {
      const n = getPath(ctx.invoice as Record<string, unknown>, 'number') ?? '';
      const d = getPath(ctx.invoice as Record<string, unknown>, 'date') ?? '';
      const t = getPath(ctx.invoice as Record<string, unknown>, 'total') ?? '';
      value = `${String(n)}|${String(d)}|${String(t)}`;
      break;
    }
    default:
      value = String(getPath(ctx.invoice as Record<string, unknown>, 'number') ?? '');
  }

  const svgHtml = generateQrSvg(value, size);
  return '<div style="text-align:center;margin:6px 0;">' + svgHtml + '</div>';
}

function renderBarcode(b: BarcodeBlock, ctx: DocumentContext): string {
  const value = String(getPath(ctx.invoice as Record<string, unknown>, 'number') ?? '');
  return (
    '<div style="text-align:center;margin:6px 0;">' +
    '<div style="font-family:monospace;font-size:12px;font-weight:bold;letter-spacing:2px;">*' +
    esc(value) +
    '*</div>' +
    '</div>'
  );
}

function renderBlock(b: Block, ctx: DocumentContext, vars: Record<string, string>): string {
  switch (b.type) {
    case 'text':
      return renderText(b, ctx, vars);
    case 'image':
      return renderImage(b, ctx);
    case 'row':
      return renderRow(b, ctx, vars);
    case 'column':
      return renderColumn(b, ctx, vars);
    case 'separator':
      return renderSeparator(b, vars);
    case 'table':
      return renderTable(b, ctx, vars);
    case 'qr':
      return renderQr(b, ctx);
    case 'barcode':
      return renderBarcode(b, ctx);
    default:
      return '';
  }
}

export function renderSection(blocks: Block[], ctx: DocumentContext, vars: Record<string, string>): string {
  return blocks.map((b) => renderBlock(b, ctx, vars)).join('');
}

export function renderDocumentHTML(ctx: DocumentContext): string {
  const t = ctx.template;
  const spec = paperSpec(t.paperSize);
  const vars = styleVars(t.styles);
  const head = renderSection(t.layout.header, ctx, vars);
  const body = renderSection(t.layout.body, ctx, vars);
  const foot = renderSection(t.layout.footer, ctx, vars);
  const font = t.styles.font;
  const family = esc(font.family);
  const lang = ctx.lang || 'ar';
  const isRtl = lang === 'ar' || lang === 'ar-fr';
  const direction = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'right' : 'left';

  const style =
    'direction:' +
    direction +
    ';text-align:' +
    textAlign +
    ';' +
    "font-family:'" +
    family +
    "','Cairo','Tajawal',-apple-system,BlinkMacSystemFont,sans-serif;" +
    'font-size:' +
    font.size +
    'px;font-weight:' +
    font.weight +
    ';' +
    'width:100%;max-width:' +
    spec.bodyWidthCss +
    ';' +
    'padding:' +
    spec.padding +
    ';color:#0f172a;background:#fff;margin:0 auto;box-sizing:border-box;';

  return '<div class="print-doc" style="' + style + '">' + head + body + foot + '</div>';
}

export function buildPrintPage(template: PrintTemplate, bodyHtml: string, title: string, lang: PrintLanguage = 'ar'): string {
  const spec = paperSpec(template.paperSize);
  const orientation = template.orientation;
  const font = template.styles.font;
  const family = esc(font.family);
  const sizeArg = orientation === 'landscape' ? ' ' + orientation : '';
  const minHeight = spec.heightMm ?? 0;
  const isRtl = lang === 'ar' || lang === 'ar-fr';
  const direction = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'right' : 'left';

  const css =
    '@page{size:' +
    spec.cssSize +
    sizeArg +
    ';margin:0;}' +
    '* { box-sizing: border-box; }' +
    'html,body{margin:0;padding:0;background:#f1f5f9;direction:' +
    direction +
    ';text-align:' +
    textAlign +
    ';' +
    "font-family:'" +
    family +
    "','Cairo','Tajawal',-apple-system,BlinkMacSystemFont,sans-serif;}" +
    '.print-sheet{width:' +
    spec.widthMm +
    'mm;min-height:' +
    minHeight +
    'mm;' +
    'margin:8mm auto;background:#fff;direction:' +
    direction +
    ';text-align:' +
    textAlign +
    ';box-shadow:0 1px 4px rgba(0,0,0,.08);box-sizing:border-box;}' +
    '.print-doc{width:100%;max-width:' +
    spec.bodyWidthCss +
    ';padding:' +
    spec.padding +
    ';direction:' +
    direction +
    ';text-align:' +
    textAlign +
    ';' +
    'font-size:' +
    font.size +
    'px;font-weight:' +
    font.weight +
    ';color:#0f172a;box-sizing:border-box;}' +
    '@media print{html,body{background:#fff;}' +
    '.print-sheet{box-shadow:none;margin:0;width:100%;min-height:auto;}}';

  return (
    '<!doctype html>' +
    '<html lang="' +
    (lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en') +
    '" dir="' +
    direction +
    '">' +
    '<head><meta charset="utf-8" />' +
    '<title>' +
    esc(title) +
    '</title>' +
    '<style>' +
    css +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="print-sheet">' +
    bodyHtml +
    '</div>' +
    '</body>' +
    '</html>'
  );
}