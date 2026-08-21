// PrintHistoryPanel — POS-PRINT-001
// عرض سجل طباعة فاتورة
import { useQuery } from '@tanstack/react-query';
import { getPrintHistory } from '@/services/print/printService';
import { Printer } from 'lucide-react';

interface PrintHistoryPanelProps {
  saleId: string;
}

export default function PrintHistoryPanel({ saleId }: PrintHistoryPanelProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['printHistory', saleId],
    queryFn: () => getPrintHistory(saleId),
    enabled: !!saleId,
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  
  if (history.length === 0) {
    return (
      <p className="text-on-surface-variant text-body-sm text-center py-4">لا توجد سجلات طباعة</p>
    );
  }
  
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {history.map((record) => (
        <div key={record.id} className="flex items-center justify-between p-3 bg-surface-container/30 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Printer className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-on-surface text-body-sm">
                {new Date(record.printedAt).toLocaleDateString('ar-DZ', {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <p className="text-on-surface-variant text-xs">{record.copies} نسخة</p>
            </div>
          </div>
          {record.isReprint && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">إعادة طباعة</span>
          )}
        </div>
      ))}
    </div>
  );
}