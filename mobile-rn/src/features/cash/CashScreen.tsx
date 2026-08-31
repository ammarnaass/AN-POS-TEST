import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Wallet,
  Lock,
  Unlock,
  DollarSign,
  Clock,
  Check,
  X,
  History,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  User,
  Calendar,
  Layers,
  Coins,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { CashSession, CapitalEntry } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, Badge, Button, Input, EmptyState } from '@/components/ui';

export const CashScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [capitalEntries, setCapitalEntries] = useState<CapitalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'capital'>('current');

  // Open Session Modal
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0');

  // Close Session Modal
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [actualBalanceInput, setActualBalanceInput] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Cash Movement (Deposit / Withdrawal) Modal
  const [movementModalVisible, setMovementModalVisible] = useState(false);
  const [movementType, setMovementType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementNote, setMovementNote] = useState('');

  // Capital Entry Modal
  const [capitalModalVisible, setCapitalModalVisible] = useState(false);
  const [capitalType, setCapitalType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalNote, setCapitalNote] = useState('');

  // Shift Details Modal (for history)
  const [selectedHistorySession, setSelectedHistorySession] = useState<CashSession | null>(null);

  useEffect(() => {
    loadCashData();
  }, []);

  async function loadCashData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allSessions, allCapital] = await Promise.all([
        db.cashSessions.toArray().catch(() => []),
        db.capitalEntries.toArray().catch(() => []),
      ]);

      allSessions.sort(
        (a: any, b: any) =>
          new Date(b.openedAt || b.opened_at || b.createdAt || 0).getTime() -
          new Date(a.openedAt || a.opened_at || a.createdAt || 0).getTime()
      );

      const open = allSessions.find((s: any) => s.status === 'open') || null;
      setSessions(allSessions);
      setCurrentSession(open);
      setCapitalEntries(allCapital);
    } catch (err) {
      console.warn('Failed to load cash data:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCashData();
    setRefreshing(false);
  };

  // 1. Open Session
  const handleOpenSession = async () => {
    const opening = parseFloat(openingBalanceInput) || 0;
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      const sessionNum = sessions.length + 1;

      await db.cashSessions.add({
        id: generateId(),
        number: String(sessionNum),
        sessionNumber: sessionNum,
        session_number: sessionNum,
        opened_by: user?.name || t('pos.cashierDefault'),
        openedBy: user?.name || t('pos.cashierDefault'),
        opened_at: nowIso,
        openedAt: nowIso,
        opening_balance: opening,
        openingBalance: opening,
        total_sales: 0,
        totalSales: 0,
        total_expenses: 0,
        deposits: '[]',
        status: 'open',
        created_at: nowIso,
        updated_at: nowIso,
      });

      setOpenModalVisible(false);
      setOpeningBalanceInput('0');
      Alert.alert(`✓ ${t('cash.openShift')}`, t('pos.openShiftActive'));
      await loadCashData();
    } catch (err) {
      Alert.alert(t('common.error'), `${t('common.error')}: ${err instanceof Error ? err.message : ''}`);
    }
  };

  // 2. Close Session
  const handleCloseSession = async () => {
    if (!currentSession) return;
    const actual = parseFloat(actualBalanceInput);
    if (isNaN(actual)) {
      Alert.alert(t('common.warning'), t('cash.actualCash'));
      return;
    }

    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      const expected = calculateExpectedBalance(currentSession);
      const diff = actual - expected;

      await db.cashSessions.update(currentSession.id, {
        actualBalance: actual,
        actual_balance: actual,
        closingBalance: actual,
        closing_balance: actual,
        expectedBalance: expected,
        expected_balance: expected,
        difference: diff,
        status: 'closed',
        closedAt: nowIso,
        closed_at: nowIso,
        note: closeNotes,
        updated_at: nowIso,
      });

      setCloseModalVisible(false);
      setActualBalanceInput('');
      setCloseNotes('');
      Alert.alert(
        `✓ ${t('cash.closeShift')}`,
        `${t('cash.actualCash')}: ${actual.toLocaleString(localeStr)} ${currency}\n${t('cash.cashDifference')}: ${diff > 0 ? '+' : ''}${diff.toLocaleString(localeStr)} ${currency}`
      );
      await loadCashData();
    } catch (err) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  // 3. Record Cash Movement
  const handleRecordMovement = async () => {
    if (!currentSession) return;
    const amt = parseFloat(movementAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert(t('common.warning'), t('pos.pleaseEnterValidPrice'));
      return;
    }

    try {
      await ensureInit();
      const deps: any[] = Array.isArray(currentSession.deposits)
        ? currentSession.deposits
        : typeof currentSession.deposits === 'string'
        ? JSON.parse(currentSession.deposits || '[]')
        : [];

      deps.push({
        id: generateId(),
        type: movementType,
        amount: movementType === 'deposit' ? amt : -amt,
        note: movementNote || (movementType === 'deposit' ? t('cash.deposit') : t('cash.withdrawal')),
        date: new Date().toISOString(),
        user: user?.name || t('pos.cashierDefault'),
      });

      await db.cashSessions.update(currentSession.id, {
        deposits: JSON.stringify(deps),
        updated_at: new Date().toISOString(),
      });

      setMovementModalVisible(false);
      setMovementAmount('');
      setMovementNote('');
      Alert.alert(t('common.success'), t('cash.cashMovementSuccess'));
      await loadCashData();
    } catch (err) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  // 4. Record Capital Entry
  const handleRecordCapital = async () => {
    const amt = parseFloat(capitalAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert(t('common.warning'), t('pos.pleaseEnterValidPrice'));
      return;
    }

    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      await db.capitalEntries.add({
        id: generateId(),
        type: capitalType,
        amount: amt,
        note: capitalNote || (capitalType === 'deposit' ? t('cash.capitalDeposit') : t('cash.capitalWithdraw')),
        date: nowIso,
        created_at: nowIso,
      });

      setCapitalModalVisible(false);
      setCapitalAmount('');
      setCapitalNote('');
      Alert.alert(t('common.success'), t('common.success'));
      await loadCashData();
    } catch (err) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const calculateExpectedBalance = (session: CashSession) => {
    const opening = session.openingBalance || (session as any).opening_balance || 0;
    const salesTotal = session.totalSales || (session as any).total_sales || 0;

    let movementsTotal = 0;
    try {
      const deps: any[] = Array.isArray(session.deposits)
        ? session.deposits
        : typeof session.deposits === 'string'
        ? JSON.parse(session.deposits || '[]')
        : [];
      movementsTotal = deps.reduce((sum, d) => sum + (d.amount || 0), 0);
    } catch {}

    return opening + salesTotal + movementsTotal;
  };

  const getMovementsList = (session: CashSession | null) => {
    if (!session) return [];
    try {
      const deps: any[] = Array.isArray(session.deposits)
        ? session.deposits
        : typeof session.deposits === 'string'
        ? JSON.parse(session.deposits || '[]')
        : [];
      return deps.slice().reverse();
    } catch {
      return [];
    }
  };

  // Calculate live movement totals for current session
  const currentMovements = useMemo(() => getMovementsList(currentSession), [currentSession]);
  const currentTotalIn = useMemo(
    () => currentMovements.filter((m) => m.amount > 0).reduce((sum, m) => sum + m.amount, 0),
    [currentMovements]
  );
  const currentTotalOut = useMemo(
    () => currentMovements.filter((m) => m.amount < 0).reduce((sum, m) => sum + Math.abs(m.amount), 0),
    [currentMovements]
  );

  // Capital Totals
  const capitalSummary = useMemo(() => {
    const totalIn = capitalEntries.filter((c) => c.type === 'deposit').reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalOut = capitalEntries.filter((c) => c.type === 'withdrawal').reduce((sum, c) => sum + (c.amount || 0), 0);
    const net = totalIn - totalOut;
    return { totalIn, totalOut, net };
  }, [capitalEntries]);

  // History Stats
  const historySummary = useMemo(() => {
    const closed = sessions.filter((s) => s.status === 'closed');
    const totalSales = closed.reduce((sum, s) => sum + (s.totalSales || (s as any).total_sales || 0), 0);
    const totalDiff = closed.reduce((sum, s) => sum + ((s as any).difference || 0), 0);
    return { totalShifts: closed.length, totalSales, totalDiff };
  }, [sessions]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.headerBackBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
            activeOpacity={0.7}
          >
            <BackIcon size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={[styles.headerTitleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.screenTitle}>{t('cash.cashRegister')}</Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Badge variant={currentSession ? 'emerald' : 'neutral'} size="xs" dot>
                {currentSession
                  ? `${t('cash.activeShiftBadge')} #${currentSession.sessionNumber || (currentSession as any).number || 1}`
                  : t('cash.closedShiftBadge')}
              </Badge>
            </View>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            style={[styles.refreshBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs Row */}
      <View style={[styles.tabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.tabActive]}
          onPress={() => setActiveTab('current')}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Wallet size={15} color={activeTab === 'current' ? '#ffffff' : colors.text.secondary} />
            <Text style={[styles.tabText, activeTab === 'current' && styles.tabTextActive]}>
              {t('cash.currentShift')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <History size={15} color={activeTab === 'history' ? '#ffffff' : colors.text.secondary} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              {t('cash.shiftHistory')}
            </Text>
            {sessions.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: activeTab === 'history' ? 'rgba(255,255,255,0.25)' : colors.border.default },
                ]}
              >
                <Text style={[styles.tabBadgeText, { color: activeTab === 'history' ? '#fff' : colors.text.secondary }]}>
                  {sessions.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'capital' && styles.tabActive]}
          onPress={() => setActiveTab('capital')}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Coins size={15} color={activeTab === 'capital' ? '#ffffff' : colors.text.secondary} />
            <Text style={[styles.tabText, activeTab === 'capital' && styles.tabTextActive]}>
              {t('cash.capital')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'current' ? (
          currentSession ? (
            /* Open Session Details View */
            <View style={{ gap: spacing.md }}>
              {/* 1. Hero Cash Status Bento */}
              <Card variant="elevated" style={styles.heroCard}>
                <View style={[styles.heroHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <Badge variant="emerald" size="sm" dot>
                      {t('pos.openShiftActive')}
                    </Badge>
                    <Text style={styles.sessionNumberText}>
                      #{currentSession.sessionNumber || (currentSession as any).number || 1}
                    </Text>
                  </View>

                  <View style={[styles.cashierBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <User size={13} color={colors.text.secondary} />
                    <Text style={styles.cashierName}>
                      {currentSession.openedBy || (currentSession as any).opened_by || t('pos.cashierDefault')}
                    </Text>
                  </View>
                </View>

                {/* Primary Large Expected Balance */}
                <View style={styles.heroBalanceBox}>
                  <Text style={styles.heroBalanceLabel}>{t('cash.expectedCash')}</Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 6, justifyContent: 'center' }}>
                    <Text style={styles.heroBalanceValue}>
                      {calculateExpectedBalance(currentSession).toLocaleString(localeStr)}
                    </Text>
                    <Text style={styles.heroBalanceCurrency}>{currency}</Text>
                  </View>
                </View>

                {/* 4-KPI Grid */}
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiBox, { backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50] }]}>
                    <Text style={styles.kpiBoxLabel}>{t('cash.initialCash')}</Text>
                    <Text style={styles.kpiBoxValue}>
                      {(currentSession.openingBalance || (currentSession as any).opening_balance || 0).toLocaleString(localeStr)} {currency}
                    </Text>
                  </View>

                  <View style={[styles.kpiBox, { backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50] }]}>
                    <Text style={styles.kpiBoxLabel}>{t('sales.totalSales')}</Text>
                    <Text style={[styles.kpiBoxValue, { color: colors.emerald[600] }]}>
                      +{(currentSession.totalSales || (currentSession as any).total_sales || 0).toLocaleString(localeStr)} {currency}
                    </Text>
                  </View>

                  <View style={[styles.kpiBox, { backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50] }]}>
                    <Text style={styles.kpiBoxLabel}>{t('cash.cashIn')}</Text>
                    <Text style={[styles.kpiBoxValue, { color: colors.primary[600] }]}>
                      +{currentTotalIn.toLocaleString(localeStr)} {currency}
                    </Text>
                  </View>

                  <View style={[styles.kpiBox, { backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50] }]}>
                    <Text style={styles.kpiBoxLabel}>{t('cash.cashOut')}</Text>
                    <Text style={[styles.kpiBoxValue, { color: colors.danger.main }]}>
                      -{currentTotalOut.toLocaleString(localeStr)} {currency}
                    </Text>
                  </View>
                </View>

                {/* Time & Duration Info */}
                <View style={[styles.heroFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color={colors.text.tertiary} />
                    <Text style={styles.heroFooterText}>
                      {new Date(currentSession.openedAt || (currentSession as any).opened_at).toLocaleTimeString(localeStr, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} color={colors.text.tertiary} />
                    <Text style={styles.heroFooterText}>
                      {new Date(currentSession.openedAt || (currentSession as any).opened_at).toLocaleDateString(localeStr)}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* 2. Quick Drawer Action Buttons */}
              <View style={[styles.actionButtonsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.emerald[600] }]}
                  onPress={() => {
                    setMovementType('deposit');
                    setMovementAmount('');
                    setMovementNote('');
                    setMovementModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <ArrowDownLeft size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>{t('cash.deposit')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.amber[600] }]}
                  onPress={() => {
                    setMovementType('withdrawal');
                    setMovementAmount('');
                    setMovementNote('');
                    setMovementModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <ArrowUpRight size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>{t('cash.withdrawal')}</Text>
                </TouchableOpacity>
              </View>

              {/* Close Session CTA Button */}
              <Button
                title={t('cash.closeShift')}
                variant="destructive"
                size="lg"
                icon={<Lock size={18} color="#fff" />}
                onPress={() => {
                  setActualBalanceInput(String(calculateExpectedBalance(currentSession)));
                  setCloseNotes('');
                  setCloseModalVisible(true);
                }}
                fullWidth
              />

              {/* 3. Live Drawer Movements Timeline */}
              <Card variant="elevated" style={styles.movementsCard}>
                <View style={[styles.movementsHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                    <Layers size={16} color={colors.primary[600]} />
                    <Text style={[styles.movementsTitle, { color: colors.text.primary }]}>
                      {t('cash.drawerMovements')}
                    </Text>
                  </View>
                  <Badge variant="neutral" size="xs">
                    {currentMovements.length}
                  </Badge>
                </View>

                {currentMovements.length === 0 ? (
                  <View style={styles.emptyMovementsBox}>
                    <DollarSign size={24} color={colors.text.tertiary} />
                    <Text style={styles.emptyMovementsText}>{t('cash.noMovementsYet')}</Text>
                    <Text style={styles.emptyMovementsSub}>{t('cash.noMovementsYetDesc')}</Text>
                  </View>
                ) : (
                  <View style={{ gap: spacing.xs }}>
                    {currentMovements.map((m: any, idx: number) => {
                      const isDep = m.amount > 0;
                      return (
                        <View
                          key={m.id || idx}
                          style={[
                            styles.movementItem,
                            {
                              backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
                              flexDirection: isRTL ? 'row-reverse' : 'row',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.movementIconBox,
                              { backgroundColor: isDep ? colors.emerald[50] : colors.danger.light },
                            ]}
                          >
                            {isDep ? (
                              <ArrowDownLeft size={16} color={colors.emerald[700]} />
                            ) : (
                              <ArrowUpRight size={16} color={colors.danger.main} />
                            )}
                          </View>

                          <View style={[styles.movementInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                            <Text style={[styles.movementNote, { color: colors.text.primary }]}>
                              {m.note || (isDep ? t('cash.deposit') : t('cash.withdrawal'))}
                            </Text>
                            <Text style={styles.movementMeta}>
                              {new Date(m.date).toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' })} • {m.user || user?.name}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.movementAmountText,
                              { color: isDep ? colors.emerald[600] : colors.danger.main },
                            ]}
                          >
                            {isDep ? '+' : '-'}
                            {Math.abs(m.amount).toLocaleString(localeStr)} {currency}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            </View>
          ) : (
            /* Closed State Card */
            <Card variant="elevated" style={styles.closedCard}>
              <View style={[styles.closedIconBox, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : colors.indigo[50] }]}>
                <Lock size={38} color={colors.primary[600]} />
              </View>
              <Text style={[styles.closedTitle, { color: colors.text.primary }]}>{t('cash.openShift')}</Text>
              <Text style={styles.closedSub}>{t('cash.openShiftPrompt')}</Text>
              <Button
                title={t('cash.openShift')}
                variant="success"
                size="lg"
                icon={<Unlock size={18} color="#fff" />}
                onPress={() => setOpenModalVisible(true)}
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            </Card>
          )
        ) : activeTab === 'history' ? (
          /* Shift History View */
          <View style={{ gap: spacing.md }}>
            {/* History Summary Bento */}
            <Card variant="elevated" style={styles.summaryBento}>
              <View style={[styles.summaryBentoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.summaryBentoItem}>
                  <Text style={styles.summaryBentoLabel}>{t('cash.shiftHistory')}</Text>
                  <Text style={styles.summaryBentoVal}>{historySummary.totalShifts}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBentoItem}>
                  <Text style={styles.summaryBentoLabel}>{t('sales.totalSales')}</Text>
                  <Text style={[styles.summaryBentoVal, { color: colors.emerald[600] }]}>
                    {historySummary.totalSales.toLocaleString(localeStr)} {currency}
                  </Text>
                </View>
              </View>
            </Card>

            {sessions.length === 0 ? (
              <EmptyState
                icon={<History size={36} color={colors.primary[600]} />}
                title={t('cash.noShiftsFound')}
                description={t('cash.noShiftsDesc')}
              />
            ) : (
              sessions.map((s) => {
                const isOpen = s.status === 'open';
                const diff = (s as any).difference || 0;
                const actualOrClosing = (s as any).closing_balance || s.closingBalance || s.openingBalance || 0;

                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSelectedHistorySession(s)}
                    activeOpacity={0.75}
                  >
                    <Card style={[styles.historyCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.historyRight, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.xs }}>
                          <Text style={[styles.historyNumber, { color: colors.text.primary }]}>
                            #{s.sessionNumber || (s as any).number || 1}
                          </Text>
                          <Badge variant={isOpen ? 'emerald' : 'neutral'} size="xs" dot>
                            {isOpen ? t('pos.openShiftActive') : t('common.completed')}
                          </Badge>
                        </View>
                        <Text style={styles.historyDate}>
                          {new Date(s.openedAt || (s as any).opened_at).toLocaleDateString(localeStr)} • {s.openedBy || (s as any).opened_by}
                        </Text>
                      </View>

                      <View style={styles.historyLeft}>
                        <Text style={[styles.historyTotal, { color: colors.text.primary }]}>
                          {actualOrClosing.toLocaleString(localeStr)} {currency}
                        </Text>
                        {s.status === 'closed' && (
                          <Badge
                            variant={diff === 0 ? 'emerald' : diff > 0 ? 'success' : 'danger'}
                            size="xs"
                          >
                            {diff === 0
                              ? `✓ ${t('cash.perfectMatch')}`
                              : `${t('cash.cashDifference')}: ${diff > 0 ? '+' : ''}${diff.toLocaleString(localeStr)}`}
                          </Badge>
                        )}
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          /* Capital & Funds View */
          <View style={{ gap: spacing.md }}>
            {/* Capital Summary Bento */}
            <Card variant="elevated" style={styles.summaryBento}>
              <View style={[styles.summaryBentoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.summaryBentoItem}>
                  <Text style={styles.summaryBentoLabel}>{t('cash.totalIn')}</Text>
                  <Text style={[styles.summaryBentoVal, { color: colors.emerald[600] }]}>
                    +{capitalSummary.totalIn.toLocaleString(localeStr)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBentoItem}>
                  <Text style={styles.summaryBentoLabel}>{t('cash.totalOut')}</Text>
                  <Text style={[styles.summaryBentoVal, { color: colors.danger.main }]}>
                    -{capitalSummary.totalOut.toLocaleString(localeStr)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBentoItem}>
                  <Text style={styles.summaryBentoLabel}>{t('cash.netBalance')}</Text>
                  <Text style={[styles.summaryBentoVal, { color: colors.primary[600] }]}>
                    {capitalSummary.net.toLocaleString(localeStr)} {currency}
                  </Text>
                </View>
              </View>
            </Card>

            <Button
              title={t('cash.newCapitalEntry')}
              variant="indigo"
              size="md"
              icon={<Plus size={18} color="#fff" />}
              onPress={() => setCapitalModalVisible(true)}
              fullWidth
            />

            {capitalEntries.length === 0 ? (
              <EmptyState
                icon={<Wallet size={36} color={colors.indigo[600]} />}
                title={t('cash.noCapitalFound')}
                description={t('cash.noCapitalDesc')}
              />
            ) : (
              capitalEntries.map((c) => {
                const isDep = c.type === 'deposit';
                return (
                  <Card key={c.id} style={[styles.historyCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.historyRight, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                        <Badge variant={isDep ? 'emerald' : 'danger'} size="xs">
                          {isDep ? t('cash.capitalDeposit') : t('cash.capitalWithdraw')}
                        </Badge>
                      </View>
                      <Text style={styles.historyDate}>
                        {new Date(c.date || (c as any).createdAt || '').toLocaleDateString(localeStr)} • {c.note || '—'}
                      </Text>
                    </View>

                    <View style={styles.historyLeft}>
                      <Text
                        style={[
                          styles.historyTotal,
                          { color: isDep ? colors.emerald[600] : colors.danger.main },
                        ]}
                      >
                        {isDep ? '+' : '-'}
                        {(c.amount || 0).toLocaleString(localeStr)} {currency}
                      </Text>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* 1. Open Session Modal */}
      <Modal visible={openModalVisible} transparent animationType="slide" onRequestClose={() => setOpenModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setOpenModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('cash.openShift')}</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign }]}>{t('cash.initialCash')} ({currency})</Text>
              <TextInput
                style={[styles.formInputAmount, { textAlign: 'center' }]}
                value={openingBalanceInput}
                onChangeText={setOpeningBalanceInput}
                keyboardType="numeric"
                placeholder="0"
                autoFocus
              />
            </View>

            {/* Quick Chips for Opening Cash */}
            <View style={styles.quickChipsRow}>
              {[0, 1000, 2000, 5000, 10000, 20000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickChip, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
                  onPress={() => setOpeningBalanceInput(String(amt))}
                >
                  <Text style={[styles.quickChipText, { color: colors.text.primary }]}>
                    {amt === 0 ? '0' : `+${amt.toLocaleString()}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={t('common.confirm')}
              variant="success"
              size="lg"
              icon={<Unlock size={18} color="#fff" />}
              onPress={handleOpenSession}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* 2. Close Session Modal */}
      <Modal visible={closeModalVisible} transparent animationType="slide" onRequestClose={() => setCloseModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setCloseModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('cash.closeShift')}</Text>
            </View>

            {/* Expected Summary Banner */}
            {currentSession && (
              <View style={[styles.expectedSummaryBox, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}>
                <Text style={styles.expectedSummaryLabel}>{t('cash.expectedCash')}</Text>
                <Text style={[styles.expectedSummaryVal, { color: colors.primary[600] }]}>
                  {calculateExpectedBalance(currentSession).toLocaleString(localeStr)} {currency}
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign }]}>{t('cash.actualCash')} ({currency}) *</Text>
              <TextInput
                style={[styles.formInputAmount, { textAlign: 'center' }]}
                value={actualBalanceInput}
                onChangeText={setActualBalanceInput}
                keyboardType="numeric"
                placeholder="0"
                autoFocus
              />
            </View>

            {/* Live Difference Indicator */}
            {currentSession && actualBalanceInput !== '' && !isNaN(parseFloat(actualBalanceInput)) && (
              <View
                style={[
                  styles.diffFeedbackBox,
                  parseFloat(actualBalanceInput) - calculateExpectedBalance(currentSession) === 0
                    ? { backgroundColor: colors.emerald[50], borderColor: colors.emerald[200] }
                    : parseFloat(actualBalanceInput) - calculateExpectedBalance(currentSession) > 0
                    ? { backgroundColor: colors.primary[50], borderColor: colors.primary[200] }
                    : { backgroundColor: colors.danger.light, borderColor: colors.danger.border },
                ]}
              >
                <Text
                  style={[
                    styles.diffFeedbackText,
                    {
                      color:
                        parseFloat(actualBalanceInput) - calculateExpectedBalance(currentSession) === 0
                          ? colors.emerald[700]
                          : parseFloat(actualBalanceInput) - calculateExpectedBalance(currentSession) > 0
                          ? colors.primary[700]
                          : colors.danger.main,
                    },
                  ]}
                >
                  {parseFloat(actualBalanceInput) - calculateExpectedBalance(currentSession) === 0
                    ? `✓ ${t('cash.perfectMatch')}`
                    : parseFloat(actualBalanceInput) - calculateExpectedBalance(currentSession) > 0
                    ? `+ ${t('cash.surplus')}: ${(parseFloat(actualBalanceInput) - calculateExpectedBalance(currentSession)).toLocaleString(localeStr)} ${currency}`
                    : `- ${t('cash.deficit')}: ${Math.abs(parseFloat(actualBalanceInput) - calculateExpectedBalance(currentSession)).toLocaleString(localeStr)} ${currency}`}
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Input
                label={t('common.notes')}
                value={closeNotes}
                onChangeText={setCloseNotes}
                placeholder={t('common.optional')}
              />
            </View>

            <Button
              title={t('cash.confirmCloseShift')}
              variant="destructive"
              size="lg"
              icon={<Lock size={18} color="#fff" />}
              onPress={handleCloseSession}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* 3. Movement Modal (Deposit / Withdrawal) */}
      <Modal visible={movementModalVisible} transparent animationType="slide" onRequestClose={() => setMovementModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setMovementModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {movementType === 'deposit' ? t('cash.deposit') : t('cash.withdrawal')}
              </Text>
            </View>

            {/* Type Switcher */}
            <View style={[styles.capitalTypeSelector, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.capTypeBtn, movementType === 'deposit' && styles.capTypeBtnActiveDeposit]}
                onPress={() => setMovementType('deposit')}
                activeOpacity={0.7}
              >
                <Text style={[styles.capTypeBtnText, movementType === 'deposit' && { color: '#fff' }]}>
                  {t('cash.deposit')} (+)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.capTypeBtn, movementType === 'withdrawal' && styles.capTypeBtnActiveWithdraw]}
                onPress={() => setMovementType('withdrawal')}
                activeOpacity={0.7}
              >
                <Text style={[styles.capTypeBtnText, movementType === 'withdrawal' && { color: '#fff' }]}>
                  {t('cash.withdrawal')} (-)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign }]}>{t('common.total')} ({currency}) *</Text>
              <TextInput
                style={[styles.formInputAmount, { textAlign: 'center' }]}
                value={movementAmount}
                onChangeText={setMovementAmount}
                keyboardType="numeric"
                placeholder="0"
                autoFocus
              />
            </View>

            {/* Quick Chips */}
            <View style={styles.quickChipsRow}>
              {[500, 1000, 2000, 5000, 10000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickChip, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
                  onPress={() => setMovementAmount(String(amt))}
                >
                  <Text style={[styles.quickChipText, { color: colors.text.primary }]}>
                    {amt.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preset Reasons */}
            <View style={styles.quickChipsRow}>
              {[
                movementType === 'deposit' ? t('cash.reasonChange') : t('cash.reasonExpense'),
                movementType === 'deposit' ? t('cash.reasonDeposit') : t('cash.reasonBank'),
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.presetReasonChip, { borderColor: colors.border.default }]}
                  onPress={() => setMovementNote(reason)}
                >
                  <Text style={[styles.presetReasonText, { color: colors.text.secondary }]}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Input
                label={t('common.notes')}
                value={movementNote}
                onChangeText={setMovementNote}
                placeholder={t('common.optional')}
              />
            </View>

            <Button
              title={t('common.save')}
              variant={movementType === 'deposit' ? 'primary' : 'destructive'}
              size="lg"
              icon={<Check size={18} color="#fff" />}
              onPress={handleRecordMovement}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* 4. Capital Entry Modal */}
      <Modal visible={capitalModalVisible} transparent animationType="slide" onRequestClose={() => setCapitalModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setCapitalModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('cash.capital')}</Text>
            </View>

            <View style={[styles.capitalTypeSelector, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.capTypeBtn, capitalType === 'deposit' && styles.capTypeBtnActiveDeposit]}
                onPress={() => setCapitalType('deposit')}
                activeOpacity={0.7}
              >
                <Text style={[styles.capTypeBtnText, capitalType === 'deposit' && { color: '#fff' }]}>
                  {t('cash.capitalDeposit')} (+)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.capTypeBtn, capitalType === 'withdrawal' && styles.capTypeBtnActiveWithdraw]}
                onPress={() => setCapitalType('withdrawal')}
                activeOpacity={0.7}
              >
                <Text style={[styles.capTypeBtnText, capitalType === 'withdrawal' && { color: '#fff' }]}>
                  {t('cash.capitalWithdraw')} (-)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign }]}>{t('common.total')} ({currency}) *</Text>
              <TextInput
                style={[styles.formInputAmount, { textAlign: 'center' }]}
                value={capitalAmount}
                onChangeText={setCapitalAmount}
                keyboardType="numeric"
                placeholder="0"
                autoFocus
              />
            </View>

            {/* Quick Chips */}
            <View style={styles.quickChipsRow}>
              {[5000, 10000, 20000, 50000, 100000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickChip, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
                  onPress={() => setCapitalAmount(String(amt))}
                >
                  <Text style={[styles.quickChipText, { color: colors.text.primary }]}>
                    {amt.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Input
                label={t('common.notes')}
                value={capitalNote}
                onChangeText={setCapitalNote}
                placeholder={t('common.optional')}
              />
            </View>

            <Button
              title={t('common.save')}
              variant="indigo"
              size="lg"
              icon={<Check size={18} color="#fff" />}
              onPress={handleRecordCapital}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* 5. History Shift Details Breakdown Modal */}
      <Modal
        visible={Boolean(selectedHistorySession)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedHistorySession(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setSelectedHistorySession(null)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {t('cash.shiftDetails')} #{selectedHistorySession?.sessionNumber || (selectedHistorySession as any)?.number || 1}
              </Text>
            </View>

            {selectedHistorySession && (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: spacing.sm }}>
                  <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.receiptLabel}>{t('pos.cashierDefault')}</Text>
                    <Text style={[styles.receiptVal, { color: colors.text.primary }]}>
                      {selectedHistorySession.openedBy || (selectedHistorySession as any).opened_by || '—'}
                    </Text>
                  </View>

                  <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.receiptLabel}>{t('cash.initialCash')}</Text>
                    <Text style={[styles.receiptVal, { color: colors.text.primary }]}>
                      {(selectedHistorySession.openingBalance || (selectedHistorySession as any).opening_balance || 0).toLocaleString(localeStr)} {currency}
                    </Text>
                  </View>

                  <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.receiptLabel}>{t('sales.totalSales')}</Text>
                    <Text style={[styles.receiptVal, { color: colors.emerald[600] }]}>
                      +{(selectedHistorySession.totalSales || (selectedHistorySession as any).total_sales || 0).toLocaleString(localeStr)} {currency}
                    </Text>
                  </View>

                  <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.receiptLabel}>{t('cash.expectedCash')}</Text>
                    <Text style={[styles.receiptVal, { color: colors.primary[600] }]}>
                      {(selectedHistorySession.expectedBalance || (selectedHistorySession as any).expected_balance || 0).toLocaleString(localeStr)} {currency}
                    </Text>
                  </View>

                  <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.receiptLabel}>{t('cash.actualCash')}</Text>
                    <Text style={[styles.receiptVal, { color: colors.text.primary, fontWeight: '800' }]}>
                      {((selectedHistorySession as any).closing_balance || selectedHistorySession.closingBalance || 0).toLocaleString(localeStr)} {currency}
                    </Text>
                  </View>

                  <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopWidth: 1, borderTopColor: colors.border.default, paddingTop: spacing.xs }]}>
                    <Text style={[styles.receiptLabel, { fontWeight: '800' }]}>{t('cash.cashDifference')}</Text>
                    <Text
                      style={[
                        styles.receiptVal,
                        {
                          fontWeight: '800',
                          color:
                            ((selectedHistorySession as any).difference || 0) === 0
                              ? colors.emerald[600]
                              : ((selectedHistorySession as any).difference || 0) > 0
                              ? colors.primary[600]
                              : colors.danger.main,
                        },
                      ]}
                    >
                      {((selectedHistorySession as any).difference || 0) > 0 ? '+' : ''}
                      {((selectedHistorySession as any).difference || 0).toLocaleString(localeStr)} {currency}
                    </Text>
                  </View>

                  {selectedHistorySession.note ? (
                    <View style={{ marginTop: spacing.xs, backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50], padding: spacing.sm, borderRadius: radii.md }}>
                      <Text style={[styles.receiptLabel, { marginBottom: 2 }]}>{t('common.notes')}:</Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{selectedHistorySession.note}</Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            )}

            <Button
              title={t('common.close')}
              variant="outline"
              size="md"
              onPress={() => setSelectedHistorySession(null)}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },

    // Header
    header: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    headerContent: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerBackBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.circle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleBox: {
      flex: 1,
      marginHorizontal: spacing.md,
    },
    screenTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    refreshBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.circle,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Tabs
    tabsRow: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
      gap: spacing.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: radii.xl,
      backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
      borderWidth: 1,
      borderColor: isDark ? colors.border.default : colors.slate[200],
    },
    tabActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[700],
      ...shadows.xs,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    tabTextActive: {
      color: '#ffffff',
    },
    tabBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radii.circle,
    },
    tabBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },

    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: spacing.xxxl,
    },

    // Hero Active Shift Card
    heroCard: {
      padding: spacing.lg,
      borderRadius: radii.xxl,
      borderWidth: 1,
      borderColor: colors.border.default,
      gap: spacing.md,
    },
    heroHeader: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sessionNumberText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    cashierBadge: {
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
      backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[100],
    },
    cashierName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },

    heroBalanceBox: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    heroBalanceLabel: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
      marginBottom: 2,
    },
    heroBalanceValue: {
      fontSize: 32,
      fontWeight: '900',
      color: colors.text.primary,
      fontFamily: 'Cairo',
      letterSpacing: -0.5,
    },
    heroBalanceCurrency: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primary[600],
      fontFamily: 'Cairo',
    },

    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    kpiBox: {
      width: '48%',
      flexGrow: 1,
      padding: spacing.md,
      borderRadius: radii.xl,
      alignItems: 'center',
      gap: 2,
    },
    kpiBoxLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    kpiBoxValue: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },

    heroFooterRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    heroFooterText: {
      fontSize: 11.5,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },

    // Action Buttons
    actionButtonsGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.md,
      borderRadius: radii.xl,
      ...shadows.sm,
    },
    actionBtnText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: '#ffffff',
      fontFamily: 'Cairo',
    },

    // Movements List Card
    movementsCard: {
      padding: spacing.md,
      borderRadius: radii.xxl,
      gap: spacing.md,
    },
    movementsHeader: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    movementsTitle: {
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
    emptyMovementsBox: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      gap: 4,
    },
    emptyMovementsText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    emptyMovementsSub: {
      fontSize: 11.5,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
      textAlign: 'center',
    },
    movementItem: {
      alignItems: 'center',
      padding: spacing.sm + 2,
      borderRadius: radii.lg,
      gap: spacing.sm,
    },
    movementIconBox: {
      width: 32,
      height: 32,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    movementInfo: {
      flex: 1,
      gap: 1,
    },
    movementNote: {
      fontSize: 12.5,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    movementMeta: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    movementAmountText: {
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },

    // Closed Session Card
    closedCard: {
      padding: spacing.xxl,
      alignItems: 'center',
      marginTop: spacing.md,
      borderRadius: radii.xxl,
    },
    closedIconBox: {
      width: 76,
      height: 76,
      borderRadius: radii.circle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    closedTitle: {
      fontSize: 18,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
    closedSub: {
      fontSize: 13,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
      textAlign: 'center',
      marginVertical: spacing.md,
      lineHeight: 21,
    },

    // Summary Bento
    summaryBento: {
      padding: spacing.md,
      borderRadius: radii.xl,
    },
    summaryBentoRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    summaryBentoItem: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    summaryBentoLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    summaryBentoVal: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    summaryDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.border.default,
    },

    // History Card
    historyCard: {
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: radii.xl,
    },
    historyLeft: {
      alignItems: 'flex-start',
      gap: 4,
    },
    historyRight: {
      flex: 1,
      marginRight: spacing.md,
      gap: 2,
    },
    historyNumber: {
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
    historyDate: {
      fontSize: 11.5,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    historyTotal: {
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },

    // Receipt Row in Modal
    receiptRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    receiptLabel: {
      fontSize: 12.5,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    receiptVal: {
      fontSize: 13,
      fontFamily: 'Cairo',
    },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
      maxHeight: '90%',
    },
    modalHeader: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    closeModalBtn: {
      padding: 4,
    },
    modalTitle: {
      fontSize: 16.5,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },

    expectedSummaryBox: {
      padding: spacing.md,
      borderRadius: radii.xl,
      alignItems: 'center',
      gap: 2,
    },
    expectedSummaryLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    expectedSummaryVal: {
      fontSize: 20,
      fontWeight: '900',
      fontFamily: 'Cairo',
    },

    diffFeedbackBox: {
      padding: spacing.sm + 2,
      borderRadius: radii.lg,
      borderWidth: 1,
      alignItems: 'center',
    },
    diffFeedbackText: {
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },

    capitalTypeSelector: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    capTypeBtn: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      alignItems: 'center',
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      borderWidth: 1,
      borderColor: isDark ? colors.border.default : colors.slate[200],
    },
    capTypeBtnActiveDeposit: {
      backgroundColor: colors.emerald[600],
      borderColor: colors.emerald[700],
    },
    capTypeBtnActiveWithdraw: {
      backgroundColor: colors.danger.main,
      borderColor: colors.danger.dark,
    },
    capTypeBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },

    quickChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      justifyContent: 'center',
    },
    quickChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.full,
    },
    quickChipText: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    presetReasonChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    presetReasonText: {
      fontSize: 11.5,
      fontWeight: '600',
      fontFamily: 'Cairo',
    },

    formGroup: {
      gap: spacing.xs,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    formInputAmount: {
      backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: colors.primary[500],
      padding: spacing.md,
      fontSize: 26,
      fontWeight: '900',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
  });

export default CashScreen;
