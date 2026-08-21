import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import QueryProvider from '@/app/providers/QueryProvider';
import App from '@/App';
import './index.css';
import { useAuthStore } from '@/store/authStore';

// Electron main process يتولى initDatabase + initSchema + seed.
// هنا فقط نستعيد الجلسة ثم نعرض الواجهة.
// HashRouter بدل BrowserRouter لأن Electron يحمّل file://

async function main() {
  try {
    await useAuthStore.getState().restoreSession();
    console.log('restoreSession done:', useAuthStore.getState().isAuthenticated);
  } catch (e) {
    console.error('restoreSession failed:', e);
  }

  createRoot(document.getElementById('root')!).render(
    <HashRouter>
      <QueryProvider>
        <App />
      </QueryProvider>
    </HashRouter>
  );
}

main().catch((e) => {
  console.error('Fatal init error:', e);
  document.getElementById('root')!.innerHTML =
    '<div style="padding:20px;color:red;font-family:monospace"><h2>خطأ في التهيئة</h2><pre>' + (e?.message || e) + '</pre></div>';
});
