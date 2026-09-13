import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Package, RefreshCw, Sparkles } from 'lucide-react';

interface PacksHeaderProps {
  packsCount: number;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
}

export const PacksHeader: React.FC<PacksHeaderProps> = ({
  packsCount,
  isLoading,
  onRefresh,
  onOpenCreate,
}) => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container/60 rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
      {/* Subtle decorative glow */}
      <div className="absolute top-0 -left-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-lg shadow-primary/25 ring-4 ring-primary/10">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-on-surface font-cairo tracking-tight">
                الباقات والحزم التجارية
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-sans">
                <Sparkles className="w-3.5 h-3.5" />
                {packsCount} باقة مسجلة
              </span>
            </div>
            <p className="text-sm text-on-surface-variant font-tajawal mt-1 leading-relaxed max-w-2xl">
              إدارة احترافية لكراتين الجملة، الباقات الترويجية، وحزم المنتجات المجمعة مع تتبع فوري لجاهزية التجميع من المخزون وهوامش الربح
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface hover:text-primary hover:bg-surface-container-high transition-all font-tajawal text-sm font-semibold cursor-pointer shadow-2xs"
            title="العودة إلى إدارة المخزون والبضائع"
          >
            <Package className="w-4 h-4 text-primary" />
            <span>المخزون والبضائع</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-bold font-tajawal hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة باقة / حزمة جديدة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
