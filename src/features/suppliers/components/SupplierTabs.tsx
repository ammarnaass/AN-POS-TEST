import React from 'react';
import { Truck, FileText, Eye } from 'lucide-react';
import type { SupplierTab } from '../types';

interface SupplierTabsProps {
  activeTab: SupplierTab;
  onTabChange: (tab: SupplierTab) => void;
  suppliersCount: number;
  invoicesCount: number;
}

export const SupplierTabs: React.FC<SupplierTabsProps> = ({
  activeTab,
  onTabChange,
  suppliersCount,
  invoicesCount,
}) => {
  const tabs = [
    { key: 'suppliers' as SupplierTab, label: 'دليل الموردين والمستحقات', icon: Truck, count: suppliersCount },
    { key: 'invoices' as SupplierTab, label: 'فواتير وطلبيات التوريد', icon: FileText, count: invoicesCount },
    { key: 'statement' as SupplierTab, label: 'كشف حساب مورد تفصيلي', icon: Eye },
  ];

  return (
    <div className="flex gap-1.5 bg-surface-container p-1.5 rounded-2xl w-fit border border-outline-variant/20">
      {tabs.map(({ key, label, icon: Icon, count }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === key
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          {count !== undefined && (
            <span
              className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
                activeTab === key ? 'bg-black/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
