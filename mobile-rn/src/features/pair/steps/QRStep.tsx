import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Wifi, Loader2, Camera, QrCode } from 'lucide-react-native';
import DesktopPairingScanner from '../DesktopPairingScanner';

interface Props {
  onConnect: (serverUrl: string, key: string) => void;
  onBack: () => void;
  loading: boolean;
}

const QRStep = ({ onConnect, onBack, loading }: Props) => {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('4321');
  const [key, setKey] = useState('');
  const [showScanner, setShowScanner] = useState(true);

  const handleScanSuccess = useCallback(
    (serverUrl: string, connectionKey: string) => {
      setShowScanner(false);
      onConnect(serverUrl, connectionKey);
    },
    [onConnect]
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>العودة</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <QrCode size={24} color="#a855f7" />
        </View>
        <Text style={styles.title}>مسح رمز QR</Text>
        <Text style={styles.subtitle}>افتح الكاميرا ووجهها نحو رمز الاقتران على شاشة الحاسوب</Text>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'scan' && styles.toggleBtnActive]}
          onPress={() => {
            setMode('scan');
            setShowScanner(true);
          }}
        >
          <Text style={mode === 'scan' ? styles.toggleTextActive : styles.toggleText}>📷 الكاميرا المباشرة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'manual' && styles.toggleBtnActive]}
          onPress={() => {
            setMode('manual');
            setShowScanner(false);
          }}
        >
          <Text style={mode === 'manual' ? styles.toggleTextActive : styles.toggleText}>⌨️ إدخال يدوي</Text>
        </TouchableOpacity>
      </View>

      {mode === 'scan' && (
        <>
          <TouchableOpacity onPress={() => setShowScanner(true)} style={styles.scanPrompt}>
            <Camera size={32} color="#94a3b8" />
            <Text style={styles.scanText}>اضغط لتشغيل كاميرا الاقتران المخصصة</Text>
          </TouchableOpacity>

          {showScanner && (
            <DesktopPairingScanner
              onConnect={handleScanSuccess}
              onManualInput={() => {
                setShowScanner(false);
                setMode('manual');
              }}
              onClose={() => setShowScanner(false)}
            />
          )}
        </>
      )}

      {mode === 'manual' && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>إدخال بيانات الاتصال يدوياً</Text>
          <TextInput
            style={styles.input}
            placeholder="192.168.1.15"
            value={ip}
            onChangeText={setIp}
            placeholderTextColor="#94a3b8"
            textAlign="center"
          />
          <TextInput
            style={styles.input}
            placeholder="المنفذ"
            value={port}
            onChangeText={setPort}
            keyboardType="numeric"
            placeholderTextColor="#94a3b8"
            textAlign="center"
          />
          <TextInput
            style={[styles.input, styles.keyInput]}
            placeholder="ABCD-1234-EFGH-5678"
            value={key}
            onChangeText={setKey}
            placeholderTextColor="#94a3b8"
            textAlign="center"
          />
          <TouchableOpacity
            style={[styles.connectBtn, (!ip || !key) && styles.connectBtnDisabled]}
            onPress={() => onConnect(`http://${ip}:${port}`, key)}
            disabled={!ip || !key}
          >
            {loading ? <Loader2 size={20} color="#fff" /> : <Wifi size={20} color="#fff" />}
            <Text style={styles.connectText}>{loading ? 'جاري الاتصال...' : 'اتصال'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: '#94a3b8', fontSize: 14 },
  header: { alignItems: 'center', gap: 8 },
  iconContainer: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.1)', alignItems: 'center', justifyContent: 'center'
  },
  icon: { fontSize: 24 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  subtitle: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  toggleBtnActive: { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: '#a855f7' },
  toggleText: { fontSize: 12, color: '#94a3b8' },
  toggleTextActive: { fontSize: 12, color: '#a855f7', fontWeight: '600' },
  scanPrompt: {
    height: 200, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
  },
  scanText: { color: '#94a3b8', fontSize: 14 },
  errorCard: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, padding: 16, alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 8 },
  retryText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, gap: 8 },
  cardLabel: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 8 },
  input: {
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0'
  },
  keyInput: { fontFamily: 'monospace', letterSpacing: 2 },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

export default QRStep;
