// PrinterStatusBadge — POS-PRINT-001 / FR-016
// Badge ملوّن يعرض حالة الطابعة
import type { PrinterStatus } from '@/types/invoicePrint';
import { statusMeta } from '@/services/print/printerStatus';

interface Props {
  status: PrinterStatus;
  size?: 'sm' | 'md';
}

export default function PrinterStatusBadge({ status, size = 'md' }: Props) {
  const meta = statusMeta(status);
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${meta.bg} ${meta.color} ${padding} font-medium`}
      title={`${meta.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
      {meta.label}
    </span>
  );
}
