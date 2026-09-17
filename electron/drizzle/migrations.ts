// ملف تجميع هجرات Drizzle لتطبيق سطح المكتب
// يُضمّن نصوص SQL للهجرات المولدة بواسطة drizzle-kit مباشرة كـ ?raw
// مما يضمن عملها داخل حزمة Electron دون الحاجة لقراءة ملفات خارجية في وقت التشغيل.

import sql0000 from './migrations/0000_massive_anthem.sql?raw';
import journal from './migrations/meta/_journal.json';

export interface MigrationEntry {
  idx: number;
  tag: string;
  when: number;
  sqlStatements: string[];
}

/**
 * تحليل ملف الهجرة وتقسيمه بحسب breakpoints الخاصة بـ drizzle-kit
 */
function parseMigrationStatements(rawSql: string): string[] {
  return rawSql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * خريطة الهجرات المسجلة والمرتبطة بالـ journal
 */
const migrationSqlMap: Record<string, string> = {
  '0000_massive_anthem': sql0000,
};

export const bundledMigrations: MigrationEntry[] = (journal.entries || []).map((entry) => {
  const rawSql = migrationSqlMap[entry.tag] || '';
  return {
    idx: entry.idx,
    tag: entry.tag,
    when: entry.when,
    sqlStatements: parseMigrationStatements(rawSql),
  };
});
