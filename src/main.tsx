import '@fontsource/cairo/400.css';
import '@fontsource/cairo/500.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import '@fontsource/cairo/800.css';
import '@fontsource/cairo/900.css';
import '@fontsource/tajawal/400.css';
import '@fontsource/tajawal/500.css';
import '@fontsource/tajawal/700.css';
import '@fontsource/tajawal/800.css';
import '@fontsource/tajawal/900.css';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import QueryProvider from '@/app/providers/QueryProvider';
import App from '@/App';
import './index.css';
import { useAuthStore } from '@/store/authStore';

// Electron main process يتولى initDatabase + initSchema + seed.
// هنا فقط نستعيد الجلسة ثم نعرض الواجهة.
// HashRouter بدل BrowserRouter لأن Electron يحمّل file://

let reactRoot: ReturnType<typeof createRoot> | null = null;

function main() {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  if (!reactRoot) {
    reactRoot = createRoot(rootEl);
  }

  reactRoot.render(
    <HashRouter>
      <QueryProvider>
        <App />
      </QueryProvider>
    </HashRouter>
  );

  // استعادة الجلسة في الخلفية دون تعطيل تحميل الواجهة
  try {
    const sessionPromise = useAuthStore.getState()?.restoreSession?.();
    if (sessionPromise && typeof sessionPromise.catch === 'function') {
      sessionPromise.catch((e) => {
        console.warn('[main] restoreSession background error:', e);
      });
    }
  } catch (e) {
    console.warn('[main] restoreSession synchronous error:', e);
  }
}

try {
  main();
} catch (e: any) {
  console.error('Fatal init error:', e);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML =
      '<div style="padding:20px;color:red;font-family:monospace"><h2>خطأ في التهيئة</h2><pre>' + (e?.message || e) + '</pre></div>';
  }
}
