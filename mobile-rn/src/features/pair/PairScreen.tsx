import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
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
} from 'lucide-react-native';
import { session, electronAPI, normalizeServerUrl, checkServerHealth } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { AppImages } from '@/assets';
import { detectLocalServer, type DiscoveredDevice } from '@/lib/discovery';
import { syncEngine } from '@/lib/syncEngine';
import DesktopPairingScanner, { parsePairingCode } from './DesktopPairingScanner';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { LanguageQuickButton } from '@/components/ui';

type PairTab = 'discover' | 'qr' | 'manual' | 'cloud';

export const PairScreen = ({ navigation, route }: any) => {
  const { setServerUrl } = useAuthStore();
  const { isDark, colors } = useTheme();
  const { t, isRTL } = useI18n();

  const initialTab = (route?.params?.initialTab as PairTab) || 'discover';
  const [activeTab, setActiveTab] = useState<PairTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Discovery State
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'found' | 'failed'>('idle');
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const [discoveryKey, setDiscoveryKey] = useState('');
  const [scanProgress, setScanProgress] = useState(0);

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

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

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
        // Trigger initial background sync
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

  // Start Discovery Scan
  const startScan = async () => {
    setScanStatus('scanning');
    setDevices([]);
    setError('');
    setScanProgress(0);

    try {
      const results = await detectLocalServer((current, total) => {
        setScanProgress(Math.round((current / total) * 100));
      });

      if (results.length > 0) {
        setDevices(results);
        setScanStatus('found');
      } else {
        setScanStatus('failed');
        setError(t('pair.connectFailed'));
      }
    } catch (e) {
      setScanStatus('failed');
      setError(e instanceof Error ? e.message : t('common.error'));
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
      {/* Top Header */}
      <View style={styles.brandingHeader}>
        <View style={styles.topIconBox}>
          <Image
            source={AppImages.logo}
            style={styles.topLogoImg}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.brandTitle, { color: colors.text.primary }]}>
          الاتصال بـ AN POS
        </Text>
        <Text style={[styles.brandSubtitle, { color: colors.text.secondary }]}>
          اختر طريقة الاتصال المناسبة
        </Text>
      </View>

      {/* Cloud Connection Top Pill Button */}
      <TouchableOpacity
        style={[
          styles.cloudTopBtn,
          activeTab === 'cloud' && styles.cloudTopBtnActive,
          { borderColor: activeTab === 'cloud' ? '#3b82f6' : borderColor },
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
          الاتصال السحابي (Cloud)
        </Text>
      </TouchableOpacity>

      {/* 3-Segmented Method Selector Cards */}
      <View style={styles.segmentedRow}>
        {/* Card 1: Manual */}
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
            اتصال يدوي
          </Text>
          <Text
            style={[
              styles.segmentSubtitle,
              { color: activeTab === 'manual' ? 'rgba(255, 255, 255, 0.8)' : colors.text.tertiary },
            ]}
          >
            عنوان IP محلي
          </Text>
        </TouchableOpacity>

        {/* Card 2: Discovery (Auto Search) */}
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
            بحث تلقائي
          </Text>
          <Text
            style={[
              styles.segmentSubtitle,
              { color: activeTab === 'discover' ? 'rgba(255, 255, 255, 0.8)' : colors.text.tertiary },
            ]}
          >
            شبكة محلية
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
            ربط عبر QR
          </Text>
          <Text
            style={[
              styles.segmentSubtitle,
              { color: activeTab === 'qr' ? 'rgba(255, 255, 255, 0.8)' : colors.text.tertiary },
            ]}
          >
            إنترنت Cloud
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={[styles.errorCard, { backgroundColor: colors.danger.light, borderColor: colors.danger.border }]}>
          <AlertCircle size={16} color={colors.danger.main} />
          <Text style={[styles.errorText, { color: colors.danger.text }]}>{error}</Text>
        </View>
      ) : null}

      {/* Active Tab Panel */}
      <View style={[styles.mainPanel, { backgroundColor: cardBg, borderColor }]}>
        {/* TAB 1: Auto Discovery */}
        {activeTab === 'discover' && (
          <View style={styles.tabContent}>
            <View style={styles.panelHeader}>
              <Globe size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.panelTitle, { color: colors.text.primary }]}>
                  بحث في الشبكة المحلية
                </Text>
                <Text style={[styles.panelSubtitle, { color: colors.text.tertiary }]}>
                  يبحث عن حاسوبك في نفس شبكة Wi-Fi ويتصل تلقائياً
                </Text>
              </View>
            </View>

            {scanStatus === 'idle' && (
              <TouchableOpacity
                style={styles.primaryPanelBtn}
                onPress={startScan}
                activeOpacity={0.88}
              >
                <Search size={20} color="#ffffff" />
                <Text style={styles.primaryPanelBtnText}>بدء البحث</Text>
              </TouchableOpacity>
            )}

            {scanStatus === 'scanning' && (
              <View style={styles.scanningBox}>
                <Loader2 size={32} color="#3b82f6" />
                <Text style={[styles.scanningText, { color: colors.text.primary }]}>
                  جاري فحص الشبكة... {scanProgress}%
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: inputBg }]}>
                  <View style={[styles.progressBar, { width: `${scanProgress}%` }]} />
                </View>
              </View>
            )}

            {scanStatus === 'found' && (
              <View style={{ gap: 10 }}>
                <Text style={[styles.foundCountText, { color: colors.text.secondary }]}>
                  تم العثور على ({devices.length}) أجهزة:
                </Text>
                {devices.map((device, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.deviceCard,
                      { backgroundColor: inputBg, borderColor },
                      selectedDevice?.ip === device.ip && styles.deviceCardSelected,
                    ]}
                    onPress={() => setSelectedDevice(device)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.deviceIconBox}>
                      <MonitorSmartphone size={20} color="#3b82f6" />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                      <Text style={[styles.deviceName, { color: colors.text.primary }]}>
                        {device.deviceName || 'حاسوب AN POS'}
                      </Text>
                      <Text style={[styles.deviceIp, { color: colors.text.tertiary }]}>
                        {device.ip}:{device.port}
                      </Text>
                    </View>
                    <Text style={[styles.deviceLatency, { color: colors.text.tertiary }]}>
                      {device.responseTime}ms
                    </Text>
                  </TouchableOpacity>
                ))}

                {selectedDevice ? (
                  <TouchableOpacity
                    style={styles.primaryPanelBtn}
                    onPress={() =>
                      handleConnect(`http://${selectedDevice.ip}:${selectedDevice.port}`, discoveryKey)
                    }
                    activeOpacity={0.88}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={20} color="#ffffff" />
                        <Text style={styles.primaryPanelBtnText}>
                          اتصال بـ {selectedDevice.deviceName || selectedDevice.ip}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity onPress={startScan} style={styles.retryRow} activeOpacity={0.7}>
                  <RefreshCw size={15} color="#3b82f6" />
                  <Text style={styles.retryText}>إعادة البحث في الشبكة</Text>
                </TouchableOpacity>
              </View>
            )}

            {scanStatus === 'failed' && (
              <View style={styles.failedBox}>
                <Text style={[styles.failedText, { color: colors.danger.main }]}>
                  لم يتم العثور على أجهزة
                </Text>
                <TouchableOpacity
                  style={styles.primaryPanelBtn}
                  onPress={startScan}
                  activeOpacity={0.88}
                >
                  <RefreshCw size={18} color="#ffffff" />
                  <Text style={styles.primaryPanelBtnText}>إعادة المحاولة</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Wifi Hint */}
            <View style={styles.hintFooterRow}>
              <Wifi size={14} color={colors.text.tertiary} />
              <Text style={[styles.hintFooterText, { color: colors.text.tertiary }]}>
                تأكد أن الهاتف والحاسوب على نفس Wi-Fi
              </Text>
            </View>
          </View>
        )}

        {/* TAB 2: QR Code */}
        {activeTab === 'qr' && (
          <View style={styles.tabContent}>
            {/* Steps Container */}
            <View style={[styles.stepsContainer, { backgroundColor: inputBg, borderColor }]}>
              <Text style={[styles.stepsTitle, { color: colors.text.primary }]}>
                خطوات الربط
              </Text>

              <View style={styles.stepRow}>
                <Text style={[styles.stepText, { color: colors.text.secondary }]}>
                  افتح AN POS على الحاسوب مع الربط بالإنترنت
                </Text>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>1</Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <Text style={[styles.stepText, { color: colors.text.secondary }]}>
                  ادخل إلى الإعدادات {'>'} الشبكة والربط
                </Text>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <Text style={[styles.stepText, { color: colors.text.secondary }]}>
                  وجّه كاميرا الهاتف نحو رمز QR
                </Text>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>3</Text>
                </View>
              </View>
            </View>

            {/* Mode Switch: Camera vs Paste */}
            <View style={[styles.qrModeSwitch, { backgroundColor: inputBg }]}>
              <TouchableOpacity
                style={[
                  styles.qrModeBtn,
                  qrMode === 'paste' && [styles.qrModeBtnActive, { backgroundColor: cardBg }],
                ]}
                onPress={() => setQrMode('paste')}
                activeOpacity={0.8}
              >
                <ClipboardPaste size={16} color={qrMode === 'paste' ? '#3b82f6' : colors.text.secondary} />
                <Text
                  style={[
                    styles.qrModeBtnText,
                    { color: qrMode === 'paste' ? colors.text.primary : colors.text.secondary },
                  ]}
                >
                  لصق الكود
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.qrModeBtn,
                  qrMode === 'camera' && [styles.qrModeBtnActive, { backgroundColor: cardBg }],
                ]}
                onPress={() => setQrMode('camera')}
                activeOpacity={0.8}
              >
                <Camera size={16} color={qrMode === 'camera' ? '#3b82f6' : colors.text.secondary} />
                <Text
                  style={[
                    styles.qrModeBtnText,
                    { color: qrMode === 'camera' ? colors.text.primary : colors.text.secondary },
                  ]}
                >
                  كاميرا
                </Text>
              </TouchableOpacity>
            </View>

            {qrMode === 'camera' ? (
              <View style={[styles.cameraActionCard, { backgroundColor: inputBg, borderColor }]}>
                <QrCode size={40} color={colors.text.tertiary} />
                <Text style={[styles.cameraPromptText, { color: colors.text.secondary }]}>
                  اضغط لتشغيل الكاميرا ومسح رمز QR
                </Text>
                <TouchableOpacity
                  style={styles.primaryPanelBtn}
                  onPress={() => setShowScanner(true)}
                  activeOpacity={0.88}
                >
                  <Camera size={18} color="#ffffff" />
                  <Text style={styles.primaryPanelBtnText}>فتح الكاميرا</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: colors.text.primary }]}
                    placeholder="الصق كود الاقتران هنا..."
                    placeholderTextColor={colors.text.tertiary}
                    value={qrPastedCode}
                    onChangeText={setQrPastedCode}
                    textAlign="center"
                  />
                  <TouchableOpacity onPress={handlePasteCode} style={styles.pasteIconBtn}>
                    <ClipboardPaste size={18} color="#3b82f6" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.primaryPanelBtn}
                  onPress={handleConnectPastedCode}
                  activeOpacity={0.88}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Check size={18} color="#ffffff" />
                      <Text style={styles.primaryPanelBtnText}>اتصال بالكود</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: Manual IP */}
        {activeTab === 'manual' && (
          <View style={styles.tabContent}>
            <View style={styles.panelHeader}>
              <Router size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.panelTitle, { color: colors.text.primary }]}>
                  اتصال يدوي
                </Text>
                <Text style={[styles.panelSubtitle, { color: colors.text.tertiary }]}>
                  أدخل عنوان IP الحاسوب الرئيسي للاتصال المباشر
                </Text>
              </View>
            </View>

            {/* IP Field */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
                عنوان IP
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary }]}
                  placeholder="مثال: 192.168.1.10"
                  placeholderTextColor={colors.text.tertiary}
                  value={manualIp}
                  onChangeText={setManualIp}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <Globe size={18} color={colors.text.tertiary} style={styles.inputIcon} />
              </View>
            </View>

            {/* Port Field */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
                المنفذ (Port)
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary }]}
                  placeholder="8080 أو 4321"
                  placeholderTextColor={colors.text.tertiary}
                  value={manualPort}
                  onChangeText={setManualPort}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <Code2 size={18} color={colors.text.tertiary} style={styles.inputIcon} />
              </View>
            </View>

            {/* Connect Button */}
            <TouchableOpacity
              style={styles.primaryPanelBtn}
              onPress={handleManualConnect}
              activeOpacity={0.88}
              disabled={loading || !manualIp.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Share2 size={18} color="#ffffff" />
                  <Text style={styles.primaryPanelBtnText}>اتصال</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Wifi Hint */}
            <View style={styles.hintFooterRow}>
              <Wifi size={14} color={colors.text.tertiary} />
              <Text style={[styles.hintFooterText, { color: colors.text.tertiary }]}>
                يجب أن يكون كلا الجهازين على نفس شبكة Wi-Fi
              </Text>
            </View>
          </View>
        )}

        {/* TAB 4: Cloud Mode */}
        {activeTab === 'cloud' && (
          <View style={styles.tabContent}>
            <View style={styles.panelHeader}>
              <Cloud size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.panelTitle, { color: colors.text.primary }]}>
                  الاتصال السحابي (Cloud)
                </Text>
                <Text style={[styles.panelSubtitle, { color: colors.text.tertiary }]}>
                  ربط الأجهزة عبر السيرفر السحابي بأمان
                </Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
                رابط الخادم السحابي
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary }]}
                  placeholder="https://cloud.anpos.app"
                  placeholderTextColor={colors.text.tertiary}
                  value={cloudUrl}
                  onChangeText={setCloudUrl}
                  autoCapitalize="none"
                  textAlign="right"
                />
                <Globe size={18} color={colors.text.tertiary} style={styles.inputIcon} />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
                مفتاح الاتصال السحابي
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary }]}
                  placeholder="ABCD-1234-EFGH-5678"
                  placeholderTextColor={colors.text.tertiary}
                  value={cloudKey}
                  onChangeText={setCloudKey}
                  textAlign="center"
                />
                <ShieldCheck size={18} color={colors.text.tertiary} style={styles.inputIcon} />
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryPanelBtn}
              onPress={() => handleConnect(cloudUrl.trim(), cloudKey.trim())}
              activeOpacity={0.88}
              disabled={loading || !cloudUrl.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Cloud size={18} color="#ffffff" />
                  <Text style={styles.primaryPanelBtnText}>اتصال سحابي</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Button: View all operating options */}
      <TouchableOpacity
        style={[styles.viewAllOptionsBtn, { borderColor }]}
        onPress={() => navigation.navigate('ModeSelect')}
        activeOpacity={0.8}
      >
        <Grid size={18} color={colors.text.secondary} />
        <Text style={[styles.viewAllOptionsText, { color: colors.text.primary }]}>
          عرض كل خيارات التشغيل
        </Text>
      </TouchableOpacity>

      {/* Footer Security Note */}
      <View style={styles.securityFooter}>
        <ShieldCheck size={14} color={colors.text.tertiary} />
        <Text style={[styles.securityFooterText, { color: colors.text.tertiary }]}>
          بياناتك محمية ومشفّرة
        </Text>
      </View>

      {/* QR Scanner Camera Modal */}
      {showScanner && (
        <DesktopPairingScanner
          onConnect={(url, key) => {
            setShowScanner(false);
            handleConnect(url, key);
          }}
          onManualInput={() => {
            setShowScanner(false);
            setActiveTab('manual');
          }}
          onClose={() => setShowScanner(false)}
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
    paddingTop: 36,
    paddingBottom: 40,
    gap: 16,
  },

  // Branding
  brandingHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  topIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    ...shadows.sm,
  },
  topLogoImg: {
    width: 48,
    height: 48,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 12.5,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },

  // Cloud Top Button
  cloudTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  cloudTopBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  cloudTopBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // 3-Segmented Row
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
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
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginTop: 2,
  },
  segmentSubtitle: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },

  // Errors
  errorCard: {
    flexDirection: 'row',
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
    textAlign: 'right',
  },

  // Main Panel
  mainPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    ...shadows.sm,
  },
  tabContent: {
    gap: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  panelSubtitle: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
    textAlign: 'right',
    marginTop: 2,
  },

  // Panel Buttons
  primaryPanelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 14,
    ...shadows.sm,
  },
  primaryPanelBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
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
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo',
    paddingHorizontal: 6,
  },
  inputIcon: {
    marginLeft: 4,
  },
  pasteIconBtn: {
    padding: 6,
  },

  // Discovery / Scanning
  scanningBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  scanningText: {
    fontSize: 13,
    fontWeight: '700',
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
  foundCountText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  deviceCardSelected: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  deviceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  deviceIp: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  deviceLatency: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    fontFamily: 'Cairo',
  },
  failedBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  failedText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
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
    textAlign: 'right',
    marginBottom: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  stepText: {
    fontSize: 12,
    fontFamily: 'Cairo',
    flex: 1,
    textAlign: 'right',
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
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  qrModeBtn: {
    flex: 1,
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  securityFooterText: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
});

export default PairScreen;
