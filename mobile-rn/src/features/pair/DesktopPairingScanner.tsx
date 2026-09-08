import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Vibration,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Keyboard,
  QrCode,
  Wifi,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react-native';
import { AnposCamera, type ScanResult } from '@/modules/AnposCamera';
import { radii, spacing } from '@/theme/tokens';
import { normalizeServerUrl } from '@/lib/apiClient';

const CameraEventEmitter = new NativeEventEmitter(NativeModules.AnposCamera);

interface DesktopPairingScannerProps {
  onConnect: (serverUrl: string, key: string) => void;
  onManualInput?: () => void;
  onClose: () => void;
}

export interface PairingPayload {
  ip?: string;
  host?: string;
  server?: string;
  port?: number | string;
  key?: string;
  token?: string;
  connectionKey?: string;
  serverUrl?: string;
  url?: string;
  baseUrl?: string;
}

export function parsePairingCode(
  rawText: string
): { serverUrl: string; key: string } | null {
  if (!rawText) return null;
  const text = rawText.trim();

  // 1. Try parsing JSON format
  try {
    const data = JSON.parse(text);
    const host =
      data.ip ||
      data.host ||
      data.server ||
      (Array.isArray(data.ips) ? data.ips[0] : null);
    const key = data.key || data.token || data.connectionKey || '';

    if (data.serverUrl || data.url || data.baseUrl) {
      const u = data.serverUrl || data.url || data.baseUrl;
      return { serverUrl: normalizeServerUrl(u), key };
    }

    if (host) {
      const port = data.port || 3000;
      return { serverUrl: normalizeServerUrl(`http://${host}:${port}`), key };
    }
  } catch {}

  // 2. Try URI format: anpos://pair?host=...&port=...&key=...
  if (text.startsWith('anpos://') || text.startsWith('http://') || text.startsWith('https://')) {
    try {
      const url = new URL(text);
      if (text.startsWith('anpos://')) {
        const host = url.searchParams.get('host') || url.hostname;
        const port = url.searchParams.get('port') || '3000';
        const key = url.searchParams.get('key') || url.searchParams.get('k') || '';
        if (host) {
          return { serverUrl: normalizeServerUrl(`http://${host}:${port}`), key };
        }
      } else {
        const key = url.searchParams.get('key') || url.searchParams.get('k') || '';
        return { serverUrl: normalizeServerUrl(url.origin), key };
      }
    } catch {}
  }

  // 3. Try delimited formats: host:port:key or host:port
  const parts = text.split(':');
  if (parts.length >= 2) {
    const host = parts[0].trim();
    const port = parts[1].trim() || '3000';
    const key = parts.slice(2).join(':').trim();
    if (host && /^[a-zA-Z0-9.-]+$/.test(host)) {
      return { serverUrl: normalizeServerUrl(`http://${host}:${port}`), key };
    }
  }

  return null;
}

export const DesktopPairingScanner = ({
  onConnect,
  onManualInput,
  onClose,
}: DesktopPairingScannerProps) => {
  const [cameraReady, setCameraReady] = useState(false);
  const [scanState, setScanState] = useState<'scanning' | 'verifying' | 'success' | 'error'>('scanning');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ serverUrl: string; key: string } | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const reticlePulse = useRef(new Animated.Value(1)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const overlayFadeAnim = useRef(new Animated.Value(1)).current;

  // Vertical laser animation loop
  useEffect(() => {
    if (scanState !== 'scanning') return;

    const laserLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(reticlePulse, {
          toValue: 1.03,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(reticlePulse, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    laserLoop.start();
    pulseLoop.start();

    return () => {
      laserLoop.stop();
      pulseLoop.stop();
    };
  }, [scanLineAnim, reticlePulse, scanState]);

  const handleCodeScanned = useCallback(
    (code: string) => {
      if (scanState !== 'scanning') return;

      // 1. Immediately pause scanning & enter verifying loading state
      setScanState('verifying');
      try {
        AnposCamera.stopScan();
      } catch {}

      // Slight natural pause for verification feel
      setTimeout(() => {
        const parsed = parsePairingCode(code);
        if (parsed) {
          setSuccessInfo(parsed);
          setScanState('success');
          try {
            Vibration.vibrate([0, 40, 60, 40]);
          } catch {}

          Animated.spring(successScaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 60,
            useNativeDriver: true,
          }).start();

          // Smooth transition to UI
          setTimeout(() => {
            Animated.timing(overlayFadeAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              onConnect(parsed.serverUrl, parsed.key);
            });
          }, 850);
        } else {
          setScanState('error');
          setErrorMessage('رمز QR غير صالح للاقتران. تأكد من مسح رمز برنامج AN POS على سطح المكتب.');
          try {
            Vibration.vibrate([0, 80, 50, 80]);
          } catch {}

          Animated.sequence([
            Animated.timing(errorShakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
            Animated.timing(errorShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
          ]).start();

          // Resume after 2.4 seconds
          setTimeout(() => {
            setErrorMessage(null);
            setScanState('scanning');
            successScaleAnim.setValue(0);
            try {
              AnposCamera.startScan();
            } catch {}
          }, 2400);
        }
      }, 250);
    },
    [scanState, onConnect, successScaleAnim, errorShakeAnim, overlayFadeAnim]
  );

  // Start Camera and Subscribe to scan events
  useEffect(() => {
    let subScan: any = null;
    let subScanned: any = null;

    const startCamera = async () => {
      try {
        const granted = await AnposCamera.requestPermission();
        if (!granted) {
          Alert.alert(
            'لم يُمنح إذن الكاميرا',
            'يرجى السماح بالوصول إلى الكاميرا لمسح رمز الاقتران بالحاسوب.',
            [
              { text: 'إلغاء', onPress: onClose },
              {
                text: 'إدخال يدوي',
                onPress: () => {
                  onClose();
                  onManualInput?.();
                },
              },
            ]
          );
          return;
        }

        AnposCamera.startScan();
        setCameraReady(true);

        subScan = CameraEventEmitter.addListener('onBarcodeScan', (res: ScanResult | { code?: string }) => {
          if (!res?.code) return;
          handleCodeScanned(res.code);
        });

        subScanned = CameraEventEmitter.addListener('onBarcodeScanned', (res: ScanResult | { code?: string }) => {
          if (!res?.code) return;
          handleCodeScanned(res.code);
        });
      } catch (err) {
        setErrorMessage('تعذر تشغيل كاميرا الجهاز');
      }
    };

    startCamera();

    return () => {
      try {
        AnposCamera.stopScan();
      } catch {}
      if (subScan) subScan.remove();
      if (subScanned) subScanned.remove();
    };
  }, [onClose, onManualInput, handleCodeScanned]);

  const laserTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.container, { opacity: overlayFadeAnim }]}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.75}
            disabled={scanState === 'verifying' || scanState === 'success'}
          >
            <X size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>اقتران بالحاسوب (QR Code)</Text>
            <Text style={styles.headerSubtitle}>وجّه الكاميرا نحو الرمز الظاهر على شاشة البرنامج</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Central QR Reticle Frame */}
        <View style={styles.scannerCenter}>
          <Animated.View
            style={[
              styles.reticleFrame,
              scanState === 'verifying' && styles.reticleVerifying,
              scanState === 'success' && styles.reticleSuccess,
              scanState === 'error' && styles.reticleError,
              {
                transform: [
                  { scale: scanState === 'scanning' ? reticlePulse : 1 },
                  { translateX: errorShakeAnim },
                ],
              },
            ]}
          >
            {/* SCANNING STATE: Laser & Corners */}
            {scanState === 'scanning' && (
              <>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      transform: [{ translateY: laserTranslateY }],
                    },
                  ]}
                />

                <View style={styles.watermark}>
                  <QrCode size={70} color="rgba(255, 255, 255, 0.15)" />
                </View>
              </>
            )}

            {/* VERIFYING / LOADING STATE */}
            {scanState === 'verifying' && (
              <View style={styles.stateCenterBox}>
                <ActivityIndicator size="large" color="#60a5fa" />
                <Text style={styles.verifyingText}>جاري التحقق من رمز الاقتران...</Text>
              </View>
            )}

            {/* SUCCESS STATE: Animated Green Checkmark */}
            {scanState === 'success' && (
              <Animated.View
                style={[
                  styles.stateCenterBox,
                  { transform: [{ scale: successScaleAnim }] },
                ]}
              >
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={58} color="#22c55e" />
                </View>
                <Text style={styles.successTitleText}>تم التعرف على الحاسوب!</Text>
                {successInfo?.serverUrl ? (
                  <Text style={styles.successSubText} numberOfLines={1}>
                    {successInfo.serverUrl}
                  </Text>
                ) : null}
              </Animated.View>
            )}

            {/* ERROR STATE: Animated Red X */}
            {scanState === 'error' && (
              <View style={styles.stateCenterBox}>
                <View style={styles.errorIconCircle}>
                  <XCircle size={56} color="#ef4444" />
                </View>
                <Text style={styles.errorTitleText}>رمز غير صالح!</Text>
              </View>
            )}
          </Animated.View>

          {/* Under-Reticle Feedback Badges */}
          {scanState === 'verifying' && (
            <View style={[styles.hintBadge, { backgroundColor: 'rgba(30, 58, 138, 0.5)', borderColor: '#3b82f6' }]}>
              <ActivityIndicator size="small" color="#93c5fd" />
              <Text style={styles.hintText}>معالجة بيانات الخادم...</Text>
            </View>
          )}

          {scanState === 'success' && (
            <View style={[styles.hintBadge, { backgroundColor: 'rgba(20, 83, 45, 0.6)', borderColor: '#22c55e' }]}>
              <CheckCircle2 size={15} color="#4ade80" />
              <Text style={[styles.hintText, { color: '#86efac' }]}>جاري الانتقال لشاشة الاتصال...</Text>
            </View>
          )}

          {scanState === 'error' && (
            <View style={styles.errorToast}>
              <Text style={styles.errorToastText}>{errorMessage}</Text>
            </View>
          )}

          {scanState === 'scanning' && (
            <View style={styles.hintBadge}>
              <Wifi size={14} color="#60a5fa" />
              <Text style={styles.hintText}>تأكد من اتصال الهاتف والحاسوب بنفس الشبكة</Text>
            </View>
          )}
        </View>

        {/* Bottom Control Bar */}
        <View style={styles.footer}>
          {onManualInput && (
            <TouchableOpacity
              style={styles.manualBtn}
              onPress={() => {
                onClose();
                onManualInput();
              }}
              activeOpacity={0.8}
              disabled={scanState === 'verifying' || scanState === 'success'}
            >
              <Keyboard size={18} color="#ffffff" />
              <Text style={styles.manualBtnText}>إدخال عنوان IP ومفتاح الربط يدوياً</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(10, 15, 29, 0.85)',
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11.5,
    fontFamily: 'Cairo',
    marginTop: 2,
    textAlign: 'center',
  },

  scannerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  reticleFrame: {
    width: 250,
    height: 250,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleVerifying: {
    borderColor: 'rgba(96, 165, 250, 0.8)',
    backgroundColor: 'rgba(30, 58, 138, 0.18)',
  },
  reticleSuccess: {
    borderColor: 'rgba(34, 197, 94, 0.9)',
    backgroundColor: 'rgba(20, 83, 45, 0.25)',
  },
  reticleError: {
    borderColor: 'rgba(239, 68, 68, 0.9)',
    backgroundColor: 'rgba(127, 29, 29, 0.25)',
  },
  stateCenterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  verifyingText: {
    color: '#93c5fd',
    fontSize: 13,
    fontFamily: 'Cairo',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: radii.full,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitleText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Cairo',
    fontWeight: '700',
    textAlign: 'center',
  },
  successSubText: {
    color: '#86efac',
    fontSize: 11.5,
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginTop: 2,
  },
  errorIconCircle: {
    width: 74,
    height: 74,
    borderRadius: radii.full,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitleText: {
    color: '#fca5a5',
    fontSize: 15,
    fontFamily: 'Cairo',
    fontWeight: '700',
    textAlign: 'center',
  },
  watermark: {
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#3b82f6',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: radii.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: radii.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: radii.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: radii.md,
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },

  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(30, 58, 138, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    marginTop: spacing.xl,
  },
  hintText: {
    color: '#93c5fd',
    fontSize: 12,
    fontFamily: 'Cairo',
    fontWeight: '600',
  },

  errorToast: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.lg,
    marginTop: spacing.xl,
    maxWidth: '85%',
  },
  errorToastText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontFamily: 'Cairo',
    textAlign: 'center',
    fontWeight: '600',
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'android' ? 30 : 44,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(10, 15, 29, 0.85)',
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
  },
  manualBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Cairo',
    fontWeight: '700',
  },
});

export default DesktopPairingScanner;
