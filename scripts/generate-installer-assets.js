// توليد الموارد البصرية لمثبت NSIS في بيئة Windows
// ينشئ الأيقونات وصور العرض الجانبية والعلوية بمقاييس دقيقة مطابقة لمواصفات NSIS MUI2

import fs from 'node:fs';
import path from 'node:path';

const buildDir = path.resolve('build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// 1. نسخ الأيقونات متعددة المقاسات
const sourceIco = path.resolve('public/an-pos-icon.ico');
if (fs.existsSync(sourceIco)) {
  fs.copyFileSync(sourceIco, path.join(buildDir, 'icon.ico'));
  fs.copyFileSync(sourceIco, path.join(buildDir, 'installer.ico'));
  fs.copyFileSync(sourceIco, path.join(buildDir, 'uninstaller.ico'));
}

/**
 * توليد ملف 24-bit BMP برمجياً بدقة متناهية وبدون مكتبات خارجية
 */
function createBmp(width, height, getPixel) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // BMP Header
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);

  // DIB Header (BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);

  // Pixel data (bottom-up in standard BMP)
  for (let y = 0; y < height; y++) {
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, height - 1 - y);
      const pixelOffset = rowOffset + x * 3;
      buf[pixelOffset] = Math.max(0, Math.min(255, Math.round(b)));
      buf[pixelOffset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      buf[pixelOffset + 2] = Math.max(0, Math.min(255, Math.round(r)));
    }
  }
  return buf;
}

// 2. ترويسة المثبت installerHeader.bmp (150 × 57 pixels)
const headerBmp = createBmp(150, 57, (x, y) => {
  const t = (x + y * 0.5) / (150 + 28);
  const r = 15 + t * (30 - 15);
  const g = 23 + t * (64 - 23);
  const b = 42 + t * (175 - 42);
  if (y >= 55) return [37, 99, 235]; // خط أزرق مميز في الأسفل
  return [r, g, b];
});
fs.writeFileSync(path.join(buildDir, 'installerHeader.bmp'), headerBmp);

// 3. اللوحة الجانبية الترحيبية installerSidebar.bmp (164 × 314 pixels)
const sidebarBmp = createBmp(164, 314, (x, y) => {
  const t = y / 314;
  let r = 10 + t * (25 - 10);
  let g = 18 + t * (50 - 18);
  let b = 35 + t * (120 - 35);
  if ((x % 16 === 0 || y % 16 === 0) && y > 150) {
    r += 12; g += 20; b += 35;
  }
  return [r, g, b];
});
fs.writeFileSync(path.join(buildDir, 'installerSidebar.bmp'), sidebarBmp);

console.log('✅ تم تجهيز موارد التثبيت البصرية (Build Assets) بنجاح داخل مجلد build/.');
