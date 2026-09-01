import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Clipboard,
  Image,
  Modal,
  Animated,
} from 'react-native';
import {
  Radio,
  SlidersHorizontal,
  Wifi,
  QrCode,
  Globe,
  Camera,
  Layers,
  Check,
  RefreshCw,
  Search,
  MonitorSmartphone,
  Router,
  Code2,
  Share2,
  ShieldCheck,
  Grid,
  Loader2,
  AlertCircle,
  Cloud,
  ClipboardPaste,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  X,
  Sparkles,
  Store,
  KeyRound,
} from 'lucide-react-native';
import { session, electronAPI, normalizeServerUrl } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { AppImages } from '@/assets';
import {
  detectLocalServer,
  deepManualSubnetScan,
  getCurrentSubnet,
  AUTO_DISCOVERY_TIMEOUT_MS,
  type DiscoveredDevice,
} from '@/lib/discovery';
import { syncEngine } from '@/lib/syncEngine';
import DesktopPairingScanner, { parsePairingCode } from './DesktopPairingScanner';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { LanguageQuickButton } from '@/components/ui';

type PairTab = 'discover' | 'manual' | 'qr' | 'cloud';

export const PairScreen = ({ navigation, route }: any) => {
  const { setServerUrl } = useAuthStore();
  const { isDark, colors } = useTheme();
  const { t, isRTL } = useI18n();

  const initialTab = (route?.params?.initialTab as PairTab) || 'discover';
  const [activeTab, setActiveTab] = useState<PairTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Discovery State (PRD §5.1 & §5.2)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'found' | 'failed'>('idle');
  const [isDeepScan, setIsDeepScan] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  // Pairing Confirmation Modal State (PRD §5.4)
  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [targetDevice, setTargetDevice] = useState<DiscoveredDevice | null>(null);
  const [pairingMethod, setPairingMethod] = useState<'code' | 'qr'>('code');
  const [sixDigitCode, setSixDigitCode] = useState('');
  const [pairModalLoading, setPairModalLoading] = useState(false);
  const [pairModalError, setPairModalError] = useState('');
  const [pairSuccess, setPairSuccess] = useState(false);

  // QR State
  const [showScanner, setShowScanner] = useState(false);
  const [qrPastedCode, setQrPastedCode] = useState('');
  const [qrMode, setQrMode] = useState<'camera' | 'paste'>('camera');

  // Manual IP State
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('4321');
  const [manualKey, setManualKey] = useState('');

  // Cloud State
  const [cloudUrl, setCloudUrl] = useState('https://cloud.anpos.app');
  const [cloudKey, setCloudKey] = useState('');

  // Abort controller ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const scanTimeoutRef = useRef<any>(null);

  // Auto-fill subnet in manual IP mode if empty
  useEffect(() => {
    if (activeTab === 'manual' && !manualIp) {
      getCurrentSubnet()
        .then((sub) => {
          if (sub && sub !== '0.0.0') {
            setManualIp(`${sub}.`);
          }
        })
        .catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // PRD §5.1: Automatic Discovery on Screen Open
  useEffect(() => {
    if (activeTab === 'discover') {
      startAutoScan();
    }
    return () => {
      // PRD §6: Battery efficiency - cancel scan on unmount or tab switch
      abortControllerRef.current?.abort();
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, [activeTab]);

  const startAutoScan = async () => {
    // Abort any prior scan
    abortControllerRef.current?.abort();
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsDeepScan(false);
    setScanStatus('scanning');
    setDevices([]);
    setError('');
    setScanProgress(5);

    // Hard 8-second cap according to PRD §5.1
    scanTimeoutRef.current = setTimeout(() => {
      if (controller && !controller.signal.aborted) {
        controller.abort();
      }
    }, AUTO_DISCOVERY_TIMEOUT_MS);

    try {
      const results = await detectLocalServer((current, total) => {
        const percent = Math.min(95, Math.round((current / total) * 100));
        setScanProgress(percent);
      }, controller.signal);

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

      if (results.length > 0) {
        setScanProgress(100);
        setDevices(results);
        setSelectedDevice(results[0]);
        setScanStatus('found');
      } else {
        setScanStatus('failed');
      }
    } catch (e: any) {
      if (controller.signal.aborted) {
        // If aborted due to 8s timeout and we found no devices
        setScanStatus('failed');
      } else {
        setScanStatus('failed');
        setError(e instanceof Error ? e.message : t('pair.connectFailed'));
      }
    }
  };

  // PRD §5.3: Deep Manual Subnet Scan (Fallback)
  const startDeepScan = async () => {
    abortControllerRef.current?.abort();
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsDeepScan(true);
    setScanStatus('scanning');
    setDevices([]);
    setError('');
    setScanProgress(5);

    try {
      const results = await deepManualSubnetScan((current, total) => {
        const percent = Math.min(98, Math.round((current / total) * 100));
        setScanProgress(percent);
      }, controller.signal);

      if (results.length > 0) {
        setScanProgress(100);
        setDevices(results);
        setSelectedDevice(results[0]);
        setScanStatus('found');
      } else {
        setScanStatus('failed');
      }
    } catch (e: any) {
      setScanStatus('failed');
      setError(e instanceof Error ? e.message : t('pair.connectFailed'));
    }
  };

  // Open Pairing Confirmation Modal (PRD §5.4)
  const handleOpenPairModal = (device: DiscoveredDevice) => {
    // Abort any ongoing background discovery scan to prevent socket contention
    abortControllerRef.current?.abort();
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    if (scanStatus === 'scanning') setScanStatus('found');

    setTargetDevice(device);
    setPairingMethod('code');
    setSixDigitCode('');
    setPairModalError('');
    setPairSuccess(false);
    setPairModalVisible(true);
  };

  const handleOpenScanner = (fromModal = false) => {
    // Abort any ongoing network discovery scan
    abortControllerRef.current?.abort();
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    // Dismiss modal if open so modals don't overlap in Android
    if (fromModal) {
      setPairModalVisible(false);
    }
    setShowScanner(true);
  };

  // Execute Confirmation / Pairing (PRD §5.4)
  const handleConfirmPairing = async (overrideCode?: string) => {
    if (!targetDevice) return;

    const codeToUse = (overrideCode ?? sixDigitCode).trim();
    setPairModalLoading(true);
    setPairModalError('');

    const serverUrl = `http://${targetDevice.ip}:${targetDevice.port}`;
    const normalizedUrl = normalizeServerUrl(serverUrl);

    try {
      await session.save(normalizedUrl, codeToUse);
      await setServerUrl(normalizedUrl);

      // Call desktop pairing confirmation endpoint
      let res: any = null;
      try {
        res = await electronAPI.pair.confirm({
          deviceName: 'AN POS Mobile',
          code: codeToUse,
          pairingToken: codeToUse,
          key: codeToUse,
        });
      } catch {
        // Fallback to /api/pair
        res = await electronAPI.pair.pair({
          deviceName: 'AN POS Mobile',
          connectionKey: codeToUse,
          code: codeToUse,
          key: codeToUse,
        });
      }

      if (res?.error) {
        throw new Error(res.error.detail || t('pair.invalidPairingCode'));
      }

      const token = res?.sessionToken || res?.token || res?.data?.sessionToken || res?.data?.token;
      const deviceId = res?.deviceId || res?.id || res?.data?.deviceId || res?.data?.id || 'mobile-terminal';

      if (res?.success || token || res?.data) {
        await session.savePairing(token || 'paired-token', deviceId);
        setPairSuccess(true);

        // PRD §5.4: Automatic initial sync start
        syncEngine.pullUpdates().catch(() => {});

        setTimeout(() => {
          setPairModalVisible(false);
          navigation.replace('Login');
        }, 1200);
      } else {
        throw new Error(t('pair.invalidPairingCode'));
      }
    } catch (e: any) {
      setPairModalError(e instanceof Error ? e.message : t('pair.invalidPairingCode'));
    } finally {
      setPairModalLoading(false);
    }
  };

  const handleConnect = async (serverUrl: string, key: string) => {
    setLoading(true);
    setError('');
    const normalizedUrl = normalizeServerUrl(serverUrl);
    if (!normalizedUrl) {
      setError(t('pair.ipPlaceholder'));
      setLoading(false);
      return;
    }

    try {
      await session.save(normalizedUrl, key);
      await setServerUrl(normalizedUrl);

      const res: any = await electronAPI.pair.pair({
        deviceName: 'AN POS Mobile',
        connectionKey: key,
      });

      if (res?.error) {
        throw new Error(res.error.detail || t('pair.connectFailed'));
      }

      const token = res?.sessionToken || res?.token || res?.data?.sessionToken || res?.data?.token;
      const deviceId = res?.deviceId || res?.id || res?.data?.deviceId || res?.data?.id || 'mobile-terminal';

      if (res?.success || token) {
        await session.savePairing(token || 'paired-token', deviceId);
        syncEngine.pullUpdates().catch(() => {});
        navigation.replace('Login');
      } else {
        throw new Error(t('pair.desktopInstructions'));
      }
    } catch (e: any) {
      setError(e instanceof Error ? e.message : t('pair.connectFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Manual Connect
  const handleManualConnect = () => {
    const rawIp = manualIp.trim();
    if (!rawIp) {
      setError(t('pair.ipPlaceholder'));
      return;
    }
    const port = manualPort.trim() || '4321';
    let url = rawIp;
    if (!url.includes(':') && !url.startsWith('http')) {
      url = `http://${rawIp}:${port}`;
    }
    handleConnect(url, manualKey.trim());
  };

  // Paste QR Code handler
  const handlePasteCode = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setQrPastedCode(text);
      }
    } catch {}
  };

  const handleConnectPastedCode = () => {
    const raw = qrPastedCode.trim();
    if (!raw) {
      setError(t('pair.qrScanDesc'));
      return;
    }
    const parsed = parsePairingCode(raw);
    if (parsed) {
      handleConnect(parsed.serverUrl, parsed.key);
      return;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      handleConnect(raw, '');
      return;
    }
    const parts = raw.split(':');
    if (parts.length >= 2) {
      const ip = parts[0];
      const port = parts[1] || '4321';
      const key = parts.slice(2).join(':') || '';
      handleConnect(`http://${ip}:${port}`, key);
    } else {
      handleConnect(`http://${raw}:4321`, '');
    }
  };

  const inputBg = isDark ? '#131b2e' : '#f1f5f9';
  const cardBg = isDark ? '#0f172a' : '#ffffff';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Header & Language Picker */}
      <View style={[styles.langRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <LanguageQuickButton />
      </View>

      <View style={styles.brandingHeader}>
        <View style={styles.topIconBox}>
          <Image
            source={AppImages.logo}
            style={styles.topLogoImg}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.brandTitle, { color: colors.text.primary }]}>
          {t('pair.pairTitle')}
        </Text>
        <Text style={[styles.brandSubtitle, { color: colors.text.secondary }]}>
          {t('pair.pairSubtitle')}
        </Text>
      </View>

      {/* Cloud Connection Top Pill Button */}
      <TouchableOpacity
        style={[
          styles.cloudTopBtn,
          activeTab === 'cloud' && styles.cloudTopBtnActive,
          { borderColor: activeTab === 'cloud' ? '#3b82f6' : borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        onPress={() => {
          setActiveTab('cloud');
          setError('');
        }}
        activeOpacity={0.8}
      >
        <Cloud size={18} color={activeTab === 'cloud' ? '#60a5fa' : colors.text.secondary} />
        <Text
          style={[
            styles.cloudTopBtnText,
            { color: activeTab === 'cloud' ? (isDark ? '#60a5fa' : '#2563eb') : colors.text.secondary },
          ]}
        >
          {t('pair.cloudTab')}
        </Text>
      </TouchableOpacity>

      {/* 3-Segmented Method Selector Cards */}
      <View style={[styles.segmentedRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        {/* Card 1: Discovery (Auto Search) */}
        <TouchableOpacity
          style={[
            styles.segmentCard,
            activeTab === 'discover'
              ? styles.segmentCardActive
              : [styles.segmentCardInactive, { backgroundColor: cardBg, borderColor }],
          ]}
          onPress={() => {
            setActiveTab('discover');
            setError('');
          }}
          activeOpacity={0.8}
        >
          <Radio
            size={22}
            color={activeTab === 'discover' ? '#ffffff' : colors.text.secondary}
          />
          <Text
            style={[
              styles.segmentTitle,
              { color: activeTab === 'discover' ? '#ffffff' : colors.text.primary },
            ]}
          >
            {t('pair.discoverTab')}
          </Text>
          <Text
            style={[
              styles.segmentSubtitle,
              { color: activeTab === 'discover' ? 'rgba(255, 255, 255, 0.85)' : colors.text.tertiary },
            ]}
          >
            Wi-Fi Auto
          </Text>
        </TouchableOpacity>

        {/* Card 2: Manual */}
        <TouchableOpacity
          style={[
            styles.segmentCard,
            activeTab === 'manual'
              ? styles.segmentCardActive
              : [styles.segmentCardInactive, { backgroundColor: cardBg, borderColor }],
          ]}
          onPress={() => {
            setActiveTab('manual');
            setError('');
          }}
          activeOpacity={0.8}
        >
          <SlidersHorizontal
            size={22}
            color={activeTab === 'manual' ? '#ffffff' : colors.text.secondary}
          />
          <Text
            style={[
              styles.segmentTitle,
              { color: activeTab === 'manual' ? '#ffffff' : colors.text.primary },
            ]}
          >
            {t('pair.manualTab')}
          </Text>
          <Text
            style={[
              styles.segmentSubtitle,
              { color: activeTab === 'manual' ? 'rgba(255, 255, 255, 0.85)' : colors.text.tertiary },
            ]}
          >
            {t('pair.manualIpSub')}
          </Text>
        </TouchableOpacity>

        {/* Card 3: QR Code */}
        <TouchableOpacity
          style={[
            styles.segmentCard,
            activeTab === 'qr'
              ? styles.segmentCardActive
              : [styles.segmentCardInactive, { backgroundColor: cardBg, borderColor }],
          ]}
          onPress={() => {
            setActiveTab('qr');
            setError('');
          }}
          activeOpacity={0.8}
        >
          <QrCode
            size={22}
            color={activeTab === 'qr' ? '#ffffff' : colors.text.secondary}
          />
          <Text
            style={[
              styles.segmentTitle,
              { color: activeTab === 'qr' ? '#ffffff' : colors.text.primary },
            ]}
          >
            {t('pair.qrTab')}
          </Text>
          <Text
            style={[
              styles.segmentSubtitle,
              { color: activeTab === 'qr' ? 'rgba(255, 255, 255, 0.85)' : colors.text.tertiary },
            ]}
          >
            QR Scan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error && !(activeTab === 'discover' && scanStatus === 'failed') ? (
        <View style={[styles.errorCard, { backgroundColor: colors.danger.light, borderColor: colors.danger.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <AlertCircle size={16} color={colors.danger.main} />
          <Text style={[styles.errorText, { color: colors.danger.text, textAlign: isRTL ? 'right' : 'left' }]}>{error}</Text>
        </View>
      ) : null}

      {/* Active Tab Panel */}
      <View style={[styles.mainPanel, { backgroundColor: cardBg, borderColor }]}>
        {/* TAB 1: Auto Discovery (PRD §5.1, §5.2, §5.3) */}
        {activeTab === 'discover' && (
          <View style={styles.tabContent}>
            <View style={[styles.panelHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Globe size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.panelTitle, { color: colors.text.primary }]}>
                  {t('pair.discoverTab')}
                </Text>
                <Text style={[styles.panelSubtitle, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('pair.localNetworkDesc')}
                </Text>
              </View>
            </View>

            {/* SCANNING STATE */}
            {scanStatus === 'scanning' && (
              <View style={styles.scanningBox}>
                <View style={styles.radarIconBox}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
                <Text style={[styles.scanningText, { color: colors.text.primary }]}>
                  {isDeepScan ? t('pair.deepScanNote') : t('pair.searchingForDevice')}
                </Text>
                <Text style={[styles.scanningPercent, { color: colors.text.tertiary }]}>
                  {scanProgress}%
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: inputBg }]}>
                  <View style={[styles.progressBar, { width: `${scanProgress}%` }]} />
                </View>
              </View>
            )}

            {/* FOUND STATE: Single Device Hero Card (PRD §5.2) */}
            {scanStatus === 'found' && devices.length === 1 && (
              <View style={styles.singleDeviceHero}>
                <View style={[styles.heroBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.heroGreenDot} />
                  <Text style={styles.heroBadgeText}>{t('pair.singleDeviceFound')}</Text>
                </View>

                <View style={styles.heroShopInfo}>
                  <Text style={[styles.heroShopName, { color: colors.text.primary }]}>
                    {devices[0].shopName || devices[0].deviceName || 'AN POS Desktop'}
                  </Text>
                  <View style={[styles.heroMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.heroMetaText, { color: colors.text.secondary }]}>
                      IP: {devices[0].ip}:{devices[0].port}
                    </Text>
                    <Text style={[styles.heroMetaDot, { color: colors.text.tertiary }]}>•</Text>
                    <Text style={[styles.heroMetaText, { color: colors.text.secondary }]}>
                      {devices[0].responseTime}ms
                    </Text>
                    <Text style={[styles.heroMetaDot, { color: colors.text.tertiary }]}>•</Text>
                    <Text style={[styles.heroMetaText, { color: colors.text.secondary }]}>
                      v{devices[0].version}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryPairHeroBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => handleOpenPairModal(devices[0])}
                  activeOpacity={0.88}
                >
                  <Sparkles size={18} color="#ffffff" />
                  <Text style={styles.primaryPairHeroBtnText}>{t('pair.pairWithDevice')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={startAutoScan}
                  style={[styles.retryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={14} color="#3b82f6" />
                  <Text style={styles.retryText}>{t('pair.retry')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FOUND STATE: Multiple Devices List (PRD §5.2) */}
            {scanStatus === 'found' && devices.length > 1 && (
              <View style={{ gap: 12 }}>
                <Text style={[styles.foundCountText, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('pair.foundDevices')} ({devices.length}):
                </Text>
                {devices.map((device, i) => (
                  <View
                    key={i}
                    style={[
                      styles.deviceCardMulti,
                      { backgroundColor: inputBg, borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <View style={styles.deviceIconBox}>
                      <Store size={20} color="#3b82f6" />
                    </View>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={[styles.deviceName, { color: colors.text.primary }]}>
                        {device.shopName || device.deviceName || 'AN POS Desktop'}
                      </Text>
                      <Text style={[styles.deviceIp, { color: colors.text.tertiary }]}>
                        {device.ip}:{device.port} • {device.responseTime}ms
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.connectSmallBtn}
                      onPress={() => handleOpenPairModal(device)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.connectSmallBtnText}>{t('pair.connect')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={startAutoScan}
                  style={[styles.retryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={15} color="#3b82f6" />
                  <Text style={styles.retryText}>{t('pair.retry')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FAILED / TIMEOUT STATE (PRD §5.2 & §5.3) */}
            {scanStatus === 'failed' && (
              <View style={styles.failedBox}>
                <View style={styles.failedIconSquircle}>
                  <AlertCircle size={32} color={colors.danger.main} />
                </View>
                <Text style={[styles.failedTitle, { color: colors.text.primary }]}>
                  {t('pair.noDeviceFound')}
                </Text>
                <Text style={[styles.failedDesc, { color: colors.text.secondary, textAlign: 'center' }]}>
                  {t('pair.noDeviceFoundDesc')}
                </Text>

                <View style={styles.failedActionButtons}>
                  <TouchableOpacity
                    style={[styles.primaryPanelBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={startAutoScan}
                    activeOpacity={0.88}
                  >
                    <RefreshCw size={18} color="#ffffff" />
                    <Text style={styles.primaryPanelBtnText}>{t('pair.retry')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryPanelBtn, { borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={startDeepScan}
                    activeOpacity={0.88}
                  >
                    <Search size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
                    <Text style={[styles.secondaryPanelBtnText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>
                      {t('pair.advancedManualScan')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* IDLE STATE */}
            {scanStatus === 'idle' && (
              <TouchableOpacity
                style={[styles.primaryPanelBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={startAutoScan}
                activeOpacity={0.88}
              >
                <Search size={20} color="#ffffff" />
                <Text style={styles.primaryPanelBtnText}>{t('pair.startScan')}</Text>
              </TouchableOpacity>
            )}

            {/* Wifi Hint */}
            <View style={[styles.hintFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Wifi size={14} color={colors.text.tertiary} />
              <Text style={[styles.hintFooterText, { color: colors.text.tertiary }]}>
                {t('pair.wifiCheckHint')}
              </Text>
            </View>
          </View>
        )}

        {/* TAB 2: Manual IP (PRD §5.3) */}
        {activeTab === 'manual' && (
          <View style={styles.tabContent}>
            <View style={[styles.panelHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Router size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.panelTitle, { color: colors.text.primary }]}>
                  {t('pair.manualTab')}
                </Text>
                <Text style={[styles.panelSubtitle, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('pair.desktopInstructions')}
                </Text>
              </View>
            </View>

            {/* IP Field */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('pair.ipPlaceholder')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Globe size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="192.168.1.10"
                  placeholderTextColor={colors.text.tertiary}
                  value={manualIp}
                  onChangeText={setManualIp}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Port Field */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('pair.portPlaceholder')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Code2 size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="4321"
                  placeholderTextColor={colors.text.tertiary}
                  value={manualPort}
                  onChangeText={setManualPort}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Pairing Code / Key */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('pair.enter6DigitCode')} ({t('common.optional')})
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <KeyRound size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="123456"
                  placeholderTextColor={colors.text.tertiary}
                  value={manualKey}
                  onChangeText={setManualKey}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Connect Button */}
            <TouchableOpacity
              style={[styles.primaryPanelBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={handleManualConnect}
              activeOpacity={0.88}
              disabled={loading || !manualIp.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Share2 size={18} color="#ffffff" />
                  <Text style={styles.primaryPanelBtnText}>{t('pair.connect')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Wifi Hint */}
            <View style={[styles.hintFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Wifi size={14} color={colors.text.tertiary} />
              <Text style={[styles.hintFooterText, { color: colors.text.tertiary }]}>
                {t('pair.wifiCheckHint')}
              </Text>
            </View>
          </View>
        )}

        {/* TAB 3: QR Code (PRD §5.4) */}
        {activeTab === 'qr' && (
          <View style={styles.tabContent}>
            <View style={[styles.panelHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <QrCode size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.panelTitle, { color: colors.text.primary }]}>
                  {t('pair.qrScanTitle')}
                </Text>
                <Text style={[styles.panelSubtitle, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('pair.qrScanDesc')}
                </Text>
              </View>
            </View>

            {/* Mode Switcher: Camera vs Paste */}
            <View style={[styles.qrModeSwitch, { backgroundColor: inputBg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[
                  styles.qrModeBtn,
                  qrMode === 'camera' && [styles.qrModeBtnActive, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }],
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                onPress={() => setQrMode('camera')}
              >
                <Camera size={16} color={qrMode === 'camera' ? '#3b82f6' : colors.text.tertiary} />
                <Text style={[styles.qrModeBtnText, { color: qrMode === 'camera' ? (isDark ? '#ffffff' : '#0f172a') : colors.text.secondary }]}>
                  {t('pair.camera')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.qrModeBtn,
                  qrMode === 'paste' && [styles.qrModeBtnActive, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }],
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                onPress={() => setQrMode('paste')}
              >
                <ClipboardPaste size={16} color={qrMode === 'paste' ? '#3b82f6' : colors.text.tertiary} />
                <Text style={[styles.qrModeBtnText, { color: qrMode === 'paste' ? (isDark ? '#ffffff' : '#0f172a') : colors.text.secondary }]}>
                  {t('pair.pasteCode')}
                </Text>
              </TouchableOpacity>
            </View>

            {qrMode === 'camera' ? (
              <View style={[styles.cameraActionCard, { backgroundColor: inputBg, borderColor }]}>
                <QrCode size={48} color="#3b82f6" />
                <Text style={[styles.cameraPromptText, { color: colors.text.primary }]}>
                  {t('pair.cameraPrompt')}
                </Text>
                <TouchableOpacity
                  style={[styles.primaryPanelBtn, { width: '100%', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => handleOpenScanner(false)}
                  activeOpacity={0.88}
                >
                  <Camera size={18} color="#ffffff" />
                  <Text style={styles.primaryPanelBtnText}>{t('pair.openCamera')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TextInput
                    style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t('pair.pasteCodePlaceholder')}
                    placeholderTextColor={colors.text.tertiary}
                    value={qrPastedCode}
                    onChangeText={setQrPastedCode}
                  />
                  <TouchableOpacity onPress={handlePasteCode} style={styles.pasteIconBtn}>
                    <ClipboardPaste size={18} color="#3b82f6" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryPanelBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={handleConnectPastedCode}
                  activeOpacity={0.88}
                  disabled={loading || !qrPastedCode.trim()}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Share2 size={18} color="#ffffff" />
                      <Text style={styles.primaryPanelBtnText}>{t('pair.connectWithCode')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* 3 Step Instruction Card */}
            <View style={[styles.stepsContainer, { backgroundColor: inputBg, borderColor }]}>
              <Text style={[styles.stepsTitle, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('pair.qrStepsTitle')}
              </Text>
              <View style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>1</Text></View>
                <Text style={[styles.stepText, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]}>{t('pair.qrStep1')}</Text>
              </View>
              <View style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>2</Text></View>
                <Text style={[styles.stepText, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]}>{t('pair.qrStep2')}</Text>
              </View>
              <View style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>3</Text></View>
                <Text style={[styles.stepText, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]}>{t('pair.qrStep3')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 4: Cloud */}
        {activeTab === 'cloud' && (
          <View style={styles.tabContent}>
            <View style={[styles.panelHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Cloud size={22} color="#60a5fa" />
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.panelTitle, { color: colors.text.primary }]}>
                  {t('pair.cloudTab')}
                </Text>
                <Text style={[styles.panelSubtitle, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('pair.cloudDesc')}
                </Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('pair.cloudServerUrl')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Globe size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="https://cloud.anpos.app"
                  placeholderTextColor={colors.text.tertiary}
                  value={cloudUrl}
                  onChangeText={setCloudUrl}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('pair.cloudKey')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ShieldCheck size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('pair.cloudKeyPlaceholder')}
                  placeholderTextColor={colors.text.tertiary}
                  value={cloudKey}
                  onChangeText={setCloudKey}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryPanelBtn, { backgroundColor: '#2563eb', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => handleConnect(cloudUrl, cloudKey)}
              activeOpacity={0.88}
              disabled={loading || !cloudUrl.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Cloud size={18} color="#ffffff" />
                  <Text style={styles.primaryPanelBtnText}>{t('pair.connect')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Switch to Standalone / Offline CTA Button */}
      <TouchableOpacity
        style={[styles.viewAllOptionsBtn, { borderColor, backgroundColor: cardBg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={() => navigation.replace('Login')}
        activeOpacity={0.7}
      >
        <Grid size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
        <Text style={[styles.viewAllOptionsText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>
          {t('modeSelect.standaloneBtn')}
        </Text>
      </TouchableOpacity>

      {/* Security Footer */}
      <View style={[styles.securityFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <ShieldCheck size={14} color={colors.text.tertiary} />
        <Text style={[styles.securityFooterText, { color: colors.text.tertiary }]}>
          AN POS Network Protocol v3.0 • End-to-End Encrypted
        </Text>
      </View>

      {/* ========================================================================= */}
      {/* PRD §5.4: PAIRING CONFIRMATION MODAL (6-Digit Code / QR Verification)   */}
      {/* ========================================================================= */}
      <Modal
        visible={pairModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !pairModalLoading && setPairModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.modalTitleWrap}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  {t('pair.confirmPairing')}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
                  {targetDevice?.shopName || targetDevice?.deviceName || 'AN POS Desktop'} ({targetDevice?.ip})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => !pairModalLoading && setPairModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Success Animation / State */}
            {pairSuccess ? (
              <View style={styles.successStateBox}>
                <CheckCircle2 size={54} color="#10b981" />
                <Text style={[styles.successStateTitle, { color: colors.text.primary }]}>
                  {t('pair.pairingSuccess')}
                </Text>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {/* Method Switcher */}
                <View style={[styles.qrModeSwitch, { backgroundColor: inputBg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[
                      styles.qrModeBtn,
                      pairingMethod === 'code' && [styles.qrModeBtnActive, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }],
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => setPairingMethod('code')}
                  >
                    <KeyRound size={16} color={pairingMethod === 'code' ? '#3b82f6' : colors.text.tertiary} />
                    <Text style={[styles.qrModeBtnText, { color: pairingMethod === 'code' ? (isDark ? '#ffffff' : '#0f172a') : colors.text.secondary }]}>
                      {t('pair.enter6DigitCode')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.qrModeBtn,
                      pairingMethod === 'qr' && [styles.qrModeBtnActive, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }],
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => {
                      handleOpenScanner(true);
                    }}
                  >
                    <QrCode size={16} color={pairingMethod === 'qr' ? '#3b82f6' : colors.text.tertiary} />
                    <Text style={[styles.qrModeBtnText, { color: pairingMethod === 'qr' ? (isDark ? '#ffffff' : '#0f172a') : colors.text.secondary }]}>
                      {t('pair.qrTab')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 6-Digit Code Input Mode */}
                {pairingMethod === 'code' && (
                  <View style={{ gap: 10 }}>
                    <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('pair.enter6DigitCode')}
                    </Text>
                    <View style={[styles.sixDigitInputContainer, { backgroundColor: inputBg, borderColor }]}>
                      <TextInput
                        style={[styles.sixDigitInput, { color: colors.text.primary }]}
                        placeholder="••••••"
                        placeholderTextColor={colors.text.tertiary}
                        value={sixDigitCode}
                        onChangeText={setSixDigitCode}
                        keyboardType="number-pad"
                        maxLength={8}
                        autoFocus
                      />
                    </View>
                    <Text style={[styles.modalHintText, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('pair.desktopInstructions')}
                    </Text>
                  </View>
                )}

                {/* Error Banner in Modal */}
                {pairModalError ? (
                  <View style={[styles.errorCard, { backgroundColor: colors.danger.light, borderColor: colors.danger.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <AlertCircle size={16} color={colors.danger.main} />
                    <Text style={[styles.errorText, { color: colors.danger.text, textAlign: isRTL ? 'right' : 'left' }]}>{pairModalError}</Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <TouchableOpacity
                  style={[styles.primaryPanelBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => handleConfirmPairing()}
                  activeOpacity={0.88}
                  disabled={pairModalLoading}
                >
                  {pairModalLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Check size={18} color="#ffffff" />
                      <Text style={styles.primaryPanelBtnText}>{t('pair.confirmPairing')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Desktop Camera Scanner Fullscreen Modal */}
      {showScanner && (
        <DesktopPairingScanner
          onConnect={(scannedUrl, scannedKey) => {
            setShowScanner(false);
            if (targetDevice && scannedKey) {
              handleConfirmPairing(scannedKey);
            } else {
              handleConnect(scannedUrl, scannedKey);
            }
          }}
          onManualInput={() => {
            setShowScanner(false);
            setPairModalVisible(false);
            setActiveTab('manual');
          }}
          onClose={() => {
            setShowScanner(false);
            if (targetDevice) {
              setPairingMethod('code');
              setPairModalVisible(true);
            }
          }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 16,
  },
  langRow: {
    alignItems: 'center',
    marginBottom: 2,
  },

  // Branding
  brandingHeader: {
    alignItems: 'center',
    gap: 6,
  },
  topIconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    ...shadows.md,
  },
  topLogoImg: {
    width: 54,
    height: 54,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Cairo',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 12.5,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },

  // Cloud Top Button
  cloudTopBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  cloudTopBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  cloudTopBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // 3-Segmented Row
  segmentedRow: {
    gap: 8,
  },
  segmentCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  segmentCardActive: {
    backgroundColor: '#3b82f6',
    ...shadows.md,
  },
  segmentCardInactive: {
    borderWidth: 1,
    ...shadows.xs,
  },
  segmentTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginTop: 2,
  },
  segmentSubtitle: {
    fontSize: 10,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },

  // Errors
  errorCard: {
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Cairo',
    flex: 1,
  },

  // Main Panel
  mainPanel: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    ...shadows.sm,
  },
  tabContent: {
    gap: 16,
  },
  panelHeader: {
    alignItems: 'center',
    gap: 10,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  panelSubtitle: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
    marginTop: 2,
  },

  // Panel Buttons
  primaryPanelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 13,
    ...shadows.sm,
  },
  primaryPanelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
  },
  secondaryPanelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
  },
  secondaryPanelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // Field block
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  inputContainer: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo',
    paddingHorizontal: 6,
  },
  inputIcon: {
    opacity: 0.8,
  },
  pasteIconBtn: {
    padding: 6,
  },

  // Discovery / Scanning (PRD §5.1)
  scanningBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  radarIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  scanningText: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  scanningPercent: {
    fontSize: 12,
    fontFamily: 'Cairo',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },

  // Single Device Hero Card (PRD §5.2)
  singleDeviceHero: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.07)',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    gap: 12,
  },
  heroBadgeRow: {
    alignItems: 'center',
    gap: 6,
  },
  heroGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  heroBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Cairo',
  },
  heroShopInfo: {
    gap: 4,
  },
  heroShopName: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  heroMetaRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  heroMetaText: {
    fontSize: 12,
    fontFamily: 'Cairo',
  },
  heroMetaDot: {
    fontSize: 10,
  },
  primaryPairHeroBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    ...shadows.sm,
    marginTop: 4,
  },
  primaryPairHeroBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
  },

  // Multi-Device Card (PRD §5.2)
  foundCountText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  deviceCardMulti: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  deviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  deviceIp: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  connectSmallBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  connectSmallBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  retryRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    marginTop: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    fontFamily: 'Cairo',
  },

  // Failed / Timeout Box (PRD §5.2)
  failedBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  failedIconSquircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  failedTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  failedDesc: {
    fontSize: 12,
    fontFamily: 'Cairo',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  failedActionButtons: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },

  // QR Mode Steps
  stepsContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
    marginBottom: 2,
  },
  stepRow: {
    alignItems: 'center',
    gap: 10,
  },
  stepText: {
    fontSize: 12,
    fontFamily: 'Cairo',
    flex: 1,
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  qrModeSwitch: {
    borderRadius: 12,
    padding: 3,
  },
  qrModeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  qrModeBtnActive: {
    ...shadows.xs,
  },
  qrModeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  cameraActionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  cameraPromptText: {
    fontSize: 12.5,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },

  // Hints
  hintFooterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  hintFooterText: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },

  // View All Options Button
  viewAllOptionsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 13,
  },
  viewAllOptionsText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // Security Footer
  securityFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  securityFooterText: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },

  // Pairing Modal (PRD §5.4)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    ...shadows.lg,
  },
  modalHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleWrap: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo',
  },
  modalCloseBtn: {
    padding: 6,
  },
  sixDigitInputContainer: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sixDigitInput: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'center',
    letterSpacing: 8,
    width: '100%',
  },
  modalHintText: {
    fontSize: 11,
    fontFamily: 'Cairo',
    lineHeight: 16,
  },
  successStateBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  successStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
});

export default PairScreen;
