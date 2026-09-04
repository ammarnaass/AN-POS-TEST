// Tab Component: ExportBackupTab (Refactored from SettingsPage.tsx)
import React from 'react';
import { Download, Upload, HardDrive } from 'lucide-react';

interface ExportBackupTabProps {
  [key: string]: any;
}

export default function ExportBackupTab({
  handleExportBackup,
  handleExportExcel,
  handleImportBackup
}: ExportBackupTabProps) {
  return (
    <div className="space-y-6">
            <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <HardDrive className="w-5 h-5 text-primary" />
                <h2 className="font-headline-lg text-headline-lg text-on-surface">تصدير واستيراد البيانات</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <button onClick={handleExportExcel}
                  className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-outline-variant/20 rounded-xl hover:border-primary hover:bg-primary-fixed/10 transition-all group">
                  <Download className="w-10 h-10 text-primary group-hover:scale-110 transition-all" />
                  <div className="text-center">
                    <p className="text-label-md text-on-surface mb-1">تصدير المنتجات (CSV)</p>
                    <p className="text-body-sm text-on-surface-variant">تصدير جميع المنتجات لملف Excel</p>
                  </div>
                </button>
                <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-outline-variant/20 rounded-xl hover:border-tertiary hover:bg-tertiary-container/10 transition-all cursor-pointer group">
                  <Upload className="w-10 h-10 text-tertiary group-hover:scale-110 transition-all" />
                  <div className="text-center">
                    <p className="text-label-md text-on-surface mb-1">استيراد المنتجات</p>
                    <p className="text-body-sm text-on-surface-variant">استيراد من ملف Excel / CSV</p>
                  </div>
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" />
                </label>
                <button onClick={handleExportBackup}
                  className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-outline-variant/20 rounded-xl hover:border-primary hover:bg-primary-fixed/10 transition-all group">
                  <Download className="w-10 h-10 text-primary group-hover:scale-110 transition-all" />
                  <div className="text-center">
                    <p className="text-label-md text-on-surface mb-1">نسخة احتياطية</p>
                    <p className="text-body-sm text-on-surface-variant">حفظ جميع البيانات كملف JSON</p>
                  </div>
                </button>
                <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-outline-variant/20 rounded-xl hover:border-tertiary hover:bg-tertiary-container/10 transition-all cursor-pointer group">
                  <Upload className="w-10 h-10 text-tertiary group-hover:scale-110 transition-all" />
                  <div className="text-center">
                    <p className="text-label-md text-on-surface mb-1">استرجاع نسخة احتياطية</p>
                    <p className="text-body-sm text-on-surface-variant">استيراد البيانات من ملف JSON</p>
                  </div>
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
              </div>
            </div>
          </div>
  );
}
