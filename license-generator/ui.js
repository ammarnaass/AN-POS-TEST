// خادم الواجهة الرسومية لتوليد تراخيص AN POS
// تشغيل: node license-generator/ui.js
// يفتح المتصفح تلقائياً بواجهة رسومية فاخرة وسهلة الاستخدام

import http from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { generateLicenseKey } from './generate-license.js';
import { generateKeyPairSync } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 5566;
const HISTORY_FILE = resolve(__dirname, 'licenses-history.json');
const PRIV_KEY_PATH = resolve(__dirname, 'private-key.pem');
const PUB_KEY_PATH = resolve(__dirname, 'public-key.pem');

// قراءة سجل التراخيص الصادرة
function loadHistory() {
  if (!existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// حفظ سجل التراخيص
function saveHistory(history) {
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

// إنشاء خادم HTTP
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ===== API Endpoints =====
  if (url.pathname === '/api/status') {
    const hasKeyPair = existsSync(PRIV_KEY_PATH) && existsSync(PUB_KEY_PATH);
    const pubKey = hasKeyPair ? readFileSync(PUB_KEY_PATH, 'utf8') : '';
    const history = loadHistory();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ hasKeyPair, pubKey, totalLicenses: history.length }));
    return;
  }

  if (url.pathname === '/api/history' && req.method === 'GET') {
    const history = loadHistory();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(history));
    return;
  }

  if (url.pathname === '/api/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const storeId = (data.storeId || 'ST0001').trim().toUpperCase();
        const customerName = (data.customerName || '').trim();
        const customerPhone = (data.customerPhone || '').trim();
        const durationType = data.durationType || 'lifetime'; // lifetime, 1year, 1month, custom
        const customDays = Number.parseInt(data.customDays || '0', 10);
        const maxDevices = Number.parseInt(data.maxMobileDevices || '5', 10);
        const notes = (data.notes || '').trim();

        let expiresAt = 0;
        let durationLabel = 'مدى الحياة';

        if (durationType === '1year') {
          expiresAt = Math.floor(Date.now() / 1000) + 365 * 86400;
          durationLabel = 'سنة واحدة (365 يوم)';
        } else if (durationType === '1month') {
          expiresAt = Math.floor(Date.now() / 1000) + 30 * 86400;
          durationLabel = 'شهر واحد (30 يوم)';
        } else if (durationType === 'custom' && customDays > 0) {
          expiresAt = Math.floor(Date.now() / 1000) + customDays * 86400;
          durationLabel = `${customDays} يوم`;
        }

        const result = generateLicenseKey({
          storeId,
          expiresAt,
          maxMobileDevices: maxDevices,
        });

        const newEntry = {
          id: 'LIC-' + Date.now().toString(36).toUpperCase(),
          storeId,
          customerName: customerName || 'متجر ' + storeId,
          customerPhone,
          key: result.key,
          expiresAt,
          durationLabel,
          maxMobileDevices: maxDevices,
          issuedAt: new Date().toISOString(),
          notes,
        };

        const history = loadHistory();
        history.unshift(newEntry);
        saveHistory(history);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, license: newEntry }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/history/') && req.method === 'DELETE') {
    const id = url.pathname.replace('/api/history/', '');
    let history = loadHistory();
    history = history.filter(item => item.id !== id);
    saveHistory(history);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // ===== صفحة الواجهة الأمامية HTML =====
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtmlContent());
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n======================================================`);
  console.log(`🚀 تم تشغيل واجهة توليد تراخيص AN POS بنجاح:`);
  console.log(`👉 ${url}`);
  console.log(`======================================================\n`);

  // فتح المتصفح تلقائياً
  const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${startCmd} ${url}`, () => {});
});

// قالب الواجهة الرسومية
function getHtmlContent() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مولد تراخيص AN POS — License Generator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Cairo', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            primary: '#0ea5e9',
            brand: '#0284c7',
            darkBg: '#0b1329',
            cardBg: '#111c44',
          }
        }
      }
    }
  </script>
  <style>
    body {
      background: radial-gradient(circle at top right, #13224f, #070d1e);
      font-family: 'Cairo', sans-serif;
    }
    .glass {
      background: rgba(17, 28, 68, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .custom-scroll::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scroll::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 999px;
    }
  </style>
</head>
<body class="text-slate-100 min-h-screen antialiased flex flex-col justify-between">

  <!-- Header -->
  <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 font-black text-xl text-white">
          AN
        </div>
        <div>
          <h1 class="text-lg font-bold flex items-center gap-2">
            لوحة توليد تراخيص AN POS
            <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Ed25519 Offline-First
            </span>
          </h1>
          <p class="text-xs text-slate-400">نظام إصدار المفاتيح المشفرة والموقعة رقمياً</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span id="keyStatusBadge" class="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          المفتاح الخاص متصل وجاهز
        </span>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
    
    <!-- Form Section (5 Cols) -->
    <div class="lg:col-span-5 space-y-6">
      <div class="glass rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <h2 class="text-base font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-700/60 pb-3">
          <svg class="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
          بيانات الترخيص الجديد
        </h2>

        <form id="genForm" class="space-y-4" onsubmit="handleGenerate(event)">
          
          <!-- معرّف المتجر -->
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">معرّف المتجر (Store ID) <span class="text-rose-400">*</span></label>
            <div class="relative">
              <input type="text" id="storeId" required maxlength="6" value="ST0001"
                class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none uppercase transition-all"
                placeholder="ST0001" />
              <button type="button" onclick="randomStoreId()" class="absolute left-2.5 top-2 text-[11px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300 transition-all">توليد عشوائي</button>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">معرف مكون من 1 إلى 6 أحرف/أرقام مميز للمحل.</p>
          </div>

          <!-- اسم العميل وهاتفه -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">اسم العميل / المحل</label>
              <input type="text" id="customerName" placeholder="سوبرماركت النور"
                class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-sky-500 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">رقم الهاتف (واتساب)</label>
              <input type="text" id="customerPhone" placeholder="0550123456"
                class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-sky-500 outline-none transition-all" />
            </div>
          </div>

          <!-- نوع الترخيص والصلاحية -->
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">مدة الاشتراك والصلاحية</label>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" onclick="setDuration('lifetime')" id="btn-lifetime"
                class="dur-btn py-2 px-3 rounded-xl border border-sky-500 bg-sky-500/20 text-sky-300 text-xs font-bold transition-all text-center">
                ♾️ مدى الحياة
              </button>
              <button type="button" onclick="setDuration('1year')" id="btn-1year"
                class="dur-btn py-2 px-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:border-slate-600 text-slate-300 text-xs font-bold transition-all text-center">
                📅 سنة (365 يوم)
              </button>
              <button type="button" onclick="setDuration('custom')" id="btn-custom"
                class="dur-btn py-2 px-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:border-slate-600 text-slate-300 text-xs font-bold transition-all text-center">
                ⚙️ مخصص
              </button>
            </div>
            <div id="customDaysBox" class="hidden mt-3">
              <label class="block text-[11px] text-slate-400 mb-1">حدد عدد الأيام:</label>
              <input type="number" id="customDays" min="1" max="3650" value="90"
                class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-sky-500 outline-none" />
            </div>
          </div>

          <!-- عدد أجهزة الجوال المسموح بها -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-bold text-slate-300">أجهزة الجوال المرخصة (Mobile Sync)</label>
              <span id="devicesVal" class="text-xs font-bold text-sky-400">5 أجهزة</span>
            </div>
            <input type="range" id="maxDevices" min="1" max="25" value="5" oninput="document.getElementById('devicesVal').innerText = this.value + ' أجهزة'"
              class="w-full accent-sky-500 h-2 bg-slate-800 rounded-lg cursor-pointer" />
            <div class="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>جهاز واحد</span>
              <span>10 أجهزة</span>
              <span>25 جهاز</span>
            </div>
          </div>

          <!-- ملاحظات -->
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">ملاحظات داخلية (اختياري)</label>
            <input type="text" id="notes" placeholder="ملاحظات الدفع أو الموزع"
              class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-sky-500 outline-none" />
          </div>

          <!-- زر التوليد -->
          <button type="submit" id="genBtn"
            class="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-bold text-white shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            توليد كود التفعيل الموقع رقمياً
          </button>
        </form>
      </div>

      <!-- نتيجة التوليد الفورية -->
      <div id="resultCard" class="hidden glass rounded-2xl p-6 border-emerald-500/30 bg-emerald-950/10 space-y-4 shadow-xl transition-all">
        <div class="flex items-center justify-between border-b border-slate-700/60 pb-3">
          <h3 class="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            تم إصدار المفتاح بنجاح!
          </h3>
          <span id="resStoreTag" class="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold"></span>
        </div>

        <div>
          <label class="block text-[11px] text-slate-400 mb-1">كود التفعيل (انسخه وأرسله للعميل):</label>
          <div class="relative">
            <textarea id="resKeyText" rows="3" readonly dir="ltr"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-sky-300 select-all focus:outline-none"></textarea>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1">
          <button onclick="copyKey()" id="copyBtn"
            class="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md">
            📋 نسخ الكود
          </button>
          <button onclick="downloadLicFile()"
            class="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            💾 تحميل ملف .lic
          </button>
        </div>

        <div id="waSection" class="pt-2 border-t border-slate-800">
          <button onclick="sendViaWhatsApp()"
            class="w-full py-2 px-4 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
            💬 إرسال عبر واتساب مباشرة
          </button>
        </div>
      </div>
    </div>

    <!-- History & Logs Section (7 Cols) -->
    <div class="lg:col-span-7 space-y-4">
      <div class="glass rounded-2xl p-6 shadow-xl h-full flex flex-col">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700/60">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              سجل التراخيص الصادرة
            </h2>
            <p class="text-xs text-slate-400">قائمة بالمفاتيح التي أصدرتها لعملائك</p>
          </div>
          <div class="flex items-center gap-2">
            <input type="text" id="searchInput" oninput="filterHistory()" placeholder="بحث باسم أو معرف المتجر..."
              class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none w-48 focus:border-sky-500" />
            <button onclick="exportCSV()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1">
              📊 تصدير Excel
            </button>
          </div>
        </div>

        <!-- History Table -->
        <div class="flex-1 overflow-y-auto custom-scroll pr-1">
          <div id="historyList" class="space-y-3">
            <div class="text-center py-12 text-slate-500 text-xs">جاري تحميل سجل التراخيص...</div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
    نظام AN POS — أداة توليد التراخيص المشفرة رقمياً (Ed25519) • سرّي وخاص بالناشر فقط
  </footer>

  <script>
    let currentDuration = 'lifetime';
    let latestLicense = null;
    let allHistory = [];

    function setDuration(type) {
      currentDuration = type;
      document.querySelectorAll('.dur-btn').forEach(btn => {
        btn.classList.remove('border-sky-500', 'bg-sky-500/20', 'text-sky-300');
        btn.classList.add('border-slate-700', 'bg-slate-900/60', 'text-slate-300');
      });
      const activeBtn = document.getElementById('btn-' + type);
      activeBtn.classList.remove('border-slate-700', 'bg-slate-900/60', 'text-slate-300');
      activeBtn.classList.add('border-sky-500', 'bg-sky-500/20', 'text-sky-300');

      const customBox = document.getElementById('customDaysBox');
      if (type === 'custom') {
        customBox.classList.remove('hidden');
      } else {
        customBox.classList.add('hidden');
      }
    }

    function randomStoreId() {
      const num = Math.floor(1000 + Math.random() * 9000);
      document.getElementById('storeId').value = 'ST' + num;
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const badge = document.getElementById('keyStatusBadge');
        if (data.hasKeyPair) {
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> المفتاح الخاص متصل وجاهز';
          badge.className = 'flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        } else {
          badge.innerHTML = '⚠️ زوج المفاتيح مفقود';
          badge.className = 'flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20';
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function fetchHistory() {
      try {
        const res = await fetch('/api/history');
        allHistory = await res.json();
        renderHistory(allHistory);
      } catch (err) {
        console.error(err);
      }
    }

    function renderHistory(list) {
      const container = document.getElementById('historyList');
      if (!list || list.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-slate-500 text-xs">لا توجد تراخيص صادرة حتى الآن. ابدأ بتوليد أول ترخيص!</div>';
        return;
      }

      container.innerHTML = list.map(item => \`
        <div class="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2 transition-all">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">\${item.storeId}</span>
              <span class="text-xs font-bold text-slate-200">\${item.customerName || 'عميل'}</span>
            </div>
            <span class="text-[11px] px-2 py-0.5 rounded-full font-bold \${item.expiresAt === 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}">
              \${item.durationLabel}
            </span>
          </div>

          <div class="text-xs font-mono text-slate-400 truncate bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 select-all" dir="ltr">
            \${item.key}
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <div class="flex items-center gap-3">
              <span>📱 \${item.maxMobileDevices} أجهزة</span>
              <span>📅 \${new Date(item.issuedAt).toLocaleDateString('ar-EG')}</span>
              \${item.customerPhone ? \`<span>📞 \${item.customerPhone}</span>\` : ''}
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="navigator.clipboard.writeText('\${item.key}'); alert('تم نسخ المفتاح!');"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold transition-all">
                نسخ 📋
              </button>
              <button onclick="deleteEntry('\${item.id}')"
                class="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 rounded text-[10px] font-bold transition-all">
                حذف 🗑️
              </button>
            </div>
          </div>
        </div>
      \`).join('');
    }

    function filterHistory() {
      const q = document.getElementById('searchInput').value.trim().toLowerCase();
      if (!q) {
        renderHistory(allHistory);
        return;
      }
      const filtered = allHistory.filter(i => 
        i.storeId.toLowerCase().includes(q) ||
        (i.customerName && i.customerName.toLowerCase().includes(q)) ||
        (i.customerPhone && i.customerPhone.includes(q))
      );
      renderHistory(filtered);
    }

    async function handleGenerate(e) {
      e.preventDefault();
      const btn = document.getElementById('genBtn');
      btn.disabled = true;
      btn.innerText = 'جاري التوقيع والتوليد...';

      const payload = {
        storeId: document.getElementById('storeId').value,
        customerName: document.getElementById('customerName').value,
        customerPhone: document.getElementById('customerPhone').value,
        durationType: currentDuration,
        customDays: document.getElementById('customDays').value,
        maxMobileDevices: document.getElementById('maxDevices').value,
        notes: document.getElementById('notes').value,
      };

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          latestLicense = data.license;
          showResult(latestLicense);
          fetchHistory();
        } else {
          alert('خطأ: ' + (data.error || 'تعذر توليد المفتاح'));
        }
      } catch (err) {
        alert('خطأ في الاتصال بالخادم');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg> توليد كود التفعيل الموقع رقمياً';
      }
    }

    function showResult(lic) {
      const card = document.getElementById('resultCard');
      card.classList.remove('hidden');
      document.getElementById('resStoreTag').innerText = lic.storeId + ' (' + lic.durationLabel + ')';
      document.getElementById('resKeyText').value = lic.key;
      card.scrollIntoView({ behavior: 'smooth' });
    }

    function copyKey() {
      if (!latestLicense) return;
      navigator.clipboard.writeText(latestLicense.key);
      const btn = document.getElementById('copyBtn');
      btn.innerText = '✓ تم النسخ!';
      setTimeout(() => (btn.innerText = '📋 نسخ الكود'), 2000);
    }

    function downloadLicFile() {
      if (!latestLicense) return;
      const blob = new Blob([JSON.stringify(latestLicense, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`\${latestLicense.storeId}.lic\`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function sendViaWhatsApp() {
      if (!latestLicense) return;
      const phone = (latestLicense.customerPhone || '').replace(/[^0-9]/g, '');
      const msg = encodeURIComponent(
\`مرحباً \${latestLicense.customerName}،
شكراً لطلبكم نظام AN POS. إليكم كود التفعيل الخاص بمتجركم:

🔑 كود التفعيل:
\${latestLicense.key}

📌 الصلاحية: \${latestLicense.durationLabel}
📱 الأجهزة المتاحة: \${latestLicense.maxMobileDevices} أجهزة

طريقة التفعيل:
1. افتح تطبيق AN POS على الكمبيوتر.
2. اذهب إلى الإعدادات ⚙️ -> تفعيل التطبيق.
3. الصق كود التفعيل واضغط "تفعيل".

لأي استفسار أو دعم فني نحن في خدمتكم!\`
      );
      const url = phone ? \`https://wa.me/\${phone}?text=\${msg}\` : \`https://wa.me/?text=\${msg}\`;
      window.open(url, '_blank');
    }

    async function deleteEntry(id) {
      if (!confirm('هل تريد حذف هذا السجل؟')) return;
      await fetch('/api/history/' + id, { method: 'DELETE' });
      fetchHistory();
    }

    function exportCSV() {
      if (allHistory.length === 0) return alert('لا توجد بيانات للتصدير');
      let csv = 'ID,Store ID,Customer Name,Phone,Duration,Max Devices,Issued At,Key\\n';
      allHistory.forEach(i => {
        csv += \`"\${i.id}","\${i.storeId}","\${i.customerName || ''}","\${i.customerPhone || ''}","\${i.durationLabel}","\${i.maxMobileDevices}","\${i.issuedAt}","\${i.key}"\\n\`;
      });
      const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`AN-POS-Licenses-\${new Date().toISOString().slice(0,10)}.csv\`;
      a.click();
      URL.revokeObjectURL(url);
    }

    fetchStatus();
    fetchHistory();
  </script>
</body>
</html>`;
}
