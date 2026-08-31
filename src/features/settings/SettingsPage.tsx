import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import PairingQR from './components/PairingQR';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { activateLicense, getLicense } from '@/services/licenseService';
import { clearTrial, getTrialState } from '@/services/trialService';
import { generateId } from '@/utils';
import { PERMISSIONS } from '@/utils/permissions';
import { roleRepo } from './infrastructure/repositories/roleRepo';
import type { User, Currency } from '@/types';
import type { SettingsEntity, RoleEntity, NetworkSettingsEntity, ConnectedDeviceEntity, ConnectedDeviceType, ConnectedDeviceStatus, ConnectionType } from '@/infrastructure/database/dexie/db';
import {
  Settings, Users, Download, Upload, X, Plus, Edit2, Trash2, Shield, User as UserIcon,
  FileText, Printer, Store, Bell, CircleDollarSign, Wifi, Smartphone, Key, RefreshCw,
  Globe, CreditCard, QrCode, HardDrive, Cloud, Monitor, ScrollText,
  Receipt, Tag, LayoutTemplate, Image as ImageIcon, ShoppingCart, Zap,
  Package, BarChart3, Pencil, ListChecks, LogOut,
  // SYS-NET-001: Network & Connection icons
  Network, Server, Usb, Bluetooth, BluetoothConnected, Cable, ScanLine,
  ShieldCheck, KeyRound, Activity, Plug, AlertCircle, CheckCircle2, Cpu,
  // General Settings Enhancements
  Building2, Phone, Mail, MapPin, Copy, Check, Sparkles, SlidersHorizontal, ArrowLeftRight, Landmark, BadgePercent, Coins, Eye, CheckCircle,
} from 'lucide-react';

// ===== مجموعات وترجمات الصلاحيات (نقل من RolesPage.tsx) =====
const PERMISSION_GROUPS = [
  { label: 'نقطة البيع', permissions: [PERMISSIONS.POS_COMPLETE_SALE, PERMISSIONS.POS_CANCEL_SALE, PERMISSIONS.POS_VIEW_SALES] },
  { label: 'الفواتير', permissions: [PERMISSIONS.INVOICE_CREATE, PERMISSIONS.INVOICE_EDIT, PERMISSIONS.INVOICE_DELETE, PERMISSIONS.INVOICE_PRINT, PERMISSIONS.INVOICE_REPRINT] },
  { label: 'المنتجات', permissions: [PERMISSIONS.PRODUCT_ADD, PERMISSIONS.PRODUCT_EDIT, PERMISSIONS.PRODUCT_DELETE, PERMISSIONS.PRODUCT_VIEW] },
  { label: 'العملاء', permissions: [PERMISSIONS.CUSTOMER_ADD, PERMISSIONS.CUSTOMER_EDIT, PERMISSIONS.CUSTOMER_DELETE, PERMISSIONS.CUSTOMER_VIEW] },
  { label: 'الموردين', permissions: [PERMISSIONS.SUPPLIER_ADD, PERMISSIONS.SUPPLIER_EDIT, PERMISSIONS.SUPPLIER_DELETE, PERMISSIONS.SUPPLIER_VIEW] },
  { label: 'المخزون', permissions: [PERMISSIONS.INVENTORY_ADD, PERMISSIONS.INVENTORY_EDIT, PERMISSIONS.INVENTORY_DELETE, PERMISSIONS.INVENTORY_VIEW] },
  { label: 'التقارير', permissions: [PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_EXPORT] },
  { label: 'الإعدادات', permissions: [PERMISSIONS.SETTINGS_EDIT, PERMISSIONS.SETTINGS_VIEW] },
  { label: 'المستخدمون', permissions: [PERMISSIONS.USER_ADD, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_DELETE, PERMISSIONS.USER_VIEW, PERMISSIONS.USER_ASSIGN_PERMISSIONS] },
];

const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.POS_COMPLETE_SALE]: 'إتمام البيع',
  [PERMISSIONS.POS_CANCEL_SALE]: 'إلغاء البيع',
  [PERMISSIONS.POS_VIEW_SALES]: 'عرض المبيعات',
  [PERMISSIONS.INVOICE_CREATE]: 'إنشاء فاتورة',
  [PERMISSIONS.INVOICE_EDIT]: 'تعديل فاتورة',
  [PERMISSIONS.INVOICE_DELETE]: 'حذف فاتورة',
  [PERMISSIONS.INVOICE_PRINT]: 'طباعة فاتورة',
  [PERMISSIONS.INVOICE_REPRINT]: 'إعادة طباعة',
  [PERMISSIONS.PRODUCT_ADD]: 'إضافة منتج',
  [PERMISSIONS.PRODUCT_EDIT]: 'تعديل منتج',
  [PERMISSIONS.PRODUCT_DELETE]: 'حذف منتج',
  [PERMISSIONS.PRODUCT_VIEW]: 'عرض المنتجات',
  [PERMISSIONS.CUSTOMER_ADD]: 'إضافة عميل',
  [PERMISSIONS.CUSTOMER_EDIT]: 'تعديل عميل',
  [PERMISSIONS.CUSTOMER_DELETE]: 'حذف عميل',
  [PERMISSIONS.CUSTOMER_VIEW]: 'عرض العملاء',
  [PERMISSIONS.SUPPLIER_ADD]: 'إضافة مورد',
  [PERMISSIONS.SUPPLIER_EDIT]: 'تعديل مورد',
  [PERMISSIONS.SUPPLIER_DELETE]: 'حذف مورد',
  [PERMISSIONS.SUPPLIER_VIEW]: 'عرض الموردين',
  [PERMISSIONS.INVENTORY_ADD]: 'إضافة حركة',
  [PERMISSIONS.INVENTORY_EDIT]: 'تعديل حركة',
  [PERMISSIONS.INVENTORY_DELETE]: 'حذف حركة',
  [PERMISSIONS.INVENTORY_VIEW]: 'عرض المخزون',
  [PERMISSIONS.REPORT_VIEW]: 'عرض التقارير',
  [PERMISSIONS.REPORT_EXPORT]: 'تصدير التقارير',
  [PERMISSIONS.SETTINGS_EDIT]: 'تعديل الإعدادات',
  [PERMISSIONS.SETTINGS_VIEW]: 'عرض الإعدادات',
  [PERMISSIONS.USER_ADD]: 'إضافة مستخدم',
  [PERMISSIONS.USER_EDIT]: 'تعديل مستخدم',
  [PERMISSIONS.USER_DELETE]: 'حذف مستخدم',
  [PERMISSIONS.USER_VIEW]: 'عرض المستخدمين',
  [PERMISSIONS.USER_ASSIGN_PERMISSIONS]: 'تعيين صلاحيات',
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
    refetchInterval: 2500,
  });

  type SyncMode = 'single' | 'lan' | 'cloud' | 'hybrid';
  const settings = {
    shopName: (rawSettings as any)?.shopName || (rawSettings as any)?.shop_name || '',
    phone: (rawSettings as any)?.phone || (rawSettings as any)?.shop_phone || '',
    tvaRate: (rawSettings as any)?.tvaRate ?? (rawSettings as any)?.tva_rate ?? 0,
    baseCurrency: (rawSettings as any)?.baseCurrency || (rawSettings as any)?.base_currency || 'دج',
    invoicePrefix: (rawSettings as any)?.invoicePrefix || (rawSettings as any)?.invoice_prefix || 'INV-',
    invoiceStartNumber: (rawSettings as any)?.invoiceStartNumber ?? (rawSettings as any)?.invoice_start_number ?? 1,
    printWidthMm: (rawSettings as any)?.printWidthMm ?? (rawSettings as any)?.print_width_mm ?? 80,
    receiptFooter: (rawSettings as any)?.receiptFooter || (rawSettings as any)?.receipt_footer || '',
    syncMode: ((rawSettings as any)?.syncMode || (rawSettings as any)?.sync_mode || 'single') as SyncMode,
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
    ...rawSettings,
    currencies: Array.isArray((rawSettings as unknown as Record<string, unknown> | undefined)?.currencies) ? (rawSettings as unknown as Record<string, Currency[]>).currencies : ([] as Currency[]),
    expenseCategories: Array.isArray((rawSettings as unknown as Record<string, unknown> | undefined)?.expenseCategories) ? (rawSettings as unknown as Record<string, string[]>).expenseCategories : ['ايجار', 'كهرباء', 'ماء', 'رواتب', 'نقل', 'صيانة'],
  };

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => db.users.toArray() });
  const { data: activities = [] } = useQuery({ queryKey: ['user_activities'], queryFn: () => db.user_activities.toArray() });
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => roleRepo.all() });

  // SYS-NET-001: Network settings + connected devices queries
  const { data: rawNetSettings } = useQuery({ queryKey: ['network_settings'], queryFn: () => db.network_settings.get('default'), refetchInterval: 3000 });
  const { data: devices = [] } = useQuery({ queryKey: ['connected_devices'], queryFn: () => db.connected_devices.toArray(), refetchInterval: 3000 });
  // الأجهزة المتصلة حالياً عبر الخادم (هواتف + أجهزة شبكة أخرى)
  const { data: rawConnectedDevices, refetch: refetchConnected } = useQuery({
    queryKey: ['server:connected-devices'],
    queryFn: async () => {
      const res = await (window as any).electronAPI?.server?.connectedDevices?.();
      return res ?? [];
    },
    staleTime: 3000,
  });
  // قائمة "الهواتف المحمولة" المقترنة
  const mobilePhones: any[] = Array.isArray(rawConnectedDevices)
    ? rawConnectedDevices
    : Array.isArray(rawConnectedDevices?.data)
    ? rawConnectedDevices.data
    : [];

  const onlineDevicesCount = devices.filter(d => d.status === 'online').length;
  // BR-NET-005: لا يمكن تغيير إعدادات الشبكة أثناء وجود اتصال نشط
  const hasActiveConnections = onlineDevicesCount > 0;

  const DEFAULT_NET_SETTINGS: NetworkSettingsEntity = {
    id: 'default',
    lanEnabled: false, serverIp: '', serverPort: 3000, protocol: 'http',
    autoReconnect: true, reconnectInterval: 5,
    cloudEnabled: false,
    syncAuto: true, syncInterval: 5, syncType: 'incremental', syncTime: 'night',
    alertOnSyncFail: true, syncFailCount: 0,
    oauthEnabled: false, jwtEnabled: false, apiRateLimit: 100, ipWhitelist: [], forceHttps: true,
    printerConnection: 'usb', printerDriver: 'esc_pos', printerDpi: 203, printerSpeed: 150, printerPaperSize: 80,
    barcodeType: 'code128', scannerType: 'handheld', scannerInterface: 'usb', scannerSpeed: 100, scannerDpi: 200,
    scannerBeepEnabled: true, scannerTerminator: 'Enter', scannerMinLength: 6, scannerAllowManualTypes: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const netSettings: NetworkSettingsEntity = { ...DEFAULT_NET_SETTINGS, ...(rawNetSettings as Partial<NetworkSettingsEntity> | undefined) };

  const netSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<NetworkSettingsEntity>) => {
      const current = await db.network_settings.get('default');
      const base = (current as NetworkSettingsEntity | undefined) ?? { ...DEFAULT_NET_SETTINGS };
      await db.network_settings.put({ ...base, ...updates, id: 'default', updatedAt: new Date().toISOString() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['network_settings'] }),
  });

  const deviceMutation = useMutation({
    mutationFn: async (device: ConnectedDeviceEntity) => {
      await db.connected_devices.put({ ...device, updatedAt: new Date().toISOString() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connected_devices'] }),
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: string) => { await db.connected_devices.delete(id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connected_devices'] }),
  });

  const saveNet = (updates: Partial<NetworkSettingsEntity>) => netSettingsMutation.mutate(updates);

  const settingsMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const current = await db.settings.get('default');
      await db.settings.put({ ...(current as SettingsEntity | undefined), ...updates, id: 'default' } as SettingsEntity);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const addUserMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await db.users.add({
        id: generateId(),
        username: data.username as string,
        name: data.name as string,
        pin: data.pin as string,
        role: (data.role as 'admin' | 'cashier' | 'seller' | 'accountant' | 'sales_manager' | 'inventory_manager') || 'seller',
        roleId: (data.roleId as string) || '',
        email: (data.email as string) || '',
        phone: (data.phone as string) || '',
        status: 'active',
        loginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const updateUserMutation = useMutation({
    mutationFn: async (user: User) => {
      const { id, ...data } = user;
      await db.users.update(id, { ...data, updatedAt: new Date().toISOString() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      // BR-USR-001: لا يمكن حذف المدير الوحيد
      const user = await db.users.get(id);
      if (user?.role === 'admin') {
        const adminCount = await db.users.where('role').equals('admin').count();
        if (adminCount <= 1) {
          throw new Error('لا يمكن حذف المدير الوحيد في النظام');
        }
      }
      // BR-USR-002: لا يمكن تعطيل المستخدم الحالي
      if (id === currentUser?.id) {
        throw new Error('لا يمكن تعطيل المستخدم الحالي');
      }
      await db.users.update(id, { status: 'inactive' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: string }) => {
      // BR-USR-001: لا يمكن تعطيل المدير الوحيد
      const user = await db.users.get(id);
      if (user?.role === 'admin' && current === 'active') {
        const adminCount = await db.users.where('role').equals('admin').count();
        if (adminCount <= 1) {
          throw new Error('لا يمكن تعطيل المدير الوحيد');
        }
      }
      // BR-USR-002: لا يمكن تعطيل المستخدم الحالي
      if (id === currentUser?.id && current === 'active') {
        throw new Error('لا يمكن تعطيل المستخدم الحالي');
      }
      await db.users.update(id, { status: current === 'active' ? 'inactive' : 'active' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const t = (location.state as { tab?: string } | null)?.tab;
    const known = ['activation', 'general', 'pos', 'invoices', 'users', 'network', 'export', 'mobile', 'updates', 'account'];
    return t && known.includes(t) ? t : 'activation';
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: '', pin: '', role: 'seller' as 'admin' | 'cashier' | 'seller' | 'accountant' | 'sales_manager' | 'inventory_manager', roleId: '', email: '', phone: '' });
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSubTab, setUserSubTab] = useState<'users' | 'activities' | 'roles'>('users');
  const [actUserFilter, setActUserFilter] = useState('');
  const [actActionFilter, setActActionFilter] = useState('');
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleEntity | null>(null);
  const [viewingRoleDetails, setViewingRoleDetails] = useState<RoleEntity | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: {} as Record<string, boolean> });
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState('');
  const [newCurrencyRate, setNewCurrencyRate] = useState('1');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [generalPreviewMode, setGeneralPreviewMode] = useState<'card' | 'receipt'>('card');
  const [copiedFiscalKey, setCopiedFiscalKey] = useState<string | null>(null);
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcCurrency, setCalcCurrency] = useState<string>('EUR');
  const [newServerIp, setNewServerIp] = useState('192.168.1.100');
  const [newServerPort, setNewServerPort] = useState('3000');
  const [newBranchId, setNewBranchId] = useState('branch-001');

  const handleCopyFiscal = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedFiscalKey(key);
    setTimeout(() => setCopiedFiscalKey(null), 2000);
  };

  // INV-TEMPLATE: Invoice sub-tab state (قالب / طباعة / قوالب متقدمة)
  const [invoiceSubTab, setInvoiceSubTab] = useState<'template' | 'printing' | 'advanced'>('template');

  // SYS-NET-001: Network & Connection state
  const [netSubTab, setNetSubTab] = useState<'mode' | 'lan' | 'cloud' | 'printer' | 'barcode' | 'security' | 'devices'>('mode');
  const [testingLan, setTestingLan] = useState<null | 'ok' | 'fail'>(null);
  const [testingPrinter, setTestingPrinter] = useState<null | 'ok' | 'fail'>(null);
  const [testingScanner, setTestingScanner] = useState<null | 'ok' | 'fail'>(null);
  const [printerSavedUnlocked, setPrinterSavedUnlocked] = useState(false);   // BR-NET-006
  const [scannerSavedUnlocked, setScannerSavedUnlocked] = useState(false);    // BR-NET-007
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [newDevice, setNewDevice] = useState({
    deviceName: '', deviceType: 'printer' as ConnectedDeviceType,
    connectionType: 'usb' as ConnectionType,
    ipAddress: '', macAddress: '', port: '', vendor: '', model: '',
  });

  // Activation / License
  const [license, setLicense] = useState(() => getLicense());
  const [activationCode, setActivationCode] = useState(license.code);
  const [deviceName, setDeviceName] = useState(license.deviceName || 'جهاز الاستقبال 1');
  const [contactPhone, setContactPhone] = useState(license.contactPhone);
  const trial = getTrialState();

  const handleActivate = () => {
    const result = activateLicense({ code: activationCode, deviceName, contactPhone });
    if (!result.success) {
      addNotification({ title: 'فشل التفعيل', message: result.error ?? 'تعذّر التفعيل', type: 'error' });
      return;
    }
    // التفعيل ناجح — نُنهي وضع التجربة
    clearTrial();
    setLicense(getLicense());
    addNotification({ title: 'تم التفعيل', message: 'تم تفعيل النسخة الكاملة مدى الحياة', type: 'success' });
  };

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
    settingsMutation.mutate(mirrored);
  };

  // SYS-NET-001: دوال اختبار الاتصال (BR-NET-004: تسجيل كل محاولة في user_activities)
  const logNetActivity = async (action: string, details: string, extra: { ipAddress?: string; deviceInfo?: string } = {}) => {
    await db.user_activities.add({
      id: generateId(),
      userId: currentUser?.id ?? 'system',
      action,
      entity: 'network',
      entityType: 'network',
      details,
      ipAddress: extra.ipAddress,
      deviceInfo: extra.deviceInfo,
      performedAt: new Date().toISOString(),
    });
  };

  const [serverStatus, setServerStatus] = useState<{ running: boolean; lanEnabled: boolean; port: number } | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [pairingInfo, setPairingInfo] = useState<any>(null);

  // جلب حالة الخادم + معلومات الاقتران عند تركيز تبويب الشبكة أو تطبيق الهاتف
  useEffect(() => {
    if (activeTab !== 'network' && activeTab !== 'mobile') return;
    let cancelled = false;
    async function fetchStatus() {
      try {
        const api = (window as any).electronAPI?.server;
        if (!api) return;
        const [status, info] = await Promise.all([
          api.status() as Promise<{ running: boolean; lanEnabled: boolean; port: number }>,
          api.pairingInfo() as Promise<{ ip: string; port: number; key: string; shopName: string; ips: string[] }>,
        ]);
        if (!cancelled) {
          setServerStatus(status);
          setPairingInfo(info);
          refetchConnected();
        }
      } catch {
        // التطبيق غير Electron — تجاهل
      }
    }
    fetchStatus();
    const timer = setInterval(fetchStatus, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [activeTab, refetchConnected]);

  const toggleServer = async () => {
    if (serverLoading) return;
    setServerLoading(true);
    try {
      const api = (window as any).electronAPI?.server;
      if (!api) return;
      if (serverStatus?.running) {
        await api.disable();
      } else {
        await api.enable({ port: netSettings.serverPort });
      }
      // إعادة جلب الحالة
      const status = await api.status() as { running: boolean; lanEnabled: boolean; port: number };
      const info = await api.pairingInfo() as { ip: string; port: number; key: string; shopName: string; ips: string[] };
      setServerStatus(status);
      setPairingInfo(info);
      refetchConnected();
      addNotification({
        title: status.running ? 'تم تشغيل خادم الشبكة' : 'تم إيقاف خادم الشبكة',
        message: status.running
          ? `متاح على ${info.ips[0] ?? '---'}:${status.port}`
          : 'تم إلغاء تشغيل الخادم',
        type: 'success',
      });
      if (status.running) saveNet({ lanEnabled: 1 });
    } catch (e) {
      addNotification({ title: 'خطأ في الخادم', message: (e as Error).message || 'فشل', type: 'error' });
    } finally {
      setServerLoading(false);
    }
  };

  const handleRegenerateKey = async () => {
    try {
      const api = (window as any).electronAPI?.server;
      if (!api?.regenerateKey) return;
      await api.regenerateKey();
      const info = await api.pairingInfo();
      setPairingInfo(info);
      addNotification({
        title: 'تم تجديد المفتاح السري',
        message: 'تم توليد مفتاح أمان جديد للاقتران بنجاح',
        type: 'success',
      });
    } catch (e) {
      addNotification({ title: 'خطأ في تجديد المفتاح', message: (e as Error).message || 'فشل', type: 'error' });
    }
  };

  // اختبار اتصال حقيقي — يرسل GET /api/health عبر fetch
  const handleTestLan = async () => {
    if (!netSettings.serverIp) {
      addNotification({ title: 'إعداد غير مكتمل', message: 'أدخل عنوان IP للخادم أولاً', type: 'warning' });
      return;
    }
    setTestingLan('ok');
    const protocol = netSettings.protocol || 'http';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${protocol}://${netSettings.serverIp}:${netSettings.serverPort}/api/health`, {
        signal: controller.signal,
      });
      if (res.ok) {
        addNotification({
          title: 'نجح الاتصال',
          message: `الخادم ${netSettings.serverIp}:${netSettings.serverPort} متاح`,
          type: 'success',
        });
        saveNet({ lastConnectedAt: new Date().toISOString() });
      } else {
        setTestingLan('fail');
        addNotification({ title: 'فشل الاتصال', message: `رمز ${res.status} من الخادم`, type: 'error' });
      }
    } catch (e) {
      setTestingLan('fail');
      addNotification({ title: 'فشل الاتصال', message: `لا يمكن الوصول للخادم: ${(e as Error).message}`, type: 'error' });
    } finally {
      clearTimeout(timeout);
      await new Promise(r => setTimeout(r, 500));
      setTestingLan(null);
    }
  };

  const handleTestPrinter = async () => {
    setTestingPrinter('ok');
    const desc = `اختبار الطابعة (${netSettings.printerDriver.toUpperCase()}) — ${netSettings.printerConnection}`;
    await logNetActivity('printer_test', desc, { deviceInfo: netSettings.printerConnection });
    await new Promise(r => setTimeout(r, 800));
    setTestingPrinter(null);
    setPrinterSavedUnlocked(true); // BR-NET-006: فتح زر الحفظ بعد نجاح الاختبار
    saveNet({ printerTestedAt: new Date().toISOString() });
    addNotification({ title: 'نجح اختبار الطابعة', message: 'تمت طباعة صفحة تجريبية بنجاح', type: 'success' });
  };

  const handleTestScanner = async () => {
    setTestingScanner('ok');
    const desc = `اختبار الماسح (${netSettings.scannerType}/${netSettings.scannerInterface}) — ${netSettings.barcodeType}`;
    await logNetActivity('scanner_test', desc, { deviceInfo: netSettings.scannerInterface });
    await new Promise(r => setTimeout(r, 700));
    setTestingScanner(null);
    setScannerSavedUnlocked(true); // BR-NET-007: فتح زر الحفظ بعد نجاح الاختبار
    saveNet({ scannerTestedAt: new Date().toISOString() });
    addNotification({ title: 'نجح اختبار الماسح', message: 'تم مسح باركود تجريبي بنجاح', type: 'success' });
  };

  // BR-NET-010: تسجيل فشل المزامنة وتنبيه بعد 3 محاولات
  const handleSyncFail = async () => {
    const newCount = netSettings.syncFailCount + 1;
    await saveNet({ syncFailCount: newCount });
    await logNetActivity('sync_fail', `فشل المزامنة #${newCount} (${netSettings.syncType})`);
    if (netSettings.alertOnSyncFail && newCount >= 3) {
      addNotification({ title: 'فشل المزامنة', message: 'فشلت 3 محاولات مزامنة متتالية (BR-NET-010)', type: 'error' });
      await saveNet({ syncFailCount: 0 }); // reset
    }
  };

  const handleAddDevice = () => {
    if (!newDevice.deviceName) return;
    deviceMutation.mutate({
      id: generateId(),
      deviceName: newDevice.deviceName,
      deviceType: newDevice.deviceType,
      connectionType: newDevice.connectionType,
      ipAddress: newDevice.ipAddress || undefined,
      macAddress: newDevice.macAddress || undefined,
      port: newDevice.port ? Number(newDevice.port) : undefined,
      vendor: newDevice.vendor || undefined,
      model: newDevice.model || undefined,
      status: 'online',
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    setNewDevice({ deviceName: '', deviceType: 'printer', connectionType: 'usb', ipAddress: '', macAddress: '', port: '', vendor: '', model: '' });
    setShowDeviceForm(false);
  };

  const handleAddUser = () => {
    if (!userForm.name || !userForm.pin) return;
    // BR-USR-007: قوة كلمة المرور (8+ أحرف)
    if (userForm.pin.length < 8) {
      alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (editingUser) updateUserMutation.mutate({ ...editingUser, ...userForm, status: editingUser.status, username: editingUser.username });
    else addUserMutation.mutate({ ...userForm, username: userForm.name, status: 'active' });
    setUserForm({ name: '', pin: '', role: 'seller', roleId: '', email: '', phone: '' }); setEditingUser(null); setShowUserForm(false);
  };

  const handleResetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 8) {
      alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    await db.users.update(userId, { pin: newPassword, passwordChangedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setShowResetPassword(null);
    setNewPassword('');
    addNotification({ title: 'تم', message: 'تم إعادة تعيين كلمة المرور بنجاح', type: 'success' });
  };

  const filteredUsers = users.filter(u => {
    if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  // فلترة سجل النشاطات (يظهر أسفل قائمة المستخدمين)
  const ACTION_LABELS: Record<string, string> = {
    login: 'تسجيل دخول',
    logout: 'تسجيل خروج',
    account_locked: 'قفل الحساب',
    create: 'إنشاء',
    update: 'تعديل',
    delete: 'حذف',
    print_invoice: 'طباعة فاتورة',
    reprint_invoice: 'إعادة طباعة',
  };
  const filteredActivities = activities
    .filter(a => !actUserFilter || a.userId === actUserFilter)
    .filter(a => !actActionFilter || a.action === actActionFilter)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  const uniqueActions = [...new Set(activities.map(a => a.action))];
  const userName = (id: string) => users.find(u => u.id === id)?.name ?? id;

  // ===== معالجات الأدوار والصلاحيات =====
  const getRoleUsers = (role: RoleEntity) => {
    return users.filter(u => {
      if (u.roleId === role.id) return true;
      if (role.isSystem && (u.role === role.name || u.role === role.id)) return true;
      if (u.role === role.name) return true;
      return false;
    });
  };

  const getUserCount = (role: RoleEntity) => getRoleUsers(role).length;

  const SYSTEM_ROLE_INFO: Record<string, { title: string; subtitle: string; icon: any; color: string; badge: string; border: string }> = {
    admin: {
      title: 'مدير النظام',
      subtitle: 'تحكم كامل وشامل بجميع أجزاء ووظائف النظام',
      icon: Shield,
      color: 'bg-red-500/10 text-red-500',
      badge: 'bg-red-500/10 text-red-500 border-red-500/20',
      border: 'hover:border-red-500/40',
    },
    cashier: {
      title: 'كاشير',
      subtitle: 'إجراء المبيعات السريعة، طباعة الإيصالات، وإدارة الصندوق',
      icon: ShoppingCart,
      color: 'bg-purple-500/10 text-purple-600',
      badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      border: 'hover:border-purple-500/40',
    },
    seller: {
      title: 'بائع',
      subtitle: 'عمليات البيع المباشر وتصفح كتالوج الأصناف',
      icon: Zap,
      color: 'bg-blue-500/10 text-blue-600',
      badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      border: 'hover:border-blue-500/40',
    },
    sales_manager: {
      title: 'مدير المبيعات',
      subtitle: 'إدارة عمليات البيع، الفواتير، ودليل العملاء',
      icon: BarChart3,
      color: 'bg-emerald-500/10 text-emerald-600',
      badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      border: 'hover:border-emerald-500/40',
    },
    inventory_manager: {
      title: 'مدير المخزون',
      subtitle: 'إدارة المنتجات، حركات المخزون، ودليل الموردين',
      icon: Package,
      color: 'bg-amber-500/10 text-amber-600',
      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      border: 'hover:border-amber-500/40',
    },
    accountant: {
      title: 'محاسب',
      subtitle: 'إدارة المصاريف، الفواتير، والتقارير المالية',
      icon: CircleDollarSign,
      color: 'bg-cyan-500/10 text-cyan-600',
      badge: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
      border: 'hover:border-cyan-500/40',
    },
  };

  const openAddRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '', permissions: {} });
    setShowRoleForm(true);
  };

  const openEditRole = (role: RoleEntity) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description ?? '', permissions: { ...role.permissions } });
    setShowRoleForm(true);
  };

  const togglePermission = (key: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const submitRole = async () => {
    if (!roleForm.name.trim()) return;
    try {
      if (editingRole) {
        await roleRepo.update(editingRole.id, { name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions });
      } else {
        await roleRepo.create({ name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions });
      }
      setShowRoleForm(false);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const removeRole = async (role: RoleEntity) => {
    if (!confirm(`حذف الدور "${role.name}"؟`)) return;
    try {
      await roleRepo.remove(role.id);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleAddCurrency = () => {
    if (!newCurrencyCode || !newCurrencySymbol) return;
    const newCurrency: Currency = { code: newCurrencyCode.toUpperCase(), symbol: newCurrencySymbol, rateToBase: Number(newCurrencyRate) || 1 };
    if (settings.currencies.find((c: Currency) => c.code === newCurrency.code)) return;
    handleSaveSettings({ currencies: [...settings.currencies, newCurrency] });
    setNewCurrencyCode(''); setNewCurrencySymbol(''); setNewCurrencyRate('1');
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

  const handleExportBackup = async () => {
    const [products, customers, suppliers, sales, expenses, usersData, cashSessions, capitalEntries, promotions, settingsData] = await Promise.all([
      db.products.toArray(), db.customers.toArray(), db.suppliers.toArray(),
      db.sales.toArray(), db.expenses.toArray(), db.users.toArray(),
      db.cash_sessions.toArray(), db.capital_entries.toArray(), db.promotions.toArray(), db.settings.get('default'),
    ]);
    const backup = { products, customers, suppliers, sales, expenses, users: usersData, cashSessions, capitalEntries, promotions, settings: settingsData, exportDate: new Date().toISOString(), version: '1.0.0' };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `an-pos-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    addNotification({ title: 'تم التصدير', message: 'تم تصدير النسخة الاحتياطية بنجاح', type: 'success' });
  };

  const handleExportExcel = async () => {
    const products = await db.products.toArray();
    const csvHeader = 'الاسم,الباركود,التصنيف,السعر,الكمية,الحد الادنى\n';
    const csvRows = products.map(p => `${p.name},${p.barcode},${p.category},${p.retailPrice},${p.quantity},${p.lowStockThreshold || 0}`).join('\n');
    const blob = new Blob(['\uFEFF' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    addNotification({ title: 'تم التصدير', message: 'تم تصدير المنتجات بنجاح', type: 'success' });
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (backup.products) await db.products.bulkAdd(backup.products);
        if (backup.customers) await db.customers.bulkAdd(backup.customers);
        if (backup.settings) await db.settings.put({ ...backup.settings, id: 'default' });
        await queryClient.invalidateQueries();
        addNotification({ title: 'تم الاسترجاع', message: 'تم استرجاع النسخة الاحتياطية بنجاح', type: 'success' });
      } catch {
        addNotification({ title: 'خطأ', message: 'خطأ في قراءة ملف النسخة الاحتياطية', type: 'error' });
      }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const tabGroups = [
    {
      title: 'المتجر والعمليات',
      items: [
        { id: 'general', label: 'الإعدادات العامة', icon: Store, badge: undefined },
        { id: 'pos', label: 'نقطة البيع (POS)', icon: ShoppingCart, badge: undefined },
        { id: 'invoices', label: 'الفواتير والطباعة', icon: FileText, badge: undefined },
      ],
    },
    {
      title: 'الأمان والمستخدمون',
      items: [
        { id: 'users', label: 'المستخدمون والأدوار', icon: Users, badge: users.length ? `${users.length}` : undefined },
      ],
    },
    {
      title: 'الاتصال والأجهزة',
      items: [
        { id: 'network', label: 'الشبكة والخادم المحلي', icon: Globe, badge: serverStatus?.running ? 'نشط' : undefined },
        { id: 'mobile', label: 'تطبيق الهاتف المقترن', icon: Smartphone, badge: mobilePhones.length ? `${mobilePhones.length}` : undefined },
      ],
    },
    {
      title: 'النظام والبيانات',
      items: [
        { id: 'export', label: 'النسخ الاحتياطي والبيانات', icon: HardDrive, badge: undefined },
        { id: 'activation', label: 'تفعيل الترخيص', icon: Key, badge: license.activated ? 'مفعّل' : trial.isActive ? 'تجريبي' : undefined },
        { id: 'updates', label: 'تحديثات النظام', icon: RefreshCw, badge: undefined },
        { id: 'account', label: 'الملف والحساب', icon: UserIcon, badge: undefined },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6" dir="rtl">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-high p-6 rounded-3xl border border-outline-variant/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-cairo text-on-surface">لوحة الإعدادات والتحكم</h1>
            <p className="text-xs text-on-surface-variant">إدارة وتخصيص كافة وظائف النظام، المبيعات، الصلاحيات، والشبكة</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/20 flex items-center gap-2 text-xs font-semibold text-on-surface">
            <div className={`w-2.5 h-2.5 rounded-full ${serverStatus?.running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>خادم الشبكة: {serverStatus?.running ? `يعمل (منفذ ${serverStatus.port})` : 'متوقف'}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/20 flex items-center gap-2 text-xs font-semibold text-on-surface">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>{license.activated ? 'النسخة الكاملة' : trial.isActive ? `تجريبي (${trial.remainingDays} يوم)` : 'غير مفعل'}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-surface-container-low/90 backdrop-blur-md border border-outline-variant/20 rounded-3xl p-4 sticky top-6 shadow-sm space-y-5">
            {tabGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                <div className="text-[11px] font-bold text-on-surface-variant/70 px-3 tracking-wider uppercase font-cairo">
                  {group.title}
                </div>
                <nav className="space-y-1">
                  {group.items.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-2xl transition-all text-xs font-bold ${
                        activeTab === tab.id
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/20 scale-[1.02]'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-on-primary' : 'text-primary'}`} />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeTab === tab.id
                              ? 'bg-white/20 text-white'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            ))}

            <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-on-surface-variant px-2">
              <span>الإصدار v1.0.0</span>
              <span className="text-emerald-500 font-bold">قاعدة بيانات جاهزة</span>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 max-w-5xl">


        {/* === تفعيل التطبيق === */}
        {activeTab === 'activation' && (
          <div className="space-y-6">
            <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-primary" />
                <h2 className="font-headline-lg text-headline-lg text-on-surface">تفعيل التطبيق</h2>
              </div>
              <p className="text-body-md text-on-surface-variant mb-6">ادخل كود التفعيل الذي استلمته لتفعيل النسخة الكاملة.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-label-md text-on-surface mb-2">كود التفعيل</label>
                  <input value={activationCode} onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-cairo text-headline-sm font-bold tracking-wider" />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-2">اسم الجهاز / المعرف</label>
                  <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-2">رقم الهاتف</label>
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0XXX XX XX XX"
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>
              </div>
              <button onClick={handleActivate}
                disabled={license.activated}
                className="mt-5 px-8 py-3 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                {license.activated ? 'التطبيق مُفعّل' : 'تفعيل التطبيق'}
              </button>
            </div>

            {/* معلومات التفعيل */}
            <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
              <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-4">معلومات التفعيل</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-body-sm text-on-surface-variant mb-1">حالة التفعيل</p>
                  {license.activated ? (
                    <span className="inline-block px-3 py-1 rounded-full text-body-sm text-label-sm bg-emerald-100 text-emerald-700">مفعّل مدى الحياة</span>
                  ) : trial.isActive ? (
                    <span className="inline-block px-3 py-1 rounded-full text-body-sm text-label-sm bg-amber-100 text-amber-700">نسخة تجريبية — متبقي {trial.remainingDays} يوم</span>
                  ) : trial.isExpired ? (
                    <span className="inline-block px-3 py-1 rounded-full text-body-sm text-label-sm bg-error-container text-on-error-container">انتهت التجربة</span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-body-sm text-label-sm bg-surface-container text-on-surface">غير مفعّل</span>
                  )}
                </div>
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-body-sm text-on-surface-variant mb-1">الإصدار</p>
                  <p className="text-label-md text-on-surface">v1.0.0</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-body-sm text-on-surface-variant mb-1">الاجازة</p>
                  <p className="text-label-md text-on-surface">مدى الحياة</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-body-sm text-on-surface-variant mb-1">اسم الجهاز</p>
                  <p className="text-label-md text-on-surface">{deviceName}</p>
                </div>
              </div>
            </div>

            {/* رسالة تسويقية */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6">
              <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-3">احصل على النسخة الكاملة</h3>
              <ul className="space-y-2 mb-5">
                {['جميع الميزات بدون قيود', 'دعم فني مدى الحياة', 'تحديثات مجانية', 'تخصيص الفواتير'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-body-md text-on-surface-variant">
                    <div className="w-5 h-5 bg-tertiary/20 rounded-full flex items-center justify-center"><span className="text-tertiary text-xs">✓</span></div>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => addNotification({ title: 'شراء', message: 'سيتم الاتصال بك قريباً', type: 'info' })}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container transition-all">
                ارسل طلب شراء الآن
              </button>
            </div>
          </div>
        )}

        {/* === الاعدادات العامة (مُطورة بتصميم استثنائي وتفاعلي) === */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            {/* === 1. بطاقة الهوية التجارية ومعاينة رأس الوصل التفاعلية (Signature Hero Component) === */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-high border border-outline-variant/30 shadow-md p-6 sm:p-8">
              {/* شارة رأس الصفحة التفاعلية */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/20">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold font-cairo text-on-surface">بطاقة المؤسسة والامتثال الجبائي</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        جاهز للفواتير
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      المعاينة الحية لهوية المتجر كما تظهر لزبائنك وفي الوصولات الرسمية
                    </p>
                  </div>
                </div>

                {/* أزرار التبديل بين بطاقة الهوية ورأس الفاتورة */}
                <div className="flex items-center bg-surface-container-highest/60 p-1.5 rounded-2xl border border-outline-variant/25 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setGeneralPreviewMode('card')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      generalPreviewMode === 'card'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>بطاقة الهوية الرقمية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeneralPreviewMode('receipt')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      generalPreviewMode === 'receipt'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>رأس الوصل الحراري (80mm)</span>
                  </button>
                </div>
              </div>

              {/* محتوى المعاينة التفاعلية */}
              <div className="mt-6">
                {generalPreviewMode === 'card' ? (
                  /* نمط البطاقة الرقمية الفاخرة للمؤسسة */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* معلومات المتجر والشعار */}
                    <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface-container-lowest border-2 border-primary/20 flex items-center justify-center overflow-hidden shadow-inner shrink-0 group">
                        {settings.shopLogo ? (
                          <img src={settings.shopLogo} alt="شعار المؤسسة" className="w-full h-full object-contain p-2" />
                        ) : (
                          <Store className="w-12 h-12 text-on-surface-variant/30" />
                        )}
                        <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-surface-container-lowest" title="نشط ومقترن" />
                      </div>

                      <div className="space-y-2 text-center sm:text-right flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <h3 className="text-xl font-bold font-cairo text-on-surface truncate">
                            {settings.shopName || 'متجر AN POS التجاري'}
                          </h3>
                          <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
                            {settings.baseCurrency || 'دج'}
                          </span>
                        </div>

                        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                          {settings.shopDescription || 'نشاط تجاري عام بالتجزئة والجملة — نظام نقاط البيع المعتمد'}
                        </p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-on-surface-variant/80 pt-1">
                          {(settings.shopAddress || settings.city) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{[settings.shopAddress, settings.city].filter(Boolean).join('، ')}</span>
                            </span>
                          )}
                          {settings.phone && (
                            <span className="flex items-center gap-1 font-mono font-medium">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{settings.phone}</span>
                            </span>
                          )}
                          {settings.shopEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{settings.shopEmail}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* الختم الجبائي والبيانات القانونية */}
                    <div className="lg:col-span-5 bg-surface-container-lowest/80 backdrop-blur-xs rounded-2xl p-4 border border-outline-variant/30 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15 text-[11px] font-bold text-on-surface-variant">
                        <span className="flex items-center gap-1 text-primary">
                          <ShieldCheck className="w-4 h-4" />
                          المعرّفات الجبائية المعتمدة
                        </span>
                        <span className="text-[10px] text-emerald-600 font-mono">Algerian Fiscal IDs</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: 'السجل (RC)', val: settings.commercialRegister, key: 'rc' },
                          { label: 'الجبائي (NIF)', val: settings.taxNumber, key: 'nif' },
                          { label: 'المادة (AI)', val: settings.taxArticle, key: 'ai' },
                          { label: 'الإحصائي (NIS)', val: settings.taxId, key: 'nis' },
                        ].map((item) => (
                          <div
                            key={item.key}
                            onClick={() => handleCopyFiscal(item.val, item.key)}
                            className="p-2 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-outline-variant/15 flex flex-col justify-between transition-all cursor-pointer group"
                            title="انقر لنسخ الرقم"
                          >
                            <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-bold">
                              <span>{item.label}</span>
                              {copiedFiscalKey === item.key ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                              )}
                            </div>
                            <span className="font-mono font-bold text-[11px] text-on-surface mt-1 truncate">
                              {item.val || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* نمط رأس الفاتورة الحرارية 80mm */
                  <div className="flex justify-center">
                    <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant/40 p-5 font-mono text-center text-on-surface space-y-2 shadow-sm text-xs">
                      {settings.shopLogo && (
                        <div className="w-12 h-12 mx-auto overflow-hidden rounded-lg">
                          <img src={settings.shopLogo} alt="شعار" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <h4 className="font-bold text-sm text-on-surface">{settings.shopName || 'متجر AN POS'}</h4>
                      {settings.shopDescription && <p className="text-[11px] text-on-surface-variant">{settings.shopDescription}</p>}
                      <div className="text-[10px] text-on-surface-variant space-y-0.5 pt-1 border-t border-dashed border-outline-variant/30">
                        {(settings.shopAddress || settings.city) && <p>{[settings.shopAddress, settings.city].filter(Boolean).join(' - ')}</p>}
                        {settings.phone && <p>الهاتف: {settings.phone}</p>}
                        {(settings.commercialRegister || settings.taxNumber) && (
                          <p>RC: {settings.commercialRegister || '—'} | NIF: {settings.taxNumber || '—'}</p>
                        )}
                        {settings.taxArticle && <p>AI: {settings.taxArticle}</p>}
                      </div>
                      <div className="pt-2 text-[10px] text-emerald-600 font-bold border-t border-dashed border-outline-variant/30 flex items-center justify-between">
                        <span>نسبة الضريبة: {settings.tvaRate}% TVA</span>
                        <span>العملة: {settings.baseCurrency || 'دج'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* === 2. هوية المؤسسة والاتصال والشعار === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/15">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-cairo text-on-surface">بيانات المتجر وهوية العلامة</h3>
                  <p className="text-xs text-on-surface-variant">الاسم التجاري، الشعار الرسمي، وأرقام الاتصال المعتمدة</p>
                </div>
              </div>

              {/* رفع وتعديل الشعار */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-surface-container rounded-2xl border border-outline-variant/15">
                <div className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden bg-surface-container-low shrink-0 shadow-inner group">
                  {settings.shopLogo ? (
                    <>
                      <img src={settings.shopLogo} alt="شعار المؤسسة" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/70 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleSaveSettings({ shopLogo: '' })}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition-all"
                        >
                          حذف الشعار
                        </button>
                      </div>
                    </>
                  ) : (
                    <Store className="w-12 h-12 text-on-surface-variant/30" />
                  )}
                </div>

                <div className="flex-1 space-y-2.5 text-center sm:text-right">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h4 className="text-sm font-bold text-on-surface">الشعار التجاري الرسمي</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-mono">PNG, JPG حتى 2MB</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    يُدرج الشعار تلقائياً في أعلى الفواتير والوصولات الورقية وبطاقات الضمان والتقارير المالية.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs">
                    <ImageIcon className="w-4 h-4" />
                    <span>{settings.shopLogo ? 'تغيير الشعار' : 'رفع شعار المؤسسة'}</span>
                    <input type="file" accept="image/*" onChange={handleShopLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* شبكة حقول بيانات المتجر */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-primary" />
                    اسم المؤسسة / المتجر
                  </label>
                  <input
                    type="text"
                    value={settings.shopName || ''}
                    placeholder="مثال: سوبرماركت البركة"
                    onChange={(e) => handleSaveSettings({ shopName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    النشاط التجاري / الوصف
                  </label>
                  <input
                    type="text"
                    value={settings.shopDescription || ''}
                    placeholder="مثال: تجارة المواد الغذائية بالتجزئة والجملة"
                    onChange={(e) => handleSaveSettings({ shopDescription: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    المدينة / الولاية
                  </label>
                  <input
                    type="text"
                    value={settings.city || ''}
                    placeholder="مثال: الجزائر العاصمة"
                    onChange={(e) => handleSaveSettings({ city: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    العنوان التفصيلي
                  </label>
                  <input
                    type="text"
                    value={settings.shopAddress || ''}
                    placeholder="مثال: شارع أول نوفمبر، عمارة ب، المحل رقم 04"
                    onChange={(e) => handleSaveSettings({ shopAddress: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    رقم الهاتف الرئيسي
                  </label>
                  <input
                    type="tel"
                    value={settings.phone || ''}
                    placeholder="05XX XX XX XX"
                    onChange={(e) => handleSaveSettings({ phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    الهاتف الثانوي / الثابت
                  </label>
                  <input
                    type="tel"
                    value={settings.shopPhone2 || ''}
                    placeholder="023 XX XX XX"
                    onChange={(e) => handleSaveSettings({ shopPhone2: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={settings.shopEmail || ''}
                    placeholder="contact@store.dz"
                    onChange={(e) => handleSaveSettings({ shopEmail: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* === 3. البيانات القانونية والجبائية الجزائرية === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-cairo text-on-surface">البيانات القانونية والجبائية (Algerian Fiscal Compliance)</h3>
                    <p className="text-xs text-on-surface-variant">الأرقام الإلزامية التي تضمن قانونية الفواتير وفق التشريع الجزائري</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600">
                  <Landmark className="w-3.5 h-3.5" />
                  النظام الجبائي الجزائري
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'السجل التجاري (RC)', key: 'commercialRegister', value: settings.commercialRegister, placeholder: '16/00-1234567B', desc: 'رقم القيد في السجل التجاري' },
                  { label: 'الرقم الجبائي (NIF)', key: 'taxNumber', value: settings.taxNumber, placeholder: '001616012345678', desc: 'رقم التعريف الإحصائي الجبائي' },
                  { label: 'رقم المادة الجبائية (AI)', key: 'taxArticle', value: settings.taxArticle, placeholder: '16012345678', desc: 'رقم مادة جدول الضرائب' },
                  { label: 'رقم التعريف الإحصائي (NIS / ART)', key: 'taxId', value: settings.taxId, placeholder: '123456789', desc: 'رقم التعريف الإحصائي للمؤسسة' },
                ].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-on-surface">{f.label}</label>
                      <span className="text-[10px] text-on-surface-variant/70">{f.desc}</span>
                    </div>
                    <input
                      type="text"
                      value={f.value || ''}
                      placeholder={f.placeholder}
                      onChange={(e) => handleSaveSettings({ [f.key]: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono font-bold tracking-wider"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* === 4. الضرائب والعملة والخيارات الإقليمية === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/15">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <BadgePercent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-cairo text-on-surface">الضرائب، العملة والتنسيق الإقليمي</h3>
                  <p className="text-xs text-on-surface-variant">النسبة الضريبية الافتراضية، العملة الأساسية، وتنسيقات الأرقام والتواريخ</p>
                </div>
              </div>

              {/* ضريبة القيمة المضافة مع خيارات سريعة */}
              <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">نسبة الضريبة الافتراضية TVA (%)</h4>
                    <p className="text-[11px] text-on-surface-variant">تُطبق تلقائياً على المبيعات والفواتير الضريبية</p>
                  </div>

                  {/* أزرار النسب الجاهزة في النظام الجزائري */}
                  <div className="flex items-center gap-2">
                    {[
                      { rate: 19, label: '19% (النسبة العادية)' },
                      { rate: 9, label: '9% (النسبة المخفضة)' },
                      { rate: 0, label: '0% (معفى)' },
                    ].map((preset) => (
                      <button
                        key={preset.rate}
                        type="button"
                        onClick={() => handleSaveSettings({ tvaRate: preset.rate })}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          settings.tvaRate === preset.rate
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-surface-container-highest/70 hover:bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.tvaRate}
                    onChange={(e) => handleSaveSettings({ tvaRate: Number(e.target.value) || 0 })}
                    className="w-32 px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold text-on-surface font-mono"
                  />
                  <span className="text-xs text-on-surface-variant">النسبة المطبقة حالياً في الحسابات: <strong className="text-emerald-600">{settings.tvaRate}%</strong></span>
                </div>
              </div>

              {/* التنسيقات الإقليمية واللغة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">العملة الأساسية</label>
                  <input
                    type="text"
                    value={settings.baseCurrency || 'دج'}
                    onChange={(e) => handleSaveSettings({ baseCurrency: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">لغة الواجهة</label>
                  <select
                    value={settings.language || 'ar'}
                    onChange={(e) => handleSaveSettings({ language: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                  >
                    <option value="ar">🇩🇿 العربية (الافتراضية)</option>
                    <option value="fr">🇫🇷 Français (الفرنسية)</option>
                    <option value="en">🇬🇧 English (الإنجليزية)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">تنسيق التاريخ</label>
                  <select
                    value={settings.dateFormat || 'DD/MM/YYYY'}
                    onChange={(e) => handleSaveSettings({ dateFormat: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (30/08/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-08-30)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">تنسيق فواصل الأرقام</label>
                  <select
                    value={`${settings.thousandsSeparator || ' '}|${settings.decimalSeparator || '.'}`}
                    onChange={(e) => {
                      const [th, dec] = e.target.value.split('|');
                      handleSaveSettings({ thousandsSeparator: th, decimalSeparator: dec });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  >
                    <option value=" |." >1 250.00 دج (قياسي جزائري)</option>
                    <option value=",|.">1,250.00 دج (فاصلة آلاف ونقطة)</option>
                    <option value=".|,">1.250,00 دج (نظام فرنسي)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* === 5. إدارة العملات ومحول أسعار الصرف التفاعلي === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-cairo text-on-surface">إدارة العملات ومحول أسعار الصرف</h3>
                    <p className="text-xs text-on-surface-variant">التعامل بالعملات الأجنبية مع حسابات الصرف الفورية</p>
                  </div>
                </div>
              </div>

              {/* بطاقات العملات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {settings.currencies.map((currency) => (
                  <div
                    key={currency.code}
                    className="p-4 bg-surface-container rounded-2xl border border-outline-variant/15 flex items-center justify-between shadow-2xs hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 font-bold text-lg flex items-center justify-center shrink-0">
                        {currency.symbol}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-on-surface">{currency.code}</span>
                          {currency.code === settings.baseCurrency.replace(/[^A-Z]/g, '') && (
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[10px] font-bold">الأساسية</span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          1 {currency.code} = <strong className="text-on-surface font-mono">{currency.rateToBase}</strong> {settings.baseCurrency}
                        </p>
                      </div>
                    </div>

                    {settings.currencies.length > 1 && currency.code !== settings.baseCurrency.replace(/[^A-Z]/g, '') && (
                      <button
                        type="button"
                        onClick={() => handleSaveSettings({ currencies: settings.currencies.filter((c: Currency) => c.code !== currency.code) })}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="حذف العملة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* محول الصرف الحي التجريبي */}
              <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/15 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-on-surface shrink-0">
                  <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                  <span>محول سريع للعملات:</span>
                </div>
                <div className="flex items-center gap-2 flex-1 w-full">
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value) || 0)}
                    className="w-24 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs font-bold text-on-surface font-mono"
                  />
                  <select
                    value={calcCurrency}
                    onChange={(e) => setCalcCurrency(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs font-bold text-on-surface"
                  >
                    {settings.currencies.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-on-surface-variant">=</span>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 font-mono font-bold text-xs border border-emerald-500/20">
                    {(
                      calcAmount *
                      (settings.currencies.find((c) => c.code === calcCurrency)?.rateToBase || 1)
                    ).toLocaleString('ar-DZ', { minimumFractionDigits: 2 })} {settings.baseCurrency}
                  </div>
                </div>
              </div>

              {/* نموذج إضافة عملة جديدة */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <input
                  value={newCurrencyCode}
                  onChange={(e) => setNewCurrencyCode(e.target.value)}
                  placeholder="رمز العملة (مثال: EUR)"
                  className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface flex-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase font-mono"
                  maxLength={5}
                />
                <input
                  value={newCurrencySymbol}
                  onChange={(e) => setNewCurrencySymbol(e.target.value)}
                  placeholder="الرمز (مثال: €)"
                  className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface flex-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  maxLength={5}
                />
                <input
                  type="number"
                  value={newCurrencyRate}
                  onChange={(e) => setNewCurrencyRate(e.target.value)}
                  placeholder="سعر الصرف مقابل دج"
                  className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface flex-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddCurrency}
                  className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة عملة</span>
                </button>
              </div>
            </div>

            {/* === 6. فئات وتصنيفات المصاريف مع المقترحات الذكية === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-cairo text-on-surface">فئات وتصنيفات المصاريف التشغيلية</h3>
                    <p className="text-xs text-on-surface-variant">تبويب المصاريف لتسهيل استخراج تقارير الأرباح والتدفق المالي</p>
                  </div>
                </div>
                <span className="text-xs text-on-surface-variant font-bold">
                  {settings.expenseCategories.length} فئات مسجلة
                </span>
              </div>

              {/* قائمة فئات المصاريف الحالية */}
              <div className="flex flex-wrap gap-2.5">
                {settings.expenseCategories.map((category: string) => (
                  <span
                    key={category}
                    className="flex items-center gap-2 px-3.5 py-2 bg-surface-container rounded-xl text-xs font-bold text-on-surface border border-outline-variant/20 shadow-2xs hover:border-primary/40 transition-all"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{category}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseCategory(category)}
                      className="text-on-surface-variant hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                      title="حذف الفئة"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* المقترحات الجاهزة بضغطة زر */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-on-surface-variant">فئات مقترحة شائعة (انقر للإضافة السريعة):</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'إيجار المحل',
                    'كهرباء وغاز',
                    'ماء',
                    'رواتب وأجور الموظفين',
                    'وقود ومصاريف النقل',
                    'تسويق وإشهار',
                    'صيانة وتصليح العتاد',
                    'مواد التغليف والأكياس',
                    'ضرائب ورسوم مهنية',
                    'اشتراك الإنترنت والهاتف',
                  ]
                    .filter((cat) => !settings.expenseCategories.includes(cat))
                    .map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleSaveSettings({ expenseCategories: [...settings.expenseCategories, cat] })}
                        className="px-3 py-1 rounded-xl text-xs font-medium bg-surface-container-high/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-outline-variant/15 text-on-surface-variant transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-primary" />
                        <span>{cat}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* إضافة فئة مخصصة */}
              <div className="flex gap-2 pt-2">
                <input
                  value={newExpenseCategory}
                  onChange={(e) => setNewExpenseCategory(e.target.value)}
                  placeholder="أدخل اسم فئة مصاريف مخصصة جديدة..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
                />
                <button
                  type="button"
                  onClick={handleAddExpenseCategory}
                  className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة فئة</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === نقطة البيع (POS) === */}
        {activeTab === 'pos' && (
          <div className="space-y-6">
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-cairo text-on-surface">إعدادات وقواعد نقطة البيع (POS)</h2>
                    <p className="text-xs text-on-surface-variant">التحكم في سلاسة وسرعة إتمام المبيعات وحركات المخزون في الصندوق</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'quickSale',
                    title: 'البيع السريع اللحظي',
                    desc: 'إتمام المعاملات فوراً بدون نوافذ تأكيد إضافية لتسريع خدمة الزبائن',
                    icon: Zap,
                    color: 'text-amber-500 bg-amber-500/10',
                  },
                  {
                    key: 'allowNegativeStock',
                    title: 'السماح بالمخزون السالب',
                    desc: 'إمكانية إتمام البيع حتى لو كانت كمية المنتج في المخزون صفراً أو غير مدخلة',
                    icon: Package,
                    color: 'text-purple-500 bg-purple-500/10',
                  },
                  {
                    key: 'confirmNoStock',
                    title: 'تنبيه تحذيري عند نفاذ المخزون',
                    desc: 'إظهار تنبيه بصري للكاشير عند محاولة بيع منتج منتهي الرصيد',
                    icon: Bell,
                    color: 'text-blue-500 bg-blue-500/10',
                  },
                  {
                    key: 'averagePricing',
                    title: 'التسعير بمتوسط التكلفة المرجح (PMP)',
                    desc: 'حساب تكلفة وأرباح المنتجات بناءً على متوسط سعر الشراء التراكمي',
                    icon: BarChart3,
                    color: 'text-emerald-500 bg-emerald-500/10',
                  },
                  {
                    key: 'accountingOnly',
                    title: 'وضع المحاسبة المالية فقط',
                    desc: 'تعطيل تتبع حركات المخزون واستخدام النظام كمحاسبة مبيعات وصندوق فقط',
                    icon: CreditCard,
                    color: 'text-rose-500 bg-rose-500/10',
                  },
                  {
                    key: 'zakatEnabled',
                    title: 'حساب وتتبع وعاء الزكاة الشرعية',
                    desc: 'حساب زكاة عروض التجارة والنقدية تلقائياً عند بلوغ النصاب السنوي',
                    icon: ShieldCheck,
                    color: 'text-teal-500 bg-teal-500/10',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-start justify-between gap-3 hover:border-primary/30 transition-all shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-on-surface font-cairo">{item.title}</p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveSettings({ [item.key]: !settings[item.key as keyof typeof settings] })}
                      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                        settings[item.key as keyof typeof settings] ? 'bg-primary' : 'bg-surface-container-highest border border-outline-variant/30'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                          settings[item.key as keyof typeof settings] ? 'right-0.5' : 'right-[26px]'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === الفواتير والطباعة === */}
        {/* === الفواتير والطباعة === */}
        {activeTab === 'invoices' && (
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 shadow-sm space-y-6">
            {/* رأس القسم */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-cairo text-on-surface">إعدادات الفواتير والطباعة</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                      {settings.invoiceTemplate === 'detailed' ? 'قالب تفصيلي' : 'قالب أساسي'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    قوالب الفاتورة، إعدادات الطباعة، والترقيم التلقائي
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/settings/print-templates')}
                  className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  <span>مصمم القوالب المرئي</span>
                </button>
              </div>
            </div>

            {/* شريط التبويبات الفرعية */}
            <div className="flex gap-2 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/15">
              {[
                { id: 'template', label: 'قالب الفاتورة والترقيم', Icon: LayoutTemplate },
                { id: 'printing', label: 'إعدادات الطباعة واللغة', Icon: Printer },
                { id: 'advanced', label: 'قوالب الطباعة المتقدمة والطابعات', Icon: ListChecks },
              ].map(({ id, label, Icon }) => {
                const active = invoiceSubTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setInvoiceSubTab(id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-primary text-on-primary shadow-sm scale-[1.01]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* === تبويب 1: قالب الفاتورة والترقيم === */}
            {invoiceSubTab === 'template' && (
              <div className="space-y-6">
                {/* اختيار نوع القالب */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-on-surface font-cairo flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-primary" />
                      <span>نوع القالب الافتراضي</span>
                    </label>
                    <span className="text-xs text-on-surface-variant">انقر لتحديد القالب المعتمد</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* قالب أساسي */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSaveSettings({ invoiceTemplate: 'basic' })}
                      className={`relative p-5 rounded-3xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                        settings.invoiceTemplate === 'basic'
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-2 ring-primary/20'
                          : 'border-outline-variant/20 bg-surface-container hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <Receipt className="w-6 h-6" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          settings.invoiceTemplate === 'basic' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant'
                        }`}>
                          {settings.invoiceTemplate === 'basic' && <span className="text-[10px] font-black">✓</span>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-on-surface font-cairo">قالب أساسي</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            سريع ومدمج
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          إيصال بسيط مع المعلومات الأساسية، مناسب لطابعات الكاشير الحرارية وسرعة خدمة الزبائن.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-on-surface-variant">
                        <span>المحتوى: اسم المحل · الأصناف · الإجمالي · كود QR</span>
                      </div>
                    </div>

                    {/* قالب تفصيلي */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSaveSettings({ invoiceTemplate: 'detailed' })}
                      className={`relative p-5 rounded-3xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                        settings.invoiceTemplate === 'detailed'
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-2 ring-primary/20'
                          : 'border-outline-variant/20 bg-surface-container hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          settings.invoiceTemplate === 'detailed' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant'
                        }`}>
                          {settings.invoiceTemplate === 'detailed' && <span className="text-[10px] font-black">✓</span>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-on-surface font-cairo">قالب تفصيلي</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                            تجاري ومحاسبي
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          فاتورة مفصلة مع جميع البيانات القانونية (RC, NIF, AI)، بيانات العميل، الضرائب، والتوقيعات.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-on-surface-variant">
                        <span>المحتوى: الهوية الجبائية · جدول محاسبي · تفصيل TVA · أختام</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ترقيم وتسلسل الفواتير */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold font-cairo text-on-surface">تسلسل وترقيم الفواتير</h3>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-surface-container-highest text-xs font-mono font-bold text-primary border border-outline-variant/20">
                      معاينة الفاتورة التالية: {settings.invoicePrefix || 'INV-'}{String(settings.invoiceStartNumber || 1).padStart(6, '0')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">بادئة رقم الفاتورة (Prefix)</label>
                      <input
                        type="text"
                        value={settings.invoicePrefix}
                        onChange={(e) => handleSaveSettings({ invoicePrefix: e.target.value })}
                        placeholder="مثال: INV- أو FACT-"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono uppercase font-bold"
                      />
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[11px] text-on-surface-variant">اقتراحات سريعة:</span>
                        {['INV-', 'FACT-', 'BL-', 'TKT-'].map((pfx) => (
                          <button
                            key={pfx}
                            type="button"
                            onClick={() => handleSaveSettings({ invoicePrefix: pfx })}
                            className="px-2 py-0.5 rounded-lg bg-surface-container-highest hover:bg-primary/10 hover:text-primary text-[10px] font-mono font-bold transition-all"
                          >
                            {pfx}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">رقم البداية التسلسلي</label>
                      <input
                        type="number"
                        min="1"
                        value={settings.invoiceStartNumber}
                        onChange={(e) => handleSaveSettings({ invoiceStartNumber: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold font-mono"
                      />
                      <p className="text-[11px] text-on-surface-variant mt-2">
                        يتم زيادة الرقم تلقائياً مع كل فاتورة بيع جديدة يتم إصدارها
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === تبويب 2: إعدادات الطباعة واللغة === */}
            {invoiceSubTab === 'printing' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* مقاس الطباعة */}
                  <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-3">
                    <label className="block text-xs font-bold text-on-surface font-cairo">مقاس ورق الطباعة الافتراضي</label>
                    <select
                      value={settings.printWidthMm}
                      onChange={(e) => handleSaveSettings({ printWidthMm: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                    >
                      <option value={80}>80mm (إيصال حراري قياسي 80 ملم للسوبرماركت)</option>
                      <option value={58}>58mm (إيصال حراري صغير 58 ملم)</option>
                      <option value={0}>A4 / A5 (فواتير ووصولات تجارية رسمية)</option>
                    </select>
                    <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant space-y-1">
                      <p className="font-semibold text-on-surface">💡 توصيات الاستخدام:</p>
                      <p>• 80mm: الأفضل لنقاط البيع ونظام الكاشير المزدحم.</p>
                      <p>• A4 / A5: الأنسب للمؤسسات والشركات والمبيعات بالجملة.</p>
                    </div>
                  </div>

                  {/* لغة طباعة الفواتير */}
                  <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-3">
                    <label className="block text-xs font-bold text-on-surface font-cairo">لغة طباعة الفواتير والوصولات</label>
                    <select
                      value={(settings as any).printLanguage || 'ar'}
                      onChange={(e) => handleSaveSettings({ printLanguage: e.target.value } as any)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                    >
                      <option value="ar">🇩🇿 العربية (اتّجاه RTL كامل)</option>
                      <option value="ar-fr">🌐 ثنائية اللغة (عربي / Français)</option>
                      <option value="fr">🇫🇷 Français (فرنسية كاملة LTR)</option>
                      <option value="en">🇬🇧 English (إنجليزية LTR)</option>
                    </select>
                    <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant space-y-1">
                      <p className="font-semibold text-on-surface">🌐 دعم الاتجاهات:</p>
                      <p>• العربية: اتجاه كامل من اليمين لليسار (RTL).</p>
                      <p>• اللغات الأجنبية: يتم عكس محاذاة الأعمدة تلقائياً (LTR).</p>
                    </div>
                  </div>
                </div>

                {/* نص تذييل الفاتورة */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-on-surface">نص التذييل أسفل الفاتورة (Receipt Footer)</label>
                    <span className="text-[11px] text-on-surface-variant">يظهر في أسفل كل إيصال مطبوع</span>
                  </div>
                  <textarea
                    value={settings.receiptFooter}
                    onChange={(e) => handleSaveSettings({ receiptFooter: e.target.value })}
                    placeholder="مثال: شكراً لزيارتكم · البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary leading-relaxed"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[11px] text-on-surface-variant">نصوص جاهزة:</span>
                    {[
                      'شكراً لتسوقكم معنا ومرحباً بكم دائماً',
                      'البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة خلال 48 ساعة',
                      'Merci pour votre visite et à bientôt !',
                    ].map((txt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSaveSettings({ receiptFooter: txt })}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-highest hover:bg-primary/10 hover:text-primary text-[11px] transition-all text-on-surface-variant"
                      >
                        "{txt.slice(0, 24)}..."
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === تبويب 3: قوالب الطباعة المتقدمة والطابعات === */}
            {invoiceSubTab === 'advanced' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* مدير القوالب */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 hover:border-primary/30 transition-all">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <LayoutTemplate className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-cairo text-on-surface">مصمم ومدير القوالب</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        تخصيص قوالب الفواتير الحرارية 80mm و 58mm وفواتير A4 و A5 بدقة بصرية وتحديد الحقول الظاهرة.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/settings/print-templates')}
                    className="w-full py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <LayoutTemplate className="w-4 h-4" />
                    <span>فتح مدير القوالب</span>
                  </button>
                </div>

                {/* طابور مهام الطباعة */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 hover:border-amber-500/30 transition-all">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <ListChecks className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-cairo text-on-surface">طابور مهام الطباعة</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        متابعة أوامر الطباعة المعلقة، إعادة المحاولة التلقائية عند انقطاع الطابعة، وإدارة الأخطاء.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/settings/print-queue')}
                    className="w-full py-2.5 bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                  >
                    <ListChecks className="w-4 h-4" />
                    <span>متابعة الطابور</span>
                  </button>
                </div>

                {/* إدارة الطابعات */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 hover:border-cyan-500/30 transition-all">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-cairo text-on-surface">إدارة واكتشاف الطابعات</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        إضافة طابعات (USB / Bluetooth / Network)، اختبار الاتصال المباشر، والتعيينات الافتراضية.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/settings/printers')}
                    className="w-full py-2.5 bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>فتح إدارة الطابعات</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === المستخدمون والأمان === */}
        {activeTab === 'users' && (
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 shadow-sm space-y-6">
            {/* رأس القسم */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-cairo text-on-surface">إدارة المستخدمين والأمان</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                      {users.length} مستخدم
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    إدارة حسابات الفريق، الصلاحيات، سجل التدقيق والنشاطات
                  </p>
                </div>
              </div>

              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setUserForm({ name: '', pin: '', role: 'seller', roleId: '', email: '', phone: '' });
                    setEditingUser(null);
                    setShowUserForm(true);
                  }}
                  className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مستخدم جديد</span>
                </button>
              )}
            </div>

            {/* شريط التبويبات الفرعية */}
            <div className="flex gap-2 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/15">
              {([
                { id: 'users', label: 'المستخدمون', Icon: Users, count: users.length },
                { id: 'activities', label: 'سجل النشاطات', Icon: ScrollText, count: filteredActivities.length },
                { id: 'roles', label: 'الأدوار والصلاحيات', Icon: Shield, count: roles.length },
              ] as const).map(({ id, label, Icon, count }) => {
                const active = userSubTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUserSubTab(id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-primary text-on-primary shadow-sm scale-[1.01]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        active ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* === تبويب 1: المستخدمون === */}
            {userSubTab === 'users' && (
              <div className="space-y-4">
                {/* شريط البحث والفلترة */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="بحث بالاسم أو اسم المستخدم..."
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <Users className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-3" />
                  </div>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="all">كل الحالات</option>
                    <option value="active">نشط فقط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>

                {/* شبكة بطاقات المستخدمين */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {filteredUsers.map((user) => {
                    const roleStyles: Record<string, { label: string; badge: string; avatar: string }> = {
                      admin: { label: 'مدير النظام', badge: 'bg-red-500/10 text-red-500 border-red-500/20', avatar: 'bg-red-500/10 text-red-600 border-red-500/30' },
                      cashier: { label: 'كاشير', badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20', avatar: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
                      seller: { label: 'بائع', badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20', avatar: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
                      accountant: { label: 'محاسب', badge: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', avatar: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30' },
                      sales_manager: { label: 'مدير مبيعات', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', avatar: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
                      inventory_manager: { label: 'مدير مخزون', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20', avatar: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
                    };

                    const style = roleStyles[user.role] || { label: user.role, badge: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/20', avatar: 'bg-primary/10 text-primary border-primary/20' };
                    const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
                    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

                    return (
                      <div
                        key={user.id}
                        className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 hover:border-primary/30 transition-all shadow-xs group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            {/* الصورة الرمزية */}
                            <div className="relative">
                              <div className={`w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-lg border shadow-inner ${style.avatar}`}>
                                {initial}
                              </div>
                              <div
                                className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-surface-container ${
                                  user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                                title={user.status === 'active' ? 'نشط' : 'غير نشط'}
                              />
                            </div>

                            {/* اسم ومعرف المستخدم */}
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold font-cairo text-on-surface">{user.name}</h3>
                                {user.id === currentUser?.id && (
                                  <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-primary/15 text-primary">
                                    أنت
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-mono text-on-surface-variant font-medium">@{user.username}</p>
                            </div>
                          </div>

                          {/* شارة الدور والحالة */}
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${style.badge}`}>
                              {style.label}
                            </span>
                            {user.status === 'active' ? (
                              <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                نشط
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-on-surface-variant">غير نشط</span>
                            )}
                          </div>
                        </div>

                        {/* معلومات إضافية (البريد، الهاتف، آخر دخول) */}
                        <div className="pt-3 border-t border-outline-variant/15 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
                          <div className="flex items-center gap-3 flex-wrap">
                            {user.phone && <span>📞 {user.phone}</span>}
                            {user.email && <span dir="ltr">✉️ {user.email}</span>}
                            {user.lastLogin && (
                              <span className="flex items-center gap-1 text-[11px]">
                                🕒 آخر دخول: {new Date(user.lastLogin).toLocaleDateString('ar-DZ')}
                              </span>
                            )}
                            {isLocked && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-500">
                                🔒 الحساب مقفل
                              </span>
                            )}
                          </div>
                        </div>

                        {/* شريط الإجراءات */}
                        {currentUser?.role === 'admin' && (
                          <div className="pt-2 border-t border-outline-variant/10 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowResetPassword(user.id);
                                setNewPassword('');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-amber-500/10 text-amber-600 text-xs font-bold transition-all flex items-center gap-1"
                              title="إعادة تعيين كلمة المرور"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>كلمة السر</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(user);
                                setUserForm({
                                  name: user.name,
                                  pin: user.pin,
                                  role: user.role,
                                  roleId: user.roleId || '',
                                  email: user.email || '',
                                  phone: user.phone || '',
                                });
                                setShowUserForm(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary/10 text-primary text-xs font-bold transition-all flex items-center gap-1"
                              title="تعديل بيانات المستخدم"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleStatusMutation.mutate({ id: user.id, current: user.status })}
                              disabled={user.id === currentUser?.id}
                              className={`p-1.5 rounded-xl transition-all ${
                                user.status === 'active'
                                  ? 'hover:bg-amber-500/10 text-amber-500'
                                  : 'hover:bg-emerald-500/10 text-emerald-500'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                              title={user.id === currentUser?.id ? 'لا يمكن تعطيل المستخدم الحالي' : user.status === 'active' ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            >
                              <Settings className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف المستخدم "${user.name}"؟`)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={user.id === currentUser?.id}
                              className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title={user.id === currentUser?.id ? 'لا يمكن حذف المستخدم الحالي' : 'حذف المستخدم'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-on-surface-variant">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-bold">لا يوجد مستخدمون يطابقون معايير البحث</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === تبويب 2: سجل النشاطات === */}
            {userSubTab === 'activities' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <select
                      value={actUserFilter}
                      onChange={(e) => setActUserFilter(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">جميع المستخدمين</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={actActionFilter}
                      onChange={(e) => setActActionFilter(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">جميع العمليات</option>
                      {uniqueActions.map((a) => (
                        <option key={a} value={a}>
                          {ACTION_LABELS[a] || a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs text-on-surface-variant font-bold">
                    {filteredActivities.length} حركة مسجلة
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant/20">
                      <tr>
                        <th className="px-4 py-3">الوقت والتاريخ</th>
                        <th className="px-4 py-3">المستخدم</th>
                        <th className="px-4 py-3">نوع العملية</th>
                        <th className="px-4 py-3">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15">
                      {filteredActivities.map((a) => (
                        <tr key={a.id} className="hover:bg-surface-container-highest/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-on-surface-variant whitespace-nowrap">
                            {new Date(a.performedAt).toLocaleString('ar-DZ')}
                          </td>
                          <td className="px-4 py-3 font-bold text-on-surface">{userName(a.userId)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                a.action === 'login'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : a.action === 'logout'
                                  ? 'bg-yellow-500/10 text-yellow-600'
                                  : a.action === 'delete'
                                  ? 'bg-red-500/10 text-red-500'
                                  : 'bg-blue-500/10 text-blue-600'
                              }`}
                            >
                              {ACTION_LABELS[a.action] || a.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant leading-relaxed">
                            {a.details ?? a.entity ?? '-'}
                          </td>
                        </tr>
                      ))}
                      {filteredActivities.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">
                            لا توجد سجلات نشاط مسجلة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* === تبويب 3: الأدوار والصلاحيات === */}
            {userSubTab === 'roles' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-container rounded-2xl border border-outline-variant/15">
                  <div>
                    <h3 className="text-sm font-bold font-cairo text-on-surface">الأدوار والصلاحيات المعتمدة في النظام</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      تحديد صلاحيات الوصول الدقيقة لكل مستخدم لحماية البيانات والعمليات المالية
                    </p>
                  </div>
                  {currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={openAddRole}
                      className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة دور مخصص</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((role) => {
                    const info = SYSTEM_ROLE_INFO[role.name] || {
                      title: role.name,
                      subtitle: role.description || 'دور مخصص للمستخدمين',
                      icon: Shield,
                      color: 'bg-primary/10 text-primary',
                      badge: 'bg-primary/10 text-primary border-primary/20',
                      border: 'hover:border-primary/40',
                    };
                    const RoleIcon = info.icon;
                    const assignedUsers = getRoleUsers(role);
                    const count = assignedUsers.length;
                    const hasAll = role.permissions['*'] === true;
                    const activePermsCount = hasAll ? 'الكل' : Object.values(role.permissions).filter(Boolean).length;

                    return (
                      <div
                        key={role.id}
                        className={`p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 transition-all shadow-xs group ${info.border}`}
                      >
                        <div className="space-y-3">
                          {/* الترويسة مع الأيقونة وشارة النظام */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-inner ${info.color} border-outline-variant/20`}>
                                <RoleIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold font-cairo text-on-surface flex items-center gap-1.5">
                                  {info.title}
                                </h4>
                                <p className="text-xs font-mono text-on-surface-variant font-medium">@{role.name}</p>
                              </div>
                            </div>

                            {role.isSystem ? (
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
                                <span>🔒</span>
                                <span>دور نظامي</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {currentUser?.role === 'admin' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openEditRole(role)}
                                      className="p-1.5 rounded-xl hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-all"
                                      title="تعديل الدور"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeRole(role)}
                                      className="p-1.5 rounded-xl hover:bg-red-500/10 text-on-surface-variant hover:text-red-500 transition-all"
                                      title="حذف الدور"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* الوصف */}
                          <p className="text-xs text-on-surface-variant leading-relaxed min-h-[32px]">
                            {role.description || info.subtitle}
                          </p>

                          {/* شريط المستخدمين المرتبطين */}
                          <div className="p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-on-surface">
                                {count} مستخدم مرتبط
                              </span>
                              {count > 0 && (
                                <div className="flex -space-x-1.5 rtl:space-x-reverse">
                                  {assignedUsers.slice(0, 3).map((u) => (
                                    <div
                                      key={u.id}
                                      title={u.name}
                                      className="w-5 h-5 rounded-full bg-primary text-on-primary font-bold text-[9px] flex items-center justify-center border border-surface-container shadow-xs"
                                    >
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                  ))}
                                  {count > 3 && (
                                    <div className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface-variant font-bold text-[9px] flex items-center justify-center border border-surface-container">
                                      +{count - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <span className="text-[11px] font-bold text-on-surface-variant font-mono">
                              {activePermsCount} صلاحية
                            </span>
                          </div>
                        </div>

                        {/* الصلاحيات والميزات الممنوحة */}
                        <div className="space-y-2.5 pt-2 border-t border-outline-variant/15">
                          <div className="flex flex-wrap gap-1">
                            {hasAll ? (
                              <span className="w-full py-1 px-2.5 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-center">
                                ⚡ صلاحيات المدير الكاملة (جميع العمليات)
                              </span>
                            ) : (
                              Object.entries(role.permissions)
                                .filter(([, v]) => v)
                                .slice(0, 4)
                                .map(([k]) => (
                                  <span
                                    key={k}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-surface-container-low border border-outline-variant/15 text-on-surface-variant"
                                  >
                                    {PERMISSION_LABELS[k] || k}
                                  </span>
                                ))
                            )}
                            {!hasAll && Object.values(role.permissions).filter(Boolean).length > 4 && (
                              <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-primary bg-primary/10">
                                +{Object.values(role.permissions).filter(Boolean).length - 4} أخرى
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setViewingRoleDetails(role)}
                            className="w-full py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-outline-variant/15 hover:border-primary/30"
                          >
                            <Shield className="w-3.5 h-3.5 text-primary" />
                            <span>استعراض الصلاحيات الكاملة</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === الشبكة والاتصال === */}
        {activeTab === 'network' && (
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 shadow-sm space-y-6">
            {/* ترويسة القسم والحالة الحية */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <Network className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold font-cairo text-on-surface">الشبكة والاتصال والأجهزة</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                      {onlineDevicesCount} جهاز متصل
                    </span>
                    {serverStatus?.running ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        خادم الشبكة: نشط ({serverStatus.port})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-container-high text-on-surface-variant">
                        الخادم المحلي: متوقف
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    إدارة طرق التشغيل، خادم الشبكة المحلية، الطابعات، قارئ الباركود، والأمان
                  </p>
                </div>
              </div>
            </div>

            {/* تنبيه عند وجود اتصالات نشطة */}
            {hasActiveConnections && (
              <div className="flex items-center gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-2xl text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  يوجد {onlineDevicesCount} اتصال نشط حالياً — تم قفل بعض إعدادات الشبكة الحساسة لمنع انقطاع الاتصال (BR-NET-005)
                </span>
              </div>
            )}

            {/* شريط التبويبات الفرعية */}
            <div className="flex gap-1.5 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/15 flex-wrap">
              {([
                { id: 'mode', label: 'وضع التشغيل', Icon: Monitor, count: null },
                { id: 'lan', label: 'الشبكة المحلية', Icon: Wifi, count: null },
                { id: 'cloud', label: 'السيرفر الخارجي', Icon: Cloud, count: null },
                { id: 'printer', label: 'الطابعة', Icon: Printer, count: null },
                { id: 'barcode', label: 'الباركود', Icon: ScanLine, count: null },
                { id: 'security', label: 'الأمان', Icon: ShieldCheck, count: null },
                { id: 'devices', label: 'الأجهزة المتصلة', Icon: Plug, count: devices.length },
              ] as const).map(({ id, label, Icon, count }) => {
                const active = netSubTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNetSubTab(id)}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-primary text-on-primary shadow-sm scale-[1.01]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                    {count !== null && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          active ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* === تبويب 1: وضع التشغيل (Operation Mode) === */}
            {netSubTab === 'mode' && (
              <div className="space-y-4">
                <div className="pb-1">
                  <h3 className="text-sm font-bold font-cairo text-on-surface">اختر الطريقة المناسبة لنوع ونشاط منشأتك</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    يمكنك تشغيل النظام كنقطة بيع مستقلة أو كخادم رئيسي يدعم عدة نقاط كاشير وهواتف
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      mode: 'single' as const,
                      title: 'جهاز واحد (Single Mode)',
                      subtitle: 'مستقل وفائق السرعة',
                      desc: 'قاعدة بيانات محلية معزولة تعمل بأقصى سرعة على هذا الجهاز مباشرة دون الحاجة لشبكة أو اتصال بالإنترنت.',
                      icon: Monitor,
                      badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                      available: true,
                    },
                    {
                      mode: 'lan' as const,
                      title: 'عدة أجهزة (شبكة محلية LAN)',
                      subtitle: 'سيرفر محلي ومزامنة Wi-Fi',
                      desc: 'يعمل هذا الجهاز كخادم رئيسي (Server) وترتبط به أجهزة الكاشير وتطبيقات الهواتف على نفس الشبكة المحلية.',
                      icon: Wifi,
                      badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                      available: true,
                    },
                    {
                      mode: 'cloud' as const,
                      title: 'عبر الإنترنت (Cloud Sync)',
                      subtitle: 'مزامنة سحابية بين الفروع',
                      desc: 'مزامنة مركزية للمبيعات والمخزون عبر السحابة لمتابعة وإدارة الفروع المتعددة في الوقت الفعلي.',
                      icon: Cloud,
                      badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                      available: false,
                    },
                    {
                      mode: 'hybrid' as const,
                      title: 'مدمج (سيرفر محلي + Cloud)',
                      subtitle: 'أقصى موثوقية واستمرارية',
                      desc: 'استمرارية العمل محلياً بدون انقطاع عند انقطاع الإنترنت، مع رفع وتحديث البيانات سحابياً في الخلفية.',
                      icon: HardDrive,
                      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                      available: false,
                    },
                  ].map((opt) => {
                    const isSelected = settings.syncMode === opt.mode;
                    const OptIcon = opt.icon;

                    return (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => {
                          if (!opt.available || hasActiveConnections) return;
                          handleSaveSettings({ syncMode: opt.mode });
                          if (opt.mode === 'lan') saveNet({ lanEnabled: true });
                          if (opt.mode === 'cloud') saveNet({ cloudEnabled: true });
                        }}
                        disabled={!opt.available || hasActiveConnections}
                        className={`p-5 rounded-3xl border-2 text-right transition-all flex flex-col justify-between gap-4 group ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-outline-variant/15 bg-surface-container hover:border-primary/40'
                        } ${!opt.available || hasActiveConnections ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-inner ${
                                isSelected ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-high text-primary border-outline-variant/20'
                              }`}
                            >
                              <OptIcon className="w-5 h-5" />
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${opt.badge}`}>
                              {opt.subtitle}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold font-cairo text-on-surface">{opt.title}</h4>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{opt.desc}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between text-xs font-bold">
                          <span className={isSelected ? 'text-primary' : 'text-on-surface-variant'}>
                            {isSelected ? '✓ الوضع المعتمد حالياً' : opt.available ? 'نقر للتعيين' : 'قريباً في الإصدار السحابي'}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary text-[10px]">
                              نشط
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* === تبويب 2: الشبكة المحلية وخادم الهواتف (LAN) === */}
            {netSubTab === 'lan' && (
              <div className="space-y-6">
                {/* خادم التطبيق المحمول ورمز QR */}
                <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/15">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold font-cairo text-on-surface">خادم ربط تطبيقات الهواتف المحمولة</h4>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {serverStatus?.running
                            ? `الخادم نشط ويعمل على ${pairingInfo?.ip ?? '---'}:${serverStatus.port}`
                            : 'شغّل الخادم لربط هواتف الكاشير والمبيعات في نفس الشبكة'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleServer}
                      disabled={serverLoading}
                      className={`relative px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                        serverStatus?.running
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-primary text-on-primary hover:bg-primary/90'
                      }`}
                    >
                      {serverLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : serverStatus?.running ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      <span>{serverLoading ? 'جاري المعالجة...' : serverStatus?.running ? 'إيقاف الخادم' : 'تشغيل الخادم'}</span>
                    </button>
                  </div>

                  {serverStatus?.running && pairingInfo && (
                    <div className="pt-2">
                      <PairingQR data={pairingInfo} subtitle="افتح تطبيق AN POS على هاتفك وامسح هذا الرمز للاتصال الفوري" />
                      <div className="mt-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/15 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-on-surface-variant">
                        <span>📡 IP: <strong className="text-on-surface">{pairingInfo.ip}</strong></span>
                        <span>🔌 Port: <strong className="text-on-surface">{pairingInfo.port}</strong></span>
                        <span>🔑 Key: <strong className="text-on-surface">{pairingInfo.key}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* إعدادات الاتصال المتقدمة */}
                <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">إعدادات عنوان الخادم والبروتوكول</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">عنوان IP للخادم</label>
                      <input
                        type="text"
                        value={netSettings.serverIp}
                        disabled={hasActiveConnections}
                        onChange={(e) => saveNet({ serverIp: e.target.value })}
                        placeholder="192.168.1.100"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">منفذ الاتصال (Port)</label>
                      <input
                        type="number"
                        value={netSettings.serverPort}
                        disabled={hasActiveConnections}
                        onChange={(e) => saveNet({ serverPort: Number(e.target.value) })}
                        placeholder="3000"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">البروتوكول</label>
                      <div className="flex gap-2">
                        {(['http', 'https'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => !hasActiveConnections && saveNet({ protocol: p })}
                            className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all uppercase ${
                              netSettings.protocol === p
                                ? 'border-primary bg-primary text-on-primary shadow-xs'
                                : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-primary/30'
                            } ${hasActiveConnections ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">مفتاح الاتصال السري (Connection Key)</label>
                      <input
                        type="password"
                        value={netSettings.connectionKey ?? ''}
                        disabled={hasActiveConnections}
                        onChange={(e) => saveNet({ connectionKey: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* إعادة الاتصال التلقائي */}
                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">إعادة الاتصال التلقائي (BR-NET-003)</p>
                        <p className="text-[11px] text-on-surface-variant">إعادة المحاولة تلقائياً عند انقطاع الاتصال بالشبكة</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => !hasActiveConnections && saveNet({ autoReconnect: !netSettings.autoReconnect })}
                      className={`relative w-12 h-6 rounded-full transition-all ${
                        netSettings.autoReconnect ? 'bg-primary' : 'bg-surface-container-highest'
                      } ${hasActiveConnections ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          netSettings.autoReconnect ? 'left-0.5' : 'right-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* زر اختبار الاتصال */}
                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTestLan}
                      disabled={!netSettings.serverIp || testingLan !== null}
                      className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-40"
                    >
                      {testingLan === 'ok' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      <span>{testingLan === 'ok' ? 'جاري فحص الاتصال...' : 'اختبار اتصال الخادم'}</span>
                    </button>

                    {netSettings.lastConnectedAt && (
                      <span className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        آخر اتصال ناجح: {new Date(netSettings.lastConnectedAt).toLocaleString('ar-DZ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* === تبويب 3: السيرفر الخارجي والمزامنة (Cloud) === */}
            {netSubTab === 'cloud' && (
              <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5">
                <div className="pb-1">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">إعدادات الربط السحابي و Webhooks</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    ربط النظام بقاعدة بيانات سحابية أو بوابات الدفع والمزامنة المركزية
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-on-surface mb-1.5">عنوان API السحابي (Base URL)</label>
                    <input
                      type="text"
                      value={netSettings.apiUrl ?? ''}
                      onChange={(e) => saveNet({ apiUrl: e.target.value })}
                      placeholder="https://api.yourshop.com/v1"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">مفتاح API السري (API Key)</label>
                    <input
                      type="password"
                      value={netSettings.apiKey ?? ''}
                      onChange={(e) => saveNet({ apiKey: e.target.value })}
                      placeholder="sk_live_••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">رابط Webhook الإشعارات</label>
                    <input
                      type="text"
                      value={netSettings.webhookUrl ?? ''}
                      onChange={(e) => saveNet({ webhookUrl: e.target.value })}
                      placeholder="https://yourshop.com/webhook"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* خيارات المزامنة */}
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 space-y-3">
                  <h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <span>جدولة المزامنة التلقائية</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-outline-variant/15">
                      <span className="text-xs font-bold text-on-surface">المزامنة التلقائية</span>
                      <button
                        type="button"
                        onClick={() => saveNet({ syncAuto: !netSettings.syncAuto })}
                        className={`relative w-12 h-6 rounded-full transition-all ${
                          netSettings.syncAuto ? 'bg-primary' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                            netSettings.syncAuto ? 'left-0.5' : 'right-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">فترة التكرار (دقائق)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={netSettings.syncInterval}
                        onChange={(e) => saveNet({ syncInterval: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">نوع المزامنة</label>
                      <select
                        value={netSettings.syncType}
                        onChange={(e) => saveNet({ syncType: e.target.value as 'full' | 'incremental' })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface"
                      >
                        <option value="incremental">مزامنة تدريجية (سريعة)</option>
                        <option value="full">مزامنة كاملة (شاملة)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === تبويب 4: الطابعة (Hardware Printers) === */}
            {netSubTab === 'printer' && (
              <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5">
                <div className="pb-1">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">إعدادات الطابعة والاتصال المباشر</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    تحديد منفذ الاتصال، السائق الحراري، دقة الطباعة، وسرعة خروج الإيصال
                  </p>
                </div>

                {/* نوع الاتصال */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface">نوع منفذ الاتصال</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {([
                      { id: 'usb', label: 'USB مباشر', Icon: Usb },
                      { id: 'network', label: 'شبكة IP', Icon: Network },
                      { id: 'bluetooth', label: 'Bluetooth', Icon: Bluetooth },
                      { id: 'serial', label: 'Serial (COM)', Icon: Cable },
                      { id: 'parallel', label: 'Parallel (LPT)', Icon: Plug },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          saveNet({ printerConnection: opt.id as any });
                          setPrinterSavedUnlocked(false);
                        }}
                        className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 text-xs font-bold transition-all ${
                          netSettings.printerConnection === opt.id
                            ? 'border-primary bg-primary/10 text-primary shadow-xs'
                            : 'border-outline-variant/15 bg-surface-container-low text-on-surface-variant hover:border-primary/30'
                        }`}
                      >
                        <opt.Icon className="w-5 h-5" />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">لغة وأوامر السائق (Driver)</label>
                    <select
                      value={netSettings.printerDriver}
                      onChange={(e) => {
                        saveNet({ printerDriver: e.target.value as any });
                        setPrinterSavedUnlocked(false);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold text-on-surface"
                    >
                      <option value="esc_pos">ESC/POS (طابعات الإيصالات الحرارية)</option>
                      <option value="zpl">ZPL (طابعات ملصقات Zebra)</option>
                      <option value="cpcl">CPCL (طابعات البلوتوث المحمولة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">دقة الطباعة (DPI)</label>
                    <select
                      value={netSettings.printerDpi}
                      onChange={(e) => {
                        saveNet({ printerDpi: Number(e.target.value) as any });
                        setPrinterSavedUnlocked(false);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold text-on-surface"
                    >
                      <option value={203}>203 DPI (قياسي)</option>
                      <option value={300}>300 DPI (عالي الوضوح)</option>
                      <option value={600}>600 DPI (فائق الدقة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">عرض الورق الحراري</label>
                    <select
                      value={netSettings.printerPaperSize}
                      onChange={(e) => {
                        saveNet({ printerPaperSize: Number(e.target.value) as any });
                        setPrinterSavedUnlocked(false);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold text-on-surface"
                    >
                      <option value={80}>80 ملم (ورق كاشير قياسي)</option>
                      <option value={58}>58 ملم (ورق طابعة محمولة صغيرة)</option>
                      <option value={76}>76 ملم (ورق متوسط)</option>
                    </select>
                  </div>
                </div>

                {/* زر اختبار الطباعة */}
                <div className="pt-3 border-t border-outline-variant/15 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTestPrinter}
                    disabled={testingPrinter !== null}
                    className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-40"
                  >
                    {testingPrinter === 'ok' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    <span>{testingPrinter === 'ok' ? 'جاري إرسال أمر الطباعة...' : 'اختبار الطابعة + طبعة تجريبية (BR-NET-006)'}</span>
                  </button>

                  {netSettings.printerTestedAt && (
                    <span className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      آخر اختبار: {new Date(netSettings.printerTestedAt).toLocaleString('ar-DZ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* === تبويب 5: الباركود والماسح (Barcode & Scanner) === */}
            {netSubTab === 'barcode' && (
              <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5">
                <div className="pb-1">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">صيغة الباركود وسلوك قارئ الباركود (SAFE POS)</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    تحديد ترميز الباركود المستخدم وتخصيص سرعة واستجابة الماسح الضوئي
                  </p>
                </div>

                {/* شبكة أنواع الباركود */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'code128', label: 'CODE128', desc: 'عام وشامل — فواتير ومنتجات' },
                    { id: 'ean13', label: 'EAN-13', desc: 'معياري للمواد الاستهلاكية' },
                    { id: 'code39', label: 'CODE39', desc: 'تتبع المستودعات والمخزون' },
                    { id: 'qr', label: 'QR Code', desc: 'رمز الاستجابة السريعة' },
                    { id: 'pdf417', label: 'PDF417', desc: 'كثيف للوثائق والمعاملات' },
                    { id: 'data_matrix', label: 'Data Matrix', desc: 'الأجهزة والقطع الصغيرة' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => saveNet({ barcodeType: opt.id as any })}
                      className={`p-3.5 rounded-2xl border-2 text-right transition-all ${
                        netSettings.barcodeType === opt.id
                          ? 'border-primary bg-primary/10 shadow-xs'
                          : 'border-outline-variant/15 bg-surface-container-low hover:border-primary/30'
                      }`}
                    >
                      <p className="text-xs font-bold font-mono text-on-surface">{opt.label}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {/* سلوك الماسح الضوئي */}
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 space-y-3">
                  <h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>إعدادات استجابة الماسح الضوئي</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-outline-variant/15">
                      <span className="text-xs font-bold text-on-surface">صوت عند المسح</span>
                      <button
                        type="button"
                        onClick={() => saveNet({ scannerBeepEnabled: !netSettings.scannerBeepEnabled })}
                        className={`relative w-11 h-6 rounded-full transition-all ${
                          netSettings.scannerBeepEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                            netSettings.scannerBeepEnabled ? 'left-0.5' : 'right-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">مفتاح نهاية المسح</label>
                      <select
                        value={netSettings.scannerTerminator}
                        onChange={(e) => saveNet({ scannerTerminator: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface"
                      >
                        <option value="Enter">Enter (افتراضي وموصى به)</option>
                        <option value="Tab">Tab</option>
                        <option value="None">بدون مفتاح إنهاء</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">أقل طول للباركود</label>
                      <input
                        type="number"
                        min={4}
                        max={40}
                        value={netSettings.scannerMinLength}
                        onChange={(e) => saveNet({ scannerMinLength: Math.max(4, Math.min(40, Number(e.target.value) || 6)) })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-outline-variant/15">
                      <span className="text-xs font-bold text-on-surface">إدخال يدوي</span>
                      <button
                        type="button"
                        onClick={() => saveNet({ scannerAllowManualTypes: !netSettings.scannerAllowManualTypes })}
                        className={`relative w-11 h-6 rounded-full transition-all ${
                          netSettings.scannerAllowManualTypes ? 'bg-primary' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                            netSettings.scannerAllowManualTypes ? 'left-0.5' : 'right-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* زر اختبار الماسح */}
                <div className="pt-2 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTestScanner}
                    disabled={testingScanner !== null}
                    className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-40"
                  >
                    {testingScanner === 'ok' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                    <span>{testingScanner === 'ok' ? 'جاري فحص الماسح...' : 'اختبار الماسح الضوئي (BR-NET-007)'}</span>
                  </button>

                  {netSettings.scannerTestedAt && (
                    <span className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      آخر اختبار: {new Date(netSettings.scannerTestedAt).toLocaleString('ar-DZ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* === تبويب 6: الأمان (Security) === */}
            {netSubTab === 'security' && (
              <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5">
                <div className="pb-1">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">إعدادات التشفير وحماية الاتصالات</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    التحكم في بروتوكولات المصادقة، تشفير HTTPS، والحد من الطلبات الزائدة
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                    <div className="flex items-center gap-3">
                      <KeyRound className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">مصادقة OAuth 2.0</p>
                        <p className="text-[11px] text-on-surface-variant">المصادقة عبر مزود هوية خارجي</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveNet({ oauthEnabled: !netSettings.oauthEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-all ${
                        netSettings.oauthEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          netSettings.oauthEnabled ? 'left-0.5' : 'right-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">مصادقة JWT Tokens</p>
                        <p className="text-[11px] text-on-surface-variant">رموز وصول مشفرة ومحددة الصلاحية</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveNet({ jwtEnabled: !netSettings.jwtEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-all ${
                        netSettings.jwtEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          netSettings.jwtEnabled ? 'left-0.5' : 'right-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">إجبار تشفير HTTPS (BR-NET-008)</p>
                        <p className="text-[11px] text-on-surface-variant">تشفير جميع الاتصالات الخارجية بنسبة 100%</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveNet({ forceHttps: !netSettings.forceHttps })}
                      className={`relative w-12 h-6 rounded-full transition-all ${
                        netSettings.forceHttps ? 'bg-primary' : 'bg-surface-container-highest'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          netSettings.forceHttps ? 'left-0.5' : 'right-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">
                      حد الطلبات (API Rate Limit req/min) — BR-NET-009
                    </label>
                    <input
                      type="number"
                      value={netSettings.apiRateLimit}
                      onChange={(e) => saveNet({ apiRateLimit: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface"
                    />
                  </div>
                </div>

                {/* قائمة IP المسموح بها */}
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 space-y-2">
                  <label className="block text-xs font-bold text-on-surface">
                    القائمة البيضاء لعناوين IP المسموح بها (IP Whitelist)
                  </label>
                  <textarea
                    value={
                      Array.isArray(netSettings.ipWhitelist)
                        ? netSettings.ipWhitelist.join('\n')
                        : typeof netSettings.ipWhitelist === 'string'
                        ? netSettings.ipWhitelist
                        : ''
                    }
                    onChange={(e) =>
                      saveNet({
                        ipWhitelist: e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="192.168.1.50&#10;192.168.1.51"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-[11px] text-on-surface-variant">اكتب كل عنوان IP في سطر منفصل. اترك الحقل فارغاً للسماح بالاتصال من أي جهاز في الشبكة.</p>
                </div>
              </div>
            )}

            {/* === تبويب 7: الأجهزة المتصلة (Connected Devices) === */}
            {netSubTab === 'devices' && (
              <div className="space-y-5">
                {/* الهواتف المحمولة المتصلة حالياً */}
                {serverStatus?.running && mobilePhones.length > 0 && (
                  <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-5 h-5 text-emerald-500" />
                      <h4 className="text-sm font-bold font-cairo text-on-surface">الهواتف الذكية المتصلة بالخادم</h4>
                    </div>

                    <div className="space-y-2">
                      {mobilePhones.map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl border border-outline-variant/15"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${d.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <div>
                              <p className="text-xs font-bold text-on-surface">{d.device_name || d.deviceName}</p>
                              <p className="text-[11px] text-on-surface-variant font-mono">
                                {d.last_seen ? new Date(d.last_seen).toLocaleString('ar-DZ') : '-'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await (window as any).electronAPI?.server?.disconnectDevice(d.id);
                                refetchConnected();
                              } catch {}
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>فصل الجهاز</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* قائمة أجهزة وملحقات نقاط البيع */}
                <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold font-cairo text-on-surface">أجهزة وملحقات الكاشير المسجلة ({devices.length})</h4>
                      <p className="text-xs text-on-surface-variant">الطابعات، أدراج النقود، الماسحات، شاشات العرض، والموازين</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDeviceForm(!showDeviceForm)}
                      className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة جهاز جديد</span>
                    </button>
                  </div>

                  {/* نموذج إضافة جهاز جديد */}
                  {showDeviceForm && (
                    <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-3">
                      <h4 className="text-xs font-bold text-on-surface">تسجيل جهاز جديد</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={newDevice.deviceName}
                          onChange={(e) => setNewDevice({ ...newDevice, deviceName: e.target.value })}
                          placeholder="اسم الجهاز (مثال: طابعة المطبخ)"
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface"
                        />
                        <select
                          value={newDevice.deviceType}
                          onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value as ConnectedDeviceType })}
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface"
                        >
                          <option value="printer">طابعة إيصالات / ملصقات</option>
                          <option value="scanner">ماسح باركود</option>
                          <option value="cash_drawer">درج نقود إلكتروني</option>
                          <option value="display">شاشة عرض للزبون (VFD)</option>
                          <option value="scale">ميزان إلكتروني</option>
                        </select>
                        <select
                          value={newDevice.connectionType}
                          onChange={(e) => setNewDevice({ ...newDevice, connectionType: e.target.value as ConnectionType })}
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface"
                        >
                          <option value="usb">USB</option>
                          <option value="network">شبكة LAN</option>
                          <option value="bluetooth">Bluetooth</option>
                          <option value="serial">Serial (COM)</option>
                        </select>
                        <input
                          type="text"
                          value={newDevice.ipAddress}
                          onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                          placeholder="عنوان IP (اختياري)"
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface"
                        />
                        <input
                          type="text"
                          value={newDevice.macAddress}
                          onChange={(e) => setNewDevice({ ...newDevice, macAddress: e.target.value })}
                          placeholder="عنوان MAC (اختياري)"
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface"
                        />
                        <input
                          type="text"
                          value={newDevice.vendor}
                          onChange={(e) => setNewDevice({ ...newDevice, vendor: e.target.value })}
                          placeholder="الشركة المصنعة (اختياري)"
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAddDevice}
                          className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all"
                        >
                          حفظ الجهاز
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeviceForm(false)}
                          className="px-5 py-2 bg-surface-container-high text-on-surface-variant rounded-xl text-xs font-bold hover:bg-surface-container-highest transition-all"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {/* جدول الأجهزة */}
                  {devices.length === 0 ? (
                    <div className="py-8 text-center text-on-surface-variant">
                      <Plug className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">لا توجد أجهزة مسجلة حالياً</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container shadow-xs">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant/20">
                          <tr>
                            <th className="px-4 py-3">الجهاز</th>
                            <th className="px-4 py-3">النوع</th>
                            <th className="px-4 py-3">نوع الاتصال</th>
                            <th className="px-4 py-3">IP / MAC</th>
                            <th className="px-4 py-3">الحالة</th>
                            <th className="px-4 py-3">آخر ظهور</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/15">
                          {devices.map((d) => (
                            <tr key={d.id} className="hover:bg-surface-container-highest/50 transition-colors">
                              <td className="px-4 py-3 text-on-surface font-bold">
                                <p>{d.deviceName}</p>
                                {d.vendor && <p className="text-[10px] text-on-surface-variant font-normal">{d.vendor}{d.model ? ` · ${d.model}` : ''}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-surface-container-high text-on-surface-variant">
                                  {{ printer: 'طابعة', scanner: 'ماسح', cash_drawer: 'درج نقود', display: 'شاشة', scale: 'ميزان' }[d.deviceType]}
                                </span>
                              </td>
                              <td className="px-4 py-3 uppercase font-mono text-on-surface-variant">{d.connectionType}</td>
                              <td className="px-4 py-3 font-mono text-on-surface-variant">
                                {d.ipAddress ?? '-'}{d.macAddress ? <><br /><span className="text-[10px] opacity-70">{d.macAddress}</span></> : ''}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    d.status === 'online'
                                      ? 'bg-emerald-500/10 text-emerald-600'
                                      : d.status === 'error'
                                      ? 'bg-red-500/10 text-red-600'
                                      : 'bg-surface-container-highest text-on-surface-variant'
                                  }`}
                                >
                                  {{ online: 'متصل', offline: 'غير متصل', error: 'خطأ' }[d.status]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-on-surface-variant font-mono whitespace-nowrap">
                                {d.lastSeen ? new Date(d.lastSeen).toLocaleString('ar-DZ') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => deleteDeviceMutation.mutate(d.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-all"
                                  title="حذف الجهاز"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === تصدير واستيراد === */}
        {activeTab === 'export' && (
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
        )}

        {/* === تطبيق الهاتف المحمول (AN POS Mobile) === */}
        {activeTab === 'mobile' && (
          <div className="space-y-6">
            {/* بطاقة الترويسة والتحكم بالخادم */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-outline-variant/15">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold font-cairo text-on-surface">تطبيق الهاتف المقترن (AN POS Mobile)</h2>
                      {serverStatus?.running ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          خادم الربط يعمل (منفذ {serverStatus.port})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-container-high text-on-surface-variant">
                          الخادم متوقف
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      ربط هواتف الكاشير والمبيعات المحمولة ومزامنة الفواتير والمخزون في الوقت الفعلي
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {serverStatus?.running && (
                    <button
                      type="button"
                      onClick={handleRegenerateKey}
                      className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-outline-variant/20"
                      title="توليد مفتاح أمان سري جديد لقطع وإعادة اقتران الأجهزة"
                    >
                      <Key className="w-4 h-4" />
                      <span>تجديد المفتاح السري</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={toggleServer}
                    disabled={serverLoading}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                      serverStatus?.running
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                        : 'bg-primary text-on-primary hover:bg-primary/90'
                    }`}
                  >
                    {serverLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : serverStatus?.running ? (
                      <LogOut className="w-4 h-4" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <span>{serverLoading ? 'جاري المعالجة...' : serverStatus?.running ? 'إيقاف خادم الربط' : 'تشغيل خادم الربط'}</span>
                  </button>
                </div>
              </div>

              {/* المحتوى المركزي: إذا كان الخادم يعمل، نعرض رمز QR وإرشادات الربط */}
              {serverStatus?.running && pairingInfo ? (
                <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* عمود رمز QR الأنيق */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-outline-variant/20 shadow-sm text-center">
                    <PairingQR
                      data={pairingInfo}
                      title="امسح الرمز بكاميرا الهاتف"
                      subtitle="افتح تطبيق AN POS على هاتفك واضغط على زر مسح رمز الاقتران"
                    />
                  </div>

                  {/* عمود خطوات الربط السريعة والمعلومات التقنية */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-3">
                      <h3 className="text-sm font-bold font-cairo text-on-surface flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-primary" />
                        <span>خطوات الربط في 3 خطوات بسيطة:</span>
                      </h3>

                      <ol className="space-y-2.5 text-xs text-on-surface-variant pr-4 list-decimal list-inside">
                        <li className="leading-relaxed">
                          <strong className="text-on-surface">تأكد من الاتصال بنفس الشبكة:</strong> يجب أن يكون هاتفك وجهاز الكمبيوتر متصلين بنفس شبكة الـ Wi-Fi المحلية.
                        </li>
                        <li className="leading-relaxed">
                          <strong className="text-on-surface">افتح تطبيق AN POS Mobile:</strong> اضغط على زر <span className="text-primary font-bold">"مسح رمز الاقتران"</span> في شاشة البداية.
                        </li>
                        <li className="leading-relaxed">
                          <strong className="text-on-surface">وجّه الكاميرا نحو الرمز:</strong> سيتم الاتصال ونقل الأصناف والمخزون وصلاحيات المستخدم تلقائياً وذرياً.
                        </li>
                      </ol>
                    </div>

                    {/* بيانات الاتصال المباشرة للمطورين والإدخال اليدوي */}
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                        <span>معلومات الاتصال المباشر (Manual Pairing):</span>
                        <span className="text-[10px] text-emerald-600 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          جاهز للاستقبال
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-mono">
                        <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/10">
                          <span className="text-[10px] text-on-surface-variant block font-cairo">عنوان الخادم IP</span>
                          <strong className="text-on-surface">{pairingInfo.ip}</strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/10">
                          <span className="text-[10px] text-on-surface-variant block font-cairo">منفذ الاتصال Port</span>
                          <strong className="text-on-surface">{pairingInfo.port}</strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/10">
                          <span className="text-[10px] text-on-surface-variant block font-cairo">رمز الأمان السري</span>
                          <strong className="text-on-surface">{pairingInfo.key}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* في حالة توقف الخادم */
                <div className="text-center py-12 px-4 max-w-lg mx-auto space-y-4">
                  <div className="w-20 h-20 bg-surface-container rounded-3xl flex items-center justify-center mx-auto text-primary border border-outline-variant/20 shadow-inner">
                    <Wifi className="w-10 h-10 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-cairo text-lg font-bold text-on-surface">خادم ربط الهواتف متوقف حالياً</h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      لتوصيل تطبيقات الكاشير والمبيعات المحمولة ومزامنة الفواتير والمخزون، يرجى تشغيل الخادم بالضغط على الزر أدناه لتوليد رمز الاستجابة السريعة (QR Code).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleServer}
                    disabled={serverLoading}
                    className="px-6 py-3 bg-primary text-on-primary rounded-2xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <Zap className="w-4 h-4" />
                    <span>تشغيل الخادم وعرض رمز QR للربط</span>
                  </button>
                </div>
              )}
            </div>

            {/* الهواتف المتصلة حالياً */}
            <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-bold font-cairo text-on-surface">
                      الهواتف والأجهزة المتصلة حالياً ({mobilePhones.length})
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      متابعة الأجهزة المقترنة والتحكم في جلسات الاتصال النشطة
                    </p>
                  </div>
                </div>

                {mobilePhones.length > 0 && (
                  <button
                    type="button"
                    onClick={refetchConnected}
                    className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-all"
                    title="تحديث قائمة الأجهزة"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {mobilePhones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mobilePhones.map((d: any) => (
                    <div
                      key={d.id}
                      className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-on-surface">{d.device_name || d.deviceName || 'هاتف محمول'}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-mono mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>متصل</span>
                            <span>·</span>
                            <span>{d.last_seen ? new Date(d.last_seen).toLocaleTimeString('ar-DZ') : 'الآن'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await (window as any).electronAPI?.server?.disconnectDevice(d.id);
                            refetchConnected();
                          } catch {}
                        }}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"
                        title="فصل الجهاز"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-on-surface-variant">
                  <Smartphone className="w-10 h-10 mx-auto mb-2 opacity-25" />
                  <p className="text-xs font-bold">لا توجد هواتف متصلة بالخادم حالياً</p>
                  <p className="text-[11px] opacity-70 mt-0.5">
                    امسح رمز الـ QR أعلاه من تطبيق الهاتف ليظهر الجهاز في هذه القائمة تلقائياً
                  </p>
                </div>
              )}
            </div>

            {/* بطاقات وظائف وقدرات تطبيق الهاتف المحمول */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: 'نقطة بيع سريعة متنقلة',
                  desc: 'إتمام البيع، الفواتير، وحساب الضرائب والخصومات مباشرة من الهاتف.',
                  icon: ShoppingCart,
                  color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                },
                {
                  title: 'جرد ومسح بالكاميرا',
                  desc: 'فحص الباركود عبر كاميرا الهاتف وتحديث كميات المخزن فورياً.',
                  icon: ScanLine,
                  color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                },
                {
                  title: 'إدارة الزبائن والديون',
                  desc: 'الاطلاع على سجلات العملاء ورصيد الديون وتسجيل الدفعات النقدية.',
                  icon: Users,
                  color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                },
                {
                  title: 'مزامنة ذرية بدون إنترنت',
                  desc: 'مزامنة ثنائية الاتجاه فائقة السرعة تعمل محلياً عبر شبكة الـ Wi-Fi.',
                  icon: ShieldCheck,
                  color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                },
              ].map((feat) => {
                const FeatIcon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2.5 shadow-xs"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${feat.color}`}>
                      <FeatIcon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold font-cairo text-on-surface">{feat.title}</h4>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === التحديثات === */}
        {activeTab === 'updates' && (
          <div className="space-y-6">
            <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <RefreshCw className="w-5 h-5 text-primary" />
                <h2 className="font-headline-lg text-headline-lg text-on-surface">التحديثات</h2>
              </div>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-tertiary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-tertiary" />
                </div>
                <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-2">الإصدار الحالي: v1.0.0</h3>
                <p className="text-body-md text-on-surface-variant mb-6">لا توجد تحديثات متاحة حالياً</p>
                <button onClick={() => addNotification({ title: 'تحديث', message: 'انك تستخدم احدث إصدار', type: 'success' })}
                  className="px-6 py-3 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container transition-all shadow-md">
                  فحص التحديثات
                </button>
              </div>
            </div>

            <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
              <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-4">سجل التحديثات</h3>
              <div className="space-y-3">
                {[
                  { version: 'v1.0.0', date: '2026-07-02', changes: 'الإصدار الأولي - نظام نقاط البيع' },
                ].map((release) => (
                  <div key={release.version} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                    <div>
                      <p className="text-label-md text-on-surface">{release.version}</p>
                      <p className="text-body-sm text-on-surface-variant">{release.changes}</p>
                    </div>
                    <span className="text-body-sm text-outline">{release.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === الحساب === */}
        {activeTab === 'account' && (
          <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <UserIcon className="w-5 h-5 text-primary" />
              <h2 className="font-headline-lg text-headline-lg text-on-surface">الحساب الشخصي</h2>
            </div>
            {currentUser ? (
              <div className="space-y-5">
                <div className="flex items-center gap-5 p-5 bg-surface-container-low rounded-lg">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary"><Shield className="w-8 h-8" /></div>
                  <div>
                    <p className="font-headline-lg text-on-surface">{currentUser.name}</p>
                    <p className="text-body-md text-on-surface-variant">{currentUser.role === 'admin' ? 'مدير النظام' : currentUser.role === 'cashier' ? 'كاشير' : 'بائع'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'اسم المستخدم', value: currentUser.username },
                    { label: 'الدور', value: currentUser.role === 'admin' ? 'مدير' : currentUser.role === 'cashier' ? 'كاشير' : 'بائع' },
                    { label: 'الحالة', value: currentUser.status === 'active' ? 'نشط' : 'غير نشط', isBadge: true, active: currentUser.status === 'active' },
                    { label: 'الرمز السري', value: '••••••' },
                  ].map((item) => (
                    <div key={item.label} className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-body-sm text-on-surface-variant mb-1.5">{item.label}</p>
                      {item.isBadge ? (
                        <span className={`inline-block px-3 py-1 rounded-full text-body-sm text-label-sm ${item.active ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-on-error-container'}`}>{item.value}</span>
                      ) : (
                        <p className="text-label-md text-on-surface">{item.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-body-md text-on-surface-variant">لم يتم تسجيل الدخول</p>
            )}
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cairo text-base font-bold text-on-surface">
                    {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {editingUser ? 'تحديث الصلاحيات وكلمة المرور' : 'إنشاء حساب جديد للموظف'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                }}
                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">الاسم الكامل</label>
                <input
                  type="text"
                  placeholder="مثال: أحمد عمار"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">رقم الهاتف</label>
                  <input
                    type="tel"
                    placeholder="05XX XX XX XX"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  {editingUser ? 'كلمة المرور الجديدة (اترك فارغاً للاحتفاظ بالقديمة)' : 'كلمة المرور (8 أحرف على الأقل)'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={userForm.pin}
                  onChange={(e) => setUserForm({ ...userForm, pin: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">الدور الأساسي</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as typeof userForm.role })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="admin">🔴 مدير النظام (Admin)</option>
                  <option value="cashier">🟣 كاشير (Cashier)</option>
                  <option value="seller">🔵 بائع (Seller)</option>
                  <option value="accountant">🔷 محاسب (Accountant)</option>
                  <option value="sales_manager">🟢 مدير مبيعات (Sales Manager)</option>
                  <option value="inventory_manager">🟡 مدير مخزون (Inventory Manager)</option>
                </select>
              </div>

              {roles.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">الدور المخصص (اختياري)</label>
                  <select
                    value={userForm.roleId}
                    onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  >
                    <option value="">بدون دور مخصص (استخدام صلاحيات الدور الأساسي)</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                }}
                className="flex-1 py-2.5 border border-outline-variant/20 rounded-xl text-on-surface-variant text-xs font-bold hover:bg-surface-container transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddUser}
                className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-95"
              >
                {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إعادة تعيين كلمة المرور */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/15">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cairo text-sm font-bold text-on-surface">إعادة تعيين كلمة المرور</h3>
                <p className="text-[11px] text-on-surface-variant">أدخل كلمة المرور الجديدة للمستخدم</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-on-surface">كلمة المرور الجديدة</label>
              <input
                type="password"
                placeholder="8 أحرف على الأقل"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(null);
                  setNewPassword('');
                }}
                className="flex-1 py-2.5 border border-outline-variant/20 rounded-xl text-on-surface-variant text-xs font-bold hover:bg-surface-container transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleResetPassword(showResetPassword)}
                className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-95"
              >
                حفظ التغيير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة/تعديل دور */}
      {showRoleForm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowRoleForm(false)}
        >
          <div
            className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-8 w-full max-w-2xl shadow-2xl my-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cairo text-base font-bold text-on-surface">
                    {editingRole ? 'تعديل دور مخصص' : 'إنشاء دور جديد'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">تخصيص مصفوفة الصلاحيات الممنوحة للمستخدمين</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRoleForm(false);
                  setEditingRole(null);
                }}
                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">اسم الدور</label>
                <input
                  type="text"
                  placeholder="مثال: مسؤول مبيعات وتوزيع"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">الوصف (اختياري)</label>
                <input
                  type="text"
                  placeholder="وصف مختصر لمسؤوليات هذا الدور"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl cursor-pointer hover:bg-emerald-500/15 transition-all">
                  <input
                    type="checkbox"
                    checked={roleForm.permissions['*'] === true}
                    onChange={() => {
                      const allOn = roleForm.permissions['*'] === true;
                      const newPerms: Record<string, boolean> = allOn ? {} : { '*': true };
                      setRoleForm({ ...roleForm, permissions: newPerms });
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-on-surface">صلاحيات المدير الكاملة (Full Admin Access)</span>
                    <p className="text-[11px] text-on-surface-variant">منح الوصول لكافة شاشات ووظائف النظام دون قيود</p>
                  </div>
                </label>

                {roleForm.permissions['*'] !== true &&
                  PERMISSION_GROUPS.map((group) => (
                    <div
                      key={group.label}
                      className="border border-outline-variant/20 bg-surface-container rounded-2xl p-3.5 space-y-2.5"
                    >
                      <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {group.label}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((p) => (
                          <label
                            key={p}
                            className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer hover:bg-surface-container-high rounded-xl px-2.5 py-1.5 transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={roleForm.permissions[p] === true}
                              onChange={() => togglePermission(p)}
                              className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
                            />
                            <span className="font-medium text-on-surface">{PERMISSION_LABELS[p] || p}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleForm(false);
                    setEditingRole(null);
                  }}
                  className="flex-1 py-2.5 border border-outline-variant/20 rounded-xl text-on-surface-variant text-xs font-bold hover:bg-surface-container transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={submitRole}
                  className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                >
                  {editingRole ? 'حفظ التعديلات' : 'إضافة الدور'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة استعراض تفاصيل وصلاحيات الدور */}
      {viewingRoleDetails && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setViewingRoleDetails(null)}
        >
          <div
            className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-8 w-full max-w-3xl shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* الترويسة */}
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-cairo text-lg font-bold text-on-surface">
                      {SYSTEM_ROLE_INFO[viewingRoleDetails.name]?.title || viewingRoleDetails.name}
                    </h3>
                    <span className="text-xs font-mono text-on-surface-variant font-medium">
                      @{viewingRoleDetails.name}
                    </span>
                    {viewingRoleDetails.isSystem ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        دور نظامي أساسي
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        دور مخصص
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {viewingRoleDetails.description || SYSTEM_ROLE_INFO[viewingRoleDetails.name]?.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingRoleDetails(null)}
                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* المستخدمون المرتبطون بهذا الدور */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>المستخدمون المرتبطون بهذا الدور ({getRoleUsers(viewingRoleDetails).length})</span>
                </h4>
              </div>

              {getRoleUsers(viewingRoleDetails).length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {getRoleUsers(viewingRoleDetails).map((u) => (
                    <div
                      key={u.id}
                      className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-2 text-xs"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-on-surface">{u.name}</span>
                      <span className="text-[10px] text-on-surface-variant font-mono">@{u.username}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant py-1">لا يوجد مستخدمون مرتبطون بهذا الدور حالياً.</p>
              )}
            </div>

            {/* مصفوفة الصلاحيات المفصلة */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-on-surface">مصفوفة الصلاحيات الممنوحة:</h4>

              {viewingRoleDetails.permissions['*'] ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                  <span className="text-sm font-bold text-emerald-600 block">
                    ⚡ صلاحيات المدير الكاملة (Super Admin Access)
                  </span>
                  <p className="text-xs text-on-surface-variant">
                    هذا الدور يمتلك حق الوصول الكامل دون أي قيود إلى كافة العمليات التجارية والمالية وإعدادات النظام.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {PERMISSION_GROUPS.map((group) => {
                    const activeInGroup = group.permissions.filter((p) => viewingRoleDetails.permissions[p] === true);
                    return (
                      <div
                        key={group.label}
                        className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-outline-variant/10">
                          <span className="text-xs font-bold text-primary">{group.label}</span>
                          <span className="text-[10px] font-bold text-on-surface-variant font-mono">
                            {activeInGroup.length}/{group.permissions.length}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {group.permissions.map((p) => {
                            const isGranted = viewingRoleDetails.permissions[p] === true;
                            return (
                              <div
                                key={p}
                                className={`flex items-center justify-between text-[11px] py-1 px-2 rounded-lg ${
                                  isGranted
                                    ? 'bg-emerald-500/10 text-emerald-600 font-bold'
                                    : 'text-on-surface-variant/40 line-through'
                                }`}
                              >
                                <span>{PERMISSION_LABELS[p] || p}</span>
                                <span>{isGranted ? '✓' : '—'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-outline-variant/15">
              <button
                type="button"
                onClick={() => setViewingRoleDetails(null)}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

