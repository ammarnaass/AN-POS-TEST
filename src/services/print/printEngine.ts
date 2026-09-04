// Print Engine — POS-PRINT-001 Phase 2
// محرك الطباعة الفعلية — يُصدَّر ليُستخدم من printService و printQueueService
// مسؤولية واحدة: تنفيذ window.open + window.print للنسخ المطلوبة
//
// POS-PRINT-001 / FR-013: يقبل printerId اختيارياً للحفاظ على التوافق مع
// printerConnection.ts — لكنه يستعمل دائماً window.print (BrowserPrintConnection).
// الطابعات الأخرى تمر مباشرة عبر getConnection(printer).print() وليس بالضرورة عبر هنا.

let printWindow: Window | null = null;

/**
 * تنفيذ الطباعة الفعلية عبر المتصفح — فتح نافذة جديدة وكتابة HTML ثم استدعاء print
 * @param html محتوى الصفحة الكامل (<html>...<script>QR/Barcode</script>...)
 * @param copies عدد النسخ المطلوبة
 * @param _printerId معرّف الطابعة (احتياطي V1 — لا يغيّر السلوك؛ حُ solved in printService)
 */
export async function doPrint(html: string, copies: number, _printerId?: string): Promise<void> {
  // 1. في بيئة Electron لسطح المكتب: طباعة صامتة فورية ومباشرة بدون نوافذ منبثقة
  const electronPrint = (window as any).electronAPI?.print;
  if (typeof electronPrint?.silent === 'function') {
    try {
      const res = await electronPrint.silent(html, {
        silent: true,
        copies: copies || 1,
        deviceName: _printerId || undefined,
      });
      if (res?.success) {
        return;
      }
      console.warn('[printEngine] فشلت الطباعة الصامتة، التراجع للطباعة العادية:', res?.error);
    } catch (e) {
      console.warn('[printEngine] استثناء أثناء الطباعة الصامتة:', e);
    }
  }

  // 2. البديل (Fallback): فتح نافذة المتصفح في حال تشغيل الويب الصرف
  return new Promise((resolve, reject) => {
    // إغلاق أي نافذة طباعة سابقة
    if (printWindow && !printWindow.closed) {
      printWindow.close();
    }

    printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      reject(new Error('تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.'));
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // انتظار تحميل الصفحة ثم الطباعة
    printWindow.onload = () => {
      setTimeout(() => {
        try {
          // طباعة عدد النسخ المطلوبة
          for (let i = 1; i < copies; i++) {
            printWindow?.print();
          }
          printWindow?.print();
          resolve();
        } catch (e) {
          reject(e);
        }
      }, 500);
    };

    // في حالة فشل onload
    setTimeout(() => {
      try {
        printWindow?.print();
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 1500);
  });
}
