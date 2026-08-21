// renderTemplate.ts — POS-PRINT-001
// BR-PRINT-007: محرك القوالب يدعم العربية RTL
// BR-PRINT-008: الحجم الحراري لا يتجاوز 80mm
import { describe, expect, it } from 'vitest'
import { renderDocumentHTML, buildPrintPage, renderSection } from '@/services/print/renderTemplate'
import type {
  DocumentContext,
  PrintTemplate,
  Block,
  TemplateStyles,
  VisibilityMap,
  TemplateLayout,
} from '@/types/invoicePrint'
import { DEFAULT_STYLES, DEFAULT_VISIBILITY } from '@/types/invoicePrint'

// ====== Fixtures ======

function makeTemplate(overrides: Partial<PrintTemplate> = {}): PrintTemplate {
  return {
    id: 'test-template',
    name: 'قالب اختبار',
    description: 'قالب تجريبي',
    paperSize: '80mm',
    orientation: 'portrait',
    widthMm: 80,
    heightMm: undefined,
    supportedDocuments: ['thermal-receipt'],
    visibility: { ...DEFAULT_VISIBILITY },
    layout: { header: [], body: [], footer: [] },
    styles: { ...DEFAULT_STYLES },
    isDefault: false,
    isSystem: false,
    createdBy: 'test-user',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeContext(overrides: Partial<DocumentContext> = {}): DocumentContext {
  return {
    invoice: {
      number: 'INV-2026-0001',
      date: '2026-07-05',
      subtotal: 1000,
      discount: 0,
      tvaAmount: 190,
      total: 1190,
      paymentMethod: 'نقداً',
      items: [
        { name: 'حليب', qty: 2, unitPrice: 100, lineTotal: 200 },
        { name: 'خبز', qty: 5, unitPrice: 30, lineTotal: 150 },
      ],
    },
    settings: { shopName: 'سوبرماركت الأمل' },
    template: makeTemplate(),
    shopLegal: {
      name: 'سوبرماركت الأمل',
      phone: '023 45 67 89',
      address: 'الجزائر العاصمة',
      footer: 'شكراً لزيارتكم',
      logo: '',
    },
    user: { id: 'u1', name: 'كاشير', role: 'cashier' },
    lang: 'ar',
    invoiceUrl: 'https://example.com/invoice/INV-2026-0001',
    ...overrides,
  }
}

// ====== renderSection ======

describe('renderSection()', () => {
  it('يعيد سلسلة فارغة لقائمة blocks فارغة', () => {
    const ctx = makeContext()
    const vars = { primary: '#0891b2', header: '#0e7490', footer: '#475569', table: '#e2e8f0', logo: '#0891b2' }
    const out = renderSection([], ctx, vars)
    expect(out).toBe('')
  })

  it('يرسم عدة blocks متتالية', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'text', text: 'سطر أول' },
      { id: 'b2', type: 'text', text: 'سطر ثاني' },
    ]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('سطر أول')
    expect(out).toContain('سطر ثاني')
  })
})

// ====== Text Block ======

describe('TextBlock rendering', () => {
  it('يرسم نص بسيط مع默认 align=right', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: 'مرحبا' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('مرحبا')
    expect(out).toContain('text-align:right')
  })

  it('يدعم محاذاة center', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: 'نص', align: 'center' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('text-align:center')
  })

  it('يدعم قائمة نصوص (متعدد الأسطر)', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: ['سطر1', 'سطر2'] }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('سطر1')
    expect(out).toContain('سطر2')
    // يجب أن يحتوي على <div>...</div><div>...</div>
    expect(out.match(/<div/g)?.length).toBe(2)
  })

  it('يطبق size كبير (xl)', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: 'X', size: 'xl' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('font-size:22px')
  })

  it('يحترم weight = 700', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: 'X', weight: 700 }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('font-weight:700')
  })

  it('يهرب من رموز HTML خطيرة (XSS prevention)', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: '<script>alert("xss")</script>' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    // يجب ألا يحتوي على raw <script>
    expect(out).not.toContain('<script>alert')
    // يجب أن يحتوي على النص المهرب
    expect(out).toContain('&lt;script&gt;')
    expect(out).toContain('&lt;/script&gt;')
  })

  it('يطبق colorVar على لون النص', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: 'X', colorVar: 'primary' }]
    const ctx = makeContext()
    const vars = { primary: '#ff0000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('color:#ff0000')
  })

  // FR-003: استبدال المتغيرات الديناميكية {{...}} بقيمها الفعلية
  it('يستبدل المتغيرات الديناميكية من سياق المستند', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: 'الفاتورة رقم: {{invoice.number}}' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('الفاتورة رقم: INV-2026-0001')
    // لا ينبغي بقاء placeholder
    expect(out).not.toContain('{{invoice.number}}')
  })

  it('يدعم الأسماء البسيطة المعرّفة في aliasMap (store_name, total, tax_amount)', () => {
    const blocks: Block[] = [{
      id: 'b1', type: 'text',
      text: [
        'المتجر: {{store_name}}',
        'الإجمالي: {{total:currency}}',
        'الضريبة: {{tax_amount:currency}}',
        'الكاشير: {{cashier_name}}',
      ],
    }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('المتجر: سوبرماركت الأمل')
    expect(out).toContain('الإجمالي: 1190.00')
    expect(out).toContain('الضريبة: 190.00')
    expect(out).toContain('الكاشير: كاشير')
  })

  it('يدعم تنسيق :currency و :number', () => {
    const blocks: Block[] = [{
      id: 'b1', type: 'text',
      text: 'الإجمالي: {{total:currency}} | خصم خام: {{invoice.subtotal:number}}',
    }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('الإجمالي: 1190.00')
    expect(out).toContain('خصم خام: 1000')
  })

  it('يُهرب القيم المتغيرة لمنع XSS (FR-003)', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: 'الاسم: {{shopLegal.name}}' }]
    const ctx = makeContext({ shopLegal: { name: '<script>alert(1)</script>', phone: '', footer: '', logo: '' } })
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    // لا raw script tag على الإطلاق (XSS prevention)
    expect(out).not.toMatch(/<script/i)
    // النص مُهرب بأمان كـ HTML entities (<script>...</script>)
    expect(out).toContain('\u0026lt;script\u0026gt;alert(1)\u0026lt;/script\u0026gt;')
    // المتغير تم استبداله فعلياً ولم يبقَ كـ placeholder
    expect(out).not.toContain('{{shopLegal.name}}')
  })

  it('يترك المتغير غير المعروف فارغاً بدلاً من إظهار placeholder', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'text', text: 'القيمة: {{unknown.path}}' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('القيمة: ')
    expect(out).not.toContain('{{unknown.path}}')
  })
})

// ====== Image Block ======

describe('ImageBlock rendering', () => {
  it('يرسم صورة من src صريح', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'image', src: 'data:image/png;base64,XYZ', width: 60, height: 60 },
    ]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('<img')
    expect(out).toContain('data:image/png;base64,XYZ')
    expect(out).toContain('width:60px')
  })

  it('يستخدم شعار المحل افتراضياً عند src فارغ', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'image', src: '' }]
    const ctx = makeContext({
      shopLegal: { name: 'X', phone: '', address: '', footer: '', logo: 'data:image/png;base64,SHOP_LOGO' },
    })
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('data:image/png;base64,SHOP_LOGO')
  })

  it('يعيد سلسلة فارغة إذا لا يوجد src ولا شعار', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'image', src: '' }]
    const ctx = makeContext({
      shopLegal: { name: 'X', phone: '', address: '', footer: '', logo: '' },
    })
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toBe('')
  })
})

// ====== Separator Block ======

describe('SeparatorBlock rendering', () => {
  it('يرسم <hr> مع dashed افتراضي', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'separator' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('<hr')
    expect(out).toContain('dashed')
  })

  it('يدعم style=solid', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'separator', style: 'solid' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('solid')
  })
})

// ====== Row & Column ======

describe('RowBlock rendering', () => {
  it('يستخدم flexbox row-reverse لدعم RTL', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'row',
        children: [
          { id: 'c1', type: 'text', text: 'يمين' },
          { id: 'c2', type: 'text', text: 'يسار' },
        ],
      },
    ]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('display:flex')
    expect(out).toContain('flex-direction:row-reverse')
    expect(out).toContain('يمين')
    expect(out).toContain('يسار')
  })

  it('يحترم gap رقمي', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'row',
        gap: 16,
        children: [{ id: 'c1', type: 'text', text: 'X' }],
      },
    ]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('gap:16px')
  })
})

describe('ColumnBlock rendering', () => {
  it('يستخدم flex-direction:column', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'column',
        children: [
          { id: 'c1', type: 'text', text: 'أول' },
          { id: 'c2', type: 'text', text: 'ثاني' },
        ],
      },
    ]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('flex-direction:column')
    expect(out).toContain('أول')
    expect(out).toContain('ثاني')
  })
})

// ====== Table Block ======

describe('TableBlock rendering', () => {
  function tableCtx() {
    const layout: TemplateLayout = {
      header: [],
      body: [
        {
          id: 'tb1',
          type: 'table',
          columns: [
            { key: 'name', label: 'المنتج', format: 'text' },
            { key: 'qty', label: 'الكمية', format: 'number' },
            { key: 'lineTotal', label: 'المجموع', format: 'currency' },
          ],
          source: 'items',
          showSubtotal: true,
          showTotal: true,
          showTva: true,
        },
      ],
      footer: [],
    }
    return makeContext({ template: makeTemplate({ layout }) })
  }

  it('يرسم <table> مع thead و tbody', () => {
    const ctx = tableCtx()
    const html = renderDocumentHTML(ctx)
    expect(html).toContain('<table')
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
    expect(html).toContain('المنتج')
    expect(html).toContain('الكمية')
  })

  it('يرسم كل عناصر الفاتورة في الصفوف', () => {
    const ctx = tableCtx()
    const html = renderDocumentHTML(ctx)
    expect(html).toContain('حليب')
    expect(html).toContain('خبز')
  })

  it('يصيغ العملة بمنزلتين عشريتين', () => {
    const ctx = tableCtx()
    const html = renderDocumentHTML(ctx)
    expect(html).toContain('200.00')
    expect(html).toContain('150.00')
  })

  it('يعرض المجموع الفرعي والإجمالي وTVA في tfoot', () => {
    const ctx = tableCtx()
    const html = renderDocumentHTML(ctx)
    expect(html).toContain('<tfoot>')
    expect(html).toContain('المجموع الفرعي')
    expect(html).toContain('TVA')
    expect(html).toContain('الإجمالي')
    expect(html).toContain('1000.00')
    expect(html).toContain('1190.00')
  })

  it('يخفي العمود showDiscount عند discount = 0', () => {
    const layout: TemplateLayout = {
      header: [],
      body: [
        {
          id: 'tb1',
          type: 'table',
          columns: [{ key: 'name', label: 'X' }],
          source: 'items',
          showDiscount: true,
        },
      ],
      footer: [],
    }
    const ctx = makeContext({ template: makeTemplate({ layout }) })
    const html = renderDocumentHTML(ctx)
    expect(html).not.toContain('الخصم')
  })

  it('يظهر الخصم عند discount > 0', () => {
    const layout: TemplateLayout = {
      header: [],
      body: [
        {
          id: 'tb1',
          type: 'table',
          columns: [{ key: 'name', label: 'X' }],
          source: 'items',
          showDiscount: true,
        },
      ],
      footer: [],
    }
    const ctx = makeContext({
      invoice: {
        ...makeContext().invoice,
        discount: 100,
      } as never,
      template: makeTemplate({ layout }),
    })
    const html = renderDocumentHTML(ctx)
    expect(html).toContain('الخصم')
    expect(html).toContain('100.00')
  })

  it('يصيغ عدد صحيح بـ format=number', () => {
    const layout: TemplateLayout = {
      header: [],
      body: [
        {
          id: 'tb1',
          type: 'table',
          columns: [{ key: 'qty', label: 'الكمية', format: 'number' }],
          source: 'items',
        },
      ],
      footer: [],
    }
    const ctx = makeContext({ template: makeTemplate({ layout }) })
    const html = renderDocumentHTML(ctx)
    expect(html).toContain('>2<')
    expect(html).toContain('>5<')
  })
})

// ====== QR Block ======

describe('QrBlock rendering', () => {
  it('يولد placeholder QR مع data-value = رقم الفاتورة', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'qr', payload: 'invoiceNumber' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('print-qr')
    expect(out).toContain('data-value="INV-2026-0001"')
  })

  it('يستخدم invoiceUrl عند payload=invoiceUrl', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'qr', payload: 'invoiceUrl' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('data-value="https://example.com/invoice/INV-2026-0001"')
  })

  it('يدعم payload مركب "invoiceNumber:date:total"', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'qr', payload: 'invoiceNumber:date:total' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('INV-2026-0001|2026-07-05|1190')
  })

  it('يحترم size مخصص (px)', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'qr', payload: 'invoiceNumber', size: 150 }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('width:150px')
    expect(out).toContain('height:150px')
  })
})

// ====== Barcode Block ======

describe('BarcodeBlock rendering', () => {
  it('يولد <svg> مع data-value = رقم الفاتورة', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'barcode', source: 'invoiceNumber' }]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('<svg')
    expect(out).toContain('print-barcode')
    expect(out).toContain('data-value="INV-2026-0001"')
    expect(out).toContain('data-format="CODE128"')
  })

  it('يدعم EAN13 format', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'barcode', source: 'invoiceNumber', format: 'EAN13' },
    ]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('data-format="EAN13"')
  })

  it('يحترم width و height', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'barcode', source: 'invoiceNumber', width: 250, height: 60 },
    ]
    const ctx = makeContext()
    const vars = { primary: '#000', header: '#000', footer: '#000', table: '#000', logo: '#000' }
    const out = renderSection(blocks, ctx, vars)
    expect(out).toContain('width="250"')
    expect(out).toContain('height="60"')
  })
})

// ====== renderDocumentHTML (high-level) ======

describe('renderDocumentHTML()', () => {
  it('يصدر div.print-doc مع direction:rtl', () => {
    const ctx = makeContext()
    const html = renderDocumentHTML(ctx)
    expect(html).toContain('<div class="print-doc"')
    expect(html).toContain('direction:rtl')
    expect(html).toContain('text-align:right')
  })

  it('يطبق خط Cairo من styles.font.family', () => {
    const template = makeTemplate({ styles: { ...DEFAULT_STYLES, font: { family: 'Tajawal', size: 11, weight: 400 } } })
    const ctx = makeContext({ template })
    const html = renderDocumentHTML(ctx)
    expect(html).toContain("font-family:'Tajawal'")
  })

  it('يطبق حجم الورق الحراري 80mm في bodyWidthCss', () => {
    const ctx = makeContext({ template: makeTemplate({ paperSize: '80mm' }) })
    const html = renderDocumentHTML(ctx)
    expect(html).toContain('width:80mm')
  })

  it('يطبق حجم A4 في bodyWidthCss = 190mm', () => {
    const template = makeTemplate({ paperSize: 'A4', widthMm: 210, heightMm: 297 })
    const ctx = makeContext({ template })
    const html = renderDocumentHTML(ctx)
    expect(html).toContain('width:190mm')
  })

  it('يرسم الترويسة والجسم والتذييل بالترتيب', () => {
    const layout: TemplateLayout = {
      header: [{ id: 'h1', type: 'text', text: 'HEADER' }],
      body: [{ id: 'b1', type: 'text', text: 'BODY' }],
      footer: [{ id: 'f1', type: 'text', text: 'FOOTER' }],
    }
    const ctx = makeContext({ template: makeTemplate({ layout }) })
    const html = renderDocumentHTML(ctx)
    expect(html.indexOf('HEADER')).toBeLessThan(html.indexOf('BODY'))
    expect(html.indexOf('BODY')).toBeLessThan(html.indexOf('FOOTER'))
  })
})

// ====== buildPrintPage ======

describe('buildPrintPage()', () => {
  it('يصفر وثيقة HTML كاملة مع doctype', () => {
    const template = makeTemplate()
    const html = buildPrintPage(template, '<div>X</div>', 'فاتورة اختبار')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })

  it('يضع lang="ar" dir="rtl" على <html>', () => {
    const template = makeTemplate()
    const html = buildPrintPage(template, '<div>X</div>', 'X')
    expect(html).toContain('<html lang="ar" dir="rtl">')
  })

  it('يضع <title> بال عنوان المعطى', () => {
    const template = makeTemplate()
    const html = buildPrintPage(template, '<div>X</div>', 'فاتورة INV-001')
    expect(html).toContain('<title>فاتورة INV-001</title>')
  })

  it('يحمّل مكتبتي QRCode و JsBarcode من CDN', () => {
    const template = makeTemplate()
    const html = buildPrintPage(template, '<div>X</div>', 'X')
    expect(html).toContain('qrcode@1.5.3')
    expect(html).toContain('jsbarcode@3.11.6')
  })

  it('يطبق @page size حسب نوع الورق', () => {
    const templateThermal = makeTemplate({ paperSize: '80mm' })
    expect(buildPrintPage(templateThermal, '<div></div>', 'X')).toContain('@page{size:80mm auto')

    const templateA4 = makeTemplate({ paperSize: 'A4', widthMm: 210, heightMm: 297 })
    expect(buildPrintPage(templateA4, '<div></div>', 'X')).toContain('@page{size:A4')
  })

  it('FR-018: يدعم حجم 58mm الحراري', () => {
    const template58 = makeTemplate({ paperSize: '58mm', widthMm: 58 })
    const html = buildPrintPage(template58, '<div></div>', 'X')
    expect(html).toContain('@page{size:58mm auto')
    expect(html).toContain('width:58mm')
  })

  it('FR-018: يدعم حجم 76mm الحراري', () => {
    const template76 = makeTemplate({ paperSize: '76mm', widthMm: 76 })
    const html = buildPrintPage(template76, '<div></div>', 'X')
    expect(html).toContain('@page{size:76mm auto')
  })

  // FR-018: دعم 58mm و 76mm
  it('يدعم حجم الورق الحراري 58mm', () => {
    const t = makeTemplate({ paperSize: '58mm', widthMm: 58 })
    expect(buildPrintPage(t, '<div></div>', 'X')).toContain('@page{size:58mm auto')
  })

  it('يدعم حجم الورق الحراري 76mm', () => {
    const t = makeTemplate({ paperSize: '76mm', widthMm: 76 })
    expect(buildPrintPage(t, '<div></div>', 'X')).toContain('@page{size:76mm auto')
  })

  it('يدعم orientation landscape بإضافتها لـ @page', () => {
    const template = makeTemplate({ paperSize: 'A4', orientation: 'landscape', widthMm: 210, heightMm: 297 })
    const html = buildPrintPage(template, '<div></div>', 'X')
    expect(html).toContain('size:A4 landscape')
  })

  it('يطبق media print rules لإخفاء box-shadow', () => {
    const template = makeTemplate()
    const html = buildPrintPage(template, '<div></div>', 'X')
    expect(html).toContain('@media print')
    expect(html).toContain('box-shadow:none')
  })

  it('يطبق script لحظة تحميل الصفحة لاستبدال placeholders QR', () => {
    const template = makeTemplate()
    const html = buildPrintPage(template, '<div class="print-qr" data-value="X"></div>', 'X')
    expect(html).toContain('window.addEventListener')
    expect(html).toContain('print-qr')
    expect(html).toContain('print-barcode')
  })

  it('يهرب العنوان لمنع XSS', () => {
    const template = makeTemplate()
    const html = buildPrintPage(template, '<div></div>', '<script>alert(1)</script>')
    expect(html).not.toContain('<title><script>')
    expect(html).toContain('<script>')
  })
})
