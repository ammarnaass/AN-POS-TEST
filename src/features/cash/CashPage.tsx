import { useAuthStore } from '@/store/authStore';
import { canControlCash } from '@/utils/permissions';
import { useCashSessionManager } from './hooks/useCashSessionManager';
import { CashHeader } from './components/CashHeader';
import { CashSessionSummaryCards } from './components/CashSessionSummaryCards';
import { CurrentShiftSection } from './components/CurrentShiftSection';
import { CapitalManagementSection } from './components/CapitalManagementSection';
import { CashHistorySection } from './components/CashHistorySection';
import { CloseShiftModal } from './modals/CloseShiftModal';
import { SessionZReportModal } from './modals/SessionZReportModal';
import { Lock, Wallet, Building2, History } from 'lucide-react';

export default function CashPage() {
  const { user: currentUser } = useAuthStore();
  const cash = useCashSessionManager();

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

  const tabs = [
    { id: 'current_shift', label: 'المناوبة الحالية والدرج', icon: Wallet, badge: cash.currentSession ? 'نشطة' : undefined },
    { id: 'capital', label: 'رأس المال والسيولة', icon: Building2, badge: `${cash.capitalEntries.length}` },
    { id: 'history', label: 'سجل المناوبات وتقارير Z', icon: History, badge: `${cash.sessions.length}` },
  ] as const;

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full p-2 sm:p-4" dir="rtl">
      {/* 1. Header */}
      <CashHeader
        currentSession={cash.currentSession}
        onPrepareCloseSession={cash.handlePrepareCloseSession}
        onRefresh={() => cash.queryClient.invalidateQueries({ queryKey: ['cashSessions'] })}
      />

      {/* 2. Top KPI Cards */}
      <CashSessionSummaryCards
        currentSession={cash.currentSession}
        expectedAmount={cash.expectedAmount}
        currentNetSales={cash.currentNetSales}
        totalCapital={cash.totalCapital}
        currentDepositsTotal={cash.currentDepositsTotal}
        currencySymbol={cash.currencySymbol}
      />

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/15 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = cash.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => cash.setActiveTab(tab.id)}
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

      {/* 4. Tab Contents */}
      {cash.activeTab === 'current_shift' && (
        <CurrentShiftSection
          currentSession={cash.currentSession}
          currencySymbol={cash.currencySymbol}
          openingBalance={cash.openingBalance}
          setOpeningBalance={cash.setOpeningBalance}
          handleOpenSession={cash.handleOpenSession}
          openSessionPending={cash.openSessionPending}
          showDenomCalculator={cash.showDenomCalculator}
          setShowDenomCalculator={cash.setShowDenomCalculator}
          denominations={cash.denominations}
          setDenominations={cash.setDenominations}
          totalDenominationsCount={cash.totalDenominationsCount}
          handleApplyDenominationsToActual={cash.handleApplyDenominationsToActual}
          currentDepositsTotal={cash.currentDepositsTotal}
          expectedAmount={cash.expectedAmount}
          depositAmount={cash.depositAmount}
          setDepositAmount={cash.setDepositAmount}
          depositNote={cash.depositNote}
          setDepositNote={cash.setDepositNote}
          handleDeposit={cash.handleDeposit}
          depositPending={cash.depositPending}
          withdrawalAmount={cash.withdrawalAmount}
          setWithdrawalAmount={cash.setWithdrawalAmount}
          withdrawalNote={cash.withdrawalNote}
          setWithdrawalNote={cash.setWithdrawalNote}
          handleWithdrawal={cash.handleWithdrawal}
          withdrawalPending={cash.withdrawalPending}
          handlePrepareCloseSession={cash.handlePrepareCloseSession}
        />
      )}

      {cash.activeTab === 'capital' && (
        <CapitalManagementSection
          currencySymbol={cash.currencySymbol}
          showCapitalForm={cash.showCapitalForm}
          setShowCapitalForm={cash.setShowCapitalForm}
          totalCapitalDeposits={cash.totalCapitalDeposits}
          totalCapitalWithdrawals={cash.totalCapitalWithdrawals}
          totalCapital={cash.totalCapital}
          capitalType={cash.capitalType}
          setCapitalType={cash.setCapitalType}
          capitalAmount={cash.capitalAmount}
          setCapitalAmount={cash.setCapitalAmount}
          capitalNote={cash.capitalNote}
          setCapitalNote={cash.setCapitalNote}
          handleCapitalEntry={cash.handleCapitalEntry}
          capitalEntryPending={cash.capitalEntryPending}
          capitalFilter={cash.capitalFilter}
          setCapitalFilter={cash.setCapitalFilter}
          filteredCapitalEntries={cash.filteredCapitalEntries}
        />
      )}

      {cash.activeTab === 'history' && (
        <CashHistorySection
          filteredSessions={cash.filteredSessions}
          historySearch={cash.historySearch}
          setHistorySearch={cash.setHistorySearch}
          historyStatusFilter={cash.historyStatusFilter}
          setHistoryStatusFilter={cash.setHistoryStatusFilter}
          currencySymbol={cash.currencySymbol}
          setSelectedHistorySession={cash.setSelectedHistorySession}
        />
      )}

      {/* 5. Modals */}
      <CloseShiftModal
        isOpen={cash.showCloseShiftModal}
        onClose={() => cash.setShowCloseShiftModal(false)}
        currentSession={cash.currentSession}
        currencySymbol={cash.currencySymbol}
        currentDepositsTotal={cash.currentDepositsTotal}
        expectedAmount={cash.expectedAmount}
        totalDenominationsCount={cash.totalDenominationsCount}
        actualAmount={cash.actualAmount}
        setActualAmount={cash.setActualAmount}
        difference={cash.difference}
        closingNote={cash.closingNote}
        setClosingNote={cash.setClosingNote}
        handleConfirmCloseSession={cash.handleConfirmCloseSession}
        closeSessionPending={cash.closeSessionPending}
      />

      <SessionZReportModal
        session={cash.selectedHistorySession}
        onClose={() => cash.setSelectedHistorySession(null)}
        currencySymbol={cash.currencySymbol}
        shopName={cash.settings?.shopName}
        onPrint={cash.handlePrintZReport}
      />
    </div>
  );
}
