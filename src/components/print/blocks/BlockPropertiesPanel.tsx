// BlockPropertiesPanel — POS-PRINT-001 / FR-001
// لوحة الخصائص للبلوك المحدد — تُظهر حقول التحرير حسب نوع الـ block.
// Bharat: النص — محتوى/محاذاة/حجم/لون. الصورة — مصدر/عرض/ارتفاع. Table — أعمدة. QR/Barcode — payload/source/format.
import type { Block, TableBlock, TextBlock, ImageBlock, QrBlock, BarcodeBlock, SeparatorBlock } from '@/types/invoicePrint';
import type { Section } from '@/store/templateEditorStore';

interface Props {
  section: Section;
  block: Block | null;
  onUpdate: (section: Section, blockId: string, updates: Partial<Block>) => void;
}

const SIZES = [
  { v: 'sm', l: 'صغير' },
  { v: 'md', l: 'متوسط' },
  { v: 'lg', l: 'كبير' },
  { v: 'xl', l: 'ضخم' },
] as const;

const ALIGNS = [
  { v: 'right', l: 'يمين' },
  { v: 'center', l: 'وسط' },
  { v: 'left', l: 'يسار' },
] as const;

const COLOR_VARS = [
  { v: 'none', l: 'افتراضي' },
  { v: 'primary', l: 'أساسي' },
  { v: 'header', l: 'الرأس' },
  { v: 'footer', l: 'التذييل' },
  { v: 'table', l: 'الجداول' },
] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-on-surface mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-outline-variant rounded-md bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary';

export default function BlockPropertiesPanel({ section, block, onUpdate }: Props) {
  if (!block) {
    return (
      <div className="p-4 text-center text-on-surface-variant text-sm">
        اختر بلوكاً لتحرير خصائصه
      </div>
    );
  }

  const update = (updates: Partial<Block>) => onUpdate(section, block.id, updates);

  return (
    <div className="space-y-4 p-3">
      <h3 className="font-label-lg text-on-surface mb-1">خصائص البلوك</h3>

      {/* نص */}
      {block.type === 'text' && (
        <TextProps block={block as TextBlock} update={update} />
      )}
      {/* صورة */}
      {block.type === 'image' && (
        <ImageProps block={block as ImageBlock} update={update} />
      )}
      {/* جدول */}
      {block.type === 'table' && (
        <TableProps block={block as TableBlock} update={update} />
      )}
      {/* فاصل */}
      {block.type === 'separator' && (
        <SeparatorProps block={block as SeparatorBlock} update={update} />
      )}
      {/* QR */}
      {block.type === 'qr' && (
        <QrProps block={block as QrBlock} update={update} />
      )}
      {/* Barcode */}
      {block.type === 'barcode' && (
        <BarcodeProps block={block as BarcodeBlock} update={update} />
      )}

      {/* row/column — لا خصائص إضافية (hierarchical في V1) */}
      {(block.type === 'row' || block.type === 'column') && (
        <div className="p-3 bg-surface-container/50 rounded-md text-xs text-on-surface-variant">
          يحتوي على بلوكات فرعية. تحريرها مباشرة سيُضاف في نسخة لاحقة.
        </div>
      )}
    </div>
  );
}

function TextProps({ block, update }: { block: TextBlock; update: (u: Partial<Block>) => void }) {
  const text = Array.isArray(block.text) ? block.text.join('\n') : block.text;
  return (
    <>
      <Field label="المحتوى">
        <textarea
          value={text}
          onChange={(e) => update({ text: e.target.value.split('\n') })}
          rows={3}
          className={inputCls + ' resize-none'}
          placeholder="اكتب النص... (سطر لكل سطر)"
        />
      </Field>
      <Field label="المحاذاة">
        <select value={block.align ?? 'right'} onChange={(e) => update({ align: e.target.value as TextBlock['align'] })} className={inputCls}>
          {ALIGNS.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
        </select>
      </Field>
      <Field label="الحجم">
        <select value={block.size ?? 'md'} onChange={(e) => update({ size: e.target.value as TextBlock['size'] })} className={inputCls}>
          {SIZES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </Field>
      <Field label="السماكة">
        <select value={block.weight ?? 400} onChange={(e) => update({ weight: Number(e.target.value) as TextBlock['weight'] })} className={inputCls}>
          <option value={300}>Light</option>
          <option value={400}>Regular</option>
          <option value={500}>Medium</option>
          <option value={600}>Semi Bold</option>
          <option value={700}>Bold</option>
        </select>
      </Field>
      <Field label="لون">
        <select value={block.colorVar ?? 'none'} onChange={(e) => update({ colorVar: e.target.value as TextBlock['colorVar'] })} className={inputCls}>
          {COLOR_VARS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
      </Field>
    </>
  );
}

function ImageProps({ block, update }: { block: ImageBlock; update: (u: Partial<Block>) => void }) {
  return (
    <>
      <Field label="المصدر (data-URL أو URL)">
        <input value={block.src} onChange={(e) => update({ src: e.target.value })} className={inputCls} placeholder="اترك فارغاً للشعار الافتراضي" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="عرض (px)">
          <input type="number" value={block.width ?? 80} onChange={(e) => update({ width: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="ارتفاع (px)">
          <input type="number" value={block.height ?? 80} onChange={(e) => update({ height: Number(e.target.value) })} className={inputCls} />
        </Field>
      </div>
      <Field label="المحاذاة">
        <select value={block.align ?? 'center'} onChange={(e) => update({ align: e.target.value as ImageBlock['align'] })} className={inputCls}>
          {ALIGNS.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
        </select>
      </Field>
      <div className="text-xs text-on-surface-variant">
        💡 يُفضّل تحويل الصورة إلى data-URL (base64) لضمان ظهورها في الطباعة.
      </div>
    </>
  );
}

function TableProps({ block, update }: { block: TableBlock; update: (u: Partial<Block>) => void }) {
  return (
    <>
      <div className="text-sm font-medium text-on-surface mb-1">الأعمدة</div>
      {block.columns.map((col, idx) => (
        <div key={idx} className="flex items-center gap-1 mb-1">
          <input
            value={col.label}
            onChange={(e) => {
              const cols = [...block.columns];
              cols[idx] = { ...col, label: e.target.value };
              update({ columns: cols });
            }}
            className={inputCls + ' flex-1'}
            placeholder="اسم العمود"
          />
          <button
            type="button"
            onClick={() => update({ columns: block.columns.filter((_, i) => i !== idx) })}
            className="text-red-500 hover:bg-red-50 rounded px-1.5 py-0.5 text-xs"
            title="حذف"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const cols = [...block.columns, { key: 'qty', label: 'عمود', align: 'right' as const, format: 'text' as const }];
          update({ columns: cols });
        }}
        className="text-xs text-primary hover:bg-primary/10 rounded px-2 py-1 mt-1"
      >
        + إضافة عمود
      </button>
      <div className="border-t border-outline-variant/30 mt-3 pt-3 space-y-1">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={block.showSubtotal ?? false} onChange={(e) => update({ showSubtotal: e.target.checked })} />
          المجموع الفرعي
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={block.showDiscount ?? false} onChange={(e) => update({ showDiscount: e.target.checked })} />
          الخصم
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={block.showTva ?? false} onChange={(e) => update({ showTva: e.target.checked })} />
          TVA
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={block.showTotal ?? false} onChange={(e) => update({ showTotal: e.target.checked })} />
          الإجمالي
        </label>
      </div>
    </>
  );
}

function SeparatorProps({ block, update }: { block: SeparatorBlock; update: (u: Partial<Block>) => void }) {
  return (
    <Field label="النمط">
      <select value={block.style ?? 'dashed'} onChange={(e) => update({ style: e.target.value as SeparatorBlock['style'] })} className={inputCls}>
        <option value="solid">خط متصل</option>
        <option value="dashed">متقطع</option>
        <option value="dotted">منقّط</option>
      </select>
    </Field>
  );
}

function QrProps({ block, update }: { block: QrBlock; update: (u: Partial<Block>) => void }) {
  return (
    <>
      <Field label="المحتوى">
        <select value={block.payload} onChange={(e) => update({ payload: e.target.value as QrBlock['payload'] })} className={inputCls}>
          <option value="invoiceNumber">رقم الفاتورة</option>
          <option value="invoiceUrl">رابط الفاتورة</option>
          <option value="invoiceNumber:date:total">رقم + تاريخ + مجموع</option>
        </select>
      </Field>
      <Field label="الحجم (px)">
        <input type="number" value={block.size ?? 110} onChange={(e) => update({ size: Number(e.target.value) })} className={inputCls} />
      </Field>
      <div className="text-xs text-on-surface-variant">
        💡 QR يُولَّد وقت الطباعة عبر مكتبة qrcode.js.
      </div>
    </>
  );
}

function BarcodeProps({ block, update }: { block: BarcodeBlock; update: (u: Partial<Block>) => void }) {
  return (
    <>
      <Field label="المصدر">
        <select value={block.source} onChange={(e) => update({ source: e.target.value as BarcodeBlock['source'] })} className={inputCls}>
          <option value="invoiceNumber">رقم الفاتورة</option>
          <option value="orderNumber">رقم الطلب</option>
        </select>
      </Field>
      <Field label="النوع">
        <select value={block.format ?? 'CODE128'} onChange={(e) => update({ format: e.target.value as BarcodeBlock['format'] })} className={inputCls}>
          <option value="CODE128">CODE128 (عام)</option>
          <option value="EAN13">EAN-13 (منتجات)</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="عرض (px)">
          <input type="number" value={block.width ?? 200} onChange={(e) => update({ width: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="ارتفاع (px)">
          <input type="number" value={block.height ?? 50} onChange={(e) => update({ height: Number(e.target.value) })} className={inputCls} />
        </Field>
      </div>
    </>
  );
}
