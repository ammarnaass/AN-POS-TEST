import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, type SettingsEntity } from '@/infrastructure/database/dexie/db';
import { usePOSSessionStore } from '@/features/pos/store/usePOSSessionStore';
import type { Currency } from '@/types';
import { setStoredTransportConfig, type TerminalRole, type SyncMode } from '@/lib/transportGateway';

export type { SyncMode, TerminalRole };

export interface ExtendedSettings {
  shopName: string;
  phone: string;
  tvaRate: number;
  baseCurrency: string;
  invoicePrefix: string;
  invoiceStartNumber: number;
  printWidthMm: number;
  receiptFooter: string;
  syncMode: SyncMode;
  terminalRole: TerminalRole;
  serverLanUrl: string;
  terminalCode: string;
  clientToken: string;
  clientDeviceId: string;
  zakatEnabled: boolean;
  nisabThreshold: number;
  invoiceTemplate: 'basic' | 'detailed';
  shopLogo: string;
  language: string;
  shopDescription: string;
  shopAddress: string;
  shopPhone2: string;
  shopEmail: string;
  commercialRegister: string;
  taxNumber: string;
  taxArticle: string;
  quickSale: boolean;
  accountingOnly: boolean;
  allowNegativeStock: boolean;
  confirmNoStock: boolean;
  averagePricing: boolean;
  terminalFavoritesMode: boolean;
  design7ShowBottomFavorites: boolean;
  allowCardPayment: boolean;
  allowTransferPayment: boolean;
  allowSelfRegistration: boolean;
  defaultRole: string;
  currencies: Currency[];
  expenseCategories: string[];
  [key: string]: any;
}

export function useSystemSettings() {
  const queryClient = useQueryClient();

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
    refetchInterval: 2500,
  });

  const settings: ExtendedSettings = {
    // ⚠️ rawSettings spread أولاً — الحقول المعرّفة صراحةً بعدها تأخذ الأولوية دائماً
    // هذا يمنع القيم الخام (0/1 integers من SQLite) من الكتابة فوق القيم المحوّلة (Boolean)
    ...rawSettings,
    shopName: (rawSettings as any)?.shopName || (rawSettings as any)?.shop_name || '',
    phone: (rawSettings as any)?.phone || (rawSettings as any)?.shop_phone || '',
    tvaRate: (rawSettings as any)?.tvaRate ?? (rawSettings as any)?.tva_rate ?? 0,
    baseCurrency: (rawSettings as any)?.baseCurrency || (rawSettings as any)?.base_currency || 'دج',
    invoicePrefix: (rawSettings as any)?.invoicePrefix || (rawSettings as any)?.invoice_prefix || 'INV-',
    invoiceStartNumber: (rawSettings as any)?.invoiceStartNumber ?? (rawSettings as any)?.invoice_start_number ?? 1,
    printWidthMm: (rawSettings as any)?.printWidthMm ?? (rawSettings as any)?.print_width_mm ?? 80,
    receiptFooter: (rawSettings as any)?.receiptFooter || (rawSettings as any)?.receipt_footer || '',
    syncMode: ((rawSettings as any)?.syncMode || (rawSettings as any)?.sync_mode || 'single') as SyncMode,
    terminalRole: ((rawSettings as any)?.terminalRole || (rawSettings as any)?.terminal_role || 'server') as TerminalRole,
    serverLanUrl: (rawSettings as any)?.serverLanUrl || (rawSettings as any)?.server_lan_url || '',
    terminalCode: (rawSettings as any)?.terminalCode || (rawSettings as any)?.terminal_code || 'T01',
    clientToken: (rawSettings as any)?.clientToken || (rawSettings as any)?.client_token || '',
    clientDeviceId: (rawSettings as any)?.clientDeviceId || (rawSettings as any)?.client_device_id || '',
    zakatEnabled: Boolean((rawSettings as any)?.zakatEnabled ?? (rawSettings as any)?.zakat_enabled),
    nisabThreshold: (rawSettings as any)?.nisabThreshold ?? (rawSettings as any)?.nisab_threshold ?? 0,
    invoiceTemplate: ((rawSettings as any)?.invoiceTemplate || (rawSettings as any)?.invoice_template || 'basic') as 'basic' | 'detailed',
    shopLogo: (rawSettings as any)?.shopLogo || (rawSettings as any)?.shop_logo || (rawSettings as any)?.logo || '',
    language: (rawSettings as any)?.language || 'ar',
    shopDescription: (rawSettings as any)?.shopDescription || (rawSettings as any)?.shop_description || '',
    shopAddress: (rawSettings as any)?.shopAddress || (rawSettings as any)?.shop_address || (rawSettings as any)?.address || '',
    shopPhone2: (rawSettings as any)?.shopPhone2 || (rawSettings as any)?.shop_phone2 || (rawSettings as any)?.phone2 || '',
    shopEmail: (rawSettings as any)?.shopEmail || (rawSettings as any)?.shop_email || (rawSettings as any)?.email || '',
    commercialRegister: (rawSettings as any)?.commercialRegister || (rawSettings as any)?.commercial_register || (rawSettings as any)?.company_rc || (rawSettings as any)?.companyRC || '',
    taxNumber: (rawSettings as any)?.taxNumber || (rawSettings as any)?.tax_number || (rawSettings as any)?.company_nif || (rawSettings as any)?.companyNif || '',
    taxArticle: (rawSettings as any)?.taxArticle || (rawSettings as any)?.tax_article || (rawSettings as any)?.company_art || (rawSettings as any)?.companyArt || '',
    quickSale: Boolean((rawSettings as any)?.quickSale ?? (rawSettings as any)?.quick_sale ?? true),
    accountingOnly: Boolean((rawSettings as any)?.accountingOnly ?? (rawSettings as any)?.accounting_only),
    allowNegativeStock: Boolean((rawSettings as any)?.allowNegativeStock ?? (rawSettings as any)?.allow_negative_stock),
    confirmNoStock: Boolean((rawSettings as any)?.confirmNoStock ?? (rawSettings as any)?.confirm_no_stock ?? true),
    averagePricing: Boolean((rawSettings as any)?.averagePricing ?? (rawSettings as any)?.average_pricing),
    terminalFavoritesMode: Boolean((rawSettings as any)?.terminalFavoritesMode ?? (rawSettings as any)?.terminal_favorites_mode ?? true),
    design7ShowBottomFavorites: (() => {
      const dbVal = (rawSettings as any)?.design7ShowBottomFavorites ?? (rawSettings as any)?.design7_show_bottom_favorites;
      if (dbVal !== undefined && dbVal !== null) return Boolean(dbVal);
      try {
        const saved = localStorage.getItem('pos_design7_show_favorites');
        if (saved !== null) return JSON.parse(saved);
      } catch {}
      return true;
    })(),
    allowCardPayment: Boolean((rawSettings as any)?.allowCardPayment ?? (rawSettings as any)?.allow_card_payment),
    allowTransferPayment: Boolean((rawSettings as any)?.allowTransferPayment ?? (rawSettings as any)?.allow_transfer_payment),
    allowSelfRegistration: ((rawSettings as any)?.allowSelfRegistration ?? (rawSettings as any)?.allow_self_registration ?? 1) !== 0 && ((rawSettings as any)?.allowSelfRegistration ?? (rawSettings as any)?.allow_self_registration) !== false,
    defaultRole: (rawSettings as any)?.defaultRole || (rawSettings as any)?.default_role || 'seller',
    currencies: Array.isArray((rawSettings as unknown as Record<string, unknown> | undefined)?.currencies) ? (rawSettings as unknown as Record<string, Currency[]>).currencies : ([] as Currency[]),
    expenseCategories: Array.isArray((rawSettings as unknown as Record<string, unknown> | undefined)?.expenseCategories) ? (rawSettings as unknown as Record<string, string[]>).expenseCategories : ['ايجار', 'كهرباء', 'ماء', 'رواتب', 'نقل', 'صيانة'],
  };

  // مزامنة الإعدادات المحفوظة في قاعدة البيانات مع إعدادات الشبكة والنقل
  useEffect(() => {
    if (!rawSettings) return;
    const dbRole = (rawSettings as any).terminalRole || (rawSettings as any).terminal_role;
    const dbSyncMode = (rawSettings as any).syncMode || (rawSettings as any).sync_mode;
    const dbServerUrl = (rawSettings as any).serverLanUrl || (rawSettings as any).server_lan_url;
    const dbToken = (rawSettings as any).clientToken || (rawSettings as any).client_token;
    const dbDeviceId = (rawSettings as any).clientDeviceId || (rawSettings as any).client_device_id;

    if (dbRole || dbSyncMode || dbServerUrl || dbToken || dbDeviceId) {
      setStoredTransportConfig({
        role: dbRole,
        syncMode: dbSyncMode,
        serverUrl: dbServerUrl,
        token: dbToken,
        deviceId: dbDeviceId,
      });
    }
  }, [rawSettings]);

  const settingsMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const current = await db.settings.get('default').catch(() => ({}));
      await db.settings.put({ ...(current as SettingsEntity | undefined), ...updates, id: 'default' } as SettingsEntity);
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const previous = queryClient.getQueryData(['settings']);
      queryClient.setQueryData(['settings'], (old: any) => ({ ...old, ...updates }));
      return { previous };
    },
    onError: (err, _updates, context) => {
      console.error('Settings save error:', err);
      if (context?.previous) {
        queryClient.setQueryData(['settings'], context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const handleSaveSettings = (updates: Record<string, unknown>) => {
    const mirrored: Record<string, unknown> = { ...updates };
    if (updates.shopName !== undefined) mirrored.shop_name = updates.shopName;
    if (updates.shop_name !== undefined) mirrored.shopName = updates.shop_name;
    if (updates.shopAddress !== undefined) {
      mirrored.address = updates.shopAddress;
      mirrored.shop_address = updates.shopAddress;
    }
    if (updates.shopLogo !== undefined) {
      mirrored.logo = updates.shopLogo;
      mirrored.shop_logo = updates.shopLogo;
    }
    if (updates.shopEmail !== undefined) {
      mirrored.email = updates.shopEmail;
      mirrored.shop_email = updates.shopEmail;
    }
    if (updates.shopPhone2 !== undefined) {
      mirrored.phone2 = updates.shopPhone2;
      mirrored.shop_phone2 = updates.shopPhone2;
    }
    if (updates.commercialRegister !== undefined) {
      mirrored.commercial_register = updates.commercialRegister;
      mirrored.company_rc = updates.commercialRegister;
    }
    if (updates.taxNumber !== undefined) {
      mirrored.tax_number = updates.taxNumber;
      mirrored.company_nif = updates.taxNumber;
    }
    if (updates.taxArticle !== undefined) {
      mirrored.tax_article = updates.taxArticle;
      mirrored.company_art = updates.taxArticle;
    }
    if (updates.allowSelfRegistration !== undefined) {
      mirrored.allow_self_registration = updates.allowSelfRegistration ? 1 : 0;
      mirrored.allowSelfRegistration = updates.allowSelfRegistration;
    }
    if (updates.defaultRole !== undefined) {
      mirrored.default_role = updates.defaultRole;
      mirrored.defaultRole = updates.defaultRole;
    }
    if (updates.syncMode !== undefined || updates.sync_mode !== undefined) {
      const newMode = (updates.syncMode ?? updates.sync_mode) as SyncMode;
      mirrored.sync_mode = newMode;
      mirrored.syncMode = newMode;
      setStoredTransportConfig({ syncMode: newMode });
    }
    if (updates.terminalRole !== undefined || updates.terminal_role !== undefined) {
      const role = (updates.terminalRole ?? updates.terminal_role) as TerminalRole;
      mirrored.terminalRole = role;
      mirrored.terminal_role = role;
      setStoredTransportConfig({ role });
    }
    if (updates.serverLanUrl !== undefined || updates.server_lan_url !== undefined) {
      const url = String(updates.serverLanUrl ?? updates.server_lan_url);
      mirrored.serverLanUrl = url;
      mirrored.server_lan_url = url;
      setStoredTransportConfig({ serverUrl: url });
    }
    if (updates.terminalCode !== undefined || updates.terminal_code !== undefined) {
      const code = String(updates.terminalCode ?? updates.terminal_code);
      mirrored.terminalCode = code;
      mirrored.terminal_code = code;
    }
    if (updates.clientToken !== undefined || updates.client_token !== undefined) {
      const token = String(updates.clientToken ?? updates.client_token);
      mirrored.clientToken = token;
      mirrored.client_token = token;
      setStoredTransportConfig({ token });
    }
    if (updates.clientDeviceId !== undefined || updates.client_device_id !== undefined) {
      const devId = String(updates.clientDeviceId ?? updates.client_device_id);
      mirrored.clientDeviceId = devId;
      mirrored.client_device_id = devId;
      setStoredTransportConfig({ deviceId: devId });
    }
    if (updates.design7ShowBottomFavorites !== undefined || updates.design7_show_bottom_favorites !== undefined) {
      const showFav = Boolean(updates.design7ShowBottomFavorites ?? updates.design7_show_bottom_favorites);
      mirrored.design7_show_bottom_favorites = showFav ? 1 : 0;
      mirrored.design7ShowBottomFavorites = showFav;
      try {
        localStorage.setItem('pos_design7_show_favorites', JSON.stringify(showFav));
      } catch {}
      usePOSSessionStore.getState().setDesign7ShowBottomFavorites?.(showFav);
    }
    settingsMutation.mutate(mirrored);
    if (updates.shopName !== undefined || updates.shop_name !== undefined) {
      (window as any).electronAPI?.server?.refreshAdvertising?.().catch(() => {});
    }
  };

  // State for general tab tools (currencies & expenses)
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState('');
  const [newCurrencyRate, setNewCurrencyRate] = useState('1');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [generalPreviewMode, setGeneralPreviewMode] = useState<'card' | 'receipt'>('card');
  const [copiedFiscalKey, setCopiedFiscalKey] = useState<string | null>(null);
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcCurrency, setCalcCurrency] = useState<string>('EUR');

  const handleCopyFiscal = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedFiscalKey(key);
    setTimeout(() => setCopiedFiscalKey(null), 2000);
  };

  const handleAddCurrency = () => {
    if (!newCurrencyCode || !newCurrencySymbol) return;
    const newCurrency: Currency = {
      code: newCurrencyCode.toUpperCase(),
      symbol: newCurrencySymbol,
      rateToBase: Number(newCurrencyRate) || 1,
    };
    if (settings.currencies.find((c: Currency) => c.code === newCurrency.code)) return;
    handleSaveSettings({ currencies: [...settings.currencies, newCurrency] });
    setNewCurrencyCode('');
    setNewCurrencySymbol('');
    setNewCurrencyRate('1');
  };

  const handleAddExpenseCategory = () => {
    if (!newExpenseCategory.trim()) return;
    if (settings.expenseCategories.includes(newExpenseCategory.trim())) return;
    handleSaveSettings({ expenseCategories: [...settings.expenseCategories, newExpenseCategory.trim()] });
    setNewExpenseCategory('');
  };

  const handleRemoveExpenseCategory = (category: string) => {
    handleSaveSettings({ expenseCategories: settings.expenseCategories.filter((c: string) => c !== category) });
  };

  const handleShopLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleSaveSettings({ shopLogo: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  return {
    settings,
    rawSettings,
    handleSaveSettings,
    settingsMutation,
    newCurrencyCode,
    setNewCurrencyCode,
    newCurrencySymbol,
    setNewCurrencySymbol,
    newCurrencyRate,
    setNewCurrencyRate,
    newExpenseCategory,
    setNewExpenseCategory,
    generalPreviewMode,
    setGeneralPreviewMode,
    copiedFiscalKey,
    handleCopyFiscal,
    calcAmount,
    setCalcAmount,
    calcCurrency,
    setCalcCurrency,
    handleAddCurrency,
    handleAddExpenseCategory,
    handleRemoveExpenseCategory,
    handleShopLogoUpload,
  };
}
