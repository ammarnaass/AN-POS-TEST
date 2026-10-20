// استخراج بصمة عتاد ثابتة ومتعددة المصادر للجهاز (Hardware Fingerprint v2 - M10)
// تدمج معرف نظام التشغيل (MachineGuid) مع معرف اللوحة الأم والـ BIOS لمنع التكرار عند استنساخ صور النظام
// تدعم Windows و Linux و macOS بدون أي مكتبات خارجية ثقيلة مع الحفاظ على التوافق الرجعي

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';

let cachedFingerprint: string | null = null;
let cachedLegacyFingerprint: string | null = null;

/**
 * حساب بصمة العتاد المتعددة المصادر (v2)
 */
export function computeHardwareFingerprint(): string {
  if (cachedFingerprint) return cachedFingerprint;

  let rawIdentifier = '';
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      let machineGuid = '';
      let boardInfo = '';

      // 1. قراءة MachineGuid من سجل Windows
      try {
        const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
          encoding: 'utf8',
          timeout: 2000,
          windowsHide: true,
        });
        const match = out.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
        if (match && match[1]) {
          machineGuid = match[1].trim();
        }
      } catch { /* continue */ }

      // 2. قراءة معلومات اللوحة الأم وBIOS من سجل Windows (سريع جداً وبدون استدعاء PowerShell)
      try {
        const biosOut = execSync('reg query "HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS"', {
          encoding: 'utf8',
          timeout: 2000,
          windowsHide: true,
        });
        const boardSerial = biosOut.match(/BaseBoardSerialNumber\s+REG_SZ\s+([^\r\n]+)/i)?.[1]?.trim() || '';
        const boardProduct = biosOut.match(/BaseBoardProduct\s+REG_SZ\s+([^\r\n]+)/i)?.[1]?.trim() || '';
        const sysSerial = biosOut.match(/SystemSerialNumber\s+REG_SZ\s+([^\r\n]+)/i)?.[1]?.trim() || '';
        const sysProduct = biosOut.match(/SystemProductName\s+REG_SZ\s+([^\r\n]+)/i)?.[1]?.trim() || '';

        const parts = [boardProduct, boardSerial, sysProduct, sysSerial].filter(
          (p) => p && !/^(to be filled|none|default|o\.e\.m|system serial)/i.test(p)
        );
        if (parts.length > 0) {
          boardInfo = parts.join(':');
        }
      } catch { /* continue */ }

      // 3. بديل في حال تعذر السجل: استخدام PowerShell لقراءة Win32_ComputerSystemProduct UUID
      if (!boardInfo) {
        try {
          const ps = execSync('powershell -NoProfile -Command "(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID"', {
            encoding: 'utf8',
            timeout: 2500,
            windowsHide: true,
          });
          const val = ps.trim();
          if (val && !val.includes('powershell')) boardInfo = val;
        } catch { /* fallback */ }
      }

      if (machineGuid || boardInfo) {
        rawIdentifier = `WIN:MG=${machineGuid}|HW=${boardInfo}`;
      }
    } else if (platform === 'linux') {
      // قراءة machine-id في لينكس مدمجاً مع DMI UUID إن وجد
      let machineId = '';
      const paths = ['/etc/machine-id', '/var/lib/dbus/machine-id'];
      for (const p of paths) {
        if (existsSync(p)) {
          machineId = readFileSync(p, 'utf8').trim();
          if (machineId) break;
        }
      }

      let dmiUuid = '';
      const dmiPaths = ['/sys/class/dmi/id/product_uuid', '/sys/class/dmi/id/board_serial'];
      for (const p of dmiPaths) {
        if (existsSync(p)) {
          try {
            const val = readFileSync(p, 'utf8').trim();
            if (val && !val.includes('Permission denied')) {
              dmiUuid = val;
              break;
            }
          } catch { /* ignore */ }
        }
      }

      if (machineId || dmiUuid) {
        rawIdentifier = `LINUX:MID=${machineId}|UUID=${dmiUuid}`;
      }
    } else if (platform === 'darwin') {
      // قراءة الرقم التسلسلي في macOS عبر ioreg
      try {
        const out = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { encoding: 'utf8', timeout: 2000 });
        const matchSerial = out.match(/"IOPlatformSerialNumber"\s*=\s*"([^"]+)"/);
        const matchUuid = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
        const serial = matchSerial?.[1]?.trim() || '';
        const uuid = matchUuid?.[1]?.trim() || '';
        if (serial || uuid) {
          rawIdentifier = `DARWIN:SERIAL=${serial}|UUID=${uuid}`;
        }
      } catch { /* fallback */ }
    }
  } catch (err) {
    console.warn('[license] تعذر استخراج معرّف العتاد المتقدم، الاعتماد على fallback:', err);
  }

  // في حال لم يتوفر معرّف العتاد المباشر، ندمج خصائص بيئة التشغيل
  if (!rawIdentifier) {
    const cpus = os.cpus().map((c) => c.model).join('|');
    const totalMem = os.totalmem().toString();
    const hostname = os.hostname();
    rawIdentifier = `FALLBACK:${platform}:${hostname}:${cpus}:${totalMem}`;
  }

  // توليد SHA-256 Hash بصيغة سداسية عشرية قصيرة ومنظمة (16 مقطع = 32 حرف)
  const hash = createHash('sha256').update(`ANPOS-HW-SALT-v2:${rawIdentifier}`).digest('hex');
  cachedFingerprint = hash.slice(0, 32).toUpperCase();

  return cachedFingerprint;
}

/**
 * حساب بصمة العتاد القديمة (v1) لضمان التوافق مع التراخيص السابقة المفعلة
 */
export function computeLegacyHardwareFingerprint(): string {
  if (cachedLegacyFingerprint) return cachedLegacyFingerprint;

  let rawIdentifier = '';
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      try {
        const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
          encoding: 'utf8',
          timeout: 2000,
          windowsHide: true,
        });
        const match = out.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
        if (match && match[1]) rawIdentifier = match[1].trim();
      } catch {
        try {
          const ps = execSync('powershell -NoProfile -Command "(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID"', {
            encoding: 'utf8',
            timeout: 2500,
            windowsHide: true,
          });
          const val = ps.trim();
          if (val && !val.includes('powershell')) rawIdentifier = val;
        } catch { /* fallback */ }
      }
    } else if (platform === 'linux') {
      const paths = ['/etc/machine-id', '/var/lib/dbus/machine-id'];
      for (const p of paths) {
        if (existsSync(p)) {
          rawIdentifier = readFileSync(p, 'utf8').trim();
          if (rawIdentifier) break;
        }
      }
    } else if (platform === 'darwin') {
      try {
        const out = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { encoding: 'utf8', timeout: 2000 });
        const match = out.match(/"IOPlatformSerialNumber"\s*=\s*"([^"]+)"/);
        if (match && match[1]) rawIdentifier = match[1].trim();
      } catch { /* fallback */ }
    }
  } catch { /* ignore */ }

  if (!rawIdentifier) {
    const cpus = os.cpus().map((c) => c.model).join('|');
    const totalMem = os.totalmem().toString();
    const hostname = os.hostname();
    rawIdentifier = `FALLBACK:${platform}:${hostname}:${cpus}:${totalMem}`;
  }

  const hash = createHash('sha256').update(`ANPOS-HW-SALT-v1:${rawIdentifier}`).digest('hex');
  cachedLegacyFingerprint = hash.slice(0, 32).toUpperCase();
  return cachedLegacyFingerprint;
}

/**
 * استخراج بصمة عتاد رقمية موجزة 32-بت من نص البصمة (تُستخدم للربط المشفر بالترخيص)
 */
export function computeHardwareHashIntFromFingerprint(fp: string): number {
  if (!fp) return 0;
  const clean = fp.replace(/[^A-Fa-f0-9]/g, '');
  if (clean.length < 8) return 0;
  return Buffer.from(clean.slice(0, 8), 'hex').readUInt32LE(0);
}

/**
 * استخراج بصمة عتاد رقمية موجزة 32-بت للجهاز الحالي
 */
export function computeHardwareHashInt(): number {
  const fp = computeHardwareFingerprint();
  return computeHardwareHashIntFromFingerprint(fp);
}

/**
 * استخراج بصمة عتاد رقمية موجزة 32-بت للنسخة القديمة v1 (للتوافق الرجعي)
 */
export function computeLegacyHardwareHashInt(): number {
  const fp = computeLegacyHardwareFingerprint();
  return computeHardwareHashIntFromFingerprint(fp);
}
