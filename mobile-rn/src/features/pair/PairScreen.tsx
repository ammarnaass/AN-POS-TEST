import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Cloud, Search, QrCode, Keyboard, Database, Shield, Loader2, AlertCircle } from 'lucide-react-native';
import { session, electronAPI } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';
import CloudStep from './steps/CloudStep';
import DiscoveryStep from './steps/DiscoveryStep';
import QRStep from './steps/QRStep';
import ManualStep from './steps/ManualStep';

type Step = 'hub' | 'cloud' | 'discover' | 'manual' | 'qr' | 'connecting';

const ConnectionHubScreen = ({ navigation }: any) => {
  const { setServerUrl } = useAuthStore();
  const [step, setStep] = useState<Step>('hub');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const check = async () => {
      if (await session.isConnected()) {
        navigation.replace('Login');
      }
    };
    check();
  }, [navigation]);

  const handleConnect = async (serverUrl: string, key: string) => {
    setStep('connecting');
    setLoading(true);
    setError('');
    try {
      await session.save(serverUrl, key);
      await setServerUrl(serverUrl);
      const res = await electronAPI.pair.pair({ deviceName: 'AN POS Mobile', connectionKey: key });
      if ('error' in res && res.error) throw new Error(res.error.detail);
      if (res.success && res.sessionToken && res.deviceId) {
        await session.savePairing(res.sessionToken, res.deviceId);
        navigation.replace('Login');
      } else {
        throw new Error('استجابة الاقتران غير مكتملة');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الاتصال');
      setStep('hub');
    } finally {
      setLoading(false);
    }
  };

  const handleStandalone = async () => {
    setLoading(true);
    setError('');
    try {
      await unifiedDB.switchToStandalone();
      navigation.replace('Login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تهيئة قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.branding}>
        <View style={styles.logo}>
          <Text style={styles.logoTxt}>AN</Text>
        </View>
        <Text style={styles.title}>لومينا POS</Text>
        <Text style={styles.subtitle}>اختر طريقة الاتصال المناسبة</Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <AlertCircle size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {step === 'hub' && (
        <View style={{ gap: 12 }}>
          <View style={styles.grid}>
            <TouchableOpacity style={styles.card} onPress={() => setStep('cloud')}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Cloud size={24} color="#3b82f6" />
              </View>
              <Text style={styles.cardTitle}>الاتصال السحابي</Text>
              <Text style={styles.cardSubtitle}>عبر الإنترنت</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => setStep('discover')}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(32, 178, 170, 0.1)' }]}>
                <Search size={24} color="#20b2aa" />
              </View>
              <Text style={styles.cardTitle}>البحث التلقائي</Text>
              <Text style={styles.cardSubtitle}>نفس الشبكة</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => setStep('qr')}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                <QrCode size={24} color="#a855f7" />
              </View>
              <Text style={styles.cardTitle}>مسح QR</Text>
              <Text style={styles.cardSubtitle}>من سطح المكتب</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => setStep('manual')}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                <Keyboard size={24} color="#f97316" />
              </View>
              <Text style={styles.cardTitle}>الاتصال اليدوي</Text>
              <Text style={styles.cardSubtitle}>IP + المنفذ</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.standaloneBtn} onPress={handleStandalone} disabled={loading}>
            {loading ? <Loader2 size={20} color="#3b82f6" /> : <Database size={20} color="#3b82f6" />}
            <Text style={styles.standaloneText}>الوضع المستقل (بدون خادم)</Text>
          </TouchableOpacity>

          <View style={styles.securityNote}>
            <Shield size={12} color="#94a3b8" />
            <Text style={styles.securityText}>بياناتك محمية ومشفرة</Text>
          </View>
        </View>
      )}

      {step === 'cloud' && <CloudStep onConnect={handleConnect} onBack={() => setStep('hub')} loading={loading} />}
      {step === 'discover' && <DiscoveryStep onConnect={handleConnect} onBack={() => setStep('hub')} />}
      {step === 'qr' && <QRStep onConnect={handleConnect} onBack={() => setStep('hub')} loading={loading} />}
      {step === 'manual' && <ManualStep onConnect={handleConnect} onBack={() => setStep('hub')} loading={loading} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 16 },
  branding: { alignItems: 'center', gap: 8 },
  logo: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center'
  },
  logoTxt: { fontSize: 24, fontWeight: '800', color: '#3b82f6', fontFamily: 'Cairo' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  subtitle: { fontSize: 12, color: '#94a3b8' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    flex: 1, minWidth: '45%', backgroundColor: '#f8fafc', borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 6,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center'
  },
  cardTitle: { fontSize: 12, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  cardSubtitle: { fontSize: 10, color: '#94a3b8' },
  standaloneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 14,
  },
  standaloneText: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', fontFamily: 'Cairo' },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  securityText: { fontSize: 10, color: '#94a3b8' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 12 },
  errorText: { color: '#ef4444', fontSize: 12, flex: 1 },
});

export default ConnectionHubScreen;
