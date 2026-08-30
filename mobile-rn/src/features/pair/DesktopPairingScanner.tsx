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
} from 'react-native';
import {
  X,
  Keyboard,
  QrCode,
  Wifi,
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

/**
 * Robust parser for all QR code and pairing code formats
 */
export const parsePairingCode = (rawCode: string): { serverUrl: string; key: string } | null => {
  let code = (rawCode || '').trim();
  if (!code) return null;

  // 0. Try Base64 decoding if applicable
  if (!code.startsWith('{') && !code.startsWith('http') && !code.startsWith('anpos') && code.length > 10) {
    try {
      // Check if it's base64
      if (/^[A-Za-z0-9+/=]+$/.test(code)) {
        const decoded = typeof atob === 'function' ? atob(code) : Buffer.from(code, 'base64').toString('utf-8');
        if (decoded && (decoded.startsWith('{') || decoded.includes(':') || decoded.includes('anpos'))) {
          code = decoded.trim();
        }
      }
    } catch {
      /* continue */
    }
  }

  // 1. Try parsing JSON format: {"ip":"192.168.1.10","port":4321,"key":"..."} or {"ips":[...], ...}
  if (code.startsWith('{') && code.endsWith('}')) {
    try {
      const data: PairingPayload & { ips?: string[] } = JSON.parse(code);
      const serverUrl = data.serverUrl || data.url || data.baseUrl;
      const key = data.key || data.token || data.connectionKey || '';

      if (serverUrl) {
        return { serverUrl: normalizeServerUrl(serverUrl), key };
      }

      const host = data.ip || data.host || data.server || (Array.isArray(data.ips) && data.ips.length > 0 ? data.ips[0] : undefined);
      if (host) {
        const port = data.port || '4321';
        return { serverUrl: normalizeServerUrl(`http://${host}:${port}`), key };
      }
    } catch {
      /* continue */
    }
  }

  // 2. Try parsing URI schemes: anpos://pair?... or http://... or https://...
  if (code.startsWith('anpos://') || code.startsWith('http://') || code.startsWith('https://')) {
    try {
      if (code.startsWith('http://') || code.startsWith('https://')) {
        const u = new URL(code);
        const key = u.searchParams.get('key') || u.searchParams.get('token') || u.searchParams.get('connectionKey') || '';
        return { serverUrl: normalizeServerUrl(`${u.protocol}//${u.host}`), key };
      }

      const url = new URL(code.replace('anpos://pair', 'http://localhost').replace('anpos://', 'http://localhost/'));
      const host = url.searchParams.get('ip') || url.searchParams.get('host') || url.searchParams.get('server');
      const port = url.searchParams.get('port') || '4321';
      const key = url.searchParams.get('key') || url.searchParams.get('token') || url.searchParams.get('connectionKey') || '';

      if (host) {
        return { serverUrl: normalizeServerUrl(`http://${host}:${port}`), key };
      }
    } catch {
      /* continue */
    }
  }

  // 3. Try delimited formats: 192.168.1.10:4321:connection_key or 192.168.1.10:4321 or 192.168.1.10
  const parts = code.split(':');
  if (parts.length >= 2) {
    const host = parts[0].trim();
    const port = parts[1].trim() || '4321';
    const key = parts.slice(2).join(':').trim();
    if (host.includes('.') || host === 'localhost') {
      return { serverUrl: normalizeServerUrl(`http://${host}:${port}`), key };
    }
  } else if (code.includes('.')) {
    // Bare IP e.g. 192.168.1.10
    return { serverUrl: normalizeServerUrl(`http://${code}:4321`), key: '' };
  }

  return null;
};

export const DesktopPairingScanner = ({
  onConnect,
  onManualInput,
  onClose,
}: DesktopPairingScannerProps) => {
  const [cameraReady, setCameraReady] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const reticlePulse = useRef(new Animated.Value(1)).current;

  // Vertical laser animation loop
  useEffect(() => {
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
  }, [scanLineAnim, reticlePulse]);

  const handleCodeScanned = useCallback(
    (code: string) => {
      if (hasScanned) return;

      const parsed = parsePairingCode(code);
      if (parsed) {
        setHasScanned(true);
        try {
          Vibration.vibrate(60);
        } catch {}
        try {
          AnposCamera.stopScan();
        } catch {}
        onConnect(parsed.serverUrl, parsed.key);
      } else {
        setErrorMessage('رمز QR غير صالح للاقتران. تأكد من مسح رمز برنامج AN POS على سطح المكتب.');
        setTimeout(() => setErrorMessage(null), 3500);
      }
    },
    [hasScanned, onConnect]
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

        // Listen to BOTH 'onBarcodeScan' (native emit name) and 'onBarcodeScanned' (alias)
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
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
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
          <Animated.View style={[styles.reticleFrame, { transform: [{ scale: reticlePulse }] }]}>
            {/* 4 Corner Markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Glowing Laser Scanline */}
            <Animated.View
              style={[
                styles.laserLine,
                {
                  transform: [{ translateY: laserTranslateY }],
                },
              ]}
            />

            {/* Subtle QR Watermark */}
            <View style={styles.watermark}>
              <QrCode size={70} color="rgba(255, 255, 255, 0.15)" />
            </View>
          </Animated.View>

          {errorMessage ? (
            <View style={styles.errorToast}>
              <Text style={styles.errorToastText}>{errorMessage}</Text>
            </View>
          ) : (
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
            >
              <Keyboard size={18} color="#ffffff" />
              <Text style={styles.manualBtnText}>إدخال عنوان IP ومفتاح الربط يدوياً</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
