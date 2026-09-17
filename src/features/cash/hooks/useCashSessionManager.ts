import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, type CashSessionEntity, type CapitalEntryEntity } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { calculateDepositsTotal } from '../sessionBalance';

export const formatMoney = (val: number | null | undefined, decimals = 2) => {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('fr-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const DZD_DENOMINATIONS = [
  { val: 2000, label: '2,000 دج', type: 'ورقة نقدية' },
  { val: 1000, label: '1,000 دج', type: 'ورقة نقدية' },
  { val: 500, label: '500 دج', type: 'ورقة نقدية' },
  { val: 200, label: '200 دج', type: 'قطعة / ورقة' },
  { val: 100, label: '100 دج', type: 'قطعة نقدية' },
  { val: 50, label: '50 دج', type: 'قطعة نقدية' },
  { val: 20, label: '20 دج', type: 'قطعة نقدية' },
  { val: 10, label: '10 دج', type: 'قطعة نقدية' },
];

export function useCashSessionManager() {
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

  const totalDenominationsCount = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [valStr, qty]) => {
      return sum + Number(valStr) * (Number(qty) || 0);
    }, 0);
  }, [denominations]);

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

  return {
    sessions,
    isLoadingSessions,
    currentSession,
    capitalEntries,
    settings,
    currencySymbol,
    activeTab,
    setActiveTab,
    openingBalance,
    setOpeningBalance,
    depositAmount,
    setDepositAmount,
    depositNote,
    setDepositNote,
    withdrawalAmount,
    setWithdrawalAmount,
    withdrawalNote,
    setWithdrawalNote,
    capitalAmount,
    setCapitalAmount,
    capitalNote,
    setCapitalNote,
    capitalType,
    setCapitalType,
    showCapitalForm,
    setShowCapitalForm,
    capitalFilter,
    setCapitalFilter,
    showCloseShiftModal,
    setShowCloseShiftModal,
    actualAmount,
    setActualAmount,
    closingNote,
    setClosingNote,
    selectedHistorySession,
    setSelectedHistorySession,
    denominations,
    setDenominations,
    showDenomCalculator,
    setShowDenomCalculator,
    historySearch,
    setHistorySearch,
    historyStatusFilter,
    setHistoryStatusFilter,
    currentDepositsTotal,
    currentNetSales,
    expectedAmount,
    difference,
    totalCapital,
    totalCapitalDeposits,
    totalCapitalWithdrawals,
    totalDenominationsCount,
    handleOpenSession,
    handlePrepareCloseSession,
    handleConfirmCloseSession,
    handleDeposit,
    handleWithdrawal,
    handleCapitalEntry,
    handleApplyDenominationsToActual,
    handlePrintZReport,
    filteredSessions,
    filteredCapitalEntries,
    queryClient,
    openSessionPending: openSessionMutation.isPending,
    closeSessionPending: closeSessionMutation.isPending,
    depositPending: depositMutation.isPending,
    withdrawalPending: shiftWithdrawalMutation.isPending,
    capitalEntryPending: capitalEntryMutation.isPending,
  };
}
