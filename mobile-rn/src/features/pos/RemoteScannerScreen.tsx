/**
 * RemoteScannerScreen — MOBILE-SCANNER-001
 * شاشة قارئ الباركود عن بُعد: تمسح الباركود وتُرسله مباشرة لنقطة البيع على الكمبيوتر
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Vibration,
  NativeEventEmitter,
  NativeModules,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';
import {
  ScanBarcode,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Layers,
  Square,
  Keyboard,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MonitorSmartphone,
  X,
  RefreshCw,
  Package,
  ShoppingCart,
  Link,
} from 'lucide-react-native';
import { AnposCamera, type ScanResult } from '@/modules/AnposCamera';
import { electronAPI } from '@/lib/apiClient';
import { session } from '@/lib/apiClient';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';

const CameraEventEmitter = new NativeEventEmitter(NativeModules.AnposCamera);

type ScannerMode = 'single' | 'multi';

interface ScannedItem {
  barcode: string;
  productName?: string;
  price?: number;
  found: boolean;
  sentAt: string;
  qty: number;
}

export default function RemoteScannerScreen({ navigation }: any) {
  const { isDark, colors } = useTheme();
  const { isRTL } = useI18n();

  const [mode, setMode] = useState<ScannerMode>('single');
  const [connected, setConnected] = useState<boolean | null>(null); // null = checking
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [lastFeedback, setLastFeedback] = useState<ScannedItem | null>(null);
  const [sending, setSending] = useState(false);

  const hasScannedSingle = useRef(false);
  const lastCodeRef = useRef('');
  const lastTimeRef = useRef(0);

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  // ── معالجة زر الرجوع الفعلي للهاتف ──
  useEffect(() => {
    const onBackPress = () => {
      if (scanning) {
        try { AnposCamera.stopScan(); } catch {}
        setScanning(false);
        hasScannedSingle.current = false;
        return true;
      }
      navigation.goBack();
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [scanning, navigation]);

  // ── التحقق من الاتصال بالكمبيوتر عند فتح الشاشة ──
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = useCallback(async () => {
    setConnected(null);
    try {
      const isConn = await session.isConnected();
      if (!isConn) {
        setConnected(false);
        return;
      }
      const status = await electronAPI.pos.status();
      setConnected(status.ok);
    } catch {
      setConnected(false);
    }
  }, []);

  // ── أنيميشن خط المسح ──
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── تشغيل الكاميرا والاستماع للأحداث ──
  useEffect(() => {
    if (manualMode || !scanning) return;

    const startCamera = async () => {
      try {
        const granted = await AnposCamera.requestPermission();
        if (!granted) {
          setManualMode(true);
          return;
        }
        AnposCamera.startScan();
      } catch {
        setManualMode(true);
      }
    };

    const handleCodeEvent = (result: ScanResult | { code?: string } | string) => {
      const rawCode = typeof result === 'string' ? result : result?.code;
      const code = rawCode?.trim();
      if (!code) return;

      const now = Date.now();

      if (mode === 'single') {
        if (hasScannedSingle.current) return;
        hasScannedSingle.current = true;
        try { AnposCamera.stopScan(); } catch {}
        setScanning(false);
        sendBarcode(code, 1);
      } else {
        // debounce 1.4s في الوضع المتعدد
        if (code === lastCodeRef.current && now - lastTimeRef.current < 1400) return;
        lastCodeRef.current = code;
        lastTimeRef.current = now;
        try { Vibration.vibrate(35); } catch {}
        sendBarcode(code, 1);
      }
    };

    const handleCloseEvent = () => {
      setScanning(false);
      hasScannedSingle.current = false;
    };

    const sub1 = CameraEventEmitter.addListener('onBarcodeScan', handleCodeEvent);
    const sub2 = CameraEventEmitter.addListener('onBarcodeScanned', handleCodeEvent);
    const subClose = CameraEventEmitter.addListener('onBarcodeScannerClose', handleCloseEvent);
    startCamera();

    return () => {
      sub1.remove();
      sub2.remove();
      subClose.remove();
      try { AnposCamera.stopScan(); } catch {}
    };
  }, [scanning, manualMode, mode]);

  // ── إرسال الباركود للكمبيوتر ──
  const sendBarcode = useCallback(async (barcode: string, qty: number) => {
    setSending(true);
    try {
      const result = await electronAPI.pos.scan(barcode, qty);

      const item: ScannedItem = {
        barcode,
        productName: result.product?.name,
        price: result.product?.price,
        found: result.found,
        sentAt: new Date().toLocaleTimeString('ar-DZ'),
        qty,
      };

      setScannedItems((prev) => [item, ...prev.slice(0, 49)]);
      setLastFeedback(item);

      // أنيميشن الـ feedback
      feedbackOpacity.setValue(1);
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 3500,
        delay: 2000,
        useNativeDriver: true,
      }).start();

      // pulse effect
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      if (result.found) {
        Vibration.vibrate([0, 40, 60, 40]);
      } else {
        Vibration.vibrate([0, 100, 80, 100]);
      }
    } catch (err: any) {
      Alert.alert('خطأ في الإرسال', err?.message || 'تعذر إرسال الباركود للكمبيوتر');
    } finally {
      setSending(false);
    }
  }, [mode, scanning, manualMode, feedbackOpacity, pulseAnim]);

  // ── إرسال يدوي ──
  const handleManualSubmit = useCallback(() => {
    const code = manualCode.trim();
    if (!code) return;
    sendBarcode(code, 1);
    setManualCode('');
  }, [manualCode, sendBarcode]);

  const BackArrow = isRTL ? ChevronRight : ChevronLeft;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border.default }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <BackArrow size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>قارئ POS عن بُعد</Text>
          <Text style={[styles.headerSub, { color: colors.text.secondary }]}>
            {scannedItems.length > 0 ? `${scannedItems.length} باركود مُرسل` : 'اضغط ابدأ المسح'}
          </Text>
        </View>
        <TouchableOpacity onPress={checkConnection} style={styles.connBtn} activeOpacity={0.7}>
          {connected === null ? (
            <RefreshCw size={18} color={colors.text.secondary} />
          ) : connected ? (
            <Wifi size={18} color="#22c55e" />
          ) : (
            <WifiOff size={18} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Connection Banner ── */}
      {connected === false && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color="#fbbf24" />
          <Text style={styles.offlineBannerText}>
            غير متصل بالكمبيوتر — تأكد من تشغيل البرنامج والاتصال بنفس الشبكة
          </Text>
          <View style={styles.bannerActions}>
            <TouchableOpacity onPress={checkConnection} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Pair')} style={styles.pairLinkBtn}>
              <Link size={13} color="#fff" />
              <Text style={styles.pairLinkBtnText}>إقران الهاتف</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Mode & Controls Bar ── */}
      <View style={[styles.controlsBar, { backgroundColor: colors.surfaceElevated }]}>
        {/* Mode Pills */}
        <View style={styles.modePills}>
          <TouchableOpacity
            style={[styles.modePill, mode === 'single' && styles.modePillActive]}
            activeOpacity={0.8}
            onPress={() => { hasScannedSingle.current = false; setMode('single'); }}
          >
            <Square size={12} color={mode === 'single' ? '#fff' : colors.text.secondary} />
            <Text style={[styles.modePillText, { color: mode === 'single' ? '#fff' : colors.text.secondary }]}>
              مرة واحدة
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, mode === 'multi' && styles.modePillActive]}
            activeOpacity={0.8}
            onPress={() => setMode('multi')}
          >
            <Layers size={12} color={mode === 'multi' ? '#fff' : colors.text.secondary} />
            <Text style={[styles.modePillText, { color: mode === 'multi' ? '#fff' : colors.text.secondary }]}>
              متعدد
            </Text>
          </TouchableOpacity>
        </View>

        {/* Manual Toggle */}
        <TouchableOpacity
          style={[styles.manualToggle, { borderColor: colors.border.default }]}
          activeOpacity={0.7}
          onPress={() => setManualMode((m) => !m)}
        >
          {manualMode ? <ScanBarcode size={16} color={colors.primary[500]} /> : <Keyboard size={16} color={colors.text.secondary} />}
        </TouchableOpacity>
      </View>

      {/* ── Main Area ── */}
      {manualMode ? (
        <KeyboardAvoidingView
          style={styles.manualArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.manualCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border.default }]}>
            <ScanBarcode size={32} color={colors.primary[500]} style={styles.manualIcon} />
            <Text style={[styles.manualLabel, { color: colors.text.primary }]}>إدخال باركود يدوي</Text>
            <TextInput
              style={[styles.manualInput, { backgroundColor: colors.background, borderColor: colors.primary[500], color: colors.text.primary }]}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="مثال: 6131234567890"
              placeholderTextColor={colors.text.secondary}
              keyboardType="default"
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleManualSubmit}
              textAlign="center"
            />
            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={handleManualSubmit}
              disabled={sending || !manualCode.trim()}
              activeOpacity={0.85}
            >
              <ShoppingCart size={18} color="#fff" />
              <Text style={styles.sendBtnText}>
                {sending ? 'جاري الإرسال...' : 'إضافة للسلة'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.cameraArea}>
          {/* Start/Stop Button or Result View */}
          {!scanning ? (
            <View style={styles.idleContainer}>
              {lastFeedback && (
                <View style={[styles.lastResultCard, { backgroundColor: colors.surfaceElevated, borderColor: lastFeedback.found ? '#22c55e' : '#ef4444' }]}>
                  <View style={[styles.lastResultHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {lastFeedback.found ? (
                      <CheckCircle2 size={24} color="#22c55e" />
                    ) : (
                      <XCircle size={24} color="#ef4444" />
                    )}
                    <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={[styles.lastResultTitle, { color: colors.text.primary }]}>
                        {lastFeedback.found ? (lastFeedback.productName || 'تم التعرف على المنتج') : 'باركود غير مسجل'}
                      </Text>
                      <Text style={[styles.lastResultCode, { color: colors.text.secondary }]}>
                        {lastFeedback.barcode}
                      </Text>
                    </View>
                    {lastFeedback.found && lastFeedback.price !== undefined && (
                      <Text style={[styles.lastResultPrice, { color: colors.primary[600] }]}>
                        {lastFeedback.price} د.ج
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.lastResultStatus, { color: lastFeedback.found ? '#16a34a' : '#dc2626', textAlign: isRTL ? 'right' : 'left' }]}>
                    {lastFeedback.found ? '✓ أُضيف مباشرة لسلة البيع على الكمبيوتر' : '✗ غير مسجل في قاعدة البيانات'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.startBtn, { opacity: connected === false ? 0.5 : 1 }]}
                activeOpacity={0.85}
                disabled={connected === false}
                onPress={() => {
                  hasScannedSingle.current = false;
                  lastCodeRef.current = '';
                  setScanning(true);
                }}
              >
                <ScanBarcode size={26} color="#fff" />
                <Text style={styles.startBtnText}>
                  {lastFeedback ? 'مسح باركود آخر' : 'ابدأ المسح بالهاتف'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exitBtn, { borderColor: colors.border.default }]}
                activeOpacity={0.8}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.exitBtnText, { color: colors.text.secondary }]}>
                  العودة للشاشة الرئيسية
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.scannerContainer}>
              {/* Feedback Badge */}
              {lastFeedback && (
                <Animated.View
                  style={[
                    styles.feedbackBadge,
                    lastFeedback.found ? styles.feedbackFound : styles.feedbackNotFound,
                    { opacity: feedbackOpacity },
                  ]}
                >
                  {lastFeedback.found ? (
                    <CheckCircle2 size={16} color="#34d399" />
                  ) : (
                    <XCircle size={16} color="#f87171" />
                  )}
                  <Text style={styles.feedbackText}>
                    {lastFeedback.found
                      ? `✓ ${lastFeedback.productName ?? lastFeedback.barcode}`
                      : `✗ باركود غير موجود: ${lastFeedback.barcode}`}
                  </Text>
                </Animated.View>
              )}

              {/* Viewfinder */}
              <Animated.View style={[styles.viewfinderWrap, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.viewfinder}>
                  <View style={[styles.corner, styles.cTL]} />
                  <View style={[styles.corner, styles.cTR]} />
                  <View style={[styles.corner, styles.cBL]} />
                  <View style={[styles.corner, styles.cBR]} />
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [{
                          translateY: scanLineAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, FRAME_H - 6],
                          }),
                        }],
                      },
                    ]}
                  />
                </View>
              </Animated.View>

              {/* Counter + Stop */}
              <View style={styles.scanActionsRow}>
                {mode === 'multi' && (
                  <View style={styles.counterBadge}>
                    <Text style={styles.counterNum}>{scannedItems.length}</Text>
                    <Text style={styles.counterLabel}>مُرسل</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.stopBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    setScanning(false);
                    try { AnposCamera.stopScan(); } catch {}
                  }}
                >
                  <X size={16} color="#fff" />
                  <Text style={styles.stopBtnText}>إيقاف</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.hintText}>
                وجّه الكاميرا نحو الباركود — يُضاف للسلة في الكمبيوتر تلقائياً
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── History List ── */}
      {scannedItems.length > 0 && (
        <View style={[styles.historySection, { backgroundColor: colors.surface, borderTopColor: colors.border.default }]}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.text.primary }]}>
              السجل ({scannedItems.length})
            </Text>
            <TouchableOpacity onPress={() => setScannedItems([])} style={styles.clearBtn}>
              <Trash2 size={14} color={colors.text.secondary} />
              <Text style={[styles.clearBtnText, { color: colors.text.secondary }]}>مسح</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
            {scannedItems.map((item, idx) => (
              <View
                key={`${item.barcode}-${idx}`}
                style={[
                  styles.historyItem,
                  { borderBottomColor: colors.border.default },
                ]}
              >
                <View style={[styles.historyIconBox, item.found ? styles.iconFound : styles.iconNotFound]}>
                  {item.found ? (
                    <Package size={14} color="#22c55e" />
                  ) : (
                    <XCircle size={14} color="#ef4444" />
                  )}
                </View>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyName, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.found && item.productName ? item.productName : item.barcode}
                  </Text>
                  {item.found && item.price !== undefined && (
                    <Text style={[styles.historyPrice, { color: colors.text.secondary }]}>
                      {item.price.toLocaleString('ar-DZ', { minimumFractionDigits: 2 })} د.ج
                    </Text>
                  )}
                  {!item.found && (
                    <Text style={styles.historyNotFound}>غير موجود في قاعدة البيانات</Text>
                  )}
                </View>
                <Text style={[styles.historyTime, { color: colors.text.secondary }]}>{item.sentAt}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Empty State (no history yet) ── */}
      {scannedItems.length === 0 && !scanning && !manualMode && (
        <View style={styles.emptyState}>
          <MonitorSmartphone size={52} color={colors.text.secondary} style={{ opacity: 0.4 }} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>قارئ POS عن بُعد</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
            امسح باركود أي منتج بكاميرا الهاتف{'\n'}وسيُضاف مباشرة لسلة نقطة البيع على الكمبيوتر
          </Text>
        </View>
      )}
    </View>
  );
}

const FRAME_W = 280;
const FRAME_H = 130;
const CORNER_S = 22;
const CORNER_T = 3.5;

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    ...shadows.xs,
  },
  backBtn: { padding: 6, marginEnd: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'Cairo' },
  headerSub: { fontSize: 11, fontFamily: 'Cairo', marginTop: 1 },
  connBtn: {
    width: 36, height: 36, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },

  // Offline Banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.3)',
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Cairo',
    color: '#fbbf24',
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  retryBtnText: {
    fontSize: 12,
    fontFamily: 'Cairo',
    fontWeight: '700',
    color: '#fbbf24',
  },
  pairLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: '#2563eb',
  },
  pairLinkBtnText: {
    fontSize: 12,
    fontFamily: 'Cairo',
    fontWeight: '700',
    color: '#fff',
  },

  // Controls Bar
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  modePills: { flexDirection: 'row', gap: spacing.sm },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modePillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  modePillText: { fontSize: 13, fontWeight: '700', fontFamily: 'Cairo' },
  manualToggle: {
    width: 36, height: 36, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  // Camera Area
  cameraArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  // Idle Container & Result Card
  idleContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  lastResultCard: {
    width: '100%',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    gap: spacing.sm,
    ...shadows.sm,
  },
  lastResultHeader: {
    alignItems: 'center',
  },
  lastResultTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  lastResultCode: {
    fontSize: 12,
    fontFamily: 'Cairo',
    marginTop: 2,
  },
  lastResultPrice: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Cairo',
  },
  lastResultStatus: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // Start Button
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: radii.xxl,
    ...shadows.md,
  },
  startBtnText: { fontSize: 17, fontWeight: '900', color: '#fff', fontFamily: 'Cairo' },

  // Exit Button
  exitBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  exitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // Scanner Container
  scannerContainer: { alignItems: 'center', width: '100%' },

  // Feedback Badge
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  feedbackFound: {
    backgroundColor: 'rgba(6, 78, 59, 0.9)',
    borderColor: '#059669',
  },
  feedbackNotFound: {
    backgroundColor: 'rgba(127, 29, 29, 0.9)',
    borderColor: '#dc2626',
  },
  feedbackText: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // Viewfinder
  viewfinderWrap: { alignItems: 'center', justifyContent: 'center' },
  viewfinder: {
    width: FRAME_W,
    height: FRAME_H,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.45)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: CORNER_S, height: CORNER_S },
  cTL: { top: 0, left: 0, borderTopWidth: CORNER_T, borderLeftWidth: CORNER_T, borderColor: '#60a5fa', borderTopLeftRadius: 8 },
  cTR: { top: 0, right: 0, borderTopWidth: CORNER_T, borderRightWidth: CORNER_T, borderColor: '#60a5fa', borderTopRightRadius: 8 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_T, borderLeftWidth: CORNER_T, borderColor: '#60a5fa', borderBottomLeftRadius: 8 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_T, borderRightWidth: CORNER_T, borderColor: '#60a5fa', borderBottomRightRadius: 8 },
  scanLine: {
    height: 2.5,
    backgroundColor: '#38bdf8',
    width: '100%',
    opacity: 0.9,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },

  // Scan Actions Row
  scanActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  counterBadge: {
    width: 72,
    height: 56,
    backgroundColor: '#2563eb',
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  counterNum: { fontSize: 20, fontWeight: '900', color: '#fff', fontFamily: 'Cairo' },
  counterLabel: { fontSize: 11, color: '#e0e7ff', fontFamily: 'Cairo' },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ef4444',
    borderRadius: radii.xl,
    ...shadows.sm,
  },
  stopBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', fontFamily: 'Cairo' },
  hintText: {
    marginTop: spacing.lg,
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'Cairo',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Manual Input
  manualArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  manualCard: {
    width: '100%',
    borderRadius: radii.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    ...shadows.lg,
  },
  manualIcon: { marginBottom: 4 },
  manualLabel: { fontSize: 16, fontWeight: '800', fontFamily: 'Cairo' },
  manualInput: {
    width: '100%',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    fontFamily: 'Cairo',
    borderWidth: 1.5,
    textAlign: 'center',
    letterSpacing: 2,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: 32,
    width: '100%',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', fontFamily: 'Cairo' },

  // History
  historySection: {
    flex: 1,
    borderTopWidth: 1,
    maxHeight: 260,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  historyTitle: { fontSize: 14, fontWeight: '800', fontFamily: 'Cairo' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  clearBtnText: { fontSize: 12, fontFamily: 'Cairo' },
  historyList: { flex: 1 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  historyIconBox: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFound: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  iconNotFound: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: '700', fontFamily: 'Cairo' },
  historyPrice: { fontSize: 12, fontFamily: 'Cairo', marginTop: 1 },
  historyNotFound: { fontSize: 11, color: '#ef4444', fontFamily: 'Cairo', marginTop: 1 },
  historyTime: { fontSize: 11, fontFamily: 'Cairo' },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', fontFamily: 'Cairo', marginTop: spacing.md },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo',
    textAlign: 'center',
    lineHeight: 22,
  },
});
