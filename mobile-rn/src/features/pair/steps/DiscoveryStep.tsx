import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Search, MonitorSmartphone, RefreshCw, Check, Loader2, AlertCircle } from 'lucide-react-native';
import { detectLocalServer, type DiscoveredDevice } from '@/lib/discovery';

interface Props {
  onConnect: (serverUrl: string, key: string) => void;
  onBack: () => void;
}

const DiscoveryStep = ({ onConnect, onBack }: Props) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'found' | 'failed'>('idle');
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const [connectionKey, setConnectionKey] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const startScan = async () => {
    setStatus('scanning');
    setDevices([]);
    setError('');
    setProgress(0);

    try {
      const results = await detectLocalServer((current, total) => {
        setProgress(Math.round((current / total) * 100));
      });

      if (results.length > 0) {
        setDevices(results);
        setStatus('found');
      } else {
        setStatus('failed');
        setError('لم يتم العثور على أجهزة على الشبكة');
      }
    } catch (e) {
      setStatus('failed');
      setError(e instanceof Error ? e.message : 'خطأ في البحث');
    }
  };

  const handleSelect = (device: DiscoveredDevice) => {
    setSelectedDevice(device);
  };

  const handleConnect = () => {
    if (selectedDevice && connectionKey) {
      onConnect(`http://${selectedDevice.ip}:${selectedDevice.port}`, connectionKey);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>العودة</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Search size={24} color="#22c55e" />
        </View>
        <Text style={styles.title}>البحث التلقائي</Text>
        <Text style={styles.subtitle}>البحث عن الكمبيوتر داخل نفس شبكة Wi-Fi</Text>
      </View>

      {status === 'idle' && (
        <TouchableOpacity style={styles.scanBtn} onPress={startScan}>
          <Search size={20} color="#fff" />
          <Text style={styles.scanText}>بدء البحث</Text>
        </TouchableOpacity>
      )}

      {status === 'scanning' && (
        <View style={styles.scanningCard}>
          <Loader2 size={40} color="#3b82f6" style={{ marginBottom: 12 }} />
          <Text style={styles.scanningText}>جاري فحص الشبكة...</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      )}

      {status === 'found' && !selectedDevice && (
        <View style={{ gap: 8 }}>
          <Text style={styles.foundCount}>تم العثور على {devices.length} جهاز:</Text>
          {devices.map((device, i) => (
            <TouchableOpacity key={i} style={styles.deviceCard} onPress={() => handleSelect(device)}>
              <View style={styles.deviceIcon}>
                <MonitorSmartphone size={20} color="#22c55e" />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.deviceName || 'حاسوب'}</Text>
                <Text style={styles.deviceIp}>{device.ip}:{device.port}</Text>
                {device.shopName ? <Text style={styles.shopName}>{device.shopName}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.responseTime}>{device.responseTime}ms</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={startScan} style={styles.retryBtn}>
            <RefreshCw size={16} color="#3b82f6" />
            <Text style={styles.retryText}>إعادة البحث</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedDevice && (
        <View style={styles.card}>
          <View style={styles.selectedDevice}>
            <View style={styles.deviceIcon}>
              <Check size={16} color="#22c55e" />
            </View>
            <View>
              <Text style={styles.deviceName}>{selectedDevice.deviceName}</Text>
              <Text style={styles.deviceIp}>{selectedDevice.ip}:{selectedDevice.port}</Text>
            </View>
          </View>
          <Text style={styles.label}>مفتاح الاتصال</Text>
          <TextInput
            style={styles.keyInput}
            placeholder="ABCD-1234-EFGH-5678"
            value={connectionKey}
            onChangeText={setConnectionKey}
            placeholderTextColor="#94a3b8"
            textAlign="center"
          />
          <TouchableOpacity
            style={[styles.connectBtn, !connectionKey && styles.connectBtnDisabled]}
            onPress={handleConnect}
            disabled={!connectionKey}
          >
            <Text style={styles.connectText}>اتصال</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedDevice(null)}>
            <Text style={styles.changeText}>اختيار جهاز آخر</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'failed' && (
        <View style={styles.failedCard}>
          <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 12 }} />
          <Text style={styles.failedText}>{error || 'فشل البحث'}</Text>
          <Text style={styles.failedHint}>تأكد من أن الحاسوب متصل بنفس الشبكة</Text>
          <TouchableOpacity onPress={startScan} style={styles.retryBtnFull}>
            <RefreshCw size={16} color="#3b82f6" />
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: '#94a3b8', fontSize: 14 },
  header: { alignItems: 'center', gap: 8 },
  iconContainer: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)', alignItems: 'center', justifyContent: 'center'
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  subtitle: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14,
  },
  scanText: { color: '#fff', fontSize: 14, fontWeight: 'bold', fontFamily: 'Cairo' },
  scanningCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 24, alignItems: 'center' },
  scanningText: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', fontFamily: 'Cairo', marginBottom: 12 },
  progressBar: { width: '100%', height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
  progressText: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  foundCount: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  deviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 12,
  },
  deviceIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.1)', alignItems: 'center', justifyContent: 'center'
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  deviceIp: { fontSize: 10, color: '#94a3b8' },
  shopName: { fontSize: 10, color: '#3b82f6' },
  responseTime: { fontSize: 10, color: '#94a3b8' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', padding: 6 },
  retryText: { color: '#3b82f6', fontSize: 12 },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, gap: 8 },
  label: { fontSize: 11, color: '#94a3b8' },
  keyInput: {
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0',
    fontFamily: 'monospace', letterSpacing: 2, textAlign: 'center'
  },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12,
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  changeText: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4 },
  selectedDevice: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  failedCard: { backgroundColor: '#fef2f2', borderRadius: 16, padding: 24, alignItems: 'center' },
  failedText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  failedHint: { color: '#94a3b8', fontSize: 11, textAlign: 'center', marginBottom: 12 },
  retryBtnFull: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20,
  },
});

export default DiscoveryStep;
