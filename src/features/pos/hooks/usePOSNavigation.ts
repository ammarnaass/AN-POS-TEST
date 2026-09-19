import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * usePOSNavigation — تنقل مركزي ومتين لشاشات نقطة البيع.
 *
 * لماذا hook مشترك؟
 * - كل التخطيطات الـ 7 كانت تعتمد على نسخ مكررة من `navigate('/')` و `navigate('/sales')`.
 * - الخروج من ملء الشاشة كان يُستدعى دون انتظار، فيسبق التنقل أحيانًا.
 * - في بيئة Electron (HashRouter) يُضاف fallback عبر `window.location.hash` عند فشل `navigate`.
 */
export function usePOSNavigation() {
  const navigate = useNavigate();

  const safeNavigate = useCallback(
    (to: string) => {
      // 1. الخروج من وضع ملء الشاشة في الخلفية فوراً دون تعطيل أو تأخير التنقل
      try {
        if (typeof document !== 'undefined' && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {
        // تجاهل — التنقل يجب أن يتم في كل الأحوال
      }

      // 2. استدعاء navigate فوراً
      const targetPath = to.startsWith('/') ? to : `/${to}`;
      try {
        navigate(targetPath);
      } catch {
        // fallback
      }

      // 3. تأكيد وتزامن الـ hash فورياً لضمان الانتقال في بيئة Electron و HashRouter
      if (typeof window !== 'undefined') {
        const targetHash = `#${targetPath}`;
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        }
      }
    },
    [navigate]
  );

  /** الخروج إلى لوحة التحكم الرئيسية */
  const goHome = useCallback(() => {
    safeNavigate('/');
  }, [safeNavigate]);

  /** فتح سجل المبيعات */
  const goSalesHistory = useCallback(() => {
    safeNavigate('/sales');
  }, [safeNavigate]);

  return { goHome, goSalesHistory };
}

export default usePOSNavigation;
