import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Keyboard, Wifi, ChevronLeft, AlertCircle } from 'lucide-react-native';

interface Props {
  onConnect: (serverUrl: string, key: string) => void;
  onBack: () => void;
  loading: boolean;
}

const ManualStep = ({ onConnect, onBack, loading }: Props) => {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('4321');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleConnect = () => {
    if (!ip.trim()) return setError('أدخل عنوان IP');
    if (!key.trim()) return setError('أدخل مفتاح الاتصال');
    setError('');
    onConnect(`http://${ip.trim()}:${port}`, key.trim());
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <ChevronLeft size={20} color="#94a3b8" />
        <Text style={styles.backText}>العودة</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Keyboard size={24} color="#f97316" />
        </View>
        <Text style={styles.title}>الاتصال اليدوي</Text>
        <Text style={styles.subtitle}>أدخل عنوان IP للحاسوب والمنفذ</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>عنوان IP</Text>
        <TextInput
          style={styles.input}
          placeholder="192.168.1.100"
          value={ip}
          onChangeText={setIp}
          placeholderTextColor="#94a3b8"
          textAlign="center"
        />
        <Text style={styles.label}>المنفذ</Text>
        <TextInput
          style={styles.input}
          placeholder="4321"
          value={port}
          onChangeText={setPort}
          keyboardType="numeric"
          placeholderTextColor="#94a3b8"
          textAlign="center"
        />
        <Text style={styles.label}>مفتاح الاتصال</Text>
        <TextInput
          style={[styles.input, styles.keyInput]}
          placeholder="ABCD-1234-EFGH-5678"
          value={key}
          onChangeText={setKey}
          placeholderTextColor="#94a3b8"
          textAlign="center"
        />
        <Text style={styles.hint}>تجده على سطح المكتب → إعدادات الشبكة</Text>

        {error ? (
          <View style={styles.errorRow}>
            <AlertCircle size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.connectBtn, (!ip || !key || loading) && styles.connectBtnDisabled]}
          onPress={handleConnect}
          disabled={!ip || !key || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Wifi size={20} color="#fff" />}
          <Text style={styles.connectText}>{loading ? 'جاري الاتصال...' : 'اتصال بالخادم'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: '#94a3b8', fontSize: 14 },
  header: { alignItems: 'center', gap: 8 },
  iconContainer: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)', alignItems: 'center', justifyContent: 'center'
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  subtitle: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, gap: 8 },
  label: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  input: {
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0'
  },
  keyInput: { fontFamily: 'monospace', letterSpacing: 2 },
  hint: { fontSize: 10, color: '#94a3b8/50', textAlign: 'center', marginTop: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 8, borderRadius: 8 },
  errorText: { color: '#ef4444', fontSize: 12, flex: 1 },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

export default ManualStep;
