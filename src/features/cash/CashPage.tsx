import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { formatDate, generateId } from '@/utils';
import { useAuthStore } from '@/store/authStore';
import { canControlCash } from '@/utils/permissions';
import { calculateDepositsTotal } from './sessionBalance';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, Unlock, DollarSign, TrendingUp, TrendingDown, Clock, X } from 'lucide-react';

export default function CashPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const { data: sessions = [] } = useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });
  const currentSession = sessions.find(s => s.status === 'open') || null;

  const { data: capitalEntries = [] } = useQuery({
    queryKey: ['capitalEntries'],
    queryFn: () => db.capital_entries.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cashSessions'] }),
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (data: { id: string; expectedBalance: number; actualBalance: number; difference: number }) => {
      await db.cash_sessions.update(data.id, {
        status: 'closed',
        closedAt: new Date().toISOString(),
        closingBalance: data.actualBalance,
        expectedBalance: data.expectedBalance,
        actualBalance: data.actualBalance,
        difference: data.difference,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cashSessions'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cashSessions'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['capitalEntries'] }),
  });

  const [openingBalance, setOpeningBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositNote, setDepositNote] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [withdrawalNote, setWithdrawalNote] = useState('');
  const [capitalAmount, setCapitalAmount] = useState(0);
  const [capitalNote, setCapitalNote] = useState('');
  const [capitalType, setCapitalType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [showCapitalForm, setShowCapitalForm] = useState(false);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [actualAmount, setActualAmount] = useState(0);

  const handleOpenSession = () => {
    if (!currentUser) return;
    openSessionMutation.mutate({ openedBy: currentUser.name, openingBalance });
    setOpeningBalance(0);
  };

  const handleCloseSession = () => {
    if (!currentSession) return;
    const expected = currentSession.openingBalance + currentSession.totalSales - currentSession.totalReturns + calculateDepositsTotal(currentSession.deposits);
    setActualAmount(expected);
    setShowSessionSummary(true);
  };

  const handleConfirmCloseSession = () => {
    if (!currentSession) return;
    closeSessionMutation.mutate({
      id: currentSession.id,
      expectedBalance: expectedAmount,
      actualBalance: actualAmount,
      difference,
    });
    setShowSessionSummary(false);
  };

  const handleDeposit = () => {
    if (depositAmount <= 0 || !currentSession) return;
    depositMutation.mutate({ sessionId: currentSession.id, amount: depositAmount, note: depositNote });
    setDepositAmount(0);
    setDepositNote('');
  };

  const handleWithdrawal = () => {
    if (withdrawalAmount <= 0) return;
    capitalEntryMutation.mutate({ type: 'withdrawal', amount: withdrawalAmount, note: `سحب من الصندوق: ${withdrawalNote}` });
    setWithdrawalAmount(0);
    setWithdrawalNote('');
  };

  const handleCapitalEntry = () => {
    if (capitalAmount <= 0) return;
    capitalEntryMutation.mutate({ type: capitalType, amount: capitalAmount, note: capitalNote });
    setCapitalAmount(0);
    setCapitalNote('');
    setShowCapitalForm(false);
  };

  const totalCapital = capitalEntries.reduce((sum, e) => (e.type === 'deposit' ? sum + e.amount : sum - e.amount), 0);
  const currentDepositsTotal = calculateDepositsTotal(currentSession?.deposits);
  const expectedAmount = currentSession ? currentSession.openingBalance + currentSession.totalSales - currentSession.totalReturns + currentDepositsTotal : 0;
  const difference = currentSession ? actualAmount - expectedAmount : 0;

  if (!canControlCash(currentUser?.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="w-14 h-14 text-outline-variant mb-4" />
        <h2 className="font-cairo text-headline-md font-bold text-on-surface mb-2">صلاحية محدودة</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">
          أدنى «{currentUser?.role === 'seller' ? 'بائع' : currentUser?.role}» لا يمكنه التحكم بالصندوق. يجب صلاحية «مدير» أو «كاشير» لفتح/إغلاق المناوبة وإجراء الإيداعات والسحوبات.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-row-reverse justify-between items-center">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">إدارة الصندوق</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">إدارة الجلسات النقدية ورأس المال</p>
        </div>
        {currentSession && (
          <div className="flex items-center gap-2 px-4 py-2 bg-tertiary-container/30 text-tertiary rounded-xl border border-tertiary/20">
            <div className="w-2.5 h-2.5 bg-tertiary rounded-full animate-pulse" />
            <span className="font-label-lg">جلسة #{currentSession.sessionNumber} مفتوحة</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Management */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            المناوبة اليومية
          </h3>
          {!currentSession ? (
            <div className="space-y-4">
              <div className="bg-surface-container-low rounded-xl p-6 text-center">
                <Wallet className="w-12 h-12 text-outline-variant mx-auto mb-3" />
                <p className="text-body-md text-on-surface-variant mb-4">لا توجد جلسة مفتوحة حالياً</p>
              </div>
              <div className="relative">
                <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input type="number" placeholder="الرصيد الافتتاحي" value={openingBalance || ''} onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                  className="w-full pr-12 pl-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
              <button onClick={handleOpenSession} className="w-full py-3.5 bg-primary text-on-primary rounded-xl font-label-lg shadow-sm hover:bg-primary-container transition-all flex items-center justify-center gap-2">
                <Unlock className="w-5 h-5" /> فتح جلسة جديدة
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-body-sm text-on-surface-variant">الرصيد الافتتاحي</p>
                  <p className="font-numeral-lg text-on-surface">{currentSession.openingBalance.toFixed(2)} دج</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-body-sm text-on-surface-variant">إجمالي المبيعات</p>
                  <p className="font-numeral-lg text-tertiary">+{currentSession.totalSales.toFixed(2)} دج</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-body-sm text-on-surface-variant">المرتجعات</p>
                  <p className="font-numeral-lg text-error">-{currentSession.totalReturns.toFixed(2)} دج</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-body-sm text-on-surface-variant">الإيداعات</p>
                  <p className="font-numeral-lg text-on-surface">+{currentDepositsTotal.toFixed(2)} دج</p>
                </div>
                <div className="bg-primary-fixed/30 rounded-xl p-4 col-span-2">
                  <p className="text-body-sm text-on-surface-variant">المتوقع في الصندوق</p>
                  <p className="font-numeral-lg text-primary">{expectedAmount.toFixed(2)} دج</p>
                </div>
              </div>

              <div className="border-t border-outline-variant pt-4 space-y-3">
                <p className="font-label-lg text-on-surface">إيداع نقدي</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="المبلغ" value={depositAmount || ''} onChange={(e) => setDepositAmount(Number(e.target.value) || 0)} className="flex-1 px-4 py-2.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                  <input type="text" placeholder="ملاحظة" value={depositNote} onChange={(e) => setDepositNote(e.target.value)} className="flex-1 px-4 py-2.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                  <button onClick={handleDeposit} className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-label-lg hover:bg-primary-container transition-all">إيداع</button>
                </div>
              </div>

              <div className="border-t border-outline-variant pt-4 space-y-3">
                <p className="font-label-lg text-on-surface">سحب نقدي</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="المبلغ" value={withdrawalAmount || ''} onChange={(e) => setWithdrawalAmount(Number(e.target.value) || 0)} className="flex-1 px-4 py-2.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                  <input type="text" placeholder="ملاحظة" value={withdrawalNote} onChange={(e) => setWithdrawalNote(e.target.value)} className="flex-1 px-4 py-2.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                  <button onClick={handleWithdrawal} className="px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface-variant font-label-lg hover:bg-surface-container-high transition-all">سحب</button>
                </div>
              </div>

              <button onClick={handleCloseSession} className="w-full py-3.5 border border-outline-variant rounded-xl text-on-surface-variant font-label-lg hover:bg-surface-container-high transition-all flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" /> إغلاق الجلسة
              </button>
            </div>
          )}
        </div>

        {/* Capital Management */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-secondary" />
              رأس المال
            </h3>
            <span className="font-numeral-lg text-primary">{totalCapital.toFixed(2)} دج</span>
          </div>

          <button onClick={() => setShowCapitalForm(!showCapitalForm)}
            className="w-full py-3 border border-outline-variant rounded-xl text-on-surface-variant font-label-lg hover:bg-surface-container-high transition-all mb-4">
            إضافة حركة رأسمال
          </button>

          {showCapitalForm && (
            <div className="bg-surface-container-low rounded-xl p-4 mb-4 space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setCapitalType('deposit')} className={`flex-1 py-2.5 rounded-xl font-label-md transition-all ${capitalType === 'deposit' ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant'}`}>إيداع</button>
                <button onClick={() => setCapitalType('withdrawal')} className={`flex-1 py-2.5 rounded-xl font-label-md transition-all ${capitalType === 'withdrawal' ? 'bg-error text-on-error' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant'}`}>سحب</button>
              </div>
              <input type="number" placeholder="المبلغ" value={capitalAmount || ''} onChange={(e) => setCapitalAmount(Number(e.target.value) || 0)} className="w-full px-4 py-3 border border-outline-variant rounded-xl text-right bg-surface-container-lowest text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              <input type="text" placeholder="ملاحظة" value={capitalNote} onChange={(e) => setCapitalNote(e.target.value)} className="w-full px-4 py-3 border border-outline-variant rounded-xl text-right bg-surface-container-lowest text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              <button onClick={handleCapitalEntry} className="w-full py-3 bg-primary text-on-primary rounded-xl font-label-lg hover:bg-primary-container transition-all">تأكيد</button>
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {capitalEntries.slice().reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  {entry.type === 'deposit' ? <ArrowDownCircle className="w-4 h-4 text-tertiary" /> : <ArrowUpCircle className="w-4 h-4 text-error" />}
                  <div>
                    <p className="text-body-md text-on-surface">{entry.type === 'deposit' ? 'إيداع' : 'سحب'}</p>
                    <p className="text-body-sm text-on-surface-variant">{entry.note || formatDate(entry.date)}</p>
                  </div>
                </div>
                <span className={entry.type === 'deposit' ? 'text-tertiary font-label-lg' : 'text-error font-label-lg'}>
                  {entry.type === 'deposit' ? '+' : '-'}{entry.amount.toFixed(2)} دج
                </span>
              </div>
            ))}
            {capitalEntries.length === 0 && <p className="text-center text-on-surface-variant py-4 text-body-md">لا توجد حركات</p>}
          </div>
        </div>
      </div>

      {/* Sessions History */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-outline-variant">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            سجل الجلسات
          </h3>
        </div>
        <table className="w-full text-right">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <th className="px-6 py-4 font-label-lg text-on-surface-variant">رقم الجلسة</th>
              <th className="px-6 py-4 font-label-lg text-on-surface-variant">الفتح</th>
              <th className="px-6 py-4 font-label-lg text-on-surface-variant">الإغلاق</th>
              <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">الافتتاحي</th>
              <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">المبيعات</th>
              <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {sessions.slice().reverse().map((session) => (
              <tr key={session.id} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="px-6 py-4 font-label-lg text-on-surface">#{session.sessionNumber}</td>
                <td className="px-6 py-4 text-body-md text-on-surface-variant">{formatDate(session.openedAt)}</td>
                <td className="px-6 py-4 text-body-md text-on-surface-variant">{session.closedAt ? formatDate(session.closedAt) : '—'}</td>
                <td className="px-6 py-4 text-center font-label-lg text-on-surface">{session.openingBalance.toFixed(2)} دج</td>
                <td className="px-6 py-4 text-center font-label-lg text-tertiary">+{session.totalSales.toFixed(2)} دج</td>
                <td className="px-6 py-4 text-center">
                  {session.status === 'open' ? (
                    <span className="inline-flex items-center gap-1.5 bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-body-sm font-label-md">
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" /> مفتوحة
                    </span>
                  ) : (
                    <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-body-sm font-label-md">مغلقة</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Wallet className="w-12 h-12 text-outline-variant mb-3" />
            <p className="text-body-md text-on-surface-variant">لا توجد جلسات سابقة</p>
          </div>
        )}
      </div>

      {/* Session Close Summary Modal */}
      {showSessionSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline-md text-on-surface">ملخص إغلاق الجلسة</h3>
              <button onClick={() => setShowSessionSummary(false)} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container-low transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 bg-surface-container-low rounded-xl p-4">
              <div className="flex justify-between"><span className="text-on-surface-variant">الرصيد الافتتاحي</span><span className="font-label-lg text-on-surface">{currentSession?.openingBalance.toFixed(2)} دج</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">المبيعات</span><span className="font-label-lg text-tertiary">+{currentSession?.totalSales.toFixed(2)} دج</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">المرتجعات</span><span className="font-label-lg text-error">-{currentSession?.totalReturns.toFixed(2)} دج</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">الإيداعات</span><span className="font-label-lg text-on-surface">+{currentDepositsTotal.toFixed(2)} دج</span></div>
              <div className="border-t border-outline-variant pt-3 flex justify-between font-numeral-lg"><span>المتوقع</span><span className="text-primary">{expectedAmount.toFixed(2)} دج</span></div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">المبلغ الفعلي</span>
                <input type="number" value={actualAmount} onChange={(e) => setActualAmount(Number(e.target.value) || 0)}
                  className="w-36 px-3 py-2 border border-outline-variant rounded-xl text-right bg-surface-container-lowest text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
              <div className={`flex justify-between font-numeral-lg ${difference === 0 ? 'text-tertiary' : 'text-error'}`}>
                <span>الفرق</span>
                <span>{difference >= 0 ? '+' : ''}{difference.toFixed(2)} دج</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSessionSummary(false)} className="flex-1 py-3.5 border border-outline-variant rounded-xl text-on-surface-variant font-label-lg hover:bg-surface-container-low transition-all">إلغاء</button>
              <button onClick={handleConfirmCloseSession} className="flex-1 py-3.5 bg-primary text-on-primary rounded-xl font-label-lg shadow-sm hover:bg-primary-container transition-all">تأكيد الإغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
