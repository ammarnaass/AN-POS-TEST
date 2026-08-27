import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  NativeEventEmitter,
  NativeModules,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Vibration,
} from 'react-native';
import {
  ScanBarcode,
  X,
  Keyboard,
  Layers,
  Square,
  CheckCircle2,
  Copy,
} from 'lucide-react-native';
import { AnposCamera, type ScanResult } from '@/modules/AnposCamera';
import { colors, radii, spacing, shadows } from '@/theme';

const CameraEventEmitter = new NativeEventEmitter(NativeModules.AnposCamera);

export type ScannerMode = 'single' | 'multi';

interface CameraScannerProps {
  onScan: (code: string, mode?: ScannerMode) => void;
  onBatchComplete?: (codes: string[]) => void;
  onClose: () => void;
  initialMode?: ScannerMode;
}

export const CameraScanner = ({
  onScan,
  onBatchComplete,
  onClose,
  initialMode = 'single',
}: CameraScannerProps) => {
  const [mode, setMode] = useState<ScannerMode>(initialMode);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  const hasScannedSingle = useRef(false);
  const lastScanTime = useRef<number>(0);
  const lastCodeScanned = useRef<string>('');
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Scan line animation loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Camera start & event subscription
  useEffect(() => {
    if (manualMode) return;

    const startCamera = async () => {
      try {
        const granted = await AnposCamera.requestPermission();
        if (!granted) {
          Alert.alert(
            'لم يُمنح إذن الكاميرا',
            'يرجى السماح بالوصول إلى الكاميرا من إعدادات الجهاز.',
            [
              { text: 'إلغاء', onPress: onClose },
              { text: 'إدخال يدوي', onPress: () => setManualMode(true) },
            ]
          );
          return;
        }
        AnposCamera.startScan();
      } catch (err) {
        setManualMode(true);
      }
    };

    const subscription = CameraEventEmitter.addListener(
      'onBarcodeScan',
      (result: ScanResult) => {
        const code = result.code?.trim();
        if (!code) return;

        const now = Date.now();

        if (mode === 'single') {
          if (!hasScannedSingle.current) {
            hasScannedSingle.current = true;
            try {
              Vibration.vibrate(60);
            } catch {}
            onScan(code, 'single');
            onClose();
          }
        } else {
          // Multi Mode: debounce repeated scans of the same code within 1.4s
          if (
            code === lastCodeScanned.current &&
            now - lastScanTime.current < 1400
          ) {
            return;
          }

          lastCodeScanned.current = code;
          lastScanTime.current = now;

          try {
            Vibration.vibrate(40);
          } catch {}

          // Visual pulse effect
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();

          setScannedCodes((prev) => [...prev, code]);
          setLastScannedFeedback(code);
          setTimeout(() => setLastScannedFeedback(null), 1200);

          onScan(code, 'multi');
        }
      }
    );

    startCamera();

    return () => {
      subscription.remove();
      AnposCamera.stopScan();
    };
  }, [manualMode, mode]);

  const handleFinishMulti = () => {
    if (onBatchComplete) {
      onBatchComplete(scannedCodes);
    }
    onClose();
  };

  const handleManualSubmit = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) {
      Alert.alert('تنبيه', 'أدخل رقم الباركود أولاً');
      return;
    }

    if (mode === 'single') {
      onScan(trimmed, 'single');
      onClose();
    } else {
      setScannedCodes((prev) => [...prev, trimmed]);
      setManualCode('');
      setLastScannedFeedback(trimmed);
      setTimeout(() => setLastScannedFeedback(null), 1200);
      onScan(trimmed, 'multi');
    }
  };

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* ── Top Bar / Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={mode === 'multi' && scannedCodes.length > 0 ? handleFinishMulti : onClose}
            style={styles.headerTextBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.headerCloseText}>إغلاق</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {mode === 'single'
              ? 'مسح الباركود'
              : `مسح متعدد (${scannedCodes.length})`}
          </Text>

          <TouchableOpacity
            style={styles.keyboardSwitchBtn}
            activeOpacity={0.7}
            onPress={() => setManualMode((m) => !m)}
          >
            {manualMode ? (
              <ScanBarcode size={20} color="#fff" />
            ) : (
              <Keyboard size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Mode Switcher Pills (مرة واحدة / متعدد) ── */}
        {!manualMode && (
          <View style={styles.modeSwitcherContainer}>
            {/* 1. مرة واحدة (Single) */}
            <TouchableOpacity
              style={[
                styles.modePill,
                mode === 'single' ? styles.modePillActive : styles.modePillInactive,
              ]}
              activeOpacity={0.8}
              onPress={() => setMode('single')}
            >
              <View style={styles.pillIconBox}>
                <Square size={13} color={mode === 'single' ? '#fff' : '#94a3b8'} />
                <Text
                  style={[
                    styles.pillIconNumber,
                    { color: mode === 'single' ? '#fff' : '#94a3b8' },
                  ]}
                >
                  1
                </Text>
              </View>
              <Text
                style={[
                  styles.modePillText,
                  mode === 'single'
                    ? styles.modePillTextActive
                    : styles.modePillTextInactive,
                ]}
              >
                مرة واحدة
              </Text>
            </TouchableOpacity>

            {/* 2. متعدد (Multi) */}
            <TouchableOpacity
              style={[
                styles.modePill,
                mode === 'multi' ? styles.modePillActive : styles.modePillInactive,
              ]}
              activeOpacity={0.8}
              onPress={() => setMode('multi')}
            >
              <Layers size={15} color={mode === 'multi' ? '#fff' : '#94a3b8'} />
              <Text
                style={[
                  styles.modePillText,
                  mode === 'multi'
                    ? styles.modePillTextActive
                    : styles.modePillTextInactive,
                ]}
              >
                متعدد
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {manualMode ? (
          /* ── Manual Code Input Screen ── */
          <KeyboardAvoidingView
            style={styles.manualArea}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.manualCard}>
              <Text style={styles.manualLabel}>
                {mode === 'single'
                  ? 'أدخل رقم الباركود'
                  : `إدخال يدوي (تم مسح ${scannedCodes.length})`}
              </Text>
              <TextInput
                style={styles.manualInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="مثال: 6131234567890"
                placeholderTextColor={colors.slate[400]}
                keyboardType="default"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleManualSubmit}
                textAlign="center"
              />

              <View style={styles.manualBtnRow}>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleManualSubmit}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmBtnText}>
                    {mode === 'single' ? 'تأكيد' : 'إضافة إلى القائمة'}
                  </Text>
                </TouchableOpacity>

                {mode === 'multi' && scannedCodes.length > 0 && (
                  <TouchableOpacity
                    style={styles.finishBtn}
                    onPress={handleFinishMulti}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.finishBtnText}>
                      إنهاء ({scannedCodes.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        ) : (
          /* ── Camera Scanner Viewfinder Area ── */
          <View style={styles.cameraArea}>
            {/* Feedback Badge on Successful Multi Scan */}
            {lastScannedFeedback && (
              <Animated.View style={styles.feedbackBadge}>
                <CheckCircle2 size={16} color="#34d399" />
                <Text style={styles.feedbackText}>
                  تم المسح: {lastScannedFeedback}
                </Text>
              </Animated.View>
            )}

            {/* Scan Frame */}
            <Animated.View
              style={[
                styles.scanFrameWrapper,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.scanFrame}>
                {/* 4 Glowing Corner Accents */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Animated Vertical Scan Line */}
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanLineAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, FRAME_HEIGHT - 6],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </Animated.View>

            {/* Multi Mode Floating Counter Button */}
            {mode === 'multi' && (
              <TouchableOpacity
                style={styles.multiCounterBox}
                activeOpacity={0.85}
                onPress={handleFinishMulti}
              >
                <Text style={styles.multiCounterNumber}>
                  {scannedCodes.length}
                </Text>
                <Text style={styles.multiCounterLabel}>مسح</Text>
              </TouchableOpacity>
            )}

            {/* Bottom Instructional Guidance */}
            <View style={styles.bottomHintContainer}>
              <Text style={styles.bottomHintText}>
                {mode === 'single'
                  ? 'وجّه الكاميرا نحو الباركود — يُضاف المنتج للسلة تلقائياً عند القراءة.'
                  : 'الوضع متعدد: امسح عدة باركودات متتالية — تُضاف للسلة دون إغلاق.'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const FRAME_WIDTH = 300;
const FRAME_HEIGHT = 140;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3.5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(9, 13, 22, 0.82)',
  },
  headerTextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerCloseText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: 'Cairo',
    letterSpacing: 0.2,
  },
  keyboardSwitchBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Mode Switcher Pills (Top) ──
  modeSwitcherContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(9, 13, 22, 0.70)',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    minWidth: 124,
  },
  modePillActive: {
    backgroundColor: '#2563eb',
    ...shadows.sm,
  },
  modePillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pillIconBox: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIconNumber: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'Cairo',
  },
  modePillText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  modePillTextActive: {
    color: '#ffffff',
  },
  modePillTextInactive: {
    color: '#cbd5e1',
  },

  // ── Camera Area ──
  cameraArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackBadge: {
    position: 'absolute',
    top: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 78, 59, 0.9)',
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    zIndex: 10,
  },
  feedbackText: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  scanFrameWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  scanFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.6)',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: '#60a5fa',
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: '#60a5fa',
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: '#60a5fa',
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: '#60a5fa',
    borderBottomRightRadius: 10,
  },
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

  // ── Multi Mode Floating Counter Button ──
  multiCounterBox: {
    width: 96,
    height: 76,
    backgroundColor: '#2563eb',
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    marginVertical: spacing.md,
    ...shadows.md,
  },
  multiCounterNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: 'Cairo',
    lineHeight: 32,
  },
  multiCounterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e0e7ff',
    fontFamily: 'Cairo',
    marginTop: -2,
  },

  // ── Bottom Instruction ──
  bottomHintContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 44,
    alignItems: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.80)',
  },
  bottomHintText: {
    color: '#e2e8f0',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Manual Input Mode ──
  manualArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  manualCard: {
    backgroundColor: '#1e293b',
    borderRadius: radii.xxl,
    padding: spacing.xl,
    width: '100%',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...shadows.lg,
  },
  manualLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#e2e8f0',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  manualInput: {
    backgroundColor: '#0f172a',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    color: '#ffffff',
    fontFamily: 'Cairo',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    textAlign: 'center',
    letterSpacing: 2,
  },
  manualBtnRow: {
    gap: spacing.sm,
  },
  confirmBtn: {
    backgroundColor: '#2563eb',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
  },
  finishBtn: {
    backgroundColor: '#059669',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  finishBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
  },
});

export default CameraScanner;
