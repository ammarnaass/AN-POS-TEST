// Print Template Engine — POS-PRINT-001
// BR-PRINT-007: القالب يجب أن يدعم اللغة العربية واتجاه RTL
// BR-PRINT-008: القالب الحراري 80mm يجب ألا يتجاوز 80mm عرض
// يحول layout (Blocks) + DocumentContext إلى HTML جاهز للطباعة

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
} from '../types/invoicePrint';
import { paperSpec } from './paperSizes';

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

// FR-003: استبدال المتغيرات الديناميكية {{path.to.field}} بقيمها الفعلية
// يدعم مسارات dotted مثل {{invoice.total}} و {{shopLegal.name}}
// يُهرب النتيجة قبل الإدراج لمنع XSS
function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(2);
  }
  if (v instanceof Date) return v.toLocaleDateString('ar-DZ');
  return String(v);
}

function interpolate(text: string, ctx: DocumentContext): string {
  // pattern: {{ path.to.field | optional:format }}
  return text.replace(/\{\{\s*([\w.]+)\s*(?::\s*(\w+)\s*)?\}\}/g, (_m, path: string, fmtKind: string | undefined) => {
    // دعم الأسماء البسيطة في PRD: store_name, total, tax_amount
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
    const formatted = fmtKind === 'currency' || fmtKind === 'number'
      ? fmt(value, fmtKind as 'currency' | 'number')
      : formatValue(value);
    return formatted;
  });
}

function fmt(n: unknown, kind: 'number' | 'currency'): string {
  const num = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(num)) return String(n ?? '');
  if (kind === 'currency') return num.toFixed(2);
  return String(num);
}

function colorVar(
  name: string | undefined,
  fallback: string,
  vars: Record<string, string>,
  customColor?: string,
): string {
  if (!name || name === 'none' || !vars) return fallback;
  if (name === 'custom') return customColor && /^#?[0-9a-fA-F]{3,8}$/.test(customColor) ? (customColor.startsWith('#') ? customColor : '#' + customColor) : fallback;
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

function renderText(
  b: TextBlock,
  ctx: DocumentContext,
  vars: Record<string, string>,
): string {
  const sizeKey = b.size ?? 'md';
  const size = SIZE_MAP[sizeKey] ?? SIZE_MAP.md;
  const align = b.align ?? 'right';
  const color = b.colorVar ? colorVar(b.colorVar, '#000', vars, b.customColor) : 'inherit';
  const weight = b.weight ?? 400;
  const lines = Array.isArray(b.text) ? b.text : [b.text];
  return lines
    .map((l) => {
      // FR-003: استبدال المتغيرات الديناميكية قبل الهروب
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
        ';line-height:1.5;">' +
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
  const style =
    'width:' + w + 'px;height:' + h + 'px;object-fit:contain;display:inline-block;';
  return (
    '<div style="text-align:' + align + ';margin:6px 0;">' +
    '<img src="' + esc(src) + '" alt="logo" style="' + style + '" />' +
    '</div>'
  );
}

function renderSeparator(b: SeparatorBlock, vars: Record<string, string>): string {
  const s = b.style ?? 'dashed';
  const thickness = b.thickness ?? 1;
  const color = b.colorVar ? colorVar(b.colorVar, '#cbd5e1', vars, b.customColor) : '#cbd5e1';
  return '<hr style="border:none;border-top:' + thickness + 'px ' + s + ' ' + color + ';margin:6px 0;" />';
}

function renderRow(
  b: RowBlock,
  ctx: DocumentContext,
  vars: Record<string, string>,
): string {
  const gap = b.gap ?? 8;
  const justify = b.align ?? 'space-between';
  const inner = b.children.map((c) => renderBlock(c, ctx, vars)).join('');
  const style =
    'display:flex;flex-direction:row-reverse;justify-content:' +
    justify +
    ';gap:' +
    gap +
    'px;align-items:flex-start;';
  return '<div style="' + style + '">' + inner + '</div>';
}

function renderColumn(
  b: ColumnBlock,
  ctx: DocumentContext,
  vars: Record<string, string>,
): string {
  const gap = b.gap ?? 8;
  const inner = b.children.map((c) => renderBlock(c, ctx, vars)).join('');
  return '<div style="display:flex;flex-direction:column;gap:' + gap + 'px;">' + inner + '</div>';
}

function formatCol(
  item: Record<string, unknown>,
  c: { key: string; format?: 'text' | 'number' | 'currency' },
): string {
  const v = (item as Record<string, unknown>)[c.key];
  if (c.format === 'currency') return fmt(v, 'currency');
  if (c.format === 'number') return fmt(v, 'number');
  return v === undefined || v === null ? '' : String(v);
}

function renderTable(
  b: TableBlock,
  ctx: DocumentContext,
  vars: Record<string, string>,
): string {
  const inv = ctx.invoice as { items?: Array<Record<string, unknown>> };
  const items = inv?.items ?? [];
  const colCount = b.columns.length;
  const tableColor = vars.table ?? '#e2e8f0';
  const tank = vars.header ?? '#0e7490';
  const primary = vars.primary ?? '#0891b2';

  let html = '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;">';

  // head
  html += '<thead><tr style="background:' + tank + ';color:#fff;">';
  for (const c of b.columns) {
    const a = c.align ?? 'right';
    const thStyle =
      'text-align:' + a + ';padding:4px 6px;font-weight:600;border:1px solid ' + tableColor + ';';
    html += '<th style="' + thStyle + '">' + esc(c.label) + '</th>';
  }
  html += '</tr></thead>';

  // body
  html += '<tbody>';
  for (const it of items) {
    html += '<tr>';
    for (const c of b.columns) {
      const a = c.align ?? 'right';
      const tdStyle =
        'text-align:' + a + ';padding:3px 6px;border:1px solid ' + tableColor + ';';
      html += '<td style="' + tdStyle + '">' + esc(formatCol(it, c)) + '</td>';
    }
    html += '</tr>';
  }
  html += '</tbody>';

  // totals
  if (b.showSubtotal || b.showTotal || b.showDiscount || b.showTva) {
    html += '<tfoot>';
    if (b.showSubtotal) {
      html +=
        '<tr><td colspan="' + (colCount - 1) + '" style="text-align:left;padding:2px 6px;">المجموع الفرعي</td>';
      html +=
        '<td style="padding:2px 6px;font-weight:600;">' +
        fmt(getPath(ctx.invoice as Record<string, unknown>, 'subtotal'), 'currency') +
        '</td></tr>';
    }
    if (b.showDiscount && Number((ctx.invoice as Record<string, unknown>)?.discount) > 0) {
      html +=
        '<tr><td colspan="' + (colCount - 1) + '" style="text-align:left;padding:2px 6px;">الخصم</td>';
      html +=
        '<td style="padding:2px 6px;">' +
        fmt(getPath(ctx.invoice as Record<string, unknown>, 'discount'), 'currency') +
        '</td></tr>';
    }
    if (b.showTva) {
      html +=
        '<tr><td colspan="' + (colCount - 1) + '" style="text-align:left;padding:2px 6px;">TVA</td>';
      html +=
        '<td style="padding:2px 6px;">' +
        fmt(getPath(ctx.invoice as Record<string, unknown>, 'tvaAmount'), 'currency') +
        '</td></tr>';
    }
    if (b.showTotal) {
      html += '<tr style="background:' + primary + ';color:#fff;">';
      html +=
        '<td colspan="' + (colCount - 1) + '" style="text-align:left;padding:4px 6px;font-weight:700;">الإجمالي</td>';
      html +=
        '<td style="padding:4px 6px;font-weight:700;">' +
        fmt(getPath(ctx.invoice as Record<string, unknown>, 'total'), 'currency') +
        '</td></tr>';
    }
    html += '</tfoot>';
  }

  html += '</table>';
  return html;
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
      value = String(n) + '|' + String(d) + '|' + String(t);
      break;
    }
    default:
      value = String(getPath(ctx.invoice as Record<string, unknown>, 'number') ?? '');
  }
  const style =
    'display:inline-block;width:' +
    size +
    'px;height:' +
    size +
    'px;border:1px dashed #cbd5e1;text-align:center;line-height:' +
    size +
    'px;font-size:10px;color:#64748b;';
  return '<div class="print-qr" data-value="' + esc(value) + '" style="' + style + '">QR</div>';
}

function renderBarcode(b: BarcodeBlock, ctx: DocumentContext): string {
  const w = b.width ?? 200;
  const h = b.height ?? 50;
  const value = String(getPath(ctx.invoice as Record<string, unknown>, 'number') ?? '');
  const format = b.format ?? 'CODE128';
  const rect =
    '<rect width="' + w + '" height="' + h +
    '" style="fill:#fff;stroke:#cbd5e1;stroke-width:1;" />';
  const label =
    '<text x="50%" y="55%" text-anchor="middle" font-size="10" fill="#64748b">' +
    (value ? esc(value) : 'BARCODE') +
    '</text>';
  return (
    '<svg class="print-barcode" data-value="' + esc(value) +
    '" data-format="' + esc(format) +
    '" width="' + w + '" height="' + h +
    '" xmlns="http://www.w3.org/2000/svg">' + rect + label + '</svg>'
  );
}

function renderBlock(
  b: Block,
  ctx: DocumentContext,
  vars: Record<string, string>,
): string {
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

export function renderSection(
  blocks: Block[],
  ctx: DocumentContext,
  vars: Record<string, string>,
): string {
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
  const style =
    'direction:rtl;text-align:right;' +
    "font-family:'" + family + "','Cairo','Tajawal',sans-serif;" +
    'font-size:' + font.size + 'px;font-weight:' + font.weight + ';' +
    'width:' + spec.bodyWidthCss + ';max-width:' + spec.bodyWidthCss + ';' +
    'padding:' + spec.padding + ';color:#0f172a;background:#fff;margin:0 auto;';
  return '<div class="print-doc" style="' + style + '">' + head + body + foot + '</div>';
}

export function buildPrintPage(
  template: PrintTemplate,
  bodyHtml: string,
  title: string,
): string {
  const spec = paperSpec(template.paperSize);
  const orientation = template.orientation;
  const font = template.styles.font;
  const family = esc(font.family);
  const sizeArg = orientation === 'landscape' ? ' ' + orientation : '';
  const minHeight = spec.heightMm ?? 0;
  const css =
    '@page{size:' + spec.cssSize + sizeArg + ';margin:0;}' +
    'html,body{margin:0;padding:0;background:#f1f5f9;direction:rtl;' +
    "font-family:'" + family + "','Cairo','Tajawal',sans-serif;}" +
    '.print-sheet{width:' + spec.widthMm + 'mm;min-height:' + minHeight + 'mm;' +
    'margin:8mm auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);}' +
    '.print-doc{width:' + spec.bodyWidthCss + ';padding:' + spec.padding + ';' +
    'font-size:' + font.size + 'px;font-weight:' + font.weight + ';color:#0f172a;}' +
    '@media print{html,body{background:#fff;}' +
    '.print-sheet{box-shadow:none;margin:0;width:auto;min-height:auto;}}';
  const script =
    'window.addEventListener("load",function(){' +
    'try{' +
    'document.querySelectorAll(".print-qr").forEach(function(el){' +
    'var v=el.getAttribute("data-value")||"";' +
    'if(window.QRCode&&v){QRCode.toCanvas(v,{width:110,margin:1},function(err,c){' +
    'if(err)return;el.innerHTML="";el.appendChild(c);});}});' +
    'document.querySelectorAll(".print-barcode").forEach(function(el){' +
    'var v=el.getAttribute("data-value")||"";' +
    'if(window.JsBarcode&&v){try{JsBarcode(el,v.replace(/\\s/g,""),{format:"CODE128",width:1.4,height:40,displayValue:true});}catch(e){}}}' +
    ');' +
    '}catch(e){console.error(e);}' +
    '});';
  return (
    '<!doctype html>' +
    '<html lang="ar" dir="rtl">' +
    '<head><meta charset="utf-8" />' +
    '<title>' + esc(title) + '</title>' +
    '<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js" defer></script>' +
    '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js" defer></script>' +
    '<style>' + css + '</style>' +
    '</head>' +
    '<body>' +
    '<div class="print-sheet">' + bodyHtml + '</div>' +
    '<script>' + script + '</script>' +
    '</body>' +
    '</html>'
  );
}