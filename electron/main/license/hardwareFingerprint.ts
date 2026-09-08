// استخراج بصمة عتاد ثابتة للجهاز (Hardware Fingerprint)
// تدعم Windows و Linux و macOS بدون أي مكتبات خارجية ثقيلة

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';

let cachedFingerprint: string | null = null;

/**
 * حساب بصمة ثابتة للجهاز
 */
export function computeHardwareFingerprint(): string {
  if (cachedFingerprint) return cachedFingerprint;

  let rawIdentifier = '';
  const platform = os.platform();

  try {

    if (platform === 'win32') {
      // قراءة MachineGuid من سجل Windows
      try {
        const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
          encoding: 'utf8',
          timeout: 2000,
          windowsHide: true,
        });
        const match = out.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
        if (match && match[1]) {
          rawIdentifier = match[1].trim();
        }
      } catch {
        // بديل: PowerShell Get-CimInstance UUID (يدعم Windows 11 24H2 والأنظمة الحديثة بدون wmic)
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
      // قراءة machine-id في لينكس
      const paths = ['/etc/machine-id', '/var/lib/dbus/machine-id'];
      for (const p of paths) {
        if (existsSync(p)) {
          rawIdentifier = readFileSync(p, 'utf8').trim();
          if (rawIdentifier) break;
        }
      }
    } else if (platform === 'darwin') {
      // قراءة الرقم التسلسلي في macOS عبر ioreg
      try {
        const out = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { encoding: 'utf8', timeout: 2000 });
        const match = out.match(/"IOPlatformSerialNumber"\s*=\s*"([^"]+)"/);
        if (match && match[1]) {
          rawIdentifier = match[1].trim();
        }
      } catch { /* fallback */ }
    }
  } catch (err) {
    console.warn('[license] تعذر استخراج معرّف النظام الأساسي، الاعتماد على fallback:', err);
  }

  // في حال لم يتوفر معرّف العتاد المباشر، ندمج خصائص بيئة التشغيل
  if (!rawIdentifier) {
    const cpus = os.cpus().map((c) => c.model).join('|');
    const totalMem = os.totalmem().toString();
    const hostname = os.hostname();
    rawIdentifier = `FALLBACK:${platform}:${hostname}:${cpus}:${totalMem}`;
  }

  // توليد SHA-256 Hash بصيغة سداسية عشرية قصيرة ومنظمة (16 مقطع = 32 حرف)
  const hash = createHash('sha256').update(`ANPOS-HW-SALT-v1:${rawIdentifier}`).digest('hex');
  cachedFingerprint = hash.slice(0, 32).toUpperCase();

  return cachedFingerprint;
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
