import {
  AlignRight,
  AlignCenter,
  AlignLeft,
  Sparkles,
  Plus,
  Trash2,
  Tag,
  QrCode as QrIcon,
  Barcode as BarcodeIcon,
  Table as TableIcon,
  Upload,
  Image as ImageIcon,
  Store,
  Check,
  RotateCcw,
} from 'lucide-react';
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
  { v: 'xl', l: 'عريض' },
] as const;

const ALIGNS = [
  { v: 'right', l: 'يمين', icon: AlignRight },
  { v: 'center', l: 'وسط', icon: AlignCenter },
  { v: 'left', l: 'يسار', icon: AlignLeft },
] as const;

const COLOR_VARS = [
  { v: 'none', l: 'افتراضي', color: '#0f172a' },
  { v: 'primary', l: 'اللون الأساسي', color: '#0891b2' },
  { v: 'header', l: 'لون الترويسة', color: '#0e7490' },
  { v: 'footer', l: 'لون التذييل', color: '#475569' },
  { v: 'table', l: 'لون الجداول', color: '#64748b' },
] as const;

const VARIABLE_TAGS = [
  { tag: '{{shopLegal.name}}', label: 'المتجر' },
  { tag: '{{shopLegal.phone}}', label: 'الهاتف' },
  { tag: '{{shopLegal.address}}', label: 'العنوان' },
  { tag: '{{shopLegal.nif}}', label: 'NIF' },
  { tag: '{{shopLegal.rc}}', label: 'RC' },
  { tag: '{{invoice.number}}', label: 'رقم الفاتورة' },
  { tag: '{{invoice.date}}', label: 'التاريخ' },
  { tag: '{{invoice.total}}', label: 'الإجمالي' },
  { tag: '{{invoice.subtotal}}', label: 'المجموع الفرعي' },
  { tag: '{{user.name}}', label: 'الكاشير' },
  { tag: '{{customer.name}}', label: 'العميل' },
  { tag: '{{customer.phone}}', label: 'هاتف العميل' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-on-surface">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-xs border border-outline-variant/30 rounded-xl bg-surface-container text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';

export default function BlockPropertiesPanel({ section, block, onUpdate }: Props) {
  if (!block) {
    return (
      <div className="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/50">
          <Tag className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold">اختر عنصراً لتعديل خصائصه</p>
        <p className="text-xs text-on-surface-variant/70">انقر على أي عنصر في لوحة العمل بالأعلى لتخصيصه</p>
      </div>
    );
  }

  const update = (updates: Partial<Block>) => onUpdate(section, block.id, updates);

  return (
    <div className="space-y-5 p-4" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            {block.type === 'text' && <Tag className="w-4 h-4" />}
            {block.type === 'table' && <TableIcon className="w-4 h-4" />}
            {block.type === 'qr' && <QrIcon className="w-4 h-4" />}
            {block.type === 'barcode' && <BarcodeIcon className="w-4 h-4" />}
            {block.type !== 'text' && block.type !== 'table' && block.type !== 'qr' && block.type !== 'barcode' && <Sparkles className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold font-cairo text-on-surface">خصائص العنصر</h3>
            <span className="text-[11px] text-on-surface-variant font-mono">النوع: {block.type}</span>
          </div>
        </div>
      </div>

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

      {/* row/column */}
      {(block.type === 'row' || block.type === 'column') && (
        <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/20 text-xs text-on-surface-variant leading-relaxed">
          💡 هذا العنصر عبارة عن حاوية هيكلية متقدمة ({block.type === 'row' ? 'صف أفقي' : 'عمود رأسي'}). يمكنك تحرير العناصر الفرعية بالداخل مباشرة.
        </div>
      )}
    </div>
  );
}

function TextProps({ block, update }: { block: TextBlock; update: (u: Partial<Block>) => void }) {
  const text = Array.isArray(block.text) ? block.text.join('\n') : block.text;

  const insertVariable = (tag: string) => {
    const newText = text ? `${text} ${tag}` : tag;
    update({ text: newText.split('\n') });
  };

  return (
    <div className="space-y-4">
      <Field label="المحتوى النصي">
        <textarea
          value={text}
          onChange={(e) => update({ text: e.target.value.split('\n') })}
          rows={3}
          className={inputCls + ' resize-none font-sans'}
          placeholder="اكتب النص أو اختر من المتغيرات أدناه..."
        />
      </Field>

      {/* رقائق المتغيرات السريعة */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface mb-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>إدراج متغير ذكي:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLE_TAGS.map((vt) => (
            <button
              key={vt.tag}
              type="button"
              onClick={() => insertVariable(vt.tag)}
              className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-outline-variant/20 text-[11px] font-semibold text-on-surface transition-all active:scale-95"
              title={`إدراج ${vt.tag}`}
            >
              +{vt.label}
            </button>
          ))}
        </div>
      </div>

      {/* المحاذاة */}
      <Field label="المحاذاة">
        <div className="grid grid-cols-3 gap-2 bg-surface-container p-1 rounded-xl border border-outline-variant/20">
          {ALIGNS.map((a) => {
            const Icon = a.icon;
            const active = (block.align ?? 'right') === a.v;
            return (
              <button
                key={a.v}
                type="button"
                onClick={() => update({ align: a.v as TextBlock['align'] })}
                className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  active
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{a.l}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* الحجم والسماكة */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="الحجم">
          <div className="grid grid-cols-2 gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant/20">
            {SIZES.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => update({ size: s.v as TextBlock['size'] })}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  (block.size ?? 'md') === s.v
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </Field>

        <Field label="السماكة">
          <select
            value={block.weight ?? 400}
            onChange={(e) => update({ weight: Number(e.target.value) as TextBlock['weight'] })}
            className={inputCls}
          >
            <option value={300}>خفيف (300)</option>
            <option value={400}>عادي (400)</option>
            <option value={500}>متوسط (500)</option>
            <option value={600}>شبه عريض (600)</option>
            <option value={700}>عريض بارز (700)</option>
          </select>
        </Field>
      </div>

      {/* اللون */}
      <Field label="لون النص">
        <select
          value={block.colorVar ?? 'none'}
          onChange={(e) => update({ colorVar: e.target.value as TextBlock['colorVar'] })}
          className={inputCls}
        >
          {COLOR_VARS.map((c) => (
            <option key={c.v} value={c.v}>{c.l}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function ImageProps({ block, update }: { block: ImageBlock; update: (u: Partial<Block>) => void }) {
  const isDefaultLogo = !block.src || block.src === '{{shopLegal.logo}}';
  const width = block.width ?? 80;
  const height = block.height ?? 80;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          update({ src: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const applySizePreset = (w: number, h: number) => {
    update({ width: w, height: h });
  };

  return (
    <div className="space-y-4">
      {/* اختيار مصدر الشعار */}
      <Field label="مصدر الشعار">
        <div className="grid grid-cols-2 gap-2 bg-surface-container p-1 rounded-xl border border-outline-variant/20">
          <button
            type="button"
            onClick={() => update({ src: '' })}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              isDefaultLogo
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>شعار المتجر</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isDefaultLogo) {
                update({ src: 'https://' });
              }
            }}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              !isDefaultLogo
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>صورة مخصصة</span>
          </button>
        </div>
      </Field>

      {/* تفاصيل المصدر المخصص أو تنبيه شعار المتجر */}
      {isDefaultLogo ? (
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-on-surface-variant space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <Check className="w-3.5 h-3.5" />
            <span>يستخدم شعار المتجر الفعلي</span>
          </div>
          <p className="text-[11px] leading-relaxed text-on-surface-variant/80">
            يتم جلب الشعار تلقائياً من إعدادات المؤسسة أو من قسم هوية الطباعة بأعلى الصفحة.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Field label="رابط الصورة أو رفع ملف">
            <div className="flex gap-2">
              <input
                value={block.src}
                onChange={(e) => update({ src: e.target.value })}
                className={inputCls + ' flex-1'}
                placeholder="أدخل رابط صورة (URL أو Data URL)..."
                dir="ltr"
              />
              <label className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-outline-variant/30 text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>رفع</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </Field>
          <button
            type="button"
            onClick={() => update({ src: '' })}
            className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>العودة لاستخدام شعار المتجر الافتراضي</span>
          </button>
        </div>
      )}

      {/* أحجام سريعة جاهزة */}
      <div>
        <div className="text-xs font-bold text-on-surface mb-2">مقاسات سريعة للشعار:</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { l: 'صغير', w: 50, h: 50 },
            { l: 'متوسط', w: 80, h: 80 },
            { l: 'كبير', w: 120, h: 120 },
            { l: 'عريض', w: 160, h: 80 },
          ].map((preset) => {
            const isMatch = width === preset.w && height === preset.h;
            return (
              <button
                key={preset.l}
                type="button"
                onClick={() => applySizePreset(preset.w, preset.h)}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-all ${
                  isMatch
                    ? 'bg-primary/10 border-primary text-primary shadow-xs'
                    : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {preset.l} ({preset.w}px)
              </button>
            );
          })}
        </div>
      </div>

      {/* أبعاد العرض والارتفاع الدقيقة */}
      <div className="space-y-3 bg-surface-container/50 p-3 rounded-2xl border border-outline-variant/15">
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-on-surface mb-1">
            <span>العرض (Width)</span>
            <span className="font-mono text-primary font-black">{width}px</span>
          </div>
          <input
            type="range"
            min={30}
            max={250}
            step={5}
            value={width}
            onChange={(e) => update({ width: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold text-on-surface mb-1">
            <span>الارتفاع (Height)</span>
            <span className="font-mono text-primary font-black">{height}px</span>
          </div>
          <input
            type="range"
            min={20}
            max={200}
            step={5}
            value={height}
            onChange={(e) => update({ height: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {/* المحاذاة */}
      <Field label="المحاذاة">
        <div className="grid grid-cols-3 gap-2 bg-surface-container p-1 rounded-xl border border-outline-variant/20">
          {ALIGNS.map((a) => {
            const Icon = a.icon;
            const active = (block.align ?? 'center') === a.v;
            return (
              <button
                key={a.v}
                type="button"
                onClick={() => update({ align: a.v as ImageBlock['align'] })}
                className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  active
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{a.l}</span>
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

function TableProps({ block, update }: { block: TableBlock; update: (u: Partial<Block>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold text-on-surface mb-2">أعمدة جدول المنتجات</div>
        <div className="space-y-2">
          {block.columns.map((col, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={col.label}
                onChange={(e) => {
                  const cols = [...block.columns];
                  cols[idx] = { ...col, label: e.target.value };
                  update({ columns: cols });
                }}
                className={inputCls + ' flex-1'}
                placeholder="عنوان العمود"
              />
              <button
                type="button"
                onClick={() => update({ columns: block.columns.filter((_, i) => i !== idx) })}
                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                title="حذف العمود"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const cols = [...block.columns, { key: 'qty', label: 'عمود جديد', align: 'right' as const, format: 'text' as const }];
            update({ columns: cols });
          }}
          className="mt-2.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة عمود</span>
        </button>
      </div>

      <div className="border-t border-outline-variant/15 pt-3">
        <div className="text-xs font-bold text-on-surface mb-2">خيارات الإجماليات والتذييل:</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'showSubtotal', label: 'المجموع الفرعي' },
            { key: 'showDiscount', label: 'الخصم' },
            { key: 'showTva', label: 'ضريبة TVA' },
            { key: 'showTotal', label: 'الإجمالي النهائي' },
          ].map((item) => (
            <label
              key={item.key}
              className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                (block as any)[item.key]
                  ? 'bg-primary/10 border-primary/40 text-primary font-bold'
                  : 'bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <input
                type="checkbox"
                checked={(block as any)[item.key] ?? false}
                onChange={(e) => update({ [item.key]: e.target.checked })}
                className="rounded text-primary focus:ring-primary/20"
              />
              <span className="text-xs">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeparatorProps({ block, update }: { block: SeparatorBlock; update: (u: Partial<Block>) => void }) {
  return (
    <Field label="نمط الخط الفاصل">
      <div className="grid grid-cols-3 gap-2 bg-surface-container p-1 rounded-xl border border-outline-variant/20">
        {[
          { v: 'solid', l: 'متصل' },
          { v: 'dashed', l: 'متقطع' },
          { v: 'dotted', l: 'منقط' },
        ].map((s) => (
          <button
            key={s.v}
            type="button"
            onClick={() => update({ style: s.v as SeparatorBlock['style'] })}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              (block.style ?? 'dashed') === s.v
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {s.l}
          </button>
        ))}
      </div>
    </Field>
  );
}

function QrProps({ block, update }: { block: QrBlock; update: (u: Partial<Block>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="محتوى رمز QR">
        <select
          value={block.payload}
          onChange={(e) => update({ payload: e.target.value as QrBlock['payload'] })}
          className={inputCls}
        >
          <option value="invoiceNumber">رقم الفاتورة فقط</option>
          <option value="invoiceUrl">رابط الفاتورة الإلكتروني</option>
          <option value="invoiceNumber:date:total">رقم الفاتورة + التاريخ + الإجمالي (ضريبي)</option>
        </select>
      </Field>

      <Field label="حجم الرمز (px)">
        <input
          type="number"
          value={block.size ?? 110}
          onChange={(e) => update({ size: Number(e.target.value) })}
          className={inputCls}
        />
      </Field>

      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary leading-relaxed">
        ⚡ يُولَّد رمز الـ QR Code بصيغة Vector SVG فائقة الوضوح والسرعة ومتوافقة مع كافة أنواع الطابعات الحرارية وA4.
      </div>
    </div>
  );
}

function BarcodeProps({ block, update }: { block: BarcodeBlock; update: (u: Partial<Block>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="مصدر قيمة الباركود">
        <select
          value={block.source}
          onChange={(e) => update({ source: e.target.value as BarcodeBlock['source'] })}
          className={inputCls}
        >
          <option value="invoiceNumber">رقم الفاتورة</option>
          <option value="orderNumber">رقم الطلب</option>
        </select>
      </Field>

      <Field label="صيغة الباركود">
        <select
          value={block.format ?? 'CODE128'}
          onChange={(e) => update({ format: e.target.value as BarcodeBlock['format'] })}
          className={inputCls}
        >
          <option value="CODE128">CODE128 (قياسي متوافق مع كافة الرموز)</option>
          <option value="EAN13">EAN-13 (أكواد تجارية رقمية)</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="العرض (px)">
          <input
            type="number"
            value={block.width ?? 200}
            onChange={(e) => update({ width: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
        <Field label="الارتفاع (px)">
          <input
            type="number"
            value={block.height ?? 40}
            onChange={(e) => update({ height: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}
