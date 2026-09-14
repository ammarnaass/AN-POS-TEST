import React, { useState } from 'react';
import { Smartphone, X, Check, Zap } from 'lucide-react';

export interface Design6FlexyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUpSuccess: (operator: string, phone: string, amount: number) => void;
}

const OPERATORS = [
  { id: 'mobilis', name: 'Mobilis', color: 'bg-emerald-600', border: 'border-emerald-500' },
  { id: 'djezzy', name: 'Djezzy', color: 'bg-red-600', border: 'border-red-500' },
  { id: 'ooredoo', name: 'Ooredoo', color: 'bg-rose-750', border: 'border-rose-600' },
  { id: '4g_lte', name: '4G LTE / Idoom', color: 'bg-blue-600', border: 'border-blue-500' },
];

const PRESET_AMOUNTS = [100, 200, 500, 1000, 1500, 2000];

export const Design6FlexyModal: React.FC<Design6FlexyModalProps> = ({
  isOpen,
  onClose,
  onTopUpSuccess,
}) => {
  const [selectedOperator, setSelectedOperator] = useState('mobilis');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(100);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim() && amount > 0) {
      onTopUpSuccess(selectedOperator, phone, amount);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-[#0b1222] border-2 border-violet-600/60 rounded-2xl p-5 shadow-2xl text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-violet-400 font-bold">
            <span>شحن وتعبئة الرصيد (فليكسي نت)</span>
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Operator Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-2 block">اختر المتعامل:</label>
            <div className="grid grid-cols-2 gap-2">
              {OPERATORS.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setSelectedOperator(op.id)}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    selectedOperator === op.id
                      ? `${op.color} text-white shadow-md ${op.border}`
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{op.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1 block">رقم الهاتف:</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06... / 07... / 05..."
              dir="ltr"
              required
              className="w-full h-11 bg-slate-900 border border-slate-700 rounded-xl px-3 font-mono text-center text-lg text-white placeholder-slate-600 focus:outline-hidden focus:border-violet-500"
            />
          </div>

          {/* Quick Amounts */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-2 block">المبلغ المعبأ (دج):</label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`py-1.5 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer border ${
                    amount === val
                      ? 'bg-violet-600 text-white border-violet-400 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {val} دج
                </button>
              ))}
            </div>
            <input
              type="number"
              min="10"
              step="10"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              dir="ltr"
              required
              className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-3 font-mono text-center text-base text-amber-400 focus:outline-hidden focus:border-violet-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 h-11 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>تأكيد الشحن وإضافة للسلة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
