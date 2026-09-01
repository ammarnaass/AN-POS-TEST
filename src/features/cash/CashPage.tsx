import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, type CashSessionEntity, type CapitalEntryEntity } from '@/infrastructure/database/dexie/db';
import { formatDate, formatDateTime, generateId } from '@/utils';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { canControlCash } from '@/utils/permissions';
import { calculateDepositsTotal } from './sessionBalance';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Lock, Unlock, DollarSign, TrendingUp,
  TrendingDown, Clock, X, Coins, Receipt, Printer, Calculator, History, Sparkles,
  CheckCircle2, AlertTriangle, Plus, ArrowLeftRight, Building2, ShieldCheck,
  User, RefreshCw, FileText, Check, Copy, SlidersHorizontal, Layers, Search, Banknote
} from 'lucide-react';

const formatMoney = (val: number | null | undefined, decimals = 2) => {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('fr-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// فئات الدينار الجزائري الشائعة
const DZD_DENOMINATIONS = [
  { val: 2000, label: '2,000 دج', type: 'ورقة نقدية' },
  { val: 1000, label: '1,000 دج', type: 'ورقة نقدية' },
  { val: 500, label: '500 دج', type: 'ورقة نقدية' },
  { val: 200, label: '200 دج', type: 'قطعة / ورقة' },
  { val: 100, label: '100 دج', type: 'قطعة نقدية' },
  { val: 50, label: '50 دج', type: 'قطعة نقدية' },
  { val: 20, label: '20 دج', type: 'قطعة نقدية' },
  { val: 10, label: '10 دج', type: 'قطعة نقدية' },
];

export default function CashPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'current_shift' | 'capital' | 'history'>('current_shift');

  // Queries
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });
  const currentSession = sessions.find((s) => s.status === 'open') || null;

  const { data: capitalEntries = [] } = useQuery({
    queryKey: ['capitalEntries'],
    queryFn: () => db.capital_entries.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const currencySymbol = settings?.baseCurrency || 'دج';

  // State
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositNote, setDepositNote] = useState<string>('');
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(0);
  const [withdrawalNote, setWithdrawalNote] = useState<string>('');

  const [capitalAmount, setCapitalAmount] = useState<number>(0);
  const [capitalNote, setCapitalNote] = useState<string>('');
  const [capitalType, setCapitalType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [showCapitalForm, setShowCapitalForm] = useState<boolean>(false);
  const [capitalFilter, setCapitalFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  // Modal States
  const [showCloseShiftModal, setShowCloseShiftModal] = useState<boolean>(false);
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [closingNote, setClosingNote] = useState<string>('');
  const [selectedHistorySession, setSelectedHistorySession] = useState<CashSessionEntity | null>(null);

  // Denominations Counter State
  const [denominations, setDenominations] = useState<Record<number, number>>({
    2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0,
  });
  const [showDenomCalculator, setShowDenomCalculator] = useState<boolean>(false);

  // History search and filter
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Mutations
  const openSessionMutation = useMutation({
    mutationFn: async (data: { openedBy: string; openingBalance: number }) => {
      const sessionNumber = sessions.length + 1;
      await db.cash_sessions.add({
        id: generateId(),
        number: String(sessionNumber),
        sessionNumber,
        openedBy: data.openedBy,
        openedAt: new Date().toISOString(),
        openingBalance: data.openingBalance,
        status: 'open',
        totalSales: 0,
        totalReturns: 0,
        deposits: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      addNotification({ title: 'تم الفتح بنجاح', message: 'تم فتح مناوبة الصندوق بنجاح', type: 'success' });
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (data: { id: string; expectedBalance: number; actualBalance: number; difference: number; note?: string }) => {
      await db.cash_sessions.update(data.id, {
        status: 'closed',
        closedAt: new Date().toISOString(),
        closingBalance: data.actualBalance,
        expectedBalance: data.expectedBalance,
        actualBalance: data.actualBalance,
        difference: data.difference,
        note: data.note,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      addNotification({ title: 'تم الإغلاق', message: 'تم إغلاق مناوبة الصندوق وتوثيق الجرد بنجاح', type: 'success' });
    },
  });

  const depositMutation = useMutation({
    mutationFn: async (data: { sessionId: string; amount: number; note: string }) => {
      const session = await db.cash_sessions.get(data.sessionId);
      if (!session) return;
      const newDeposit = { amount: data.amount, note: data.note, createdAt: new Date().toISOString() };
      await db.cash_sessions.update(data.sessionId, {
        deposits: [...(session.deposits || []), newDeposit],
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      addNotification({ title: 'إيداع نقدي', message: 'تم إيداع المبلغ في الصندوق بنجاح', type: 'success' });
    },
  });

  const shiftWithdrawalMutation = useMutation({
    mutationFn: async (data: { sessionId: string; amount: number; note: string }) => {
      const session = await db.cash_sessions.get(data.sessionId);
      if (!session) return;
      // نسجل السحب كمبلغ سالب في سجل الجلسة
      const newWithdrawal = { amount: -Math.abs(data.amount), note: `سحب / مصروف: ${data.note}`, createdAt: new Date().toISOString() };
      await db.cash_sessions.update(data.sessionId, {
        deposits: [...(session.deposits || []), newWithdrawal],
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      addNotification({ title: 'سحب نقدي', message: 'تم سحب المبلغ وتحديث رصيد الصندوق بنجاح', type: 'warning' });
    },
  });

  const capitalEntryMutation = useMutation({
    mutationFn: async (data: { type: 'deposit' | 'withdrawal'; amount: number; note: string }) => {
      await db.capital_entries.add({
        id: generateId(),
        type: data.type,
        amount: data.amount,
        note: data.note,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capitalEntries'] });
      addNotification({ title: 'حركة رأس مال', message: 'تم تسجيل حركة رأس المال بنجاح', type: 'success' });
    },
  });

  // Calculations
  const currentDepositsTotal = calculateDepositsTotal(currentSession?.deposits);
  const currentNetSales = currentSession ? currentSession.totalSales - currentSession.totalReturns : 0;
  const expectedAmount = currentSession
    ? currentSession.openingBalance + currentSession.totalSales - currentSession.totalReturns + currentDepositsTotal
    : 0;
  const difference = currentSession ? actualAmount - expectedAmount : 0;

  const totalCapitalDeposits = capitalEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + e.amount, 0);
  const totalCapitalWithdrawals = capitalEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + e.amount, 0);
  const totalCapital = totalCapitalDeposits - totalCapitalWithdrawals;

  // Total counted from denominations
  const totalDenominationsCount = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [valStr, qty]) => {
      return sum + Number(valStr) * (Number(qty) || 0);
    }, 0);
  }, [denominations]);

  // Handlers
  const handleOpenSession = () => {
    if (!currentUser) return;
    openSessionMutation.mutate({
      openedBy: currentUser.name || currentUser.username || 'المسؤول',
      openingBalance: Number(openingBalance) || 0,
    });
    setOpeningBalance(0);
  };

  const handlePrepareCloseSession = () => {
    if (!currentSession) return;
    setActualAmount(expectedAmount);
    setClosingNote('');
    setShowCloseShiftModal(true);
  };

  const handleConfirmCloseSession = () => {
    if (!currentSession) return;
    closeSessionMutation.mutate({
      id: currentSession.id,
      expectedBalance: expectedAmount,
      actualBalance: actualAmount,
      difference,
      note: closingNote,
    });
    setShowCloseShiftModal(false);
  };

  const handleDeposit = () => {
    if (depositAmount <= 0 || !currentSession) return;
    depositMutation.mutate({ sessionId: currentSession.id, amount: depositAmount, note: depositNote || 'إيداع نقدي' });
    setDepositAmount(0);
    setDepositNote('');
  };

  const handleWithdrawal = () => {
    if (withdrawalAmount <= 0 || !currentSession) return;
    shiftWithdrawalMutation.mutate({ sessionId: currentSession.id, amount: withdrawalAmount, note: withdrawalNote || 'سحب نقدي / مصروف' });
    setWithdrawalAmount(0);
    setWithdrawalNote('');
  };

  const handleCapitalEntry = () => {
    if (capitalAmount <= 0) return;
    capitalEntryMutation.mutate({ type: capitalType, amount: capitalAmount, note: capitalNote || (capitalType === 'deposit' ? 'إيداع رأس مال' : 'سحب رأس مال') });
    setCapitalAmount(0);
    setCapitalNote('');
    setShowCapitalForm(false);
  };

  const handleApplyDenominationsToActual = () => {
    setActualAmount(totalDenominationsCount);
    addNotification({
      title: 'تم تطبيق العد',
      message: `تم تحديد المبلغ الفعلي إلى ${formatMoney(totalDenominationsCount)} ${currencySymbol}`,
      type: 'info',
    });
  };

  const handlePrintZReport = (session: CashSessionEntity) => {
    window.print();
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        !historySearch ||
        s.openedBy.toLowerCase().includes(historySearch.toLowerCase()) ||
        String(s.sessionNumber).includes(historySearch);
      const matchStatus =
        historyStatusFilter === 'all' ? true : s.status === historyStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [sessions, historySearch, historyStatusFilter]);

  // Filtered Capital Entries
  const filteredCapitalEntries = useMemo(() => {
    return capitalEntries.filter((e) => {
      if (capitalFilter === 'all') return true;
      return e.type === capitalFilter;
    });
  }, [capitalEntries, capitalFilter]);

  if (!canControlCash(currentUser?.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="font-cairo text-xl font-bold text-on-surface">صلاحية إدارة الصندوق مقيدة</h2>
        <p className="text-xs text-on-surface-variant font-tajawal leading-relaxed">
          حسابك الحالي برتبة «{currentUser?.role === 'seller' ? 'بائع' : currentUser?.role}» لا يملك صلاحية التحكم المباشر بالخزينة. تتطلب هذه العملية صلاحية «مدير» أو «كاشير مسؤول» لفتح المناوبات وإجراء السحوبات والإيداعات.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full p-2 sm:p-4" dir="rtl">
      {/* ──────── 1. HEADER & LIVE SHIFT COCKPIT ──────── */}
      <header className="bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-high p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-outline-variant/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-cairo text-on-surface">إدارة الصندوق ورأس المال</h1>
              {currentSession ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  مناوبة #{currentSession.sessionNumber} مفتوحة ({currentSession.openedBy})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-container-high text-on-surface-variant">
                  الخزينة مغلقة حالياً
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5 font-tajawal">
              متابعة تدفقات الدرج النقدي، مطابقة الأرصدة، جرد الفئات، وحركات رأس المال التشغيلي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentSession && (
            <button
              type="button"
              onClick={handlePrepareCloseSession}
              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Lock className="w-4 h-4" />
              <span>إغلاق وجرد المناوبة</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['cashSessions'] })}
            className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ──────── 2. TOP KPI CARDS ──────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Expected in Drawer */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 shadow-xs hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant font-cairo">الرصيد الحي بالدرج</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-on-surface">
              {formatMoney(currentSession ? expectedAmount : 0)}
            </span>
            <span className="text-xs font-bold text-on-surface-variant">{currencySymbol}</span>
          </div>
          <p className="text-[11px] text-on-surface-variant/80 font-tajawal">
            {currentSession ? 'الرصيد النقدي المتوقع تواجده في الدرج حالياً' : 'افتح مناوبة لتتبع النقدية الحية'}
          </p>
        </div>

        {/* Card 2: Shift Sales */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 shadow-xs hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant font-cairo">صافي مبيعات المناوبة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-emerald-600">
              +{formatMoney(currentNetSales)}
            </span>
            <span className="text-xs font-bold text-emerald-600/80">{currencySymbol}</span>
          </div>
          <p className="text-[11px] text-on-surface-variant/80 font-tajawal">
            إجمالي المبيعات ({formatMoney(currentSession?.totalSales || 0)}) - المرتجعات ({formatMoney(currentSession?.totalReturns || 0)})
          </p>
        </div>

        {/* Card 3: Active Capital */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 shadow-xs hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant font-cairo">رأس المال التشغيلي</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-cyan-600">
              {formatMoney(totalCapital)}
            </span>
            <span className="text-xs font-bold text-cyan-600/80">{currencySymbol}</span>
          </div>
          <p className="text-[11px] text-on-surface-variant/80 font-tajawal">
            إجمالي إيداعات رأس المال مطروحاً منها السحوبات
          </p>
        </div>

        {/* Card 4: Shift In/Out Adjustments */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 shadow-xs hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant font-cairo">تعديلات ومصروفات الدرج</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 font-mono">
            <span className={`text-2xl font-black ${currentDepositsTotal >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
              {currentDepositsTotal >= 0 ? `+${formatMoney(currentDepositsTotal)}` : formatMoney(currentDepositsTotal)}
            </span>
            <span className="text-xs font-bold text-on-surface-variant">{currencySymbol}</span>
          </div>
          <p className="text-[11px] text-on-surface-variant/80 font-tajawal">
            {currentSession?.deposits?.length || 0} حركة إيداع / سحب مسجلة في المناوبة
          </p>
        </div>
      </div>

      {/* ──────── 3. NAVIGATION TABS ──────── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/15 overflow-x-auto no-scrollbar">
        {[
          { id: 'current_shift', label: 'المناوبة الحالية والدرج', icon: Wallet, badge: currentSession ? 'نشطة' : undefined },
          { id: 'capital', label: 'رأس المال والسيولة', icon: Building2, badge: `${capitalEntries.length}` },
          { id: 'history', label: 'سجل المناوبات وتقارير Z', icon: History, badge: `${sessions.length}` },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
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

      {/* ──────── 4. TAB CONTENTS ──────── */}

      {/* ═══ TAB 1: المناوبة الحالية والدرج ═══ */}
      {activeTab === 'current_shift' && (
        <div className="space-y-6">
          {!currentSession ? (
            /* في حالة عدم وجود مناوبة مفتوحة */
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-10 shadow-sm text-center max-w-xl mx-auto space-y-5">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto border border-primary/20 shadow-inner">
                <Wallet className="w-10 h-10" />
              </div>

              <div>
                <h3 className="font-cairo text-xl font-bold text-on-surface">فتح مناوبة صندوق جديدة</h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed font-tajawal">
                  لبدء تسجيل المبيعات النقدية، حركات الدرج، وحساب النقدية بدقة، يرجى إدخال الرصيد الافتتاحي وتأكيد فتح المناوبة.
                </p>
              </div>

              {/* حقل الرصيد الافتتاحي مع أزرار سريعة */}
              <div className="space-y-3 pt-2 text-right">
                <label className="block text-xs font-bold text-on-surface font-cairo">الرصيد الافتتاحي بالصندوق (الفكة الأولية):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={openingBalance || ''}
                    onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full h-12 pr-11 pl-12 bg-surface-container border border-outline-variant/20 rounded-xl text-lg font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
                    autoFocus
                  />
                  <Coins className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/60" />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant font-mono">
                    {currencySymbol}
                  </span>
                </div>

                {/* أزرار مبالغ افتراضية سريعة */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: 'بدون رصيد (0)', val: 0 },
                    { label: '2,000 دج', val: 2000 },
                    { label: '5,000 دج', val: 5000 },
                    { label: '10,000 دج', val: 10000 },
                    { label: '20,000 دج', val: 20000 },
                    { label: '50,000 دج', val: 50000 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => setOpeningBalance(btn.val)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        openingBalance === btn.val
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 text-on-surface-variant'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenSession}
                disabled={openSessionMutation.isPending}
                className="w-full py-3.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                <span>{openSessionMutation.isPending ? 'جاري الفتح...' : 'تأكيد فتح مناوبة الصندوق'}</span>
              </button>
            </div>
          ) : (
            /* في حالة وجود مناوبة نشطة */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
              {/* العمود الأيمن: معادلة التدفق النقدي والإحصائيات */}
              <div className="lg:col-span-7 space-y-5">
                {/* بطاقة تفكيك السيولة النقدية */}
                <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold font-cairo text-on-surface">تفاصيل التدفق النقدي للمناوبة #{currentSession.sessionNumber}</h3>
                        <p className="text-[11px] text-on-surface-variant">
                          بدأت بواسطة <strong>{currentSession.openedBy}</strong> في {formatDateTime(currentSession.openedAt)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDenomCalculator(!showDenomCalculator)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        showDenomCalculator
                          ? 'bg-primary text-on-primary border-primary shadow-xs'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/20'
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{showDenomCalculator ? 'إخفاء حاسبة الفئات' : 'حاسبة فئات النقود'}</span>
                    </button>
                  </div>

                  {/* الشبكة التفاعلية للمعادلة */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                    <div className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-1">
                      <span className="text-[10px] text-on-surface-variant block font-cairo">الرصيد الافتتاحي</span>
                      <strong className="text-sm text-on-surface block font-mono">{formatMoney(currentSession.openingBalance)} {currencySymbol}</strong>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-1">
                      <span className="text-[10px] text-emerald-600 block font-cairo">مبيعات نقدية (+)</span>
                      <strong className="text-sm text-emerald-600 block font-mono">+{formatMoney(currentSession.totalSales)} {currencySymbol}</strong>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/15 space-y-1">
                      <span className="text-[10px] text-rose-600 block font-cairo">مرتجعات (-)</span>
                      <strong className="text-sm text-rose-600 block font-mono">-{formatMoney(currentSession.totalReturns)} {currencySymbol}</strong>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-1">
                      <span className="text-[10px] text-amber-600 block font-cairo">تعديلات/إيداع (±)</span>
                      <strong className="text-sm text-amber-600 block font-mono">
                        {currentDepositsTotal >= 0 ? `+${formatMoney(currentDepositsTotal)}` : formatMoney(currentDepositsTotal)} {currencySymbol}
                      </strong>
                    </div>
                  </div>

                  {/* بطاقة المبلغ المتوقع بالصندوق (Hero Result) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/10 to-emerald-500/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                    <div>
                      <span className="text-xs font-bold text-on-surface font-cairo block">الرصيد النقدي المتوقع بالدرج:</span>
                      <span className="text-[11px] text-on-surface-variant font-tajawal">
                        المعادلة: الافتتاحي + المبيعات - المرتجعات + الإيداعات - السحوبات
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-primary">
                        {formatMoney(expectedAmount)}
                      </span>
                      <span className="text-xs font-bold text-primary">{currencySymbol}</span>
                    </div>
                  </div>
                </div>

                {/* حاسبة عد النقود وفئات الدينار الجزائري (Denominations Counter) */}
                {showDenomCalculator && (
                  <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-500" />
                        <div>
                          <h4 className="text-xs font-bold font-cairo text-on-surface">حاسبة عد فئات الدينار الجزائري (DZD Cash Counter)</h4>
                          <p className="text-[10px] text-on-surface-variant">أدخل عدد القطع أو الأوراق لكل فئة ليتم حساب المجموع آلياً</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDenominations({ 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 })}
                          className="px-2.5 py-1 text-[11px] text-on-surface-variant hover:text-red-500 transition-colors cursor-pointer"
                        >
                          تصفير الفئات
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {DZD_DENOMINATIONS.map((d) => {
                        const count = denominations[d.val] || 0;
                        const subtotal = d.val * count;
                        return (
                          <div key={d.val} className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/15 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <strong className="text-on-surface font-mono">{d.label}</strong>
                              <span className="text-[9px] text-on-surface-variant">{d.type}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={count || ''}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setDenominations(prev => ({ ...prev, [d.val]: val }));
                                }}
                                placeholder="0"
                                className="w-full h-8 px-2 bg-surface-container-high border border-outline-variant/20 rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </div>
                            <span className="text-[10px] text-on-surface-variant font-mono text-left block">
                              = {formatMoney(subtotal)} {currencySymbol}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-on-surface font-cairo block">إجمالي المبلغ المحسوب بالعد:</span>
                        <span className="text-[10px] text-on-surface-variant">مطابقة مع المتوقع: {formatMoney(totalDenominationsCount - expectedAmount)} {currencySymbol}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black font-mono text-amber-600">
                          {formatMoney(totalDenominationsCount)} {currencySymbol}
                        </span>
                        <button
                          type="button"
                          onClick={handleApplyDenominationsToActual}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-all cursor-pointer"
                        >
                          تطبيق للجرد
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* سجل حركات المناوبة الحالية */}
                <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
                    <h4 className="text-xs font-bold font-cairo text-on-surface flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>سجل الإيداعات والسحوبات أثناء هذه المناوبة ({currentSession.deposits?.length || 0})</span>
                    </h4>
                  </div>

                  {currentSession.deposits && currentSession.deposits.length > 0 ? (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {currentSession.deposits.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {item.amount >= 0 ? (
                              <ArrowDownCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <ArrowUpCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <div>
                              <p className="font-bold text-on-surface">{item.note || (item.amount >= 0 ? 'إيداع نقدي' : 'سحب نقدي')}</p>
                              <span className="text-[10px] text-on-surface-variant font-mono">{formatDateTime(item.createdAt)}</span>
                            </div>
                          </div>
                          <span className={`font-mono font-bold ${item.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {item.amount >= 0 ? `+${formatMoney(item.amount)}` : formatMoney(item.amount)} {currencySymbol}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-xs text-on-surface-variant font-tajawal">
                      لم يتم تسجيل أي سحوبات أو إيداعات يدوية أثناء هذه المناوبة حتى الآن.
                    </p>
                  )}
                </div>
              </div>

              {/* العمود الأيسر: إجراءات الصندوق السريعة */}
              <div className="lg:col-span-5 space-y-5">
                {/* بطاقة الإيداع النقدي السريع */}
                <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface font-cairo">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <ArrowDownCircle className="w-4 h-4" />
                    </div>
                    <span>إيداع نقدي بالدرج (Cash In)</span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="المبلغ (دج)"
                      value={depositAmount || ''}
                      onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-right"
                    />
                    <input
                      type="text"
                      placeholder="ملاحظة أو سبب الإيداع (مثلاً: تغذية صندوق)"
                      value={depositNote}
                      onChange={(e) => setDepositNote(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-right font-tajawal"
                    />
                    <button
                      type="button"
                      onClick={handleDeposit}
                      disabled={depositAmount <= 0 || depositMutation.isPending}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تأكيد الإيداع في الصندوق</span>
                    </button>
                  </div>
                </div>

                {/* بطاقة السحب النقدي / المصروفات */}
                <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface font-cairo">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <ArrowUpCircle className="w-4 h-4" />
                    </div>
                    <span>سحب نقدي / مصروفات من الدرج (Cash Out)</span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="المبلغ (دج)"
                      value={withdrawalAmount || ''}
                      onChange={(e) => setWithdrawalAmount(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-right"
                    />
                    <input
                      type="text"
                      placeholder="ملاحظة أو سبب السحب (مثلاً: شراء لوازم، توريد للمورد)"
                      value={withdrawalNote}
                      onChange={(e) => setWithdrawalNote(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-right font-tajawal"
                    />
                    <button
                      type="button"
                      onClick={handleWithdrawal}
                      disabled={withdrawalAmount <= 0 || shiftWithdrawalMutation.isPending}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span>تأكيد سحب المبلغ من الصندوق</span>
                    </button>
                  </div>
                </div>

                {/* بطاقة زر إغلاق الجلسة السريع */}
                <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface font-cairo">
                    <Lock className="w-4 h-4 text-primary" />
                    <span>إنهاء المناوبة وإجراء الجرد اليومي</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-tajawal leading-relaxed">
                    عند انتهاء فترة العمل، اضغط على الزر أدناه لمقارنة النقدية الفعلية مع المحسوبة وطباعة تقرير الإغلاق (Z-Report).
                  </p>
                  <button
                    type="button"
                    onClick={handlePrepareCloseSession}
                    className="w-full py-3 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>بدء جرد وإغلاق المناوبة</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: رأس المال والسيولة ═══ */}
      {activeTab === 'capital' && (
        <div className="space-y-6">
          {/* ترويسة بطاقة رأس المال مع الإحصائيات */}
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center border border-cyan-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-cairo text-on-surface">إدارة رأس المال التشغيلي والمستثمر</h3>
                  <p className="text-xs text-on-surface-variant font-tajawal">
                    تسجيل وضبط الأموال المستثمرة كأصول نقدية للمشروع والسحوبات التراكمية
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCapitalForm(!showCapitalForm)}
                className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showCapitalForm ? 'إلغاء الإدخال' : 'إضافة حركة رأس مال'}</span>
              </button>
            </div>

            {/* بطاقات الإحصاءات الثلاثية */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-1">
                <span className="text-[11px] text-emerald-600 font-bold font-cairo">إجمالي رأس المال المودع (+)</span>
                <p className="text-lg font-black font-mono text-emerald-600">+{formatMoney(totalCapitalDeposits)} {currencySymbol}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-1">
                <span className="text-[11px] text-rose-600 font-bold font-cairo">إجمالي السحوبات من رأس المال (-)</span>
                <p className="text-lg font-black font-mono text-rose-600">-{formatMoney(totalCapitalWithdrawals)} {currencySymbol}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1">
                <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-bold font-cairo">صافي رأس المال الحالي</span>
                <p className="text-lg font-black font-mono text-cyan-700 dark:text-cyan-300">{formatMoney(totalCapital)} {currencySymbol}</p>
              </div>
            </div>

            {/* نموذج إضافة حركة رأس مال جديدة (عند الضغط) */}
            {showCapitalForm && (
              <div className="p-4 sm:p-5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-4 animate-in fade-in-50">
                <h4 className="text-xs font-bold font-cairo text-on-surface flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>تسجيل حركة مالية جديدة في رأس المال:</span>
                </h4>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCapitalType('deposit')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      capitalType === 'deposit'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    إيداع في رأس المال (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapitalType('withdrawal')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      capitalType === 'withdrawal'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    سحب من رأس المال (-)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface font-cairo block">المبلغ ({currencySymbol}):</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={capitalAmount || ''}
                      onChange={(e) => setCapitalAmount(Number(e.target.value) || 0)}
                      className="w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface text-right focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface font-cairo block">الملاحظة والبيان:</label>
                    <input
                      type="text"
                      placeholder="مثال: ضخ استثماري أولي، تمويل تجديدات المحل..."
                      value={capitalNote}
                      onChange={(e) => setCapitalNote(e.target.value)}
                      className="w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-xs text-on-surface text-right focus:outline-none focus:ring-1 focus:ring-primary/40 font-tajawal"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCapitalForm(false)}
                    className="px-4 py-2 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleCapitalEntry}
                    disabled={capitalAmount <= 0 || capitalEntryMutation.isPending}
                    className="px-6 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-40"
                  >
                    {capitalEntryMutation.isPending ? 'جاري الحفظ...' : 'حفظ الحركة المالية'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* جدول سجل حركات رأس المال */}
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <h4 className="text-xs font-bold font-cairo text-on-surface flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span>سجل حركات رأس المال والسيولة ({filteredCapitalEntries.length})</span>
              </h4>

              <div className="flex items-center gap-1.5">
                {(['all', 'deposit', 'withdrawal'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCapitalFilter(f)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      capitalFilter === f
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {f === 'all' ? 'الكل' : f === 'deposit' ? 'إيداعات' : 'سحوبات'}
                  </button>
                ))}
              </div>
            </div>

            {filteredCapitalEntries.length > 0 ? (
              <div className="divide-y divide-outline-variant/10">
                {filteredCapitalEntries.slice().reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className="py-3 px-2 flex items-center justify-between hover:bg-surface-container/50 rounded-xl transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        entry.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {entry.type === 'deposit' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-on-surface font-cairo">
                          {entry.type === 'deposit' ? 'إيداع رأس مال' : 'سحب من رأس المال'}
                        </p>
                        <p className="text-[11px] text-on-surface-variant font-tajawal">{entry.note || 'بدون بيان'}</p>
                        <span className="text-[10px] text-on-surface-variant font-mono">{formatDateTime(entry.date || entry.createdAt)}</span>
                      </div>
                    </div>

                    <span className={`text-sm font-black font-mono ${
                      entry.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {entry.type === 'deposit' ? '+' : '-'}{formatMoney(entry.amount)} {currencySymbol}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-on-surface-variant">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold font-cairo">لا توجد حركات رأس مال مسجلة حتى الآن</p>
                <p className="text-[11px] opacity-70 mt-0.5 font-tajawal">اضغط على زر «إضافة حركة رأس مال» بالأعلى لتوثيق أول عملية</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB 3: سجل المناوبات وتقارير Z ═══ */}
      {activeTab === 'history' && (
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-cairo text-on-surface">سجل كافة مناوبات الصندوق وتقارير الإغلاق</h3>
                <p className="text-[11px] text-on-surface-variant">الاطلاع على تفاصيل الجلسات السابقة، مطابقة الفروقات، وطباعة تقارير Z</p>
              </div>
            </div>

            {/* أدوات البحث والفلترة */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type="text"
                  placeholder="بحث باسم الكاشير أو الرقم..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="h-8 pr-8 pl-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40 font-tajawal w-44 sm:w-56"
                />
              </div>

              <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-xl border border-outline-variant/15">
                {(['all', 'open', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setHistoryStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      historyStatusFilter === st
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {st === 'all' ? 'الكل' : st === 'open' ? 'نشطة' : 'مغلقة'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* جدول الجلسات */}
          {filteredSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/15 text-on-surface-variant font-cairo">
                    <th className="pb-3 pr-3 font-bold">رقم الجلسة</th>
                    <th className="pb-3 font-bold">المسؤول (الكاشير)</th>
                    <th className="pb-3 font-bold">تاريخ الفتح</th>
                    <th className="pb-3 font-bold">تاريخ الإغلاق</th>
                    <th className="pb-3 text-center font-bold font-mono">الافتتاحي</th>
                    <th className="pb-3 text-center font-bold font-mono">المبيعات</th>
                    <th className="pb-3 text-center font-bold font-mono">الرصيد الفعلي</th>
                    <th className="pb-3 text-center font-bold">الفارق</th>
                    <th className="pb-3 text-center font-bold">الحالة</th>
                    <th className="pb-3 text-left pl-3 font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredSessions.slice().reverse().map((session) => {
                    const diff = session.difference ?? 0;
                    return (
                      <tr key={session.id} className="hover:bg-surface-container/50 transition-colors">
                        <td className="py-3.5 pr-3 font-bold text-on-surface font-mono">#{session.sessionNumber}</td>
                        <td className="py-3.5 font-bold text-on-surface">{session.openedBy}</td>
                        <td className="py-3.5 text-on-surface-variant font-mono text-[11px]">{formatDateTime(session.openedAt)}</td>
                        <td className="py-3.5 text-on-surface-variant font-mono text-[11px]">
                          {session.closedAt ? formatDateTime(session.closedAt) : '—'}
                        </td>
                        <td className="py-3.5 text-center font-mono font-bold text-on-surface">{formatMoney(session.openingBalance)} {currencySymbol}</td>
                        <td className="py-3.5 text-center font-mono font-bold text-emerald-600">+{formatMoney(session.totalSales)} {currencySymbol}</td>
                        <td className="py-3.5 text-center font-mono font-bold text-on-surface">
                          {session.actualBalance !== undefined ? `${formatMoney(session.actualBalance)} ${currencySymbol}` : '—'}
                        </td>
                        <td className="py-3.5 text-center font-mono font-bold">
                          {session.status === 'closed' ? (
                            diff === 0 ? (
                              <span className="text-emerald-600">مطابق (0.00)</span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-600">+{formatMoney(diff)} (فائض)</span>
                            ) : (
                              <span className="text-rose-600">{formatMoney(diff)} (عجز)</span>
                            )
                          ) : (
                            <span className="text-on-surface-variant">—</span>
                          )}
                        </td>
                        <td className="py-3.5 text-center">
                          {session.status === 'open' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              مفتوحة
                            </span>
                          ) : (
                            <span className="bg-surface-container-high text-on-surface-variant px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              مغلقة
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-left pl-3">
                          <button
                            type="button"
                            onClick={() => setSelectedHistorySession(session)}
                            className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/15 text-primary text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>تقرير Z</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-on-surface-variant">
              <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-bold font-cairo">لا توجد مناوبات سابقة مسجلة</p>
            </div>
          )}
        </div>
      )}

      {/* ──────── 5. MODALS ──────── */}

      {/* Modal 1: Close Shift & Reconciliation Modal */}
      {showCloseShiftModal && currentSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-outline-variant/20 space-y-5 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cairo text-base font-bold text-on-surface">إغلاق وجرد مناوبة الصندوق #{currentSession.sessionNumber}</h3>
                  <p className="text-[11px] text-on-surface-variant font-tajawal">مطابقة النقدية الفعلية مع السجلات المحاسبية للنظام</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(false)}
                className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* تفاصيل المطابقة المالية */}
            <div className="space-y-2.5 bg-surface-container-low rounded-2xl p-4 text-xs font-mono">
              <div className="flex justify-between text-on-surface-variant">
                <span className="font-cairo">الرصيد الافتتاحي</span>
                <span className="font-bold text-on-surface">{formatMoney(currentSession.openingBalance)} {currencySymbol}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span className="font-cairo">إجمالي المبيعات النقدية (+)</span>
                <span className="font-bold text-emerald-600">+{formatMoney(currentSession.totalSales)} {currencySymbol}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span className="font-cairo">المرتجعات (-)</span>
                <span className="font-bold text-rose-600">-{formatMoney(currentSession.totalReturns)} {currencySymbol}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span className="font-cairo">الإيداعات والسحوبات (±)</span>
                <span className="font-bold text-amber-600">
                  {currentDepositsTotal >= 0 ? `+${formatMoney(currentDepositsTotal)}` : formatMoney(currentDepositsTotal)} {currencySymbol}
                </span>
              </div>

              <div className="border-t border-outline-variant/15 pt-2.5 flex justify-between items-baseline">
                <span className="font-bold text-on-surface font-cairo">الرصيد المتوقع بالدرج:</span>
                <span className="text-base font-black text-primary">{formatMoney(expectedAmount)} {currencySymbol}</span>
              </div>
            </div>

            {/* حقل إدخال النقدية الفعلية بالجرد */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface font-cairo block">
                  المبلغ الفعلي الموجود بالدرج (الذي تم عده):
                </label>
                {totalDenominationsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActualAmount(totalDenominationsCount)}
                    className="text-[11px] text-primary font-bold hover:underline cursor-pointer"
                  >
                    استخدام مجموع حاسبة الفئات ({formatMoney(totalDenominationsCount)} {currencySymbol})
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={actualAmount || ''}
                  onChange={(e) => setActualAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full h-12 pr-4 pl-12 bg-surface-container border border-outline-variant/20 rounded-xl text-lg font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
                  autoFocus
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant font-mono">
                  {currencySymbol}
                </span>
              </div>

              {/* مؤشر الفارق المباشر */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                difference === 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : difference > 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
              }`}>
                <span>{difference === 0 ? 'مطابقة تامة (لا يوجد عجز)' : difference > 0 ? 'فائض نقدي بالصندوق:' : 'عجز نقدي بالصندوق:'}</span>
                <span className="text-sm font-mono font-black">
                  {difference >= 0 ? `+${formatMoney(difference)}` : formatMoney(difference)} {currencySymbol}
                </span>
              </div>
            </div>

            {/* ملاحظة الإغلاق */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface font-cairo block">ملاحظات الإغلاق والتسليم (اختياري):</label>
              <input
                type="text"
                placeholder="أي ملاحظات حول الجرد أو التسليم للكاشير التالي..."
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface text-right focus:outline-none focus:ring-1 focus:ring-primary/30 font-tajawal"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseSession}
                disabled={closeSessionMutation.isPending}
                className="flex-2 py-3 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
              >
                {closeSessionMutation.isPending ? 'جاري الإغلاق...' : 'تأكيد الإغلاق والترحيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Session Detail & Z-Report View Modal */}
      {selectedHistorySession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-outline-variant/20 space-y-5 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cairo text-base font-bold text-on-surface">تقرير جلسة الصندوق Z-Report #{selectedHistorySession.sessionNumber}</h3>
                  <p className="text-[11px] text-on-surface-variant font-tajawal">تفاصيل المناوبة وإحصائيات المبيعات والجرد</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistorySession(null)}
                className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* بطاقة التقرير القابل للطباعة */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-3 text-xs font-mono">
              <div className="text-center pb-2 border-b border-dashed border-outline-variant/30 space-y-0.5">
                <h4 className="font-cairo font-bold text-sm text-on-surface">{settings?.shopName || 'AN POS'}</h4>
                <p className="text-[10px] text-on-surface-variant font-tajawal">تقرير إغلاق الصندوق اليومي (Z-Report)</p>
                <p className="text-[10px] text-on-surface-variant">المسؤول: {selectedHistorySession.openedBy}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-cairo text-on-surface-variant">وقت الفتح:</span>
                  <span>{formatDateTime(selectedHistorySession.openedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-cairo text-on-surface-variant">وقت الإغلاق:</span>
                  <span>{selectedHistorySession.closedAt ? formatDateTime(selectedHistorySession.closedAt) : 'مستمرة'}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-outline-variant/30 pt-2 space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-cairo text-on-surface-variant">الرصيد الافتتاحي:</span>
                  <span className="font-bold">{formatMoney(selectedHistorySession.openingBalance)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span className="font-cairo">إجمالي المبيعات (+):</span>
                  <span className="font-bold">+{formatMoney(selectedHistorySession.totalSales)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span className="font-cairo">إجمالي المرتجعات (-):</span>
                  <span className="font-bold">-{formatMoney(selectedHistorySession.totalReturns)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span className="font-cairo">صافي الإيداعات والسحوبات:</span>
                  <span className="font-bold">
                    {calculateDepositsTotal(selectedHistorySession.deposits) >= 0 ? '+' : ''}
                    {formatMoney(calculateDepositsTotal(selectedHistorySession.deposits))} {currencySymbol}
                  </span>
                </div>
              </div>

              <div className="border-t-2 border-outline-variant/30 pt-2 space-y-1.5 font-bold">
                <div className="flex justify-between text-on-surface">
                  <span className="font-cairo">الرصيد المحسوب (المتوقع):</span>
                  <span>{formatMoney(selectedHistorySession.expectedBalance ?? 0)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span className="font-cairo">الرصيد الفعلي بعد الجرد:</span>
                  <span>{formatMoney(selectedHistorySession.actualBalance ?? selectedHistorySession.closingBalance ?? 0)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span className="font-cairo">الفارق النهائي:</span>
                  <span className={((selectedHistorySession.difference ?? 0) >= 0) ? 'text-emerald-600' : 'text-rose-600'}>
                    {(selectedHistorySession.difference ?? 0) >= 0 ? '+' : ''}
                    {formatMoney(selectedHistorySession.difference ?? 0)} {currencySymbol}
                  </span>
                </div>
              </div>

              {selectedHistorySession.note && (
                <div className="border-t border-dashed border-outline-variant/30 pt-2 text-[11px] text-on-surface-variant font-tajawal">
                  <strong>ملاحظة الإغلاق:</strong> {selectedHistorySession.note}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedHistorySession(null)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => handlePrintZReport(selectedHistorySession)}
                className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
