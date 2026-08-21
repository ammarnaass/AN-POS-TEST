// PrintQueuePage — POS-PRINT-001 Phase 2
// صفحة طابور الطباعة — مغلّف بـ ErrorBoundary لعرض أخطاء render بوضوح
import { PrintQueuePanelWithBoundary } from '@/components/print/PrintQueuePanel';

export default function PrintQueuePage() {
  return <PrintQueuePanelWithBoundary />;
}
