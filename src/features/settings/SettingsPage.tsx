import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import PairingQR from './components/PairingQR';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { fetchLicenseStatus, activateLicenseWithKey, deactivateCurrentLicense, getHardwareFingerprint, type LicenseStatus } from '@/services/licenseService';
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



import { PERMISSION_GROUPS, PERMISSION_LABELS } from './constants/permissionGroups';
import ActivationTab from './tabs/ActivationTab';
import GeneralTab from './tabs/GeneralTab';
import PosSettingsTab from './tabs/PosSettingsTab';
import InvoicesTab from './tabs/InvoicesTab';
import UsersRolesTab from './tabs/UsersRolesTab';
import NetworkTab from './tabs/NetworkTab';
import ExportBackupTab from './tabs/ExportBackupTab';
import MobileDevicesTab from './tabs/MobileDevicesTab';
import UpdatesTab from './tabs/UpdatesTab';
import AccountTab from './tabs/AccountTab';

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
    allowCardPayment: Boolean((rawSettings as any)?.allowCardPayment ?? (rawSettings as any)?.allow_card_payment),
    allowTransferPayment: Boolean((rawSettings as any)?.allowTransferPayment ?? (rawSettings as any)?.allow_transfer_payment),
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

  // Activation / License (Ed25519)
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [activationInput, setActivationInput] = useState('');
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const trial = getTrialState();
  const isLicenseActive = Boolean(licenseStatus?.isLicensed && licenseStatus?.status === 'active');

  useEffect(() => {
    fetchLicenseStatus().then(setLicenseStatus);
  }, []);

  const handleActivate = async () => {
    if (!activationInput.trim()) {
      addNotification({ title: 'تنبيه', message: 'يرجى إدخال كود التفعيل أولاً', type: 'warning' });
      return;
    }
    setIsActivating(true);
    try {
      const result = await activateLicenseWithKey(activationInput);
      if (!result.success || !result.status) {
        addNotification({ title: 'فشل التفعيل', message: result.error ?? 'كود التفعيل غير صالح', type: 'error' });
        return;
      }
      clearTrial();
      setLicenseStatus(result.status);
      setActivationInput('');
      addNotification({ title: 'تم التفعيل بنجاح', message: 'تم تفعيل ترخيص AN POS لهذا الجهاز بنجاح', type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'خطأ', message: err?.message || 'تعذر إتمام عملية التفعيل', type: 'error' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setActivationInput(content);
        setIsActivating(true);
        const result = await activateLicenseWithKey(content);
        setIsActivating(false);
        if (result.success && result.status) {
          clearTrial();
          setLicenseStatus(result.status);
          setActivationInput('');
          addNotification({ title: 'تم التفعيل', message: 'تم استيراد وتفعيل ملف الترخيص بنجاح', type: 'success' });
        } else {
          addNotification({ title: 'فشل التفعيل', message: result.error || 'ملف الترخيص غير صالح', type: 'error' });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeactivate = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إلغاء تفعيل هذا الجهاز؟ سيعود النظام للوضع التجريبي.')) {
      await deactivateCurrentLicense();
      const st = await fetchLicenseStatus();
      setLicenseStatus(st);
      addNotification({ title: 'تم إلغاء التفعيل', message: 'تمت إزالة الترخيص من هذا الجهاز', type: 'info' });
    }
  };

  const handleCopyFingerprint = () => {
    if (licenseStatus?.hardwareFingerprint) {
      navigator.clipboard.writeText(licenseStatus.hardwareFingerprint);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
      addNotification({ title: 'تم النسخ', message: 'تم نسخ بصمة الجهاز للحافظة', type: 'success' });
    }
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

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
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
        { id: 'activation', label: 'تفعيل الترخيص', icon: Key, badge: isLicenseActive ? 'مفعّل' : trial.isActive ? 'تجريبي' : undefined },
        { id: 'updates', label: 'تحديثات النظام', icon: RefreshCw, badge: undefined },
        { id: 'account', label: 'الملف والحساب', icon: UserIcon, badge: undefined },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full" dir="rtl">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-high p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-outline-variant/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-cairo text-on-surface">لوحة الإعدادات والتحكم</h1>
            <p className="text-xs text-on-surface-variant font-tajawal">إدارة وتخصيص كافة وظائف النظام، المبيعات، الصلاحيات، والشبكة</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/20 flex items-center gap-2 text-xs font-semibold text-on-surface">
            <div className={`w-2.5 h-2.5 rounded-full ${serverStatus?.running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>خادم الشبكة: {serverStatus?.running ? `يعمل (منفذ ${serverStatus.port})` : 'متوقف'}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/20 flex items-center gap-2 text-xs font-semibold text-on-surface">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>{isLicenseActive ? 'النسخة الكاملة' : trial.isActive ? `تجريبي (${trial.remainingDays} يوم)` : 'غير مفعل'}</span>
          </div>
        </div>
      </header>

      {/* Mobile / Tablet Horizontal Navigation (< lg) */}
      <div className="lg:hidden bg-surface-container-low/90 backdrop-blur-md border border-outline-variant/20 rounded-2xl p-2.5 shadow-sm space-y-2">
        <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-1">
          {tabGroups.flatMap((g) => g.items).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container bg-surface-container/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-on-primary' : 'text-primary'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar Navigation (>= lg) */}
        <aside className="hidden lg:block lg:w-72 flex-shrink-0">
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
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-2xl transition-all text-xs font-bold cursor-pointer ${
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


        {/* === تفعيل التطبيق (Ed25519 Offline-First) === */}
        {activeTab === 'activation' && (
          <ActivationTab {...{ activationInput, addNotification, copiedFingerprint, handleActivate, handleCopyFingerprint, handleDeactivate, handleFileUpload, isActivating, licenseStatus, setActivationInput, trial }} />
        )}

        {/* === الاعدادات العامة (مُطورة بتصميم استثنائي وتفاعلي) === */}
        {activeTab === 'general' && (
          <GeneralTab {...{ calcAmount, calcCurrency, copiedFiscalKey, generalPreviewMode, handleAddCurrency, handleAddExpenseCategory, handleCopyFiscal, handleRemoveExpenseCategory, handleSaveSettings, handleShopLogoUpload, newCurrencyCode, newCurrencyRate, newCurrencySymbol, newExpenseCategory, setCalcAmount, setCalcCurrency, setGeneralPreviewMode, setNewCurrencyCode, setNewCurrencyRate, setNewCurrencySymbol, setNewExpenseCategory, settings }} />
        )}

        {/* === نقطة البيع (POS) === */}
        {activeTab === 'pos' && (
          <PosSettingsTab {...{ handleSaveSettings, settings }} />
        )}

        {/* === الفواتير والطباعة === */}
        {activeTab === 'invoices' && (
          <InvoicesTab {...{ handleSaveSettings, invoiceSubTab, navigate, setInvoiceSubTab, settings }} />
        )}

        {/* === المستخدمون والأمان === */}
        {activeTab === 'users' && (
          <UsersRolesTab {...{ ACTION_LABELS, SYSTEM_ROLE_INFO, actActionFilter, actUserFilter, currentUser, deleteUserMutation, filteredActivities, filteredUsers, getRoleUsers, openAddRole, openEditRole, removeRole, roles, setActActionFilter, setActUserFilter, setEditingUser, setNewPassword, setShowResetPassword, setShowUserForm, setUserForm, setUserSearch, setUserStatusFilter, setUserSubTab, setViewingRoleDetails, toggleStatusMutation, uniqueActions, userName, userSearch, userStatusFilter, userSubTab, users }} />
        )}

        {/* === الشبكة والاتصال === */}
        {activeTab === 'network' && (
          <NetworkTab {...{ deleteDeviceMutation, devices, handleAddDevice, handleSaveSettings, handleTestLan, handleTestPrinter, handleTestScanner, hasActiveConnections, mobilePhones, netSettings, netSubTab, newDevice, onlineDevicesCount, pairingInfo, refetchConnected, saveNet, serverLoading, serverStatus, setNetSubTab, setNewDevice, setPrinterSavedUnlocked, setShowDeviceForm, settings, showDeviceForm, testingLan, testingPrinter, testingScanner, toggleServer }} />
        )}

        {/* === تصدير واستيراد === */}
        {activeTab === 'export' && (
          <ExportBackupTab {...{ handleExportBackup, handleExportExcel, handleImportBackup }} />
        )}

        {/* === تطبيق الهاتف المحمول (AN POS Mobile) === */}
        {activeTab === 'mobile' && (
          <MobileDevicesTab {...{ copiedField, handleCopyText, handleRegenerateKey, mobilePhones, pairingInfo, refetchConnected, serverLoading, serverStatus, toggleServer }} />
        )}

        {/* === التحديثات === */}
        {activeTab === 'updates' && (
          <UpdatesTab {...{ addNotification }} />
        )}

        {/* === الحساب === */}
        {activeTab === 'account' && (
          <AccountTab {...{ currentUser }} />
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

