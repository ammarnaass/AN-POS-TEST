// إدارة قواعد جدار حماية ويندوز عند تفعيل خادم الشبكة المحلية (A4 - Windows Firewall Helper)
// يضمن:
// 1. تقييد المنفذ الفعلي للبرنامج على الشبكات الخاصة ونطاق العمل فقط (profile=private,domain)
// 2. تقييد الاتصالات بالشبكة الفرعية المحلية (remoteip=localsubnet)
// 3. منع فتح المنفذ على الشبكات العامة (Public)
// 4. استدعاء netsh بصلاحيات المدير عبر UAC عند الطلب دون تشغيل التطبيق بالكامل كمدير (asInvoker)

import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ipcMain } from 'electron';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export const FIREWALL_RULE_NAME = 'AN POS LAN Server';

export interface FirewallStatus {
  exists: boolean;
  port?: number;
  profiles?: string[];
  remoteIp?: string;
  error?: string;
}

/**
 * فحص حالة وجود وتكوين قاعدة جدار الحماية الحالية
 * لا يتطلب صلاحيات مدير لقراءة القواعد
 */
export async function checkFirewallRule(expectedPort?: number): Promise<FirewallStatus> {
  if (process.platform !== 'win32') {
    return { exists: true, port: expectedPort };
  }

  try {
    const { stdout } = await execAsync(`netsh advfirewall firewall show rule name="${FIREWALL_RULE_NAME}"`);
    const output = stdout || '';

    if (!output.includes(FIREWALL_RULE_NAME)) {
      return { exists: false };
    }

    const portMatch = output.match(/LocalPort\s*:\s*(\d+)/i) || output.match(/المنفذ المحلي\s*:\s*(\d+)/i);
    const parsedPort = portMatch ? parseInt(portMatch[1], 10) : undefined;

    return {
      exists: true,
      port: parsedPort,
    };
  } catch {
    // إذا لم تكن القاعدة موجودة، netsh يرجع كود خطأ (No rules match the specified criteria)
    return { exists: false };
  }
}

/**
 * إضافة أو تحديث قاعدة جدار الحماية للمنفذ المحدد مع طلب UAC
 */
export async function configureFirewallRule(port: number): Promise<{ success: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return { success: true };
  }

  try {
    // 1. أمر netsh لحذف القاعدة القديمة وإضافة القاعدة الجديدة المحصنة
    const netshCommand = `netsh advfirewall firewall delete rule name="${FIREWALL_RULE_NAME}" & netsh advfirewall firewall add rule name="${FIREWALL_RULE_NAME}" dir=in action=allow protocol=TCP localport=${port} profile=private,domain remoteip=localsubnet`;

    // 2. تشغيل الأمر عبر PowerShell بصلاحيات RunAs لطلب UAC لمرة واحدة فقط
    const psScript = `Start-Process cmd -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '/c ${netshCommand}'`;

    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript]);

    // 3. التحقق من تطبيق القاعدة بعد التنفيذ
    const status = await checkFirewallRule(port);
    if (status.exists) {
      return { success: true };
    } else {
      return { success: false, error: 'لم يتم العثور على القاعدة بعد تنفيذ الأمر (ربما تم رفض تصريح UAC من المستخدم).' };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'فشل تشغيل إجراء ضبط جدار الحماية (تم إلغاء UAC أو حدث خطأ بالنظام).',
    };
  }
}

/**
 * إزالة قاعدة جدار الحماية مع طلب UAC عند الحاجة
 */
export async function removeFirewallRule(): Promise<{ success: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return { success: true };
  }

  try {
    const netshCommand = `netsh advfirewall firewall delete rule name="${FIREWALL_RULE_NAME}"`;
    const psScript = `Start-Process cmd -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '/c ${netshCommand}'`;
    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript]);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * تسجيل معالجات IPC لجدار الحماية
 */
export function registerFirewallIpc(): void {
  ipcMain.handle('firewall:status', async (_e, port?: number) => {
    return checkFirewallRule(port);
  });

  ipcMain.handle('firewall:configure', async (_e, port: number) => {
    return configureFirewallRule(port);
  });

  ipcMain.handle('firewall:remove', async () => {
    return removeFirewallRule();
  });
}
