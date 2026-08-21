import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Product, WarehouseEntity, MovementType } from '@/infrastructure/database/dexie/db';
import { movementRepo } from '../infrastructure/repositories/movementRepo';

const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: 'receive', label: 'استلام بضاعة' },
  { value: 'issue', label: 'صرف بضاعة' },
  { value: 'purchase', label: 'شراء' },
  { value: 'sale', label: 'بيع' },
  { value: 'return', label: 'مرتجع' },
  { value: 'waste', label: 'تالف/هالك' },
  { value: 'adjust', label: 'تعديل يدوي' },
  { value: 'transfer', label: 'تحويل' },
];

interface LineInput {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  products: Product[];
  warehouses: WarehouseEntity[];
  createdBy?: string;
  onDone: () => void;
  onError: (msg: string) => void;
}

export default function StockMovementForm({ products, warehouses, createdBy, onDone, onError }: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<MovementType>('receive');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineInput[]>([
    { itemId: '', quantity: 1, unitPrice: 0 },
  ]);

  const setLine = (i: number, patch: Partial<LineInput>) =>
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines(prev => [...prev, { itemId: '', quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const totalAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const submit = async () => {
    try {
      await movementRepo.create({
        date,
        type,
        warehouseId,
        lines: lines.map(l => ({
          ...l,
          quantity: Number(l.quantity) || 0,
          unitPrice: Number(l.unitPrice) || 0,
        })),
        reference,
        description: description || undefined,
        createdBy,
      });
      onDone();
    } catch (e) {
      onError((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onDone}>
      <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6 w-full max-w-3xl space-y-4 my-8" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-bold text-on-surface">حركة مخزون جديدة</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">التاريخ</label>
            <input type="date" className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">نوع الحركة</label>
            <select className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface" value={type} onChange={e => setType(e.target.value as MovementType)}>
              {MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">المستودع</label>
            <select className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface" placeholder="المرجع (مستند مصدر) *" value={reference} onChange={e => setReference(e.target.value)} />
          <input className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface" placeholder="الوصف" value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs text-on-surface-variant px-2">
            <span className="col-span-5">الصنف</span>
            <span className="col-span-2 text-center">الكمية</span>
            <span className="col-span-2 text-center">سعر الوحدة</span>
            <span className="col-span-2 text-center">المبلغ</span>
            <span className="col-span-1" />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <select className="col-span-5 bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface" value={l.itemId} onChange={e => setLine(i, { itemId: e.target.value })}>
                <option value="">— اختر الصنف —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} - ` : ''}{p.name}</option>)}
              </select>
              <input type="number" min={1} className="col-span-2 bg-surface-container-high border border-outline-variant/20 rounded-xl px-2 py-2 text-sm text-on-surface text-center" value={l.quantity || ''} onChange={e => setLine(i, { quantity: Number(e.target.value) })} />
              <input type="number" min={0} step="0.01" className="col-span-2 bg-surface-container-high border border-outline-variant/20 rounded-xl px-2 py-2 text-sm text-on-surface text-center" value={l.unitPrice || ''} onChange={e => setLine(i, { unitPrice: Number(e.target.value) })} />
              <span className="col-span-2 text-center text-sm text-emerald-400">{(l.quantity * l.unitPrice).toLocaleString('ar-DZ', { minimumFractionDigits: 2 })}</span>
              <button onClick={() => removeLine(i)} className="col-span-1 flex justify-center text-on-surface-variant hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={addLine} className="flex items-center gap-1 text-cyan-400 text-sm hover:text-cyan-300"><Plus className="w-4 h-4" /> إضافة صنف</button>
        </div>

        <div className="flex justify-between items-center border-t border-outline-variant/20 pt-3 text-sm">
          <span className="text-on-surface">الإجمالي: <span className="text-emerald-400 font-bold">{totalAmount.toLocaleString('ar-DZ', { minimumFractionDigits: 2 })}</span></span>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onDone} className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high text-sm">إلغاء</button>
          <button onClick={submit} className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600">حفظ الحركة</button>
        </div>
      </div>
    </div>
  );
}
