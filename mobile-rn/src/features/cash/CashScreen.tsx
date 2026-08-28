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
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  Clock,
  Check,
  X,
  History,
  TrendingUp,
  AlertCircle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { CashSession, CapitalEntry } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, EmptyState } from '@/components/ui';

export const CashScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { isDark, colors } = useTheme();
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

  useEffect(() => {
    loadCashData();
  }, []);

  async function loadCashData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allSessions, allCapital] = await Promise.all([
        db.cashSessions.toArray(),
        db.capitalEntries.toArray(),
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
        opened_by: user?.name || 'كاشير',
        openedBy: user?.name || 'كاشير',
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
      Alert.alert('✓ تم فتح الصندوق', 'تم فتح مناوبة الصندوق بنجاح ويمكن الآن إتمام عمليات البيع.');
      await loadCashData();
    } catch (err) {
      Alert.alert('خطأ', `فشل فتح الصندوق: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
  };

  // 2. Close Session
  const handleCloseSession = async () => {
    if (!currentSession) return;
    const actual = parseFloat(actualBalanceInput);
    if (isNaN(actual)) {
      Alert.alert('تنبيه', 'يرجى إدخال المبلغ الفعلي الموجود في الدرج');
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
        '✓ تم إغلاق الصندوق',
        `تم إغلاق المناوبة بنجاح.\nالمبلغ الفعلي: ${actual.toLocaleString('ar-DZ')} دج\nالفارق: ${diff > 0 ? '+' : ''}${diff.toLocaleString('ar-DZ')} دج`
      );
      await loadCashData();
    } catch (err) {
      Alert.alert('خطأ', 'فشل إغلاق الصندوق');
    }
  };

  // 3. Record Cash Movement
  const handleRecordMovement = async () => {
    if (!currentSession) return;
    const amt = parseFloat(movementAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال مبلغ صحيح');
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
        note: movementNote || (movementType === 'deposit' ? 'إيداع نقدي' : 'سحب نقدي'),
        date: new Date().toISOString(),
        user: user?.name || 'كاشير',
      });

      await db.cashSessions.update(currentSession.id, {
        deposits: JSON.stringify(deps),
        updated_at: new Date().toISOString(),
      });

      setMovementModalVisible(false);
      setMovementAmount('');
      setMovementNote('');
      Alert.alert('✓ تم التسجيل', `تم تسجيل عملية ال${movementType === 'deposit' ? 'إيداع' : 'سحب'} بنجاح`);
      await loadCashData();
    } catch (err) {
      Alert.alert('خطأ', 'فشل تسجيل حركة الصندوق');
    }
  };

  // 4. Record Capital Entry
  const handleRecordCapital = async () => {
    const amt = parseFloat(capitalAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      await db.capitalEntries.add({
        id: generateId(),
        type: capitalType,
        amount: amt,
        note: capitalNote || (capitalType === 'deposit' ? 'إيداع رأس مال' : 'سحب أرباح'),
        date: nowIso,
        created_at: nowIso,
      });

      setCapitalModalVisible(false);
      setCapitalAmount('');
      setCapitalNote('');
      Alert.alert('✓ تم التسجيل', 'تم تسجيل حركة رأس المال بنجاح');
      await loadCashData();
    } catch (err) {
      Alert.alert('خطأ', 'فشل تسجيل حركة رأس المال');
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
        <View style={styles.headerRight}>
          <Text style={styles.screenTitle}>إدارة الصندوق والمناوبات</Text>
          <View style={styles.subtitleRow}>
            <Badge
              variant={currentSession ? 'success' : 'danger'}
              size="xs"
              dot
            >
              {currentSession ? 'المناوبة الحالية مفتوحة' : 'الصندوق مقفل'}
            </Badge>
          </View>
        </View>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.tabActive]}
          onPress={() => setActiveTab('current')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.tabTextActive]}>
            المناوبة الحالية
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            سجل المناوبات
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'capital' && styles.tabActive]}
          onPress={() => setActiveTab('capital')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'capital' && styles.tabTextActive]}>
            رأس المال
          </Text>
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
            /* Open Session Details */
            <View style={{ gap: spacing.md }}>
              <Card variant="elevated" style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Badge variant="emerald" size="sm" dot>
                    مناوبة نشطة
                  </Badge>
                  <Text style={styles.sessionNumberText}>
                    مناوبة #{currentSession.sessionNumber || (currentSession as any).number || 1}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.sessionInfoGrid}>
                  <View style={styles.sessionInfoRow}>
                    <Text style={styles.sessionVal}>{currentSession.openedBy || (currentSession as any).opened_by || 'الكاشير'}</Text>
                    <Text style={styles.sessionLabel}>المسؤول</Text>
                  </View>
                  <View style={styles.sessionInfoRow}>
                    <Text style={styles.sessionVal}>
                      {new Date(currentSession.openedAt || (currentSession as any).opened_at).toLocaleTimeString('ar-DZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text style={styles.sessionLabel}>وقت الفتح</Text>
                  </View>
                  <View style={styles.sessionInfoRow}>
                    <Text style={styles.sessionVal}>
                      {(currentSession.openingBalance || (currentSession as any).opening_balance || 0).toLocaleString('ar-DZ')} دج
                    </Text>
                    <Text style={styles.sessionLabel}>الرصيد الافتتاحي</Text>
                  </View>
                  <View style={styles.sessionInfoRow}>
                    <Text style={[styles.sessionVal, { color: colors.emerald[700] }]}>
                      {(currentSession.totalSales || (currentSession as any).total_sales || 0).toLocaleString('ar-DZ')} دج
                    </Text>
                    <Text style={styles.sessionLabel}>إجمالي مبيعات المناوبة</Text>
                  </View>
                </View>

                <View style={styles.expectedBox}>
                  <Text style={styles.expectedVal}>
                    {calculateExpectedBalance(currentSession).toLocaleString('ar-DZ')} <Text style={styles.expectedCurrency}>دج</Text>
                  </Text>
                  <Text style={styles.expectedLabel}>الرصيد المتوقع في الدرج حالياً</Text>
                </View>
              </Card>

              {/* Action Buttons Grid */}
              <View style={styles.actionButtonsGrid}>
                <Button
                  title="إيداع نقدي"
                  variant="primary"
                  size="md"
                  icon={<ArrowDownLeft size={18} color="#fff" />}
                  onPress={() => {
                    setMovementType('deposit');
                    setMovementModalVisible(true);
                  }}
                  style={{ flex: 1 }}
                />

                <Button
                  title="سحب نقدي"
                  variant="outline"
                  size="md"
                  icon={<ArrowUpRight size={18} color={colors.slate[800]} />}
                  onPress={() => {
                    setMovementType('withdrawal');
                    setMovementModalVisible(true);
                  }}
                  style={{ flex: 1 }}
                />
              </View>

              {/* Close Session Button */}
              <Button
                title="إغلاق مناوبة الصندوق الحالية"
                variant="destructive"
                size="lg"
                icon={<Lock size={18} color="#fff" />}
                onPress={() => {
                  setActualBalanceInput(String(calculateExpectedBalance(currentSession)));
                  setCloseModalVisible(true);
                }}
                fullWidth
              />
            </View>
          ) : (
            /* Closed State */
            <Card variant="elevated" style={styles.closedCard}>
              <View style={styles.closedIconBox}>
                <Lock size={36} color={colors.slate[400]} />
              </View>
              <Text style={styles.closedTitle}>الصندوق مقفل حالياً</Text>
              <Text style={styles.closedSub}>
                لبدء عمليات البيع وإصدار الفواتير، يجب أولاً فتح مناوبة يومية وتحديد الرصيد الافتتاحي.
              </Text>
              <Button
                title="فتح مناوبة جديدة الآن"
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
          /* Shift History */
          <View style={{ gap: spacing.sm }}>
            {sessions.length === 0 ? (
              <EmptyState
                icon={<History size={32} color={colors.primary[600]} />}
                title="لا توجد مناوبات مسجلة"
                description="ستظهر جميع المناوبات السابقة هنا بمجرد إغلاق أول مناوبة"
              />
            ) : (
              sessions.map((s) => {
                const isOpen = s.status === 'open';
                const diff = (s as any).difference || 0;

                return (
                  <Card key={s.id} style={styles.historyCard}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyTotal}>
                        {((s as any).closing_balance || s.closingBalance || s.openingBalance || 0).toLocaleString('ar-DZ')} دج
                      </Text>
                      {s.status === 'closed' && (
                        <Badge
                          variant={diff === 0 ? 'neutral' : diff > 0 ? 'success' : 'danger'}
                          size="xs"
                        >
                          الفارق: {diff > 0 ? '+' : ''}{diff.toLocaleString('ar-DZ')} دج
                        </Badge>
                      )}
                    </View>

                    <View style={styles.historyRight}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Text style={styles.historyNumber}>
                          مناوبة #{s.sessionNumber || (s as any).number || 1}
                        </Text>
                        <Badge variant={isOpen ? 'emerald' : 'neutral'} size="xs" dot>
                          {isOpen ? 'مفتوحة' : 'مغلقة'}
                        </Badge>
                      </View>
                      <Text style={styles.historyDate}>
                        {new Date(s.openedAt || (s as any).opened_at).toLocaleDateString('ar-DZ')} • {s.openedBy || (s as any).opened_by}
                      </Text>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        ) : (
          /* Capital Entries */
          <View style={{ gap: spacing.md }}>
            <Button
              title="تسجيل حركة رأس مال جديدة"
              variant="indigo"
              size="md"
              icon={<Plus size={18} color="#fff" />}
              onPress={() => setCapitalModalVisible(true)}
              fullWidth
            />

            {capitalEntries.length === 0 ? (
              <EmptyState
                icon={<Wallet size={32} color={colors.indigo[600]} />}
                title="لا توجد حركات رأس مال"
                description="يمكنك تسجيل إيداعات وسحوبات رأس المال لمتابعة السيولة بدقة"
              />
            ) : (
              capitalEntries.map((c) => (
                <Card key={c.id} style={styles.historyCard}>
                  <View style={styles.historyLeft}>
                    <Text
                      style={[
                        styles.historyTotal,
                        { color: c.type === 'deposit' ? colors.emerald[700] : colors.danger.main },
                      ]}
                    >
                      {c.type === 'deposit' ? '+' : '-'}
                      {(c.amount || 0).toLocaleString('ar-DZ')} دج
                    </Text>
                    <Badge variant={c.type === 'deposit' ? 'emerald' : 'danger'} size="xs">
                      {c.type === 'deposit' ? 'إيداع' : 'سحب'}
                    </Badge>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyNumber}>
                      {c.type === 'deposit' ? 'إيداع رأس مال' : 'سحب أرباح'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(c.date || (c as any).createdAt || '').toLocaleDateString('ar-DZ')} • {c.note || '—'}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Open Session Modal */}
      <Modal visible={openModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setOpenModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>فتح مناوبة صندوق جديدة</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>الرصيد الافتتاحي في الدرج (الفكة بالدينار)</Text>
              <TextInput
                style={styles.formInputAmount}
                value={openingBalanceInput}
                onChangeText={setOpeningBalanceInput}
                keyboardType="numeric"
                placeholder="0"
                textAlign="center"
                autoFocus
              />
            </View>

            <Button
              title="تأكيد فتح المناوبة"
              variant="success"
              size="lg"
              icon={<Unlock size={18} color="#fff" />}
              onPress={handleOpenSession}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* Close Session Modal */}
      <Modal visible={closeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCloseModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إغلاق مناوبة الصندوق</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>المبلغ الفعلي المحسوب في الدرج (دج) *</Text>
              <TextInput
                style={styles.formInputAmount}
                value={actualBalanceInput}
                onChangeText={setActualBalanceInput}
                keyboardType="numeric"
                placeholder="0"
                textAlign="center"
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Input
                label="ملاحظات الإغلاق"
                value={closeNotes}
                onChangeText={setCloseNotes}
                placeholder="سبب الفارق إن وجد..."
              />
            </View>

            <Button
              title="تأكيد إغلاق الصندوق"
              variant="destructive"
              size="lg"
              icon={<Lock size={18} color="#fff" />}
              onPress={handleCloseSession}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* Movement Modal (Deposit / Withdrawal) */}
      <Modal visible={movementModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setMovementModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {movementType === 'deposit' ? 'إيداع نقدي في الصندوق' : 'سحب نقدي من الصندوق'}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>المبلغ (دج) *</Text>
              <TextInput
                style={styles.formInputAmount}
                value={movementAmount}
                onChangeText={setMovementAmount}
                keyboardType="numeric"
                placeholder="0"
                textAlign="center"
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Input
                label="السبب أو الملاحظة"
                value={movementNote}
                onChangeText={setMovementNote}
                placeholder="تغذية الصندوق / مصاريف سريعة..."
              />
            </View>

            <Button
              title="حفظ الحركة"
              variant={movementType === 'deposit' ? 'primary' : 'destructive'}
              size="lg"
              icon={<Check size={18} color="#fff" />}
              onPress={handleRecordMovement}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* Capital Entry Modal */}
      <Modal visible={capitalModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCapitalModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>حركة رأس المال</Text>
            </View>

            <View style={styles.capitalTypeSelector}>
              <TouchableOpacity
                style={[styles.capTypeBtn, capitalType === 'deposit' && styles.capTypeBtnActiveDeposit]}
                onPress={() => setCapitalType('deposit')}
                activeOpacity={0.7}
              >
                <Text style={[styles.capTypeBtnText, capitalType === 'deposit' && { color: '#fff' }]}>
                  إيداع رأس مال (+)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.capTypeBtn, capitalType === 'withdrawal' && styles.capTypeBtnActiveWithdraw]}
                onPress={() => setCapitalType('withdrawal')}
                activeOpacity={0.7}
              >
                <Text style={[styles.capTypeBtnText, capitalType === 'withdrawal' && { color: '#fff' }]}>
                  سحب أرباح (-)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>المبلغ (دج) *</Text>
              <TextInput
                style={styles.formInputAmount}
                value={capitalAmount}
                onChangeText={setCapitalAmount}
                keyboardType="numeric"
                placeholder="0"
                textAlign="center"
              />
            </View>

            <View style={styles.formGroup}>
              <Input
                label="ملاحظات"
                value={capitalNote}
                onChangeText={setCapitalNote}
                placeholder="إضافة سيولة شخصية / سحب أرباح..."
              />
            </View>

            <Button
              title="تأكيد تسجيل العملية"
              variant="indigo"
              size="lg"
              icon={<Check size={18} color="#fff" />}
              onPress={handleRecordCapital}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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

  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
  subtitleRow: {
    marginTop: spacing.xs,
  },

  tabsRow: {
    flexDirection: 'row',
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
    borderRadius: radii.lg,
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

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  // Active Session View
  activeSessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emerald[50],
    borderWidth: 1,
    borderColor: colors.emerald[200],
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  activeIconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.emerald[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSessionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald[800],
    fontFamily: 'Cairo',
  },
  activeSessionSub: {
    fontSize: 12,
    color: colors.emerald[600],
    fontFamily: 'Cairo',
    marginTop: 1,
  },

  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.text.primary,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },

  totalsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
    fontFamily: 'Cairo',
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  totalLabel: {
    fontSize: 12.5,
    color: colors.text.secondary,
    fontFamily: 'Cairo',
  },
  totalVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
  netRow: {
    borderBottomWidth: 0,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
  netVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary[700],
    fontFamily: 'Cairo',
  },

  actionButtonsGroup: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  // Closed Session View
  closedCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  closedIconBox: {
    width: 72,
    height: 72,
    borderRadius: radii.circle,
    backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  closedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
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

  // History Card
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  historyLeft: {
    alignItems: 'flex-start',
    gap: 4,
  },
  historyRight: {
    alignItems: 'flex-end',
    flex: 1,
    marginRight: spacing.md,
    gap: 2,
  },
  historyNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
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
    color: colors.text.primary,
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
  },
  modalHeader: {
    flexDirection: 'row',
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

  formGroup: {
    gap: spacing.xs,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  formInputAmount: {
    backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    padding: spacing.md,
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
});

export default CashScreen;
